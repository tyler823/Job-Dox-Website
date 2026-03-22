/**
 * create-checkout.js
 * Netlify Function — Creates a Stripe Checkout Session for the Premium plan.
 *
 * Accepts POST { companyId, memberEmail, successUrl, cancelUrl }
 * Returns  { url } — the Stripe hosted checkout URL
 *
 * Env vars required in Netlify dashboard:
 *   STRIPE_SECRET_KEY       = sk_live_...
 *   STRIPE_PREMIUM_PRICE_ID = price_...
 */

const { verifyAndGetCompanyId } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

function respond(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!stripeKey || !priceId) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_PREMIUM_PRICE_ID env vars");
    return respond(500, { error: "Stripe configuration missing" });
  }

  // ── Auth verification ──
  const companyId = await verifyAndGetCompanyId(event.headers["authorization"] || event.headers["Authorization"]);
  if (!companyId) {
    return respond(401, { error: "Unauthorized" });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { memberEmail, successUrl, cancelUrl } = body;

  if (!memberEmail) {
    return respond(400, { error: "memberEmail is required" });
  }

  const defaultSuccess = "https://job-dox.ai/portal.html?billing=success";
  const defaultCancel = "https://job-dox.ai/portal.html?billing=cancelled";

  // Build Stripe Checkout Session via REST API
  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("client_reference_id", companyId);
  params.append("customer_email", memberEmail);
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("success_url", successUrl || defaultSuccess);
  params.append("cancel_url", cancelUrl || defaultCancel);

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe API error:", data);
      return respond(res.status, { error: data.error?.message || "Stripe error" });
    }

    return respond(200, { url: data.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return respond(500, { error: "Failed to create checkout session" });
  }
};
