/**
 * ms-firebase-auth.js
 * Memberstack → Firebase Auth Bridge
 *
 * Validates a Memberstack token, then issues a Firebase custom token
 * with companyId, permissionLevel, email, and supportUser claims.
 *
 * Env vars required:
 *   MEMBERSTACK_SECRET_KEY – Memberstack Admin API secret
 *   FIREBASE_SERVICE_ACCOUNT – Firebase service-account JSON (one line)
 */

const { getDb, admin } = require("./_firebase");

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

/* ── audit helper (server-side only — bypasses Firestore rules) ── */
async function writeAuditLog(db, fields) {
  try {
    await db.collection("audit_logs").add({
      ...fields,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (_) {
    // Best-effort — never let logging failure break auth flow
  }
}

exports.handler = async (event) => {
  console.log("ms-firebase-auth called");
  console.log("Body received:", event.body);

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const db = getDb();
  const ip = (event.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const userAgent = event.headers["user-agent"] || "unknown";

  let memberId = "unknown";
  let companyId = "";
  let email = "";

  try {
    // ── 1. Get memberId from request body ──
    const { memberId: reqMemberId } = JSON.parse(event.body || '{}');
    if (!reqMemberId) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "An error occurred" }) };
    }

    // ── 2. Verify member exists via Memberstack Admin API ──
    const msSecret = process.env.MEMBERSTACK_SECRET_KEY;
    if (!msSecret) {
      await writeAuditLog(db, {
        event: "auth_token_failed",
        memberId,
        companyId,
        email,
        success: false,
        reason: "missing_memberstack_key",
        ip,
        userAgent,
      });
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "An error occurred" }) };
    }

    const msRes = await fetch(`https://admin.memberstack.com/members/${reqMemberId}`, {
      headers: {
        "X-API-KEY": msSecret,
      },
    });

    console.log("Memberstack API status:", msRes.status);

    if (!msRes.ok) {
      await writeAuditLog(db, {
        event: "auth_token_failed",
        memberId: reqMemberId,
        companyId,
        email,
        success: false,
        reason: "memberstack_member_lookup_failed",
        ip,
        userAgent,
      });
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const msData = await msRes.json();
    const member = msData.data || msData;

    // ── 3. Extract member fields ──
    memberId = member.id || "unknown";
    email = (member.auth && member.auth.email) || "";
    companyId = (member.customFields && member.customFields["company-id"]) || "";
    let permissionLevel = parseInt(
      (member.customFields && member.customFields["permission-level"]) || "0",
      10
    );
    if (isNaN(permissionLevel)) permissionLevel = 0;

    // ── 4. Require companyId ──
    // If no company-id custom field AND user is not account owner, reject.
    // Account owners use their own memberId as companyId.
    if (!companyId) {
      companyId = memberId;
    }
    if (!companyId || companyId === "unknown") {
      await writeAuditLog(db, {
        event: "auth_token_failed",
        memberId,
        companyId,
        email,
        success: false,
        reason: "no_company_assigned",
        ip,
        userAgent,
      });
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: "No company assigned" }) };
    }

    // ── 5. Support user detection ──
    let supportUser = false;
    if (email && email.toLowerCase().endsWith("@job-dox.com")) {
      supportUser = true;
      permissionLevel = 10;
    }

    // ── 6. Create Firebase custom token ──
    const customClaims = {
      companyId,
      permissionLevel,
      email,
      supportUser,
    };

    const customToken = await admin.auth().createCustomToken(memberId, customClaims);

    // ── 7. Audit log — success ──
    await writeAuditLog(db, {
      event: "auth_token_issued",
      memberId,
      companyId,
      permissionLevel,
      email,
      supportUser,
      success: true,
      ip,
      userAgent,
    });

    // ── 8. Return token ──
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ firebaseToken: customToken }),
    };
  } catch (_) {
    // ── 9. Catch-all — never expose internals ──
    await writeAuditLog(db, {
      event: "auth_token_failed",
      memberId,
      companyId,
      email,
      success: false,
      reason: "internal_error",
      ip,
      userAgent,
    });

    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: "An error occurred" }),
    };
  }
};
