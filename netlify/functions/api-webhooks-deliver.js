/**
 * api-webhooks-deliver.js
 * Netlify Function — Webhook Delivery Worker
 *
 * Called internally (or via cron/event trigger) to deliver webhook
 * payloads to registered endpoints when events fire.
 *
 * POST /api-webhooks-deliver  { companyId, event }
 *
 * This function:
 *   1. Looks up all active webhooks for the company that subscribe to the event type
 *   2. Sends the payload to each endpoint with HMAC signature
 *   3. Records delivery status
 *   4. Auto-disables webhooks after 10 consecutive failures
 *
 * This is called from within the platform (e.g., the automation runner
 * or event bus) — not from external clients.
 */

const crypto = require("crypto");
const https  = require("https");
const http   = require("http");
const { getDb } = require("./_firebase");
const { json, error } = require("./_api-helpers");

const MAX_FAILURES = 10;
const DELIVERY_TIMEOUT_MS = 10000;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*" }, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return error(405, "method_not_allowed", "Use POST.");
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return error(400, "invalid_json", "Invalid JSON.");
  }

  const { companyId, eventType, eventData } = body;
  if (!companyId || !eventType) {
    return error(400, "missing_fields", "companyId and eventType are required.");
  }

  const db = getDb();

  // Find all active webhooks for this company that listen to this event type
  const snap = await db.collection(`companies/${companyId}/webhooks`)
    .where("status", "==", "active")
    .get();

  const webhooks = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(w => w.events && w.events.includes(eventType));

  if (webhooks.length === 0) {
    return json(200, { ok: true, delivered: 0, message: "No matching webhooks." });
  }

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    companyId,
    data: eventData || {},
  };

  const results = await Promise.allSettled(
    webhooks.map(w => deliverWebhook(db, companyId, w, payload))
  );

  const delivered = results.filter(r => r.status === "fulfilled" && r.value.success).length;
  const failed    = results.filter(r => r.status !== "fulfilled" || !r.value.success).length;

  return json(200, { ok: true, delivered, failed, total: webhooks.length });
};

async function deliverWebhook(db, companyId, webhook, payload) {
  const payloadStr = JSON.stringify(payload);
  const signature  = crypto.createHmac("sha256", webhook.secret).update(payloadStr).digest("hex");

  try {
    const url = new URL(webhook.url);
    const transport = url.protocol === "https:" ? https : http;

    const statusCode = await new Promise((resolve, reject) => {
      const req = transport.request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-JobDox-Signature": signature,
          "X-JobDox-Event": payload.event,
          "X-JobDox-Delivery": crypto.randomUUID(),
          "User-Agent": "JobDox-Webhook/1.0",
        },
      }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on("error", reject);
      req.setTimeout(DELIVERY_TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error("Timeout"));
      });
      req.write(payloadStr);
      req.end();
    });

    const isSuccess = statusCode >= 200 && statusCode < 300;

    // Update webhook status
    const webhookRef = db.doc(`companies/${companyId}/webhooks/${webhook.id}`);
    if (isSuccess) {
      await webhookRef.update({
        lastTriggeredAt: new Date(),
        lastStatusCode: statusCode,
        failureCount: 0,
      });
    } else {
      const newFailures = (webhook.failureCount || 0) + 1;
      const updates = {
        lastTriggeredAt: new Date(),
        lastStatusCode: statusCode,
        failureCount: newFailures,
      };
      if (newFailures >= MAX_FAILURES) {
        updates.status = "disabled";
        updates.disabledReason = `Auto-disabled after ${MAX_FAILURES} consecutive failures.`;
      }
      await webhookRef.update(updates);
    }

    // Log delivery
    await db.collection(`companies/${companyId}/webhooks/${webhook.id}/deliveries`).add({
      event: payload.event,
      statusCode,
      success: isSuccess,
      createdAt: new Date(),
    });

    return { success: isSuccess, statusCode };
  } catch (err) {
    // Network error
    const webhookRef = db.doc(`companies/${companyId}/webhooks/${webhook.id}`);
    const newFailures = (webhook.failureCount || 0) + 1;
    const updates = {
      lastTriggeredAt: new Date(),
      lastError: err.message,
      failureCount: newFailures,
    };
    if (newFailures >= MAX_FAILURES) {
      updates.status = "disabled";
      updates.disabledReason = `Auto-disabled after ${MAX_FAILURES} consecutive failures.`;
    }
    await webhookRef.update(updates);

    await db.collection(`companies/${companyId}/webhooks/${webhook.id}/deliveries`).add({
      event: payload.event,
      error: err.message,
      success: false,
      createdAt: new Date(),
    });

    return { success: false, error: err.message };
  }
}
