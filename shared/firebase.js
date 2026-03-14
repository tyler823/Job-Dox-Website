// ════════════════════════════════════════════════════════════════
//  Job-Dox · shared/firebase.js
//  THE single Firebase file for the entire platform.
//  Every tool imports from here — portal, automations, DryDox, all of them.
//
//  SETUP: Replace FIREBASE_CONFIG values with yours from
//  Firebase Console → Project Settings → Your apps → Config
// ════════════════════════════════════════════════════════════════

import { initializeApp }                           from "firebase/app";
import { getAuth, signInWithEmailAndPassword,
         signOut as fbSignOut, onAuthStateChanged,
         createUserWithEmailAndPassword,
         sendPasswordResetEmail }                  from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc,
         addDoc, updateDoc, deleteDoc,
         collection, query, where, orderBy, limit,
         onSnapshot, serverTimestamp, writeBatch }  from "firebase/firestore";
import { getStorage, ref as storageRef,
         uploadBytes, getDownloadURL,
         deleteObject }                             from "firebase/storage";

// ── YOUR FIREBASE CONFIG ──────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────

const app     = initializeApp(FIREBASE_CONFIG);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════

export const signIn        = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signOut       = ()                => fbSignOut(auth);
export const createUser    = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const resetPassword = (email)           => sendPasswordResetEmail(auth, email);
export const onAuthChange  = (cb)              => onAuthStateChanged(auth, cb);

// ════════════════════════════════════════════════════════════════
//  USER PROFILES
//  /users/{uid}  →  { companyId, name, role, position, email }
// ════════════════════════════════════════════════════════════════

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const saveUserProfile = (uid, data) =>
  setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });

// ════════════════════════════════════════════════════════════════
//  CROSS-TOOL EVENT BUS
//  /companies/{companyId}/events/{eventId}
//
//  This is how tools talk to each other.
//  Any tool calls emitEvent() when something happens.
//  Any tool calls listenEvents() to react to those events.
//  The automations runner uses this to know when to fire.
// ════════════════════════════════════════════════════════════════

/**
 * Emit an event onto the shared bus.
 * @param {string} companyId
 * @param {string} type        - from constants.js EVENT_TYPES
 * @param {string} source      - "portal" | "automations" | "drydox" | etc.
 * @param {string} projectId   - the project this event relates to (if any)
 * @param {object} payload     - any extra data the event carries
 */
export const emitEvent = (companyId, type, source, projectId = null, payload = {}) =>
  addDoc(collection(db, "companies", companyId, "events"), {
    type,
    source,
    projectId,
    payload,
    createdAt: serverTimestamp(),
  });

/**
 * Listen to events for a specific project (real-time).
 * Returns unsubscribe function.
 */
