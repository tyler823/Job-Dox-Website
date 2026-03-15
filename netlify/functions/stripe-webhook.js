/**
 * stripe-webhook.js
 * Netlify Function — Handles Stripe webhook events for subscription lifecycle.
 *
 * Events handled:
 *   checkout.session.completed    → upgrade company to Premium (1000 coins)
 *   customer.subscription.deleted → downgrade company to Standard (300 coins)
 *   invoice.payment_failed        → flag payment failure on company doc
 *
 * Env vars required in Netlify dashboard:
 *   STRIPE_WEBHOOK_SECRET    = whsec_...
 *   FIREBASE_SERVICE_ACCOUNT = { ... }
 */

const crypto = require("crypto");
const { getDb } = require("./_firebase");

/**
 * Verify Stripe webhook signature manually (no stripe npm package).
 * Uses the v1 signing scheme: HMAC-SHA256 of "timestamp.rawBody".
 */
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) throw new Error("Missing stripe-signature header");

  const parts = {};
  sigHeader.split(",").forEach(item => {
    const [key, val] = item.split("=");
    if (key === "t") parts.t = val;
    if (key === "v1") parts.v1 = val;
  });

  if (!parts.t || !parts.v1) {
    throw new Error("Invalid stripe-signature format");
  }

  const payload = `${parts.t}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  // Timing-safe comparison
  if (expected.length !== parts.v1.length) {
    throw new Error("Signature verification failed");
  }
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  if (!crypto.timingSafeEqual(a, b)) {
    throw new Error("Signature verification failed");
  }

  // Check timestamp tolerance (5 minutes)
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(parts.t)) > tolerance) {
    throw new Error("Webhook timestamp too old");
  }

  return true;
}

exports.handler = async (event) => {
  // Webhooks are POST only — no CORS needed (Stripe server-to-server)
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env var");
    return { statusCode: 500, body: "Webhook secret not configured" };
  }

  // Get the raw body — Netlify may base64-encode it
  let rawBody;
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(event.body, "base64").toString("utf8");
  } else {
    rawBody = event.body;
  }

  // Verify Stripe signature
  const sigHeader = event.headers["stripe-signature"];
  try {
    verifyStripeSignature(rawBody, sigHeader, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Parse the event after verification
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const db = getDb();

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(db, stripeEvent.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(db, stripeEvent.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(db, stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${stripeEvent.type}:`, err);
    return { statusCode: 500, body: "Webhook handler error" };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

/**
 * checkout.session.completed
 * Upgrade the company to Premium: 1000 base coins.
 */
async function handleCheckoutCompleted(db, session) {
  const companyId = session.client_reference_id;
  if (!companyId) {
    console.error("checkout.session.completed: missing client_reference_id");
    return;
  }

  const ref = db.collection("companies").doc(companyId)
    .collection("billing").doc("cortexCoins");

  const snap = await ref.get();
  const current = snap.exists ? snap.data() : {};

  const usedThisCycle = current.usedThisCycle || 0;
  const rolloverCoins = current.rolloverCoins || 0;
  const newBase = 1000;
  const newTotal = (newBase - usedThisCycle) + rolloverCoins;

  await ref.set({
    baseAllowance: newBase,
    totalAvailable: Math.max(newTotal, 0),
    plan: "premium",
    stripeSubscriptionId: session.subscription || "",
    stripeCustomerId: session.customer || "",
  }, { merge: true });

  console.log(`Company ${companyId} upgraded to Premium (1000 coins)`);
}

/**
 * customer.subscription.deleted
 * Downgrade the company back to Standard: 300 base coins.
 */
async function handleSubscriptionDeleted(db, subscription) {
  // Find the company by stripeSubscriptionId
  const billing = db.collectionGroup("billing");
  // We can't do collectionGroup queries easily without an index, so use the
  // subscription metadata. Stripe sends customer info — look up by customerId.
  // Actually, the subscription object doesn't have client_reference_id.
  // We need to find the company doc that has this subscription ID.
  const companiesRef = db.collection("companies");
  const companiesSnap = await companiesRef.get();

  let companyId = null;

  for (const compDoc of companiesSnap.docs) {
    const coinsRef = compDoc.ref.collection("billing").doc("cortexCoins");
    const coinsSnap = await coinsRef.get();
    if (coinsSnap.exists) {
      const data = coinsSnap.data();
      if (data.stripeSubscriptionId === subscription.id) {
        companyId = compDoc.id;
        break;
      }
    }
  }

  if (!companyId) {
    console.error(`subscription.deleted: no company found for subscription ${subscription.id}`);
    return;
  }

  const ref = db.collection("companies").doc(companyId)
    .collection("billing").doc("cortexCoins");

  const snap = await ref.get();
  const current = snap.exists ? snap.data() : {};

  const usedThisCycle = current.usedThisCycle || 0;
  const rolloverCoins = current.rolloverCoins || 0;
  const newBase = 300;
  const newTotal = (newBase - usedThisCycle) + rolloverCoins;

  await ref.set({
    baseAllowance: newBase,
    totalAvailable: Math.max(newTotal, 0),
    plan: "standard",
    stripeSubscriptionId: "",
  }, { merge: true });

  console.log(`Company ${companyId} downgraded to Standard (300 coins)`);
}

/**
 * invoice.payment_failed
 * Flag the company doc so the portal can show a warning.
 */
async function handlePaymentFailed(db, invoice) {
  const customerId = invoice.customer;
  if (!customerId) {
    console.error("invoice.payment_failed: missing customer ID");
    return;
  }

  // Find company by stripeCustomerId
  const companiesSnap = await db.collection("companies").get();

  for (const compDoc of companiesSnap.docs) {
    const coinsRef = compDoc.ref.collection("billing").doc("cortexCoins");
    const coinsSnap = await coinsRef.get();
    if (coinsSnap.exists) {
      const data = coinsSnap.data();
      if (data.stripeCustomerId === customerId) {
        await coinsRef.set({
          paymentFailed: true,
          paymentFailedAt: new Date().toISOString(),
        }, { merge: true });
        console.log(`Payment failure flagged for company ${compDoc.id}`);
        return;
      }
    }
  }

  console.error(`invoice.payment_failed: no company found for customer ${customerId}`);
}
