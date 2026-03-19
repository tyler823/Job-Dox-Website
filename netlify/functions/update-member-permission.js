/**
 * update-member-permission.js
 * Syncs a staff member's permission-level to Memberstack custom fields.
 * Called from the portal frontend after Firestore permission writes so that
 * the Firebase auth bridge (ms-firebase-auth) issues tokens with the correct
 * permissionLevel claim.
 *
 * Env vars required:
 *   MEMBERSTACK_SECRET_KEY – Memberstack Admin API secret
 */

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { memberId, permissionLevel } = JSON.parse(event.body || "{}");

    if (!memberId || permissionLevel === undefined) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "An error occurred" }) };
    }

    const msSecret = process.env.MEMBERSTACK_SECRET_KEY;
    if (!msSecret) {
      console.error("MEMBERSTACK_SECRET_KEY not configured");
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "An error occurred" }) };
    }

    const msRes = await fetch(
      `https://admin.memberstack.com/members/${memberId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": msSecret,
        },
        body: JSON.stringify({
          customFields: {
            "permission-level": String(permissionLevel),
          },
        }),
      }
    );

    if (!msRes.ok) {
      console.error("Memberstack API error:", msRes.status);
      return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: "An error occurred" }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error("update-member-permission error:", err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "An error occurred" }) };
  }
};
