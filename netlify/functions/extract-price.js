/**
 * extract-price.js
 * Netlify Function — Extracts product price from a URL by fetching the page
 * and looking for common price patterns in HTML / meta tags / JSON-LD.
 */

const ALLOWED_ORIGIN = process.env.SITE_URL || 'https://job-dox.ai';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'url is required' }) };
  }

  // Validate URL format
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid URL format' }) };
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ price: null, error: `Page returned ${res.status}` }) };
    }

    const html = await res.text();
    const result = { price: null, title: null, source: parsed.hostname };

    // 1. Try JSON-LD structured data (most reliable)
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const m of jsonLdMatches) {
        const inner = m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        try {
          const ld = JSON.parse(inner);
          const items = Array.isArray(ld) ? ld : [ld];
          for (const item of items) {
            const offer = item.offers || item.Offers;
            if (offer) {
              const o = Array.isArray(offer) ? offer[0] : offer;
              if (o.price) {
                result.price = parseFloat(String(o.price).replace(/[^0-9.]/g, ''));
              }
            }
            if (item.name) result.title = item.name;
          }
        } catch { /* skip malformed JSON-LD */ }
        if (result.price) break;
      }
    }

    // 2. Try Open Graph / meta tags
    if (!result.price) {
      const ogPrice = html.match(/<meta[^>]*property=["'](?:og:price:amount|product:price:amount)["'][^>]*content=["']([^"']+)["']/i);
      if (ogPrice) {
        result.price = parseFloat(ogPrice[1].replace(/[^0-9.]/g, ''));
      }
    }
    if (!result.title) {
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitle) result.title = ogTitle[1];
    }

    // 3. Try common price patterns in HTML
    if (!result.price) {
      // Look for price in data attributes
      const dataPrice = html.match(/data-price=["']([0-9]+\.?[0-9]*)["']/i);
      if (dataPrice) {
        result.price = parseFloat(dataPrice[1]);
      }
    }

    if (!result.price) {
      // Common price class patterns used by major retailers
      const pricePatterns = [
        /class=["'][^"']*(?:price|Price|product-price|priceblock_ourprice|a-price-whole)[^"']*["'][^>]*>\s*\$?\s*([0-9,]+\.?\d*)/i,
        /<span[^>]*>\$\s*([0-9,]+\.\d{2})<\/span>/i,
      ];
      for (const pat of pricePatterns) {
        const m = html.match(pat);
        if (m) {
          result.price = parseFloat(m[1].replace(/,/g, ''));
          break;
        }
      }
    }

    // 4. Fallback: title tag
    if (!result.title) {
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTag) result.title = titleTag[1].trim();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ price: null, error: `Could not fetch page: ${err.message}` }),
    };
  }
};
