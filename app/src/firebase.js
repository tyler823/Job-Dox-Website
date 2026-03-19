// ── App-local Firebase initialization ──────────────────────────
// Vite/Rollup cannot resolve firebase packages from shared/firebase.js
// (outside the app/ root), so we initialize directly here.
// The config matches shared/firebase.js — keep them in sync.

import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";

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
