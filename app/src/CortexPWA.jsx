import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, query, orderBy, limit as fsLimit,
  onSnapshot, addDoc, serverTimestamp, where, Timestamp
} from "firebase/firestore";

/* ══════════════════════════════════════════════════════════════════
   FIREBASE — same config as the portal
══════════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAFwSEDPqKgAUbwbh_2KZNwLDdGCZEiq3E",
  authDomain:        "cortex-717c6.firebaseapp.com",
  projectId:         "cortex-717c6",
  storageBucket:     "cortex-717c6.firebasestorage.app",
  messagingSenderId: "496631882511",
  appId:             "1:496631882511:web:3f7be61bcbb83a6ab4d47a",
};

let _fbApp;
try { _fbApp = initializeApp(FIREBASE_CONFIG, "pwa"); } catch { _fbApp = initializeApp(FIREBASE_CONFIG); }
const db = getFirestore(_fbApp);

/* ══════════════════════════════════════════════════════════════════
   PROJECT TYPES — matches shared/constants.js
══════════════════════════════════════════════════════════════════ */
const PROJECT_TYPES = [
  "Water Damage", "Fire & Smoke", "Mold Remediation", "Storm Damage",
  "Reconstruction", "Contents", "HVAC", "Plumbing", "Electrical", "Demo", "Other",
];

/* ── Work type color lookup (mirrors WT_META in JobDoxPortal.jsx) ── */
const WT_META = {
  "Water Mitigation": "#3b82f6",
  "Fire & Smoke":     "#f97316",
  "Mold Remediation": "#10b981",
  "Storm Damage":     "#8b5cf6",
  "Reconstruction":   "#6b7280",
  "Demo":             "#f43f5e",
  "Contents":         "#ec4899",
  "Water Damage":     "#3b82f6",
  "HVAC":             "#0891b2",
  "Plumbing":         "#3b82f6",
  "Electrical":       "#eab308",
  "Other":            "#6b7280",
};

function getProjectColor(project) {
  const wts = project.worktypes || [];
  if (wts.length > 0) {
    const first = wts[0];
    if (first.color) return first.color;
    return WT_META[first.type] || "var(--acc)";
  }
  const t = project.type || "";
  return WT_META[t] || "var(--acc)";
}

/* ══════════════════════════════════════════════════════════════════
   STATUS BADGE COLORS — matches shared/constants.js
══════════════════════════════════════════════════════════════════ */
const STATUS_COLORS = {
  "new lead":          "#5ba3f5",
  "active":            "#1ad98a",
  "mitigation":        "#e89c18",
  "reconstruction":    "#a78bfa",
  "pending approval":  "#f97316",
  "completed":         "#404866",
  "closed":            "#404866",
  "on hold":           "#e43531",
};

function statusColor(status) {
  if (!status) return "var(--t3)";
  return STATUS_COLORS[status.toLowerCase()] || "var(--t3)";
}

/* ══════════════════════════════════════════════════════════════════
   RELATIVE TIME HELPER
══════════════════════════════════════════════════════════════════ */
function relTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ══════════════════════════════════════════════════════════════════
   ICONS (inline SVGs)
══════════════════════════════════════════════════════════════════ */
const Ic = {
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>,
  cortex: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  feed: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
  chevron: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  close: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  project: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>,
  activity: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  spin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>,
};

