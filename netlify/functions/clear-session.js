/**
 * clear-session.js
 * Called via navigator.sendBeacon() when a user closes their tab / force-quits.
 * Deletes the activeSessions/{memberId} doc so Memberstack doesn't get confused.
 *
 * Body: JSON  { memberId: "mem_xxx" }
 */

const { getDb } = require("./_firebase");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const { memberId } = JSON.parse(event.body || "{}");
    if (!memberId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "memberId required" }) };
    }

    const db = getDb();
    await db.collection("activeSessions").doc(memberId).delete();

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("clear-session error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
