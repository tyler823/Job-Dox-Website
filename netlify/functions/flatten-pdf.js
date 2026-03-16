/**
 * flatten-pdf.js
 * Netlify Function — Generate a flat PDF with signatures and field values burned in.
 * Uses pdf-lib to overlay text and images onto the original PDF pages.
 *
 * Expects POST body: { companyId, projectId, documentId }
 * Returns: { pdfBase64: "data:application/pdf;base64,..." }
 *
 * Env vars required:
 *   FIREBASE_SERVICE_ACCOUNT = { ...service account JSON }
 */

const { getDb } = require("./_firebase");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { companyId, projectId, documentId } = body;
  if (!companyId || !projectId || !documentId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "companyId, projectId, and documentId are required" }) };
  }

  try {
    const db = getDb();
    const docSnap = await db.doc(`companies/${companyId}/projects/${projectId}/documents/${documentId}`).get();

    if (!docSnap.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Document not found" }) };
    }

    const docData = docSnap.data();
    const pdfBase64 = docData.pdfBase64 || "";
    const fields = docData.fields || [];
    const values = docData.values || {};

    if (!pdfBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No PDF data in document" }) };
    }

    // Dynamically import pdf-lib
    let PDFDocument, rgb, StandardFonts;
    try {
      const pdfLib = require("pdf-lib");
      PDFDocument = pdfLib.PDFDocument;
      rgb = pdfLib.rgb;
      StandardFonts = pdfLib.StandardFonts;
    } catch {
      // pdf-lib not installed — return original PDF
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pdfBase64, note: "pdf-lib not available, returning original PDF" }),
      };
    }

    // Decode base64 PDF
    const raw = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
    const pdfBytes = Buffer.from(raw, "base64");
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pageObjs = pdfDoc.getPages();

    // Process each field
    for (const field of fields) {
      const fid = field.fieldId || field.id;
      const val = values[fid];
      if (!val) continue;

      const pageIdx = (field.page || 1) - 1;
      if (pageIdx < 0 || pageIdx >= pageObjs.length) continue;
      const page = pageObjs[pageIdx];
      const { width: pw, height: ph } = page.getSize();

      const fx = field.x * pw;
      const fw = (field.width ?? field.w ?? 0.3) * pw;
      const fh = (field.height ?? field.h ?? 0.05) * ph;
      // PDF coordinates: y=0 is bottom, so flip
      const fy = ph - (field.y * ph) - fh;

      if (val.text) {
        // Draw text
        const fontSize = Math.min(14, Math.max(7, fh * 0.6));
        page.drawText(val.text, {
          x: fx + 2,
          y: fy + fh * 0.25,
          size: fontSize,
          font: helvetica,
          color: rgb(0.05, 0.07, 0.09),
          maxWidth: fw - 4,
        });
      } else if (val.data && val.data.startsWith("data:image")) {
        // Draw signature image
        try {
          const imgRaw = val.data.split(",")[1];
          const imgBytes = Buffer.from(imgRaw, "base64");
          let img;
          if (val.data.includes("image/png")) {
            img = await pdfDoc.embedPng(imgBytes);
          } else {
            img = await pdfDoc.embedJpg(imgBytes);
          }
          page.drawImage(img, {
            x: fx,
            y: fy,
            width: fw,
            height: fh,
          });
        } catch (imgErr) {
          console.warn("Failed to embed signature image:", imgErr.message);
        }
      } else if (val.checked) {
        // Draw checkmark
        page.drawText("✓", {
          x: fx + fw * 0.25,
          y: fy + fh * 0.2,
          size: Math.min(16, fh * 0.8),
          font: helvetica,
          color: rgb(0.1, 0.55, 0.35),
        });
      }
    }

    // Save modified PDF
    const modifiedBytes = await pdfDoc.save();
    const modifiedB64 = Buffer.from(modifiedBytes).toString("base64");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pdfBase64: `data:application/pdf;base64,${modifiedB64}`,
      }),
    };
  } catch (e) {
    console.error("flatten-pdf error:", e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to flatten PDF: " + e.message }),
    };
  }
};
