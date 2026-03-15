/**
 * yard-sign.js
 * Netlify Function — Public Yard Sign Pages (SEO)
 *
 * Handles two routes via /pros/* wildcard:
 *   /pros/{companySlug}           → Company index page (all published signs)
 *   /pros/{companySlug}/{jobSlug} → Individual yard sign page
 *
 * Returns fully server-rendered HTML with JSON-LD Schema markup.
 * No React, no client JS required — pure HTML for instant Google indexing.
 */

const { getDb } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";
const SITE_URL = "https://job-dox.ai";

const COLORS = {
  bg: "#06070d",
  s2: "#10121e",
  acc: "#e43531",
  t1: "#eef1f8",
  t2: "#8b95b0",
  br: "rgba(255,255,255,0.10)",
};

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">';

function escHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlShell(title, description, canonicalUrl, bodyContent, extraHead = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  ${FONT_LINK}
  ${extraHead}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Outfit', sans-serif; background: ${COLORS.bg}; color: ${COLORS.t1}; min-height: 100vh; display: flex; flex-direction: column; }
    a { color: ${COLORS.t1}; text-decoration: none; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 0 20px; width: 100%; }
    .header { padding: 24px 0; border-bottom: 1px solid ${COLORS.br}; }
    .header-inner { display: flex; align-items: center; gap: 10px; }
    .logo-text { font-size: 18px; font-weight: 700; color: ${COLORS.t1}; letter-spacing: -0.5px; }
    .logo-accent { color: ${COLORS.acc}; }
    .main { flex: 1; padding: 48px 0; }
    .footer { padding: 24px 0; border-top: 1px solid ${COLORS.br}; text-align: center; font-size: 13px; color: ${COLORS.t2}; }
    .card { background: ${COLORS.s2}; border: 1px solid ${COLORS.br}; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .h1 { font-size: 28px; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: ${COLORS.t2}; margin-bottom: 24px; }
    .desc { font-size: 15px; line-height: 1.7; color: ${COLORS.t2}; margin-bottom: 24px; }
    .date { font-size: 12px; color: ${COLORS.t2}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
    .cta { display: inline-block; background: ${COLORS.acc}; color: #fff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; transition: opacity 0.2s; }
    .cta:hover { opacity: 0.85; }
    .badge { display: inline-block; background: rgba(228,53,49,0.12); color: ${COLORS.acc}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
    .sign-list { list-style: none; }
    .sign-item { display: block; padding: 16px; border: 1px solid ${COLORS.br}; border-radius: 8px; margin-bottom: 8px; background: ${COLORS.s2}; transition: border-color 0.2s; }
    .sign-item:hover { border-color: ${COLORS.acc}; }
    .sign-wt { font-size: 12px; font-weight: 700; color: ${COLORS.acc}; text-transform: uppercase; letter-spacing: 0.5px; }
    .sign-loc { font-size: 14px; font-weight: 600; color: ${COLORS.t1}; margin-top: 4px; }
    .section-hd { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="wrap">
      <div class="header-inner">
        <span class="logo-text">Job<span class="logo-accent">-</span>Dox</span>
      </div>
    </div>
  </header>
  <main class="main">
    <div class="wrap">
      ${bodyContent}
    </div>
  </main>
  <footer class="footer">
    <div class="wrap">Powered by Job-Dox &middot; <a href="${SITE_URL}" style="color:${COLORS.acc};">job-dox.ai</a></div>
  </footer>
</body>
</html>`;
}

function notFoundPage() {
  return htmlShell(
    "Page Not Found | Job-Dox",
    "The requested page could not be found.",
    SITE_URL,
    `<div class="card" style="text-align:center;">
      <div class="h1">Page Not Found</div>
      <p class="desc">This yard sign page doesn't exist or has been unpublished.</p>
      <a href="${SITE_URL}" class="cta">Go to Job-Dox</a>
    </div>`
  );
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // ── Parse URL path ──
  const path = event.path.replace(/^\/pros\/?/, "");
  const parts = path.split("/").filter(Boolean);
  const companySlug = parts[0] || "";
  const jobSlug = parts[1] || "";

  if (!companySlug) {
    return { statusCode: 404, headers, body: notFoundPage() };
  }

  let db;
  try {
    db = getDb();
  } catch (e) {
    console.error("[yard-sign] Firebase init error:", e.message);
    return { statusCode: 503, headers, body: notFoundPage() };
  }

  // ══════════════════════════════════════════════════════════════
  // INDIVIDUAL YARD SIGN PAGE
  // ══════════════════════════════════════════════════════════════
  if (jobSlug) {
    try {
      const snap = await db.collection("yard_signs")
        .where("companySlug", "==", companySlug)
        .where("slug", "==", jobSlug)
        .where("published", "==", true)
        .limit(1)
        .get();

      if (snap.empty) {
        return { statusCode: 404, headers, body: notFoundPage() };
      }

      const ys = snap.docs[0].data();
      const workType = (ys.workTypes || [])[0] || "Restoration";
      const neighborhood = ys.neighborhood || ys.city || "";
      const city = ys.city || "";
      const stateAbbr = ys.stateAbbr || "";
      const state = ys.state || stateAbbr;
      const zipCode = ys.zipCode || "";
      const companyName = ys.companyName || "";
      const completedAt = ys.completedAt;
      let dateStr = "";
      let isoDate = "";
      if (completedAt) {
        const d = completedAt.toDate ? completedAt.toDate() : new Date(completedAt);
        dateStr = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        isoDate = d.toISOString();
      }

      const title = `${workType} Restoration \u2014 ${neighborhood}, ${city} ${stateAbbr} | ${companyName}`;
      const description = `${companyName} completed ${workType.toLowerCase()} restoration in ${neighborhood}, ${city} ${stateAbbr}. Professional restoration services serving ${city} and surrounding communities.`;
      const canonicalUrl = `${SITE_URL}/pros/${escHtml(companySlug)}/${escHtml(jobSlug)}`;

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: `${workType} Restoration`,
        provider: {
          "@type": "LocalBusiness",
          name: companyName,
          url: `${SITE_URL}/pros/${companySlug}`,
        },
        areaServed: {
          "@type": "Place",
          name: `${neighborhood}, ${city}, ${state}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: city,
            addressRegion: stateAbbr,
            postalCode: zipCode,
            addressCountry: "US",
          },
        },
        datePublished: isoDate,
      });

      const extraHead = `<script type="application/ld+json">${jsonLd}</script>`;

      const bodyContent = `
      <div class="card">
        <div class="badge">${escHtml(workType)}</div>
        <h1 class="h1">${escHtml(companyName)}</h1>
        <div class="subtitle">${escHtml(workType)} Restoration &middot; ${escHtml(neighborhood)}, ${escHtml(city)}, ${escHtml(state)}</div>
        <p class="desc">${escHtml(companyName)} completed ${escHtml(workType.toLowerCase())} restoration services in the ${escHtml(neighborhood)} area of ${escHtml(city)}, ${escHtml(state)}. Certified restoration professionals serving ${escHtml(city)} and surrounding communities.</p>
        ${dateStr ? `<div class="date">${escHtml(dateStr)}</div>` : ""}
        <a href="${SITE_URL}" class="cta">Get Help Now</a>
      </div>`;

      return { statusCode: 200, headers, body: htmlShell(title, description, canonicalUrl, bodyContent, extraHead) };
    } catch (e) {
      console.error("[yard-sign] Individual page error:", e);
      return { statusCode: 500, headers, body: notFoundPage() };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // COMPANY INDEX PAGE — all published yard signs for this company
  // ══════════════════════════════════════════════════════════════
  try {
    const snap = await db.collection("yard_signs")
      .where("companySlug", "==", companySlug)
      .where("published", "==", true)
      .get();

    if (snap.empty) {
      return { statusCode: 404, headers, body: notFoundPage() };
    }

    const signs = snap.docs.map(d => d.data());
    const companyName = signs[0].companyName || companySlug;
    const cities = [...new Set(signs.map(s => s.city).filter(Boolean))];
    const citySummary = cities.length > 3
      ? `${cities.slice(0, 3).join(", ")} and ${cities.length - 3} more`
      : cities.join(", ");

    // Group signs by work type
    const byWorkType = {};
    for (const s of signs) {
      const wt = (s.workTypes || [])[0] || "Restoration";
      if (!byWorkType[wt]) byWorkType[wt] = [];
      byWorkType[wt].push(s);
    }

    const title = `${companyName} \u2014 Restoration Services | Job-Dox`;
    const description = `${companyName} provides professional restoration services. Serving ${citySummary} and surrounding areas.`;
    const canonicalUrl = `${SITE_URL}/pros/${escHtml(companySlug)}`;

    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: companyName,
      url: canonicalUrl,
      areaServed: cities.map(c => ({ "@type": "Place", name: c })),
    });

    const extraHead = `<script type="application/ld+json">${jsonLd}</script>`;

    let listHtml = "";
    for (const [wt, items] of Object.entries(byWorkType)) {
      listHtml += `<div class="section-hd" style="margin-top:24px;">${escHtml(wt)}</div>
      <ul class="sign-list">`;
      for (const s of items) {
        const loc = [s.neighborhood || s.city, s.city, s.stateAbbr].filter(Boolean).join(", ");
        const href = `${SITE_URL}/pros/${escHtml(companySlug)}/${escHtml(s.slug)}`;
        listHtml += `<li><a href="${href}" class="sign-item">
          <div class="sign-wt">${escHtml(wt)}</div>
          <div class="sign-loc">${escHtml(loc)}</div>
        </a></li>`;
      }
      listHtml += `</ul>`;
    }

    const bodyContent = `
    <div class="card">
      <h1 class="h1">${escHtml(companyName)}</h1>
      <div class="subtitle">Serving ${escHtml(citySummary)} and surrounding areas</div>
      <div class="desc">${signs.length} completed restoration project${signs.length !== 1 ? "s" : ""} across ${cities.length} ${cities.length !== 1 ? "cities" : "city"}.</div>
    </div>
    ${listHtml}`;

    return { statusCode: 200, headers, body: htmlShell(title, description, canonicalUrl, bodyContent, extraHead) };
  } catch (e) {
    console.error("[yard-sign] Company index error:", e);
    return { statusCode: 500, headers, body: notFoundPage() };
  }
};
