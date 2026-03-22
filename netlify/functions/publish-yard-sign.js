const { getDb, admin } = require("./_firebase");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      companyId, companyName, companySlug,
      workTypes, city, neighborhood,
      state, stateAbbr, zipCode,
      jobId, slug, companyWebsite, officeWebsite
    } = body;

    // Validate required fields
    if (!companyId || !jobId || !slug || !companySlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const db = getDb();

    // Idempotency check — skip if this jobId + workType combo already exists
    const existing = await db.collection("yard_signs")
      .where("companyId", "==", companyId)
      .where("jobId", "==", jobId)
      .where("workTypes", "array-contains", workTypes[0])
      .get();

    if (!existing.empty) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ skipped: true, reason: "already exists" }),
      };
    }

    // Write the yard sign document
    await db.collection("yard_signs").add({
      companyId,
      companyName,
      companySlug,
      workTypes,
      city,
      neighborhood,
      state,
      stateAbbr,
      zipCode,
      jobId,
      slug,
      published: true,
      companyWebsite: companyWebsite || "",
      officeWebsite: officeWebsite || "",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("[publish-yard-sign] Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
