// ── App-local Firebase initialization ──────────────────────────
// Vite/Rollup cannot resolve firebase packages from shared/firebase.js
// (outside the app/ root), so we initialize directly here.
// The config matches shared/firebase.js — keep them in sync.

import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore, addDoc, collection, serverTimestamp,
         onSnapshot, orderBy, query }  from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAFwSEDPqKgAUbwbh_2KZNwLDdGCZEiq3E",
  authDomain:        "cortex-717c6.firebaseapp.com",
  projectId:         "cortex-717c6",
  storageBucket:     "cortex-717c6.firebasestorage.app",
  messagingSenderId: "496631882511",
  appId:             "1:496631882511:web:3f7be61bcbb83a6ab4d47a",
};

const app = initializeApp(FIREBASE_CONFIG);
export const db     = getFirestore(app);
export const fbAuth = getAuth(app);

/**
 * Get the current Firebase user's ID token for authenticating Netlify function calls.
 * Returns the token string or null if no user is signed in.
 */
export async function getFirebaseIdToken() {
  const user = fbAuth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// Save a completed shift record for a project
export const saveShift = (companyId, projectId, shift) =>
  addDoc(
    collection(db, "companies", companyId, "projects", projectId, "shifts"),
    { ...shift, createdAt: serverTimestamp() }
  );

// Listen to all shifts for a project in real time
export const listenShifts = (companyId, projectId, callback) => {
  const q = query(
    collection(db, "companies", companyId, "projects", projectId, "shifts"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  });
};
