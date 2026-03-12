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

module.exports = { getDb, admin };
