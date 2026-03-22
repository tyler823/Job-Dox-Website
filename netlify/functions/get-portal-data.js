/**
 * get-portal-data.js
 * Netlify Function — Returns project data for the customer portal.
 *
 * Query params:
 *   companyId  — the company that owns the project
 *   projectId  — the project to fetch
 *   email      — the authenticated homeowner's email (verified against contacts)
 *
 * Returns project details, client-visible notes, photos, and signing requests.
 * Only returns notes where visibleToClient === true.
 *
 * Env vars required in Netlify dashboard:
 *   FIREBASE_SERVICE_ACCOUNT = { ...service account JSON, one line }
 *   SITE_URL                 = https://job-dox.com  (for CORS)
 */

const { getDb, admin } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.com";

const headers = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const { companyId, projectId, email } = event.queryStringParameters || {};

  if (!companyId || !projectId || !email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "`companyId`, `projectId`, and `email` are required." }),
    };
  }

  try {
    const db = getDb();

    // ── 1. Load project document ──
    const projectRef = db.doc(`companies/${companyId}/projects/${projectId}`);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Project not found." }),
      };
    }

    const project = { id: projectSnap.id, ...projectSnap.data() };

    // ── 2. Verify email is in project contacts ──
    const contactsSnap = await db
      .collection(`companies/${companyId}/projects/${projectId}/contacts`)
      .get();

    const contacts = contactsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const emailLower = email.toLowerCase();
    const matchedContact = contacts.find(
      (c) => (c.email || "").toLowerCase() === emailLower
    );

    if (!matchedContact) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ accessDenied: true }),
      };
    }

    // ── 3. Load company name + logo (top-level doc, then settings fallback) ──
    let companyName = "";
    let companyLogo = "";
    let companyPhone = "";
    let companyEmail = "";
    let companyAddress = "";
    try {
      const coSnap = await db.doc(`companies/${companyId}`).get();
      if (coSnap.exists) {
        const coData = coSnap.data();
        companyName = coData.name || coData.companyName || "";
        companyLogo = coData.logo || "";
      }
      // Fallback to settings/companyInfo if top-level fields are empty
      if (!companyName || !companyLogo) {
        const ciSnap = await db.doc(`companies/${companyId}/settings/companyInfo`).get();
        if (ciSnap.exists) {
          const ci = ciSnap.data()?.data || ciSnap.data() || {};
          if (!companyName) companyName = ci.name || "";
          if (!companyLogo) companyLogo = ci.logo || "";
          companyPhone = ci.phone || "";
          companyEmail = ci.email || "";
          companyAddress = [ci.address, ci.city, ci.state, ci.zip].filter(Boolean).join(", ");
        }
      }
    } catch (_) {
      // Non-fatal — company doc may not exist
    }

    // ── 3b. Load office branding (overrides company defaults) ──
    let brand = { name: companyName, logo: companyLogo, phone: companyPhone, email: companyEmail, address: companyAddress };
    try {
      const officeId = project.officeId;
      if (officeId) {
        const offSnap = await db.doc(`companies/${companyId}/offices/${officeId}`).get();
        if (offSnap.exists) {
          const o = offSnap.data();
          brand.name    = (o.displayName || "").trim() || brand.name;
          brand.logo    = (o.logo || "").trim()        || brand.logo;
          brand.phone   = (o.phone || "").trim()       || brand.phone;
          brand.email   = (o.email || "").trim()       || brand.email;
          brand.address = [o.street, o.city, o.state, o.zip].filter(Boolean).join(", ") || brand.address;
        }
      }
    } catch (_) {
      // Non-fatal — office doc may not exist
    }

    // ── 4. Load daily notes (only visibleToClient) ──
    const notesSnap = await db
      .collection(`companies/${companyId}/projects/${projectId}/dailyNotes`)
      .orderBy("createdAt", "desc")
      .get();

    const notes = notesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((n) => n.visibleToClient === true);

    // ── 5. Load photos / media uploads ──
    // Photos may be in a "mediaUploads" subcollection or stored in the project doc.
    let photos = [];
    try {
      const mediaSnap = await db
        .collection(`companies/${companyId}/projects/${projectId}/mediaUploads`)
        .orderBy("createdAt", "desc")
        .get();
      photos = mediaSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (_) {
      // Collection may not exist — photos might be stored differently
    }

    // If no subcollection photos, check if the project doc has embedded media
    if (photos.length === 0 && project.mediaUploads && Array.isArray(project.mediaUploads)) {
      photos = project.mediaUploads;
    }

    // ── 6. Load signing requests for this project ──
    const signingSnap = await db
      .collection(`companies/${companyId}/signingRequests`)
      .where("projectId", "==", projectId)
      .get();

    const signingRequests = signingSnap.docs.map((d) => {
      const data = d.data();
      const signingUrl = data.token
        ? `${ALLOWED_ORIGIN}/app/dist/#/sign?token=${data.token}`
        : "";
      return {
        id: d.id,
        docName: data.docName || "",
        status: data.status || "pending",
        createdAt: data.createdAt || null,
        signerName: data.signerName || "",
        signingUrl: signingUrl,
      };
    });

    // ── 7. Find a company contact (assigned staff) ──
    let companyContact = null;
    if (project.assignedTo) {
      // assignedTo might be a name or ID
      companyContact = { name: project.assignedTo, phone: project.assignedPhone || "" };
    } else if (project.projectManager) {
      companyContact = { name: project.projectManager, phone: project.managerPhone || "" };
    }

    // ── 8. Build response ──
    // Strip internal fields from project
    const safeProject = {
      id: project.id,
      name: project.name || "",
      status: project.status || "active",
      workType: project.workType || project.projectType || "",
      street: project.street || project.address || "",
      city: project.city || "",
      state: project.state || "",
      zip: project.zip || "",
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        project: safeProject,
        companyName,
        companyContact,
        brand,
        notes,
        photos,
        signingRequests,
      }),
    };
  } catch (err) {
    console.error("[get-portal-data] Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