/* ══════════════════════════════════════════════════════════════════
   CSS — uses design system variables, no hardcoded colors
══════════════════════════════════════════════════════════════════ */
const PWA_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}
:root{
  --bg:#06070d;--s1:#0c0e18;--s2:#10121e;--s3:#161929;--s4:#1c2035;
  --acc:#e43531;--acc-lo:rgba(228,53,49,.09);--acc-glo:rgba(228,53,49,.28);
  --t1:#eef1f8;--t2:#8b95b0;--t3:#404866;
  --green:#1ad98a;--amber:#e89c18;--blue:#5ba3f5;--purple:#a78bfa;--teal:#22d3ee;
  --br:rgba(255,255,255,.10);--br-hi:rgba(255,255,255,.18);
  --ui:'Outfit',sans-serif;--mono:'Space Mono',monospace;
  --safe-bottom:env(safe-area-inset-bottom,0px);
  --safe-top:env(safe-area-inset-top,0px);
  color-scheme:dark;
}
@keyframes pwa-spin{to{transform:rotate(360deg);}}
@keyframes pwa-fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
@keyframes pwa-pop{from{opacity:0;transform:scale(.95);}to{opacity:1;transform:none;}}
.pwa-shell{display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg);color:var(--t1);font-family:var(--ui);overflow:hidden;}
.pwa-accent-line{height:3px;background:var(--acc);flex-shrink:0;}
.pwa-header{background:var(--s1);border-bottom:1px solid var(--br);padding:0 16px;padding-top:var(--safe-top);display:flex;align-items:center;justify-content:space-between;min-height:52px;flex-shrink:0;}
.pwa-header-title{font-weight:800;font-size:18px;color:var(--t1);letter-spacing:-.01em;}
.pwa-header-bell{background:none;border:none;color:var(--t2);cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;}
.pwa-header-bell:hover{background:var(--s3);}

.pwa-quick-actions{display:flex;gap:0;background:var(--s1);border-bottom:1px solid var(--br);flex-shrink:0;padding:8px 12px 10px;}
.pwa-qa-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;background:none;border:none;cursor:pointer;color:var(--t2);font-family:var(--ui);font-size:9px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:6px 4px;border-radius:10px;transition:all .12s;}
.pwa-qa-btn:active{background:var(--acc-lo);color:var(--acc);}
.pwa-qa-icon{width:40px;height:40px;border-radius:10px;background:var(--s3);border:1px solid var(--br);display:flex;align-items:center;justify-content:center;color:var(--t1);transition:all .12s;}
.pwa-qa-btn:active .pwa-qa-icon{border-color:var(--acc);background:var(--acc-lo);}

.pwa-main{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
.pwa-scroll-pad{padding:16px 14px calc(20px + var(--safe-bottom));}

.pwa-section-label{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px;}

.pwa-feed-item{display:flex;gap:10px;padding:10px 12px;background:var(--s2);border:1px solid var(--br);border-radius:10px;margin-bottom:6px;align-items:flex-start;animation:pwa-fade .2s ease both;}
.pwa-feed-icon{width:28px;height:28px;border-radius:7px;background:var(--s3);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--t2);}
.pwa-feed-msg{flex:1;font-size:12px;color:var(--t2);line-height:1.45;}
.pwa-feed-time{font-family:var(--mono);font-size:9px;color:var(--t3);flex-shrink:0;white-space:nowrap;}

.pwa-proj-card{display:flex;background:var(--s2);border:1px solid var(--br);border-radius:12px;overflow:hidden;margin-bottom:8px;cursor:pointer;transition:border-color .12s;animation:pwa-fade .2s ease both;}
.pwa-proj-card:active{border-color:var(--acc);}
.pwa-proj-accent{width:4px;flex-shrink:0;}
.pwa-proj-body{flex:1;padding:12px 14px;display:flex;align-items:center;gap:10px;}
.pwa-proj-info{flex:1;min-width:0;}
.pwa-proj-name{font-weight:700;font-size:14px;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pwa-proj-sub{font-size:11px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pwa-proj-badge{font-family:var(--mono);font-size:8px;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:6px;white-space:nowrap;font-weight:700;}
.pwa-proj-chevron{color:var(--t3);flex-shrink:0;}

.pwa-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px;text-align:center;}
.pwa-empty-text{font-size:13px;color:var(--t3);}

/* ── Modal ── */
.pwa-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(3px);z-index:300;display:flex;align-items:flex-end;animation:pwa-fade .12s ease both;}
.pwa-modal{background:var(--s2);border-radius:18px 18px 0 0;border-top:1px solid var(--br);width:100%;max-height:90vh;overflow-y:auto;padding:20px 16px;padding-bottom:calc(20px + var(--safe-bottom));animation:pwa-pop .15s ease both;}
.pwa-modal-handle{width:36px;height:4px;background:var(--br-hi);border-radius:2px;margin:0 auto 16px;}
.pwa-modal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.pwa-modal-title{font-size:17px;font-weight:700;color:var(--t1);}
.pwa-modal-close{background:none;border:none;color:var(--t3);cursor:pointer;padding:4px;border-radius:6px;}
.pwa-modal-close:hover{color:var(--t1);background:var(--s3);}

