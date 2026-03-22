/**
 * cortex-coins.js
 * Netlify Function — Cortex Coins AI Usage Tracker
 *
 * Manages per-company AI usage on a 28-day billing cycle.
 * Each company gets 300 Cortex Coins per cycle, with unused coins rolling over.
 *
 * Firestore doc: /companies/{companyId}/billing/cortexCoins
 * {
 *   cycleStart:     Timestamp,   // Start of current 28-day cycle
 *   cycleEnd:       Timestamp,   // End of current 28-day cycle
 *   baseAllowance:  300,         // Coins granted per cycle
 *   rolloverCoins:  number,      // Unused coins carried from previous cycle
 *   usedThisCycle:  number,      // Coins consumed in current cycle
 *   totalAvailable: number,      // baseAllowance + rolloverCoins
 *   log:            array,       // Recent usage log entries
 *   alertSentAt80:  Timestamp|null, // Track if 80% alert already sent this cycle
 * }
 *
 * Actions (via POST body "action"):
 *   "status"   — returns current coin balance and cycle info
 *   "deduct"   — deducts 1 coin (called by AI functions before processing)
 *   "check"    — checks if coins are available (dry run, no deduction)
 *
 * Env vars: FIREBASE_SERVICE_ACCOUNT
 */

const { getDb, verifyAndGetCompanyId } = require("./_firebase");

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://job-dox.ai";
const CYCLE_DAYS = 28;
const BASE_ALLOWANCE = 300;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

function respond(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}

/**
 * Initialize or roll over a billing cycle for a company.
 * Returns the up-to-date cortexCoins document data.
 */
async function ensureCycle(db, companyId) {
  const ref = db.collection("companies").doc(companyId)
    .collection("billing").doc("cortexCoins");

  const snap = await ref.get();
  const now = new Date();

  if (!snap.exists) {
    // First-time setup: create initial cycle
    const cycleStart = now;
    const cycleEnd = new Date(now.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000);
    const data = {
      cycleStart,
      cycleEnd,
      baseAllowance: BASE_ALLOWANCE,
      rolloverCoins: 0,
      usedThisCycle: 0,
      totalAvailable: BASE_ALLOWANCE,
      log: [],
      alertSentAt80: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(data);
    return { ref, data };
  }

  let data = snap.data();

  // Convert Firestore Timestamps to Dates for comparison
  const cycleEnd = data.cycleEnd?.toDate ? data.cycleEnd.toDate() : new Date(data.cycleEnd);

  if (now >= cycleEnd) {
    // Cycle has expired — roll over unused coins and start a new cycle
    const unused = Math.max(0, data.totalAvailable - data.usedThisCycle);
    const newCycleStart = now;
    const newCycleEnd = new Date(now.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000);
    // Preserve the company's current base allowance (300 standard, 1000 premium)
    const currentBase = data.baseAllowance || BASE_ALLOWANCE;

    data = {
      cycleStart: newCycleStart,
      cycleEnd: newCycleEnd,
      baseAllowance: currentBase,
      rolloverCoins: unused,
      usedThisCycle: 0,
      totalAvailable: currentBase + unused,
      log: [], // Clear log for new cycle
      alertSentAt80: null,
      updatedAt: now,
    };
    await ref.set(data, { merge: true });
  }

  return { ref, data };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  // ── Auth verification ──
  const companyId = await verifyAndGetCompanyId(event.headers["authorization"] || event.headers["Authorization"]);
  if (!companyId) {
    return respond(401, { error: "Unauthorized" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  const { action = "status", feature = "", userId = "" } = body;

  try {
    const db = getDb();
    const { ref, data } = await ensureCycle(db, companyId);

    const remaining = data.totalAvailable - data.usedThisCycle;
    const cycleEnd = data.cycleEnd?.toDate ? data.cycleEnd.toDate() : new Date(data.cycleEnd);
    const cycleStart = data.cycleStart?.toDate ? data.cycleStart.toDate() : new Date(data.cycleStart);
    const usagePercent = data.totalAvailable > 0
      ? Math.round((data.usedThisCycle / data.totalAvailable) * 100)
      : 0;

    // ── STATUS: return current balance info ──
    if (action === "status") {
      return respond(200, {
        totalAvailable: data.totalAvailable,
        used: data.usedThisCycle,
        remaining,
        rolloverCoins: data.rolloverCoins,
        baseAllowance: data.baseAllowance,
        usagePercent,
        cycleStart: cycleStart.toISOString(),
        cycleEnd: cycleEnd.toISOString(),
        cycleResetDate: formatDate(cycleEnd),
        alert80: usagePercent >= 80,
        exhausted: remaining <= 0,
      });
    }

    // ── CHECK: dry run — can the company make an AI call? ──
    if (action === "check") {
      if (remaining <= 0) {
        return respond(200, {
          allowed: false,
          remaining: 0,
          cycleResetDate: formatDate(cycleEnd),
          message: `You've used all of your Cortex Coins for this billing cycle. Cycle resets on ${formatDate(cycleEnd)}.`,
        });
      }
      return respond(200, {
        allowed: true,
        remaining,
        usagePercent,
        alert80: usagePercent >= 80,
        cycleResetDate: formatDate(cycleEnd),
      });
    }

    // ── DEDUCT: consume 1 coin ──
    if (action === "deduct") {
      if (remaining <= 0) {
        return respond(403, {
          error: "insufficient_coins",
          message: `You've used all of your Cortex Coins for this billing cycle. Cycle resets on ${formatDate(cycleEnd)}.`,
          cycleResetDate: formatDate(cycleEnd),
          remaining: 0,
        });
      }

      const newUsed = data.usedThisCycle + 1;
      const newRemaining = data.totalAvailable - newUsed;
      const newUsagePercent = Math.round((newUsed / data.totalAvailable) * 100);

      // Build log entry (keep last 50)
      const logEntry = {
        feature: feature || "unknown",
        userId: userId || "unknown",
        timestamp: new Date().toISOString(),
        coinsBefore: remaining,
        coinsAfter: newRemaining,
      };
      const updatedLog = [...(data.log || []).slice(-49), logEntry];

      const update = {
        usedThisCycle: newUsed,
        log: updatedLog,
        updatedAt: new Date(),
      };

      // Mark if we've crossed 80% threshold
      let alert80 = false;
      if (newUsagePercent >= 80 && !data.alertSentAt80) {
        update.alertSentAt80 = new Date();
        alert80 = true;
      } else if (newUsagePercent >= 80) {
        alert80 = true;
      }

      await ref.update(update);

      return respond(200, {
        success: true,
        remaining: newRemaining,
        used: newUsed,
        totalAvailable: data.totalAvailable,
        usagePercent: newUsagePercent,
        alert80,
        cycleResetDate: formatDate(cycleEnd),
        ...(alert80 && {
          alertMessage: `You've used ${newUsagePercent}% of your Cortex Coins for this billing cycle. Cycle resets on ${formatDate(cycleEnd)}.`,
        }),
      });
    }

    return respond(400, { error: `Unknown action: ${action}` });

  } catch (err) {
    console.error("[cortex-coins] error:", err);
    return respond(500, { error: err.message || "Internal error" });
  }
};

/**
 * Format a date as MM/DD/YYYY
 */
function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