export const listenProjectEvents = (companyId, projectId, callback) => {
  const q = query(
    collection(db, "companies", companyId, "events"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

/**
 * Listen to all company events of a specific type (real-time).
 * Used by the automations runner to watch for triggers.
 */
export const listenEventsByType = (companyId, type, callback) => {
  const q = query(
    collection(db, "companies", companyId, "events"),
    where("type", "==", type),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

// ════════════════════════════════════════════════════════════════
//  PROJECTS
//  /companies/{companyId}/projects/{projectId}
// ════════════════════════════════════════════════════════════════

export const listenProjects = (companyId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const addProject = (companyId, project) =>
  addDoc(collection(db, "companies", companyId, "projects"), {
    ...project,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateProject = (companyId, projectId, data) =>
  updateDoc(doc(db, "companies", companyId, "projects", projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });

// ════════════════════════════════════════════════════════════════
//  DAILY NOTES
//  /companies/{companyId}/projects/{projectId}/dailyNotes/{noteId}
// ════════════════════════════════════════════════════════════════

export const listenDailyNotes = (companyId, projectId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects", projectId, "dailyNotes"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const addDailyNote = (companyId, projectId, note) =>
  addDoc(collection(db, "companies", companyId, "projects", projectId, "dailyNotes"), {
    ...note,
    createdAt: serverTimestamp(),
  });

export const updateDailyNote = (companyId, projectId, noteId, data) =>
  updateDoc(doc(db, "companies", companyId, "projects", projectId, "dailyNotes", noteId), data);

export const deleteDailyNote = (companyId, projectId, noteId) =>
  deleteDoc(doc(db, "companies", companyId, "projects", projectId, "dailyNotes", noteId));

// ════════════════════════════════════════════════════════════════
//  SHIFTS
//  /companies/{companyId}/projects/{projectId}/shifts/{shiftId}
// ════════════════════════════════════════════════════════════════

export const listenShifts = (companyId, projectId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects", projectId, "shifts"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveShift = (companyId, projectId, shift) =>
  addDoc(collection(db, "companies", companyId, "projects", projectId, "shifts"), {
    ...shift,
    createdAt: serverTimestamp(),
  });

// ════════════════════════════════════════════════════════════════
//  ESTIMATES
//  /companies/{companyId}/projects/{projectId}/estimates/{estimateId}
// ════════════════════════════════════════════════════════════════

export const listenEstimates = (companyId, projectId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects", projectId, "estimates"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveEstimate = (companyId, projectId, estimate) => {
  if (estimate.id) {
    return setDoc(
      doc(db, "companies", companyId, "projects", projectId, "estimates", estimate.id),
      { ...estimate, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
  return addDoc(
    collection(db, "companies", companyId, "projects", projectId, "estimates"),
    { ...estimate, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  );
};

// ════════════════════════════════════════════════════════════════
//  DOCUMENTS
//  /companies/{companyId}/projects/{projectId}/documents/{docId}
// ════════════════════════════════════════════════════════════════

export const listenDocuments = (companyId, projectId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects", projectId, "documents"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveDocument = (companyId, projectId, docData) =>
  addDoc(collection(db, "companies", companyId, "projects", projectId, "documents"), {
    ...docData,
    createdAt: serverTimestamp(),
  });

export const deleteDocument = (companyId, projectId, docId) =>
  deleteDoc(doc(db, "companies", companyId, "projects", projectId, "documents", docId));

// ════════════════════════════════════════════════════════════════
//  TASKS
//  /companies/{companyId}/projects/{projectId}/tasks/{taskId}
// ════════════════════════════════════════════════════════════════

export const listenTasks = (companyId, projectId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects", projectId, "tasks"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveTask = (companyId, projectId, task) => {
  if (task.id) {
    return setDoc(
      doc(db, "companies", companyId, "projects", projectId, "tasks", task.id),
      { ...task, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
  return addDoc(
    collection(db, "companies", companyId, "projects", projectId, "tasks"),
    { ...task, createdAt: serverTimestamp() }
  );
};

export const deleteTask = (companyId, projectId, taskId) =>
  deleteDoc(doc(db, "companies", companyId, "projects", projectId, "tasks", taskId));

// ════════════════════════════════════════════════════════════════
//  CONTACTS
//  /companies/{companyId}/projects/{projectId}/contacts/{contactId}
// ════════════════════════════════════════════════════════════════

export const listenContacts = (companyId, projectId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "projects", projectId, "contacts"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveContact = (companyId, projectId, contact) =>
  addDoc(collection(db, "companies", companyId, "projects", projectId, "contacts"), {
    ...contact,
    createdAt: serverTimestamp(),
  });

export const deleteContact = (companyId, projectId, contactId) =>
  deleteDoc(doc(db, "companies", companyId, "projects", projectId, "contacts", contactId));

// ════════════════════════════════════════════════════════════════
//  STAFF  (company-level, not per-project)
//  /companies/{companyId}/staff/{staffId}
// ════════════════════════════════════════════════════════════════

export const listenStaff = (companyId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "staff"), orderBy("name")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveStaffMember = (companyId, member) =>
  addDoc(collection(db, "companies", companyId, "staff"), {
    ...member,
    createdAt: serverTimestamp(),
  });

export const deleteStaffMember = (companyId, memberId) =>
  deleteDoc(doc(db, "companies", companyId, "staff", memberId));

// ════════════════════════════════════════════════════════════════
//  PAYROLL RATES  (company-level)
//  /companies/{companyId}/payrollRates
//  Stores pay rates and billing rates per position.
// ════════════════════════════════════════════════════════════════

export const getPayrollRates = async (companyId) => {
  const snap = await getDoc(doc(db, "companies", companyId, "settings", "payrollRates"));
  return snap.exists() ? snap.data().rates || [] : [];
};

export const savePayrollRates = (companyId, rates) =>
  setDoc(
    doc(db, "companies", companyId, "settings", "payrollRates"),
    { rates, updatedAt: serverTimestamp() },
    { merge: true }
  );

// ════════════════════════════════════════════════════════════════
//  CORTEX COINS — AI Usage Tracking
//  /companies/{companyId}/billing/cortexCoins
//  Managed server-side by netlify/functions/cortex-coins.js
//  These helpers call the Netlify function from the frontend.
// ════════════════════════════════════════════════════════════════

const NETLIFY_FN = "/.netlify/functions";

/**
 * Get current Cortex Coins status for a company.
 * Returns { totalAvailable, used, remaining, usagePercent, cycleResetDate, alert80, exhausted, ... }
 */
export const getCortexCoinsStatus = async (companyId) => {
  const res = await fetch(`${NETLIFY_FN}/cortex-coins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, action: "status" }),
  });
  return res.json();
};

/**
 * Check if a company can make an AI call (dry-run, no deduction).
 * Returns { allowed, remaining, usagePercent, alert80, cycleResetDate, message? }
 */
export const checkCortexCoins = async (companyId) => {
  const res = await fetch(`${NETLIFY_FN}/cortex-coins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, action: "check" }),
  });
  return res.json();
};

// ════════════════════════════════════════════════════════════════
//  AUTOMATIONS
//  /companies/{companyId}/automations/{automationId}
// ════════════════════════════════════════════════════════════════

export const listenAutomations = (companyId, callback) =>
  onSnapshot(
    query(collection(db, "companies", companyId, "automations"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const saveAutomation = (companyId, automation) => {
  if (automation.id) {
    return setDoc(
      doc(db, "companies", companyId, "automations", automation.id),
      { ...automation, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
  return addDoc(
    collection(db, "companies", companyId, "automations"),
    { ...automation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  );
};

export const deleteAutomation = (companyId, automationId) =>
  deleteDoc(doc(db, "companies", companyId, "automations", automationId));

// Automation run log — every time an automation fires, record it
export const logAutomationRun = (companyId, automationId, log) =>
  addDoc(collection(db, "companies", companyId, "automations", automationId, "runs"), {
    ...log,
    createdAt: serverTimestamp(),
  });

// ════════════════════════════════════════════════════════════════
//  PHOTO STORAGE
//  Stores item photos in Firebase Storage, returns download URLs.
//  Path: companies/{companyId}/projects/{projectId}/items/{itemId}/{filename}
// ════════════════════════════════════════════════════════════════

/**
 * Upload a photo (File or Blob) to Firebase Storage.
 * Returns { url, path, name } — url is the public download URL.
 */
export const uploadItemPhoto = async (companyId, projectId, itemId, file, fileName) => {
  const safeName = `${Date.now()}_${(fileName || file.name || "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `companies/${companyId}/projects/${projectId}/items/${itemId}/${safeName}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return { url, path, name: fileName || file.name || safeName };
};

/**
 * Delete a photo from Firebase Storage by its storage path.
 */
export const deleteItemPhoto = async (storagePath) => {
  try {
    await deleteObject(storageRef(storage, storagePath));
  } catch (err) {
    // Ignore "not found" — photo may have been deleted externally
    if (err.code !== "storage/object-not-found") throw err;
  }
};