.pwa-field{margin-bottom:14px;}
.pwa-lbl{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:5px;}
.pwa-inp{width:100%;background:var(--s3);border:1px solid var(--br);border-radius:8px;padding:11px 13px;font-size:14px;color:var(--t1);outline:none;font-family:var(--ui);-webkit-appearance:none;}
.pwa-inp:focus{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-lo);}
.pwa-inp::placeholder{color:var(--t3);}
.pwa-sel{width:100%;background:var(--s3);border:1px solid var(--br);border-radius:8px;padding:11px 13px;font-size:14px;color:var(--t1);outline:none;cursor:pointer;font-family:var(--ui);-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23404866'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;}

.pwa-btn{border:none;border-radius:8px;padding:13px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--ui);display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;width:100%;-webkit-tap-highlight-color:transparent;}
.pwa-btn-primary{background:var(--acc);color:#fff;box-shadow:0 0 12px var(--acc-glo);}
.pwa-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.pwa-btn-ghost{background:transparent;border:1px solid var(--br);color:var(--t2);}

/* ── Loading / Auth screens ── */
.pwa-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;height:100dvh;background:var(--bg);gap:16px;}
.pwa-loading-logo{width:52px;height:52px;border-radius:14px;background:var(--acc);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:18px;font-weight:700;color:#fff;box-shadow:0 0 24px var(--acc-glo);}
.pwa-spin{animation:pwa-spin .7s linear infinite;display:inline-block;}

/* ── Detail placeholder ── */
.pwa-detail{display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg);color:var(--t1);font-family:var(--ui);}
.pwa-detail-header{background:var(--s1);border-bottom:1px solid var(--br);padding:0 14px;padding-top:var(--safe-top);display:flex;align-items:center;gap:10px;min-height:52px;flex-shrink:0;}
.pwa-detail-back{background:none;border:none;color:var(--t2);cursor:pointer;display:flex;align-items:center;padding:4px;}
.pwa-detail-title{font-weight:700;font-size:15px;color:var(--t1);}
.pwa-detail-body{flex:1;overflow-y:auto;padding:20px 16px;}

