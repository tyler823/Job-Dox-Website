/**
 * _firebase.js
 * Shared Firebase Admin initializer for Netlify Functions.
 * Prefixed with _ so Netlify doesn't treat it as a function endpoint.
 *
 * Env var required in Netlify dashboard:
 *   FIREBASE_SERVICE_ACCOUNT = { ...the full service account JSON as a single line }
 *
 * How to get it:
 *   Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 *   Copy the downloaded JSON, minify it to one line, paste as the env var value.
 */

const admin = require("firebase-admin");

let _db = null;

function getDb() {
  if (_db) return _db;

  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set in Netlify.");

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  _db = admin.firestore();
  return _db;
}

/**
 * Verify a Firebase ID token from the Authorization header and return the companyId claim.
 * @param {string} authHeader - The Authorization header value (e.g., "Bearer eyJ...")
 * @returns {Promise<string|null>} The companyId from the token's custom claims, or null
 */
async function verifyAndGetCompanyId(authHeader) {
  try {
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    const idToken = parts[1];
    if (!idToken) return null;

    // Ensure Firebase Admin is initialized
    getDb();

    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.companyId || null;
  } catch {
    return null;
  }
}

/**
 * Deduct a Cortex Coin directly via Firestore (for server-to-server use).
 * Avoids HTTP round-trip and auth requirement of the cortex-coins endpoint.
 * @returns {{ allowed: boolean, message?: string, coinData?: object }}
 */
async function deductCortexCoinDirect(companyId, feature, userId) {
  if (!companyId) return { allowed: true, coinData: null };
  try {
    const db = getDb();
    const CYCLE_DAYS = 28;
    const BASE_ALLOWANCE = 300;
    const ref = db.collection("companies").doc(companyId)
      .collection("billing").doc("cortexCoins");
    const snap = await ref.get();
    const now = new Date();

    let data;
    if (!snap.exists) {
      data = {
        cycleStart: now, cycleEnd: new Date(now.getTime() + CYCLE_DAYS * 86400000),
        baseAllowance: BASE_ALLOWANCE, rolloverCoins: 0, usedThisCycle: 0,
        totalAvailable: BASE_ALLOWANCE, log: [], alertSentAt80: null, createdAt: now, updatedAt: now,
      };
      await ref.set(data);
    } else {
      data = snap.data();
      const cycleEnd = data.cycleEnd?.toDate ? data.cycleEnd.toDate() : new Date(data.cycleEnd);
      if (now >= cycleEnd) {
        const unused = Math.max(0, data.totalAvailable - data.usedThisCycle);
        const currentBase = data.baseAllowance || BASE_ALLOWANCE;
        data = {
          cycleStart: now, cycleEnd: new Date(now.getTime() + CYCLE_DAYS * 86400000),
          baseAllowance: currentBase, rolloverCoins: unused, usedThisCycle: 0,
          totalAvailable: currentBase + unused, log: [], alertSentAt80: null, updatedAt: now,
        };
        await ref.set(data, { merge: true });
      }
    }

    const remaining = data.totalAvailable - data.usedThisCycle;
    if (remaining <= 0) {
      const cycleEnd = data.cycleEnd?.toDate ? data.cycleEnd.toDate() : new Date(data.cycleEnd);
      return { allowed: false, message: `Cortex Coins exhausted. Resets ${cycleEnd.toLocaleDateString()}.` };
    }

    const newUsed = data.usedThisCycle + 1;
    const logEntry = { feature: feature || "unknown", userId: userId || "unknown", timestamp: now.toISOString() };
    await ref.update({ usedThisCycle: newUsed, log: [...(data.log || []).slice(-49), logEntry], updatedAt: now });

    return { allowed: true, coinData: { remaining: data.totalAvailable - newUsed, used: newUsed } };
  } catch (err) {
    console.warn("[deductCortexCoinDirect] failed, allowing:", err.message);
    return { allowed: true, coinData: null };
  }
}

module.exports = { getDb, admin, verifyAndGetCompanyId, deductCortexCoinDirect };
