/**
 * marketing-webhook.js
 * Netlify Function — Zapier Webhook Receiver for Marketing Data
 *
 * Accepts POST requests to /api/marketing-data/{companyId}/{secretToken}
 * Validates the secretToken against Firestore company_settings.
 * Auto-detects Google Ads vs Google Analytics payload.
 * Writes validated data to marketing_data/{companyId}.
 *
 * Detection logic:
 *   - Google Ads: payload contains "campaignName" or "campaigns" field
 *   - Google Analytics: payload contains "organicSessions" or "organicUsers" field
 *   - If neither matches, returns 400
 */

const { getDb, admin } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Parse URL: /api/marketing-data/{companyId}/{secretToken} ──
  const path = event.path.replace(/^\/api\/marketing-data\/?/, "");
  const parts = path.split("/").filter(Boolean);
  const companyId = parts[0] || "";
  const secretToken = parts[1] || "";

  if (!companyId || !secretToken) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required URL parameters" }) };
  }

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[marketing-webhook] Firebase init error:", e.message);
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Service unavailable" }) };
  }

  // ── Validate secretToken against Firestore ──
  try {
    const settingsDoc = await db.collection("company_settings").doc(companyId).get();
    if (!settingsDoc.exists) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }
    const stored = settingsDoc.data();
    if (!stored.webhookToken || stored.webhookToken !== secretToken) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }
  } catch (e) {
    console.error("[marketing-webhook] Token validation error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal error during validation" }) };
  }

  // ── Parse request body ──
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const docRef = db.collection("marketing_data").doc(companyId);

  // ── Detect payload type and write to Firestore ──
  // Google Ads detection: has "campaignName", "campaigns", or "spend" fields
  const isGoogleAds = payload.campaignName || payload.campaigns || (payload.spend !== undefined && payload.clicks !== undefined);

  // Google Analytics detection: has "organicSessions" or "organicUsers" fields
  const isGoogleAnalytics = payload.organicSessions !== undefined || payload.organicUsers !== undefined;

  if (isGoogleAds) {
    // ── GOOGLE ADS DATA ──
    // Accept either a single campaign object or an array of campaigns
    let campaigns;
    if (Array.isArray(payload.campaigns)) {
      campaigns = payload.campaigns.map(normalizeCampaign);
    } else {
      // Single campaign object from Zapier (flat fields)
      campaigns = [normalizeCampaign(payload)];
    }

    try {
      await docRef.set({
        companyId,
        lastUpdated: now,
        googleAds: {
          lastReceived: now,
          campaigns,
          dateRange: payload.dateRange || "",
        },
      }, { merge: true });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, type: "googleAds", campaignsReceived: campaigns.length }) };
    } catch (e) {
      console.error("[marketing-webhook] Firestore write error (ads):", e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to store data" }) };
    }
  }

  if (isGoogleAnalytics) {
    // ── GOOGLE ANALYTICS DATA ──
    const topOrganicPages = Array.isArray(payload.topOrganicPages)
      ? payload.topOrganicPages.map(p => ({
          pagePath: p.pagePath || p.page || "",
          sessions: toNum(p.sessions),
          source: p.source || "google / organic",
        }))
      : [];

    try {
      await docRef.set({
        companyId,
        lastUpdated: now,
        googleAnalytics: {
          lastReceived: now,
          organicSessions: toNum(payload.organicSessions),
          organicUsers: toNum(payload.organicUsers),
          topOrganicPages,
          dateRange: payload.dateRange || "",
        },
      }, { merge: true });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, type: "googleAnalytics" }) };
    } catch (e) {
      console.error("[marketing-webhook] Firestore write error (analytics):", e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to store data" }) };
    }
  }

  // Neither type detected
  return { statusCode: 400, headers, body: JSON.stringify({ error: "Unrecognized payload. Expected Google Ads fields (campaignName, spend, clicks) or Google Analytics fields (organicSessions, organicUsers)." }) };
};

/** Normalize a campaign object — handles Zapier's flat field mapping */
function normalizeCampaign(c) {
  return {
    campaignName: c.campaignName || c.campaign_name || c.name || "",
    status: (c.status || "ENABLED").toUpperCase(),
    spend: toNum(c.spend),
    budget: toNum(c.budget),
    conversions: toNum(c.conversions),
    costPerConversion: toNum(c.costPerConversion || c.cost_per_conversion),
    clicks: toNum(c.clicks),
    impressions: toNum(c.impressions),
    dateRange: c.dateRange || c.date_range || "",
  };
}

/** Safely convert to number */
function toNum(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