/* ── Auth screen ── */
.pwa-auth{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;background:var(--bg);padding:24px;}
.pwa-auth-card{background:var(--s2);border:1px solid var(--br);border-radius:16px;padding:28px 24px;width:100%;max-width:380px;text-align:center;}
.pwa-auth-title{font-size:20px;font-weight:800;margin-bottom:6px;color:var(--t1);}
.pwa-auth-sub{font-size:13px;color:var(--t2);margin-bottom:20px;line-height:1.5;}
`;

/* ══════════════════════════════════════════════════════════════════
   MAIN PWA COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function CortexPWA() {
  /* ── Auth state ── */
  const [member, setMember]       = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);

  /* ── Data state ── */
  const [projects, setProjects]         = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activity, setActivity]         = useState([]);
  const [activityLoaded, setActivityLoaded] = useState(false);

  /* ── UI state ── */
  const [view, setView]               = useState("portfolio"); // portfolio | detail | myday | cortex
  const [selectedProject, setSelected] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const newsfeedRef = useRef(null);

  /* ══════════════════════════════════════════════════════════════════
     BUG 1 FIX + BUG 2 FIX — Memberstack initialization
     - Polls for $memberstackDom (may not be ready immediately)
     - On login event: explicitly closes the modal, re-inits session
     - Handles null member gracefully (shows login, not infinite spin)
     - Sets loading to false even when Firestore returns empty
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;
    let unsubProjects = null;
    let unsubActivity = null;
    let pollTimer = null;
    let pollCount = 0;
    const MAX_POLLS = 40; // 10 seconds max wait (40 x 250ms)

    function startFirestoreListeners(cid) {
      // ── Stream active projects ──
      const pq = query(
        collection(db, "companies", cid, "projects"),
        orderBy("createdAt", "desc")
      );
      unsubProjects = onSnapshot(pq, (snap) => {
        if (cancelled) return;
        setProjects(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setProjectsLoaded(true); // BUG 1 FIX: always set loaded, even if empty
      }, () => {
        // Firestore error — still resolve loading so we don't spin forever
        if (!cancelled) setProjectsLoaded(true);
      });

      // ── Stream activity feed ──
      const aq = query(
        collection(db, "companies", cid, "activityFeed"),
        orderBy("timestamp", "desc"),
        fsLimit(10)
      );
      unsubActivity = onSnapshot(aq, (snap) => {
        if (cancelled) return;
        setActivity(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setActivityLoaded(true);
      }, () => {
        // Collection may not exist — that's fine, show empty state
        if (!cancelled) setActivityLoaded(true);
      });
    }

    function handleMemberResolved(memberObj) {
      if (cancelled) return;

      if (!memberObj) {
        // BUG 1 FIX: No member — show login UI, not infinite spinner
        setAuthReady(true);
        setMember(null);
        return;
      }

      setMember(memberObj);

      // Resolve companyId from custom fields (same logic as portal)
      let cid = memberObj.customFields?.["company-id"] || null;
      if (!cid) cid = memberObj.id; // owner — their ID is the companyId
      setCompanyId(cid);
      setAuthReady(true);

      // BUG 2 FIX: Explicitly close any open Memberstack modal
      try { window.$memberstackDom?.closeModal?.(); } catch {}

      // Start Firestore listeners
      startFirestoreListeners(cid);
    }

    function pollForMemberstack() {
      pollCount++;

      if (!window.$memberstackDom) {
        if (pollCount >= MAX_POLLS) {
          // Memberstack never loaded — show auth screen, not spinner
          if (!cancelled) {
            setAuthReady(true);
            setAuthError("Unable to connect to authentication service. Please reload.");
          }
          return;
        }
        pollTimer = setTimeout(pollForMemberstack, 250);
        return;
      }

      // Memberstack is available
      window.$memberstackDom.getCurrentMember().then(({ data: m }) => {
        handleMemberResolved(m);
      }).catch(() => {
        if (!cancelled) {
          setAuthReady(true);
          setMember(null);
        }
      });

      // BUG 2 FIX: Listen for auth changes (login/logout)
      // When a user logs in via the modal, this fires and we dismiss the modal
      window.$memberstackDom.onAuthChange?.((memberObj) => {
        if (cancelled) return;
        if (memberObj) {
          // Successful login — close modal and initialize
          try { window.$memberstackDom?.closeModal?.(); } catch {}
          handleMemberResolved(memberObj);
        } else {
          // Logged out
          setMember(null);
          setCompanyId(null);
          setProjects([]);
          setProjectsLoaded(false);
          setActivity([]);
          setActivityLoaded(false);
          if (unsubProjects) { unsubProjects(); unsubProjects = null; }
          if (unsubActivity) { unsubActivity(); unsubActivity = null; }
        }
      });
    }

    pollForMemberstack();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (unsubProjects) unsubProjects();
      if (unsubActivity) unsubActivity();
    };
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     HANDLERS
  ══════════════════════════════════════════════════════════════════ */
  const openLogin = useCallback(() => {
    if (window.$memberstackDom?.openModal) {
      window.$memberstackDom.openModal("LOGIN");
    }
  }, []);

  const openSignup = useCallback(() => {
    if (window.$memberstackDom?.openModal) {
      window.$memberstackDom.openModal("SIGNUP");
    }
  }, []);

  const scrollToFeed = useCallback(() => {
    newsfeedRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     RENDER — Loading screen
  ══════════════════════════════════════════════════════════════════ */
  if (!authReady) {
    return (
      <>
        <style>{PWA_CSS}</style>
        <div className="pwa-loading">
          <div className="pwa-loading-logo">C</div>
          <span className="pwa-spin">{Ic.spin}</span>
          <div style={{ fontSize: 12, color: "var(--t2)" }}>Loading Cortex…</div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — Auth error
  ══════════════════════════════════════════════════════════════════ */
  if (authError) {
    return (
      <>
        <style>{PWA_CSS}</style>
        <div className="pwa-auth">
          <div className="pwa-loading-logo" style={{ marginBottom: 18 }}>C</div>
          <div className="pwa-auth-card">
            <div className="pwa-auth-title">Connection Error</div>
            <div className="pwa-auth-sub">{authError}</div>
            <button className="pwa-btn pwa-btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — Not logged in
  ══════════════════════════════════════════════════════════════════ */
  if (!member) {
    return (
      <>
        <style>{PWA_CSS}</style>
        <div className="pwa-auth">
          <div className="pwa-loading-logo" style={{ marginBottom: 18 }}>C</div>
          <div className="pwa-auth-card">
            <div className="pwa-auth-title">Cortex</div>
            <div className="pwa-auth-sub">Sign in to access your projects and portfolio.</div>
            <button className="pwa-btn pwa-btn-primary" style={{ marginBottom: 10 }} onClick={openLogin}>
              Sign In
            </button>
            <button className="pwa-btn pwa-btn-ghost" onClick={openSignup}>
              Create Account
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — Project Detail placeholder
  ══════════════════════════════════════════════════════════════════ */
  if (view === "detail" && selectedProject) {
    const color = getProjectColor(selectedProject);
    return (
      <>
        <style>{PWA_CSS}</style>
        <div className="pwa-detail">
          <div style={{ height: 3, background: "var(--acc)", flexShrink: 0 }} />
          <div className="pwa-detail-header">
            <button className="pwa-detail-back" onClick={() => { setView("portfolio"); setSelected(null); }}>
              {Ic.back}
            </button>
            <div className="pwa-detail-title">{selectedProject.name || "Project"}</div>
          </div>
          <div className="pwa-detail-body">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 6, height: 40, borderRadius: 3, background: color }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedProject.name}</div>
                <div style={{ fontSize: 12, color: "var(--t2)" }}>{selectedProject.client || selectedProject.clientName || ""}</div>
              </div>
            </div>
            {selectedProject.address && (
              <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 12 }}>{selectedProject.address}</div>
            )}
            {selectedProject.status && (
              <span className="pwa-proj-badge" style={{
                background: `color-mix(in srgb, ${statusColor(selectedProject.status)} 12%, transparent)`,
                color: statusColor(selectedProject.status),
                border: `1px solid color-mix(in srgb, ${statusColor(selectedProject.status)} 25%, transparent)`,
              }}>{selectedProject.status}</span>
            )}
            <div style={{ marginTop: 30, textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
              Full project details are available in the Cortex Portal.
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — Placeholder sub-views (My Day, Cortex)
  ══════════════════════════════════════════════════════════════════ */
  if (view === "myday" || view === "cortex") {
    const title = view === "myday" ? "My Day" : "Cortex";
    return (
      <>
        <style>{PWA_CSS}</style>
        <div className="pwa-detail">
          <div style={{ height: 3, background: "var(--acc)", flexShrink: 0 }} />
          <div className="pwa-detail-header">
            <button className="pwa-detail-back" onClick={() => setView("portfolio")}>{Ic.back}</button>
            <div className="pwa-detail-title">{title}</div>
          </div>
          <div className="pwa-detail-body">
            <div className="pwa-empty">
              <div style={{ opacity: .15 }}>{view === "myday" ? Ic.calendar : Ic.cortex}</div>
              <div className="pwa-empty-text">{title} is coming soon to the mobile experience.</div>
              <button className="pwa-btn pwa-btn-ghost" style={{ width: "auto" }} onClick={() => setView("portfolio")}>
                Back to Portfolio
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — Main Portfolio View
  ══════════════════════════════════════════════════════════════════ */
  const activeProjects = projects.filter((p) => {
    if (p.archived) return false;
    const s = (p.status || "").toLowerCase();
    return s === "active" || s === "new lead" || s === "mitigation" || s === "reconstruction" || s === "pending approval";
  });

  const isLoading = !projectsLoaded || !activityLoaded;

  return (
    <>
      <style>{PWA_CSS}</style>
      <div className="pwa-shell">
        {/* ── Accent line ── */}
        <div className="pwa-accent-line" />

        {/* ── Header ── */}
        <div className="pwa-header">
          <div className="pwa-header-title">Cortex</div>
          <button className="pwa-header-bell">{Ic.bell}</button>
        </div>

        {/* ── Quick Actions ── */}
        <div className="pwa-quick-actions">
          <button className="pwa-qa-btn" onClick={() => setView("myday")}>
            <span className="pwa-qa-icon">{Ic.calendar}</span>
            My Day
          </button>
          <button className="pwa-qa-btn" onClick={() => setView("cortex")}>
            <span className="pwa-qa-icon">{Ic.cortex}</span>
            Cortex
          </button>
          <button className="pwa-qa-btn" onClick={() => setShowCreateModal(true)}>
            <span className="pwa-qa-icon">{Ic.plus}</span>
            New Project
          </button>
          <button className="pwa-qa-btn" onClick={scrollToFeed}>
            <span className="pwa-qa-icon">{Ic.feed}</span>
            Newsfeed
          </button>
        </div>

        {/* ── Main scroll area ── */}
        <div className="pwa-main">
          <div className="pwa-scroll-pad">
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
                <span className="pwa-spin">{Ic.spin}</span>
                <div style={{ fontSize: 12, color: "var(--t2)" }}>Loading projects…</div>
              </div>
            ) : (
              <>
                {/* ── RECENT ACTIVITY ── */}
                <div ref={newsfeedRef}>
                  <div className="pwa-section-label">{Ic.activity} Recent Activity</div>
                  {activity.length === 0 ? (
                    <div style={{ padding: "16px 12px", background: "var(--s2)", border: "1px solid var(--br)", borderRadius: 10, fontSize: 12, color: "var(--t3)", marginBottom: 20 }}>
                      No recent activity
                    </div>
                  ) : (
                    <div style={{ marginBottom: 20 }}>
                      {activity.map((item) => (
                        <div key={item.id} className="pwa-feed-item">
                          <div className="pwa-feed-icon">{Ic.activity}</div>
                          <div className="pwa-feed-msg">{item.message || item.text || "Activity event"}</div>
                          <div className="pwa-feed-time">{relTime(item.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── ACTIVE PROJECTS ── */}
                <div className="pwa-section-label">{Ic.project} Active Projects</div>
                {activeProjects.length === 0 ? (
                  <div className="pwa-empty">
                    <div style={{ opacity: .15 }}>{Ic.project}</div>
                    <div className="pwa-empty-text">No active projects</div>
                    <button className="pwa-btn pwa-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: 13 }} onClick={() => setShowCreateModal(true)}>
                      Create Your First Project
                    </button>
                  </div>
                ) : (
                  activeProjects.map((proj) => {
                    const color = getProjectColor(proj);
                    const sc = statusColor(proj.status);
                    return (
                      <div key={proj.id} className="pwa-proj-card" onClick={() => { setSelected(proj); setView("detail"); }}>
                        <div className="pwa-proj-accent" style={{ background: color }} />
                        <div className="pwa-proj-body">
                          <div className="pwa-proj-info">
                            <div className="pwa-proj-name">{proj.name || "Untitled"}</div>
                            <div className="pwa-proj-sub">{proj.client || proj.clientName || proj.address || ""}</div>
                          </div>
                          {proj.status && (
                            <span className="pwa-proj-badge" style={{
                              background: `color-mix(in srgb, ${sc} 12%, transparent)`,
                              color: sc,
                              border: `1px solid color-mix(in srgb, ${sc} 25%, transparent)`,
                            }}>{proj.status}</span>
                          )}
                          <span className="pwa-proj-chevron">{Ic.chevron}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Create Project Modal ── */}
        {showCreateModal && (
          <CreateProjectModal
            companyId={companyId}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CREATE PROJECT MODAL
   Writes same doc shape as JobDoxPortal.jsx AddProjModal
══════════════════════════════════════════════════════════════════ */
function CreateProjectModal({ companyId, onClose }) {
  const [form, setForm] = useState({
    name: "", clientName: "", address: "", city: "", state: "", zip: "", type: PROJECT_TYPES[0], status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const projNum = `JD-${new Date().getFullYear()}-${String(Date.now()).slice(-3).padStart(3, "0")}`;
      const fullAddress = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");
      await addDoc(collection(db, "companies", companyId, "projects"), {
        projectNumber: projNum,
        name:          form.name.trim(),
        type:          form.type,
        status:        form.status,
        client:        form.clientName.trim(),
        clientName:    form.clientName.trim(),
        address:       fullAddress,
        worktypes:     [{ type: form.type, status: "active", phase: "Initial Response" }],
        budget:        0,
        spent:         0,
        tasks:         0,
        tasksOpen:     0,
        templateTasks: [],
        created:       new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pwa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pwa-modal">
        <div className="pwa-modal-handle" />
        <div className="pwa-modal-hd">
          <div className="pwa-modal-title">New Project</div>
          <button className="pwa-modal-close" onClick={onClose}>{Ic.close}</button>
        </div>

        <div className="pwa-field">
          <label className="pwa-lbl">Project Name *</label>
          <input className="pwa-inp" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Henderson Residence" />
        </div>

        <div className="pwa-field">
          <label className="pwa-lbl">Client Name</label>
          <input className="pwa-inp" value={form.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Client name" />
        </div>

        <div className="pwa-field">
          <label className="pwa-lbl">Address</label>
          <input className="pwa-inp" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main Street" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="pwa-field">
            <label className="pwa-lbl">City</label>
            <input className="pwa-inp" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
          </div>
          <div className="pwa-field">
            <label className="pwa-lbl">State</label>
            <input className="pwa-inp" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="OK" />
          </div>
          <div className="pwa-field">
            <label className="pwa-lbl">ZIP</label>
            <input className="pwa-inp" value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="73008" />
          </div>
        </div>

        <div className="pwa-field">
          <label className="pwa-lbl">Work Type</label>
          <select className="pwa-sel" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="pwa-field">
          <label className="pwa-lbl">Status</label>
          <select className="pwa-sel" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="Active">Active</option>
            <option value="New Lead">New Lead</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", background: "var(--acc-lo)", border: "1px solid rgba(228,53,49,.25)", borderRadius: 8, fontSize: 11, color: "var(--acc)", marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button className="pwa-btn pwa-btn-primary" disabled={saving} onClick={submit}>
          {saving ? <><span className="pwa-spin">{Ic.spin}</span> Creating…</> : "Create Project"}
        </button>
      </div>
    </div>
  );
}
