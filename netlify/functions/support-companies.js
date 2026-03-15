/**
 * support-companies.js
 *
 * Netlify Function – returns the list of Memberstack members for the
 * staff support / white-glove-onboarding company selector.
 *
 * IMPORTANT: MEMBERSTACK_SECRET_KEY must be set in the Netlify
 * environment variables for this site.
 *
 * Endpoint: GET /.netlify/functions/support-companies
 */

const MEMBERSTACK_API = "https://admin.memberstack.com/members";
const ADMIN_PLAN_ID   = "pln_cortex-admin-vl2v0qmj";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function deriveStatus(planConnections) {
  if (!Array.isArray(planConnections) || planConnections.length === 0) return "churned";
  if (planConnections.some(c => c.active === true || c.status === "ACTIVE"))  return "active";
  if (planConnections.some(c => c.status === "TRIALING"))                     return "trialing";
  return "churned";
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  try {
    const apiKey = process.env.MEMBERSTACK_SECRET_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "MEMBERSTACK_SECRET_KEY is not configured." }),
      };
    }

    // Fetch all members from Memberstack Admin API
    // The API may paginate — collect all pages
    let allMembers = [];
    let hasMore = true;
    let after = undefined;

    while (hasMore) {
      const url = new URL(MEMBERSTACK_API);
      if (after) url.searchParams.set("after", after);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "X-API-KEY": apiKey },
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          statusCode: res.status,
          headers: corsHeaders(),
          body: JSON.stringify({ error: `Memberstack API error: ${res.status}`, detail: text }),
        };
      }

      const json = await res.json();
      const members = json.data || json.members || json || [];

      if (Array.isArray(members)) {
        allMembers = allMembers.concat(members);
      }

      // Handle pagination
      if (json.hasNextPage && json.endCursor) {
        after = json.endCursor;
      } else if (json.totalCount && allMembers.length < json.totalCount && members.length > 0) {
        after = members[members.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Map & filter
    const companies = allMembers
      .filter((m) => {
        // Exclude members on the admin plan
        const plans = m.planConnections || [];
        return !plans.some((p) => p.planId === ADMIN_PLAN_ID);
      })
      .map((m) => {
        const cf = m.customFields || {};
        return {
          id:          m.id,
          companyName: cf["company-name"] || cf["companyName"] || "",
          email:       m.auth?.email || "",
          status:      deriveStatus(m.planConnections),
          companyId:   cf["company-id"] || "",
          createdAt:   m.createdAt || null,
        };
      });

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(companies),
    };
  } catch (err) {
    console.error("support-companies error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};
