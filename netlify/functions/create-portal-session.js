/**
 * create-portal-session.js
 * Netlify Function — Creates a Stripe Billing Portal session so users can
 * manage their subscription (update payment method, cancel, etc.).
 *
 * Accepts POST { stripeCustomerId, returnUrl }
 * Returns  { url } — the Stripe Billing Portal URL
 *
 * Env vars required in Netlify dashboard:
 *   STRIPE_SECRET_KEY = sk_live_...
 */

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY env var");
    return respond(500, { error: "Stripe configuration missing" });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { stripeCustomerId, returnUrl } = body;

  if (!stripeCustomerId) {
    return respond(400, { error: "stripeCustomerId is required" });
  }

  const defaultReturn = "https://job-dox.ai/portal.html?page=settings";

  const params = new URLSearchParams();
  params.append("customer", stripeCustomerId);
  params.append("return_url", returnUrl || defaultReturn);

  try {
    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe Portal API error:", data);
      return respond(res.status, { error: data.error?.message || "Stripe error" });
    }

    return respond(200, { url: data.url });
  } catch (err) {
    console.error("Stripe portal session error:", err);
    return respond(500, { error: "Failed to create portal session" });
  }
};
