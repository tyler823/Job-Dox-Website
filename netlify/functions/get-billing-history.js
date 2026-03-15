/**
 * get-billing-history.js
 * Netlify Function — Fetches a company's invoice history from Stripe.
 *
 * Accepts POST { stripeCustomerId }
 * Returns  { invoices: [...] }
 *
 * If stripeCustomerId is null/missing, returns an empty array (company
 * hasn't been billed yet).
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

/**
 * Derive a human-readable description from invoice line items.
 */
function deriveDescription(invoice) {
  const lines = invoice.lines?.data || [];
  if (lines.length === 0) return "Cortex by Job-Dox";

  const descriptions = lines.map(line => {
    const amount = (line.amount || 0) / 100;
    const desc = line.description || "";

    // Detect plan tier from amount or description
    if (amount === 199 || /standard/i.test(desc)) {
      return "Cortex by Job-Dox \u2014 Standard Plan";
    }
    if (amount === 500 || amount === 750 || /premium/i.test(desc)) {
      return "Cortex by Job-Dox \u2014 Premium Plan";
    }

    // Proration or other line item — use Stripe's description if available
    if (desc) return desc;
    return "Cortex by Job-Dox";
  });

  // Deduplicate and combine
  const unique = [...new Set(descriptions)];
  return unique.join("; ");
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
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { stripeCustomerId } = body;

  // No customer yet — return empty array, not an error
  if (!stripeCustomerId) {
    return respond(200, { invoices: [] });
  }

  try {
    const params = new URLSearchParams();
    params.append("customer", stripeCustomerId);
    params.append("limit", "24");
    params.append("expand[]", "data.subscription");

    const res = await fetch(`https://api.stripe.com/v1/invoices?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe Invoices API error:", data);
      return respond(res.status, { error: data.error?.message || "Stripe error" });
    }

    const invoices = (data.data || []).map(inv => {
      const created = new Date(inv.created * 1000);
      const dateStr = created.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });

      const amountCents = inv.amount_paid ?? 0;
      const amountStr = "$" + (amountCents / 100).toFixed(2);

      let status = "void";
      if (inv.status === "paid") status = "paid";
      else if (inv.status === "open") status = "open";

      return {
        id: inv.id,
        date: dateStr,
        amount: amountStr,
        status,
        description: deriveDescription(inv),
        invoiceUrl: inv.hosted_invoice_url || null,
      };
    });

    return respond(200, { invoices });
  } catch (err) {
    console.error("Stripe billing history error:", err);
    return respond(500, { error: "Failed to fetch billing history" });
  }
};
