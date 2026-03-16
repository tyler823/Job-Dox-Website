/**
 * get-ip.js
 * Netlify Function — Returns the caller's IP address
 * Used by the public signing page to record signerIp for legal purposes.
 */

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Netlify provides the client IP in the event headers
  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "unavailable";

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ip }),
  };
};
