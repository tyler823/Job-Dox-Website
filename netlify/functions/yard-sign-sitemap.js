/**
 * yard-sign-sitemap.js
 * Netlify Function — XML Sitemap for all published yard signs
 *
 * Responds to /sitemap-yards.xml
 * Queries all yard_signs where published == true (all companies).
 * Returns valid XML sitemap with <loc>, <lastmod>, <changefreq>, <priority>.
 */

const { getDb } = require("./_firebase");

const SITE_URL = "https://job-dox.ai";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[yard-sign-sitemap] Firebase init error:", e.message);
    return { statusCode: 503, headers, body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>' };
  }

  try {
    const snap = await db.collection("yard_signs")
      .where("published", "==", true)
      .get();

    // Collect unique company slugs for company index pages
    const companySlugs = new Set();
    const urls = [];

    for (const doc of snap.docs) {
      const d = doc.data();
      const companySlug = d.companySlug || "";
      const slug = d.slug || "";
      if (!companySlug || !slug) continue;

      companySlugs.add(companySlug);

      let lastmod = "";
      if (d.completedAt) {
        const dt = d.completedAt.toDate ? d.completedAt.toDate() : new Date(d.completedAt);
        lastmod = dt.toISOString().split("T")[0];
      }

      urls.push(
        `  <url>
    <loc>${SITE_URL}/pros/${escXml(companySlug)}/${escXml(slug)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
      );
    }

    // Add company index pages
    for (const cs of companySlugs) {
      urls.push(
        `  <url>
    <loc>${SITE_URL}/pros/${escXml(cs)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return { statusCode: 200, headers, body: xml };
  } catch (e) {
    console.error("[yard-sign-sitemap] Query error:", e);
    return { statusCode: 500, headers, body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>' };
  }
};

function escXml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
