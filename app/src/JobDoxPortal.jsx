import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DocumentsTab, LogoUploadSection, DocumentTemplateCenter } from "./JobDoxDocuments.jsx";
import { FinancialTab, FinancialHealthBadge, FinancialDashboard } from "./JobDoxFinance.jsx";
import ContentsDox from "./ContentsDox.jsx";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
         doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, where } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAFwSEDPqKgAUbwbh_2KZNwLDdGCZEiq3E",
  authDomain:        "cortex-717c6.firebaseapp.com",
  projectId:         "cortex-717c6",
  storageBucket:     "cortex-717c6.firebasestorage.app",
  messagingSenderId: "496631882511",
  appId:             "1:496631882511:web:3f7be61bcbb83a6ab4d47a",
};
const _fbApp = initializeApp(FIREBASE_CONFIG);
const db     = getFirestore(_fbApp);

/* ── Netlify function caller — mirrors the Firebase httpsCallable API ── */
const NETLIFY = "/.netlify/functions";
async function callFn(name, data) {
  const res = await fetch(`${NETLIFY}/${name}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `${name} failed (${res.status})`);
  return json;
}
const sendSMS           = data => callFn("send-sms",            data);
const initiateCall      = data => callFn("initiate-call",       data);
const savePhoneSettings = data => callFn("save-phone-settings", data);

/* ── Google Maps key — restrict this to your domain in Google Cloud Console ── */
const GMAPS_KEY = "AIzaSyB63wo4pFCRReosTWPlkZ6eETg7zdPaQpM"; // ← replace with real key

/* ══════════════════════════════════════════════════════════════════
   MEMBERSTACK CONFIG
══════════════════════════════════════════════════════════════════ */
const MS_APP_ID   = "app_cmmm8x9fr00dg0utoabyje7x9";
const MS_PLAN_ID  = "pln_cortex-by-job-dox-w6l0yeo";
const MS_PRICE_ID = "prc_cortex-by-job-dox-41m0yuk";
const MS_TRIAL_DAYS = 7;


/* ══════════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;}
::-webkit-scrollbar{width:4px;background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.18);border-radius:2px;}
@keyframes jd-fade{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
@keyframes jd-slide{from{opacity:0;transform:translateX(-10px);}to{opacity:1;transform:none;}}
@keyframes jd-ping{0%{transform:scale(1);opacity:.8;}100%{transform:scale(2);opacity:0;}}
@keyframes jd-pop{from{opacity:0;transform:scale(.96) translateY(4px);}to{opacity:1;transform:none;}}

.feed-popup{position:fixed;z-index:600;background:var(--s2);border:1px solid var(--br-hi);border-radius:13px;width:290px;box-shadow:0 12px 40px rgba(0,0,0,.45);animation:jd-pop .15s ease both;overflow:hidden;}
.feed-popup-hd{padding:13px 15px 10px;border-bottom:1px solid var(--br);}
.feed-action-btn{width:100%;background:transparent;border:none;padding:10px 15px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:var(--ui);font-size:12px;color:var(--t1);text-align:left;transition:background .1s;border-bottom:1px solid var(--br);}
.feed-action-btn:last-child{border-bottom:none;}
.feed-action-btn:hover{background:var(--s3);}
.feed-action-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

.myday-page{flex:1;display:flex;overflow:hidden;}
.myday-left{width:280px;flex-shrink:0;border-right:1px solid var(--br);background:var(--s1);display:flex;flex-direction:column;padding:16px;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:8px;}
.cal-day{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;transition:all .12s;border:none;background:transparent;color:var(--t2);font-family:var(--ui);}
.cal-day:hover{background:var(--s3);color:var(--t1);}
.cal-day.today{background:var(--acc-lo);color:var(--acc);font-weight:700;box-shadow:0 0 0 1px rgba(228,53,49,.25);}
.cal-day.sel{background:var(--acc);color:#fff;font-weight:700;box-shadow:0 0 8px var(--acc-glo);}
.cal-day.other{opacity:.3;}
.cal-day.has-tasks::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--amber);}
.cal-day{position:relative;}
.cal-hdr{font-size:9px;color:var(--t3);text-align:center;padding:3px 0;font-family:var(--mono);}
.myday-main{flex:1;overflow-y:auto;padding:20px;}
.time-slot{display:flex;gap:12px;margin-bottom:4px;min-height:60px;position:relative;}
.time-label{width:48px;flex-shrink:0;font-family:var(--mono);font-size:9px;color:var(--t3);padding-top:6px;text-align:right;}
.time-line{width:1px;background:var(--br);flex-shrink:0;position:relative;}
.time-line::before{content:'';position:absolute;top:6px;left:-3px;width:7px;height:7px;border-radius:50%;background:var(--br);}
.time-line.has-appt::before{background:var(--blue);}
.appt-block{flex:1;background:var(--s2);border:1px solid var(--br);border-left:3px solid var(--blue);border-radius:7px;padding:8px 11px;cursor:pointer;transition:all .12s;}
.appt-block:hover{border-color:var(--blue);box-shadow:0 3px 12px rgba(91,163,245,.15);}
.appt-block.done-appt{opacity:.55;border-left-color:var(--t3);}
.now-line{position:absolute;left:0;right:0;height:2px;background:var(--acc);z-index:2;}
.now-line::before{content:'';position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--acc);}
.checklist-item{display:flex;gap:9px;padding:9px 12px;border-bottom:1px solid var(--br);align-items:flex-start;cursor:default;}
.checklist-item:hover{background:var(--s2);}
.chk{width:16px;height:16px;border-radius:4px;border:2px solid var(--br);flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s;}
.chk.done{background:var(--green);border-color:var(--green);}

.jdp{--bg:#06070d;--rail:#08090f;--s1:#0c0e18;--s2:#10121e;--s3:#161929;--s4:#1c2035;--acc:#e43531;--acc-lo:rgba(228,53,49,.09);--acc-glo:rgba(228,53,49,.28);--t1:#eef1f8;--t2:#8b95b0;--t3:#404866;--green:#1ad98a;--amber:#e89c18;--blue:#5ba3f5;--purple:#a78bfa;--teal:#22d3ee;--br:rgba(255,255,255,.10);--br-hi:rgba(255,255,255,.18);--ui:'Outfit',sans-serif;--mono:'Space Mono',monospace;color-scheme:dark;}
body.jd-light-mode .jdp,.jdp.lt{--bg:#e8ebf2;--rail:#dde1ed;--s1:#f2f4f8;--s2:#fff;--s3:#e8eaf2;--s4:#dde0ed;--acc:#e43531;--acc-lo:rgba(228,53,49,.08);--acc-glo:rgba(228,53,49,.20);--t1:#0d1117;--t2:#374151;--t3:#6b7280;--green:#059669;--amber:#b45309;--blue:#1d60c8;--purple:#6d28d9;--teal:#0e7490;--br:rgba(0,0,0,.14);--br-hi:rgba(0,0,0,.24);color-scheme:light;}

.jdp{display:flex;height:100vh;overflow:hidden;background:var(--bg);color:var(--t1);font-family:var(--ui);}
.jdp-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}

.rail{width:56px;background:var(--rail);border-right:1px solid var(--br);display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:2px;flex-shrink:0;z-index:200;}
.rail-logo{width:36px;height:36px;border-radius:9px;background:var(--acc);display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-family:var(--mono)!important;font-size:14px;font-weight:700;color:#fff;box-shadow:0 0 16px var(--acc-glo);cursor:pointer;user-select:none;}
.rail-btn{width:44px;height:44px;border:none;border-radius:10px;cursor:pointer;background:transparent;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:all .15s;position:relative;flex-shrink:0;}
.rail-btn:hover{background:var(--br-hi);color:var(--t1);}
.rail-btn.active{background:var(--acc-lo);color:var(--acc);box-shadow:0 0 0 1px rgba(228,53,49,.2);}
.rail-btn.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;background:var(--acc);border-radius:0 2px 2px 0;}
.rail-btn[data-tip]:hover::after{content:attr(data-tip);position:absolute;left:54px;top:50%;transform:translateY(-50%);background:var(--s4);color:var(--t1);font-size:11px;font-weight:500;white-space:nowrap;padding:5px 11px;border-radius:7px;border:1px solid var(--br);pointer-events:none;z-index:999;box-shadow:0 4px 16px rgba(0,0,0,.25);}
.rail-div{width:28px;height:1px;background:var(--br);margin:4px 0;flex-shrink:0;}
.rail-lbl{font-family:var(--mono)!important;font-size:7px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;}
.rail-sp{flex:1;}

.topbar{background:var(--s1);border-bottom:1px solid var(--br);padding:0 18px;display:flex;align-items:center;justify-content:space-between;height:54px;flex-shrink:0;gap:10px;}
.topbar-ttl{font-weight:700;font-size:15px;color:var(--t1);}
.topbar-sub{font-size:9px;color:var(--t3);font-family:var(--mono)!important;margin-top:1px;letter-spacing:.05em;}

.btn{border:none;border-radius:6px;padding:7px 14px;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--ui);display:inline-flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap;}
.btn-primary{background:var(--acc);color:#fff;box-shadow:0 0 10px var(--acc-glo);}
.btn-primary:hover{filter:brightness(1.1);}
.btn-secondary{background:var(--s3);border:1px solid var(--br);color:var(--t1);}
.btn-secondary:hover{background:var(--s4);}
.btn-ghost{background:transparent;border:1px solid var(--br);color:var(--t2);}
.btn-ghost:hover{background:var(--s3);color:var(--t1);}
.btn-danger{background:var(--acc-lo);border:1px solid rgba(228,53,49,.25);color:var(--acc);}
.btn-green{background:rgba(26,217,138,.1);border:1px solid rgba(26,217,138,.25);color:var(--green);}
.btn-green:hover{background:rgba(26,217,138,.2);}
.btn-blue{background:rgba(91,163,245,.1);border:1px solid rgba(91,163,245,.25);color:var(--blue);}
.btn-blue:hover{background:rgba(91,163,245,.2);}
.btn-amber{background:rgba(232,156,24,.1);border:1px solid rgba(232,156,24,.25);color:var(--amber);}
.btn-lg{padding:9px 20px;font-size:12px;}
.btn-xs{padding:3px 8px;font-size:10px;}

.card{background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:16px;}

.kpi-bar{display:flex;background:var(--s1);border-bottom:1px solid var(--br);flex-shrink:0;}
.kpi{flex:1;padding:10px 16px;border-right:1px solid var(--br);}
.kpi:last-child{border-right:none;}
.kpi-val{font-family:var(--mono)!important;font-size:18px;font-weight:700;margin-bottom:2px;}
.kpi-lbl{font-size:9px;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;}

.tabs{background:var(--s1);border-bottom:1px solid var(--br);padding:0 18px;display:flex;flex-shrink:0;overflow-x:auto;}
.tab{background:none;border:none;font-family:var(--ui);font-size:12px;padding:12px 12px;cursor:pointer;border-bottom:2px solid transparent;color:var(--t2);white-space:nowrap;display:flex;align-items:center;gap:5px;transition:all .12s;}
.tab.active{color:var(--t1);font-weight:700;border-bottom-color:var(--acc);}

.overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;animation:jd-fade .15s ease;}
.modal{background:var(--s2);border:1px solid var(--br);border-radius:14px;width:100%;max-width:640px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;}
.modal-lg{max-width:820px;}
.modal-sm{max-width:460px;}
.modal-hd{padding:15px 20px;border-bottom:1px solid var(--br);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.modal-ttl{font-size:14px;font-weight:700;color:var(--t1);}
.modal-body{padding:18px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;flex:1;}
.modal-ft{padding:12px 20px;border-top:1px solid var(--br);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;}

.lbl{font-family:var(--mono)!important;font-size:9px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:4px;}
.inp{width:100%;background:var(--s3);border:1px solid var(--br);border-radius:7px;padding:8px 11px;font-size:12px;color:var(--t1);outline:none;font-family:var(--ui);}
.inp:focus{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-lo);}
.inp::placeholder{color:var(--t3);}
.sel{width:100%;background:var(--s3);border:1px solid var(--br);border-radius:7px;padding:8px 11px;font-size:12px;color:var(--t1);outline:none;cursor:pointer;font-family:var(--ui);}
.txa{width:100%;background:var(--s3);border:1px solid var(--br);border-radius:7px;padding:8px 11px;font-size:12px;color:var(--t1);outline:none;resize:vertical;min-height:65px;font-family:var(--ui);}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;}

.chip{border-radius:20px;padding:3px 10px;font-size:10px;cursor:pointer;border:1px solid var(--br);background:transparent;color:var(--t3);transition:all .12s;font-family:var(--ui);}
.chip.on{border-color:var(--acc);color:var(--t1);background:var(--acc-lo);}
.badge{display:inline-flex;align-items:center;gap:4px;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600;}
.dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

.port-body{flex:1;display:flex;overflow:hidden;}
.port-projects{flex:1;overflow-y:auto;padding:16px;}
.port-sidebar{width:295px;flex-shrink:0;border-left:1px solid var(--br);overflow:hidden;display:flex;flex-direction:column;background:var(--s1);}
.port-sidebar-hd{padding:12px 14px 6px;font-family:var(--mono)!important;font-size:9px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;}

.proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:11px;}
.proj-card{background:var(--s2);border:1px solid var(--br);border-radius:12px;overflow:hidden;transition:all .18s;display:flex;flex-direction:column;}
.proj-card:hover{border-color:var(--br-hi);box-shadow:0 6px 24px rgba(0,0,0,.14);}
.proj-accent{height:4px;}
.proj-body{padding:12px 14px;flex:1;cursor:pointer;}
.proj-actions{padding:0;border-top:1px solid var(--br);display:grid;grid-template-columns:1fr 1fr 1fr 1fr;background:var(--s3);}
.proj-actions .pab{display:flex;align-items:center;justify-content:center;gap:4px;padding:9px 4px;font-size:10px;font-weight:600;font-family:var(--ui);color:var(--t2);background:transparent;border:none;cursor:pointer;transition:background .12s,color .12s;white-space:nowrap;overflow:hidden;border-right:1px solid var(--br);}
.proj-actions .pab:last-child{border-right:none;}
.proj-actions .pab:hover{background:var(--s4);color:var(--t1);}
.proj-actions .pab.pab-green{color:var(--green);}
.proj-actions .pab.pab-green:hover{background:rgba(26,217,138,.08);}
.proj-actions .pab.pab-blue{color:var(--blue);}
.proj-actions .pab.pab-blue:hover{background:rgba(91,163,245,.08);}
.proj-actions .pab.pab-amber{color:var(--amber);}
.proj-actions .pab.pab-amber:hover{background:rgba(232,156,24,.08);}
.proj-actions .pab.pab-danger{color:var(--acc);}
.proj-actions .pab.pab-danger:hover{background:rgba(228,53,49,.08);}

.bar-track{height:5px;background:var(--s4);border-radius:3px;overflow:hidden;margin-top:3px;}
.bar-fill{height:100%;border-radius:3px;transition:width .4s;}

.feed-row{display:flex;gap:9px;padding:8px 13px;border-bottom:1px solid var(--br);cursor:default;}
.feed-row:hover{background:rgba(255,255,255,.02);}

.myday-row{display:flex;gap:8px;padding:7px 13px;border-bottom:1px solid var(--br);align-items:flex-start;}
.day-chk{width:15px;height:15px;border-radius:4px;border:2px solid var(--br);flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s;}
.day-chk.done{background:var(--green);border-color:var(--green);}

.staff-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--br);border-radius:8px;margin-bottom:5px;background:var(--s2);}

.scroll{flex:1;overflow-y:auto;padding:18px;}
.back-btn{display:flex;align-items:center;gap:5px;cursor:pointer;color:var(--t2);font-size:12px;background:none;border:none;transition:color .12s;}
.back-btn:hover{color:var(--t1);}
.sec{font-family:var(--mono)!important;font-size:9px;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:9px;}
.mono{font-family:var(--mono)!important;}
.row{background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:10px 13px;margin-bottom:5px;transition:border-color .12s;}
.row:hover{border-color:var(--br-hi);}
.task-chk{width:17px;height:17px;border-radius:4px;border:2px solid var(--br);flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s;}
.task-chk.done{background:var(--green);border-color:var(--green);}
.scope-row{display:grid;grid-template-columns:1fr 62px 70px 80px 26px;gap:6px;align-items:center;padding:5px 9px;background:var(--s2);border:1px solid var(--br);border-radius:7px;margin-bottom:3px;}
.msg-row{display:flex;gap:9px;padding:10px 0;border-bottom:1px solid var(--br);}
.folder-card{background:var(--s3);border:1px solid var(--br);border-radius:8px;padding:12px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:9px;}
.folder-card:hover{background:var(--s4);border-color:var(--br-hi);}
.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:7px;}
.media-thumb{border-radius:7px;overflow:hidden;border:1px solid var(--br);aspect-ratio:1;background:var(--s3);cursor:pointer;}
.contact-card{background:var(--s2);border:1px solid var(--br);border-radius:9px;padding:13px;display:flex;gap:10px;}
.sms-bubble{background:#1a8c4e;border-radius:14px 14px 4px 14px;padding:9px 13px;font-size:11px;color:#fff;line-height:1.5;max-width:260px;}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:44px;text-align:center;}
.anim{animation:jd-fade .2s ease both;}
.anim-slide{animation:jd-slide .18s ease both;}

.search{display:flex;align-items:center;gap:7px;background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:0 11px;height:33px;}
.search input{background:transparent;border:none;outline:none;color:var(--t1);font-size:12px;width:100%;}
.search input::placeholder{color:var(--t3);}

.tools-panel{position:fixed;top:0;left:56px;width:268px;height:100vh;background:var(--s2);border-right:1px solid var(--br);z-index:300;display:flex;flex-direction:column;box-shadow:6px 0 28px rgba(0,0,0,.28);animation:jd-slide .16s ease;}
.tool-item{width:100%;background:transparent;border:1px solid var(--br);border-radius:9px;padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;margin-bottom:5px;text-align:left;transition:all .12s;font-family:var(--ui);}
.tool-item:hover{background:var(--s3);border-color:var(--br-hi);}

.wt-pill{display:inline-flex;align-items:center;gap:5px;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700;border:1px solid;flex-shrink:0;}
.wt-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

.rail-btn.clocked-in{background:rgba(26,217,138,.12);color:var(--green);box-shadow:0 0 0 1px rgba(26,217,138,.25);}
.rail-btn.clocked-in::after{content:'';position:absolute;top:7px;right:7px;width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);}
.clocked-banner{background:rgba(26,217,138,.12);border-top:1px solid rgba(26,217,138,.25);padding:5px 11px;display:flex;align-items:center;gap:6px;font-size:10px;color:var(--green);font-weight:700;}

.proj-list{display:flex;flex-direction:column;gap:5px;}
.proj-list-row{background:var(--s2);border:1px solid var(--br);border-radius:10px;display:flex;align-items:center;overflow:hidden;transition:all .15s;}
.proj-list-row:hover{border-color:var(--br-hi);box-shadow:0 3px 12px rgba(0,0,0,.12);}
.proj-list-accent{width:4px;align-self:stretch;flex-shrink:0;}
.proj-list-body{flex:1;display:flex;align-items:center;gap:12px;padding:9px 13px;min-width:0;cursor:pointer;}
.proj-list-actions{display:flex;gap:4px;padding:6px 9px;border-left:1px solid var(--br);flex-shrink:0;}
.view-toggle{display:flex;gap:2px;background:var(--s3);border:1px solid var(--br);border-radius:7px;padding:2px;}
.view-toggle-btn{width:26px;height:26px;border:none;border-radius:5px;background:transparent;color:var(--t3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.view-toggle-btn.on{background:var(--s2);color:var(--t1);box-shadow:0 1px 3px rgba(0,0,0,.2);}

@keyframes jd-spin{to{transform:rotate(360deg);}}
@keyframes jd-slide-up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}

/* ── Bottom tab bar (mobile only) ── */
.mobile-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:400;background:var(--rail);border-top:1px solid var(--br);padding:6px 4px calc(6px + env(safe-area-inset-bottom));display:none;align-items:center;justify-content:space-around;}
.mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;background:none;border:none;cursor:pointer;color:var(--t3);font-family:var(--ui);font-size:8px;font-weight:600;letter-spacing:.03em;min-width:0;transition:color .15s;}
.mob-tab.active{color:var(--acc);}
.mob-tab svg{flex-shrink:0;}
.mob-tab-dot{width:4px;height:4px;border-radius:50%;background:var(--acc);margin-top:1px;}

@media(max-width:768px){
  /* Hide desktop rail, show bottom nav */
  .rail{display:none!important;}
  .mobile-bottom-nav{display:flex!important;}
  
  /* Compensate for bottom nav */
  .jdp{flex-direction:column;}
  .jdp-main{padding-bottom:60px;}
  
  /* Topbar */
  .topbar{padding:0 10px;height:52px;gap:6px;}
  .topbar-ttl{font-size:13px;}
  .topbar-sub{display:none;}
  .topbar-actions-desktop{display:none!important;}
  .topbar-actions-mobile{display:flex!important;}
  
  /* Search */
  .search{min-width:0;flex:1;}
  
  /* KPI bar */
  .kpi-bar{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .kpi{min-width:88px;padding:8px 11px;flex-shrink:0;}
  .kpi-val{font-size:15px;}
  
  /* Portfolio */
  .port-body{flex-direction:column;}
  .port-sidebar{width:100%;border-left:none;border-top:1px solid var(--br);max-height:220px;}
  .port-projects{padding:10px;}
  .proj-grid{grid-template-columns:1fr;}
  
  /* Tabs */
  .tabs{padding:0 8px;}
  .tab{padding:11px 8px;font-size:11px;}
  
  /* Scroll content */
  .scroll{padding:10px;}
  
  /* Modals → bottom sheet */
  .modal{max-width:100%!important;margin:0;border-radius:14px 14px 0 0;position:fixed;bottom:0;max-height:92vh;}
  .overlay{align-items:flex-end;padding:0;}
  
  /* Grids */
  .g2{grid-template-columns:1fr 1fr;}
  .g3,.g4{grid-template-columns:1fr 1fr;}
  
  /* My Day */
  .myday-page{flex-direction:column;}
  .myday-left{width:100%;border-right:none;border-bottom:1px solid var(--br);padding:12px;flex-shrink:0;max-height:260px;overflow-y:auto;}
  .myday-main{padding:12px;}
  .cal-day{width:26px;height:26px;font-size:10px;}
  
  /* Staff rows */
  .staff-row{flex-wrap:wrap;gap:6px;}
  
  /* Project detail topbar — hide secondary buttons */
  .proj-detail-btns-secondary{display:none!important;}
  .proj-detail-btns-secondary > *{display:none!important;}
  
  /* Contact cards */
  .contact-card{flex-direction:column;}
  
  /* Tools panel */
  .tools-panel{left:0;width:100%;height:auto;max-height:80vh;top:auto;bottom:60px;border-radius:14px 14px 0 0;border:none;border-top:1px solid var(--br);}
  
  /* Report tab — single column on mobile */
  .report-builder{grid-template-columns:1fr!important;}
  
  /* Overview notes portal chip */
  .portal-chip-row{flex-direction:column;align-items:flex-start!important;}
}

@media(max-width:480px){
  .kpi-bar{display:grid;grid-template-columns:1fr 1fr;overflow-x:unset;}
  .kpi{border-right:1px solid var(--br);border-bottom:1px solid var(--br);}
  .kpi:nth-child(even){border-right:none;}
  .tabs .tab span:not(.mono):not(.badge-count){display:none;}
  .tab{padding:11px 10px;gap:0;}
  .g2,.g3,.g4{grid-template-columns:1fr;}
  .scroll{padding:8px;}
  .topbar{height:48px;}
  .topbar-ttl{font-size:12px;}
  .proj-grid{gap:8px;}
  .card{padding:12px;}
  .scope-row{grid-template-columns:1fr 52px 64px 70px 22px;font-size:11px;}
  .staff-row > *:nth-child(n+4){display:none;}
  .staff-row-phone,.staff-row-cert{display:none!important;}
  .contact-card{padding:10px;}
  .modal-body{padding:14px 16px;}
  .report-summary-chips{grid-template-columns:1fr!important;}
}
`;

const Ic = {
  dash:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>,
  folder:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>,
  tasks:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
  settings:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  account: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  history: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>,
  plus:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  back:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  close:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  check:   <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>,
  copy:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>,
  search:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  photo:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>,
  doc:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  pdf:     <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>,
  mail:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
  phone:   <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.32.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
  sms:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
  dollar:  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
  invoice: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>,
  clock:   <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>,
  trash:   <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  map:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
  notify:  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  scope:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>,
  msg:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>,
  chart:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zM16.2 13h2.8v6h-2.8v-6z"/></svg>,
  contact: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 0H4v2h16V0zm0 4H4v2h16V4zM4 24h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2zm8-11.99c1.66 0 3 1.34 3 3C15 16.66 13.66 18 12 18c-1.66 0-3-1.34-3-3 0-1.66 1.34-2.99 3-2.99zM6 20c0-2 4-3.1 6-3.1s6 1.1 6 3.1H6z"/></svg>,
  upload:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>,
  moon:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>,
  sun:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>,
  tools:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>,
  drydox:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>,
  contents:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5z"/></svg>,
  mindflow:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>,
  pricetag:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>,
  attr:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>,
  report:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>,
  calendar:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>,
  chev_l:  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>,
  chev_r:  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  goto:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>,
  comment: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>,
  eye:     <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  chevron: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>,
  fire:    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>,
  water2:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>,
  storm:   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>,
  ic_list: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>,
  record:  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>,
  call_in: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 5.41L18.59 4 7 15.59V9H5v10h10v-2H8.41L20 5.41zM6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.57l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
  call_out:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5H9zM6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.57l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
  play:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  pause:   <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  group:   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  estimate:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/></svg>,
  proj_report:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  ic_grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>,
  stopwatch:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 1.58l-1.06 1.95C13.43 3.2 12.73 3 12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.87-1.35-5.43-3.44-7.07l1.05-1.93-1.54-.42zM12 19c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm.5-11h-1.5v5.25l4.5 2.67.75-1.23-3.75-2.23V8z"/></svg>,
  logout:  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
};

const STATUS_C = {"In Progress":"var(--blue)","New Lead":"var(--t2)","Scoping":"var(--amber)","On Hold":"var(--acc)","Completed":"var(--green)","Pending Approval":"var(--purple)"};
const TYPE_C   = {"Fire & Smoke":"#f97316","Water Damage":"#3b82f6","Storm Damage":"#8b5cf6","Mold Remediation":"#10b981","Reconstruction":"#6b7280","Contents":"#ec4899","Demo":"#f43f5e"};

const WT_META = {
  "Water Mitigation": { color:"#3b82f6", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2C20 10.48 17.33 6.55 12 2z"/></svg> },
  "Fire & Smoke":     { color:"#f97316", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg> },
  "Mold Remediation": { color:"#10b981", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2-.47 0-.87.07-1.27.13C14.93 12.06 16 10 17 8z"/></svg> },
  "Storm Damage":     { color:"#8b5cf6", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.03A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.03A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.97z"/></svg> },
  "Reconstruction":   { color:"#6b7280", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.28L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5v-5l-2.28 2.28C6.81 18 5 15.21 5 12c0-4.08 3.05-7.44 7-7.93V2.05z"/></svg> },
  "Demo":             { color:"#f43f5e", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg> },
  "Contents":         { color:"#ec4899", icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5z"/></svg> },
};

const WT_PHASE_C = {
  active:    {bg:"rgba(26,217,138,.12)",  border:"rgba(26,217,138,.3)",  text:"var(--green)",  dot:"var(--green)"},
  complete:  {bg:"rgba(91,163,245,.1)",   border:"rgba(91,163,245,.25)", text:"var(--blue)",   dot:"var(--blue)"},
  scheduled: {bg:"rgba(168,139,250,.1)",  border:"rgba(168,139,250,.25)",text:"var(--purple)", dot:"var(--purple)"},
  scoping:   {bg:"rgba(232,156,24,.1)",   border:"rgba(232,156,24,.25)", text:"var(--amber)",  dot:"var(--amber)"},
  pending:   {bg:"rgba(64,72,102,.18)",   border:"rgba(64,72,102,.35)",  text:"var(--t3)",     dot:"var(--t3)"},
  testing:   {bg:"rgba(34,211,238,.1)",   border:"rgba(34,211,238,.25)", text:"var(--teal)",   dot:"var(--teal)"},
};

/* ══════════════════════════════════════════════
   COMPANY CONFIG — localStorage-backed
   Keys: jd_company_worktypes, jd_company_statuses, jd_company_project_types
══════════════════════════════════════════════ */
const LS_CWT_KEY  = "jd_company_worktypes";
const LS_CST_KEY  = "jd_company_statuses";
const LS_CPT_KEY  = "jd_company_project_types";
const LS_CO_KEY   = "jd_company_info";
const LS_OFFICES_KEY = "jd_company_offices";

function loadOfficesLS()  { try { return JSON.parse(localStorage.getItem(LS_OFFICES_KEY)) || []; } catch { return []; } }
function saveOfficesToLS(offices) { try { localStorage.setItem(LS_OFFICES_KEY, JSON.stringify(offices)); } catch {} }

const DEFAULT_CO_INFO = { name:"", address:"", city:"", state:"", zip:"", phone:"", email:"", website:"", logo:"" };
function loadCoInfo() {
  try { return JSON.parse(localStorage.getItem(LS_CO_KEY)) || DEFAULT_CO_INFO; } catch { return DEFAULT_CO_INFO; }
}
function saveCoInfo(info) {
  localStorage.setItem(LS_CO_KEY, JSON.stringify(info));
}

/* ── Billing settings (tax rates, T&C, overhead, pinned items) ── */
const LS_BILLING = "jd_billing_settings";
const DEFAULT_BILLING = {
  taxRates:       [{ id:"tx1", name:"No Tax", rate:0 }, { id:"tx2", name:"Sales Tax (8.5%)", rate:8.5 }, { id:"tx3", name:"State Tax (6%)", rate:6 }],
  defaultTaxId:   "tx1",
  defaultOverhead: 10,
  defaultDiscount: 0,
  terms:          "Payment is due within 30 days of invoice date. A late fee of 1.5% per month will be applied to overdue balances. All work performed per applicable building codes. Contractor is not responsible for pre-existing conditions.",
  pinnedItems:    {},   // { [workTypeName]: [{ id, desc, unit, price }] }
  nextInvoiceNum: 1001,
};
function loadBilling()     { try { return { ...DEFAULT_BILLING, ...JSON.parse(localStorage.getItem(LS_BILLING)) }; } catch { return DEFAULT_BILLING; } }
function saveBilling(b)    { try { localStorage.setItem(LS_BILLING, JSON.stringify(b)); } catch {} }

/* ── Budget Category Templates ── */
const LS_BUDGET_TEMPLATES = "jd_budget_templates";
const DEFAULT_BUDGET_TEMPLATES = [
  { id:"bc1",  name:"General Demo / Tear-out", color:"#f59e0b", workTypes:[], active:true },
  { id:"bc2",  name:"Structural / Framing",    color:"#8b5cf6", workTypes:[], active:true },
  { id:"bc3",  name:"Drywall",                 color:"#06b6d4", workTypes:[], active:true },
  { id:"bc4",  name:"Painting",                color:"#84cc16", workTypes:[], active:true },
  { id:"bc5",  name:"Flooring",                color:"#f97316", workTypes:[], active:true },
  { id:"bc6",  name:"Electrical",              color:"#eab308", workTypes:[], active:true },
  { id:"bc7",  name:"Plumbing",                color:"#3b82f6", workTypes:[], active:true },
  { id:"bc8",  name:"HVAC / Mechanical",       color:"#10b981", workTypes:[], active:true },
  { id:"bc9",  name:"Equipment",               color:"#ec4899", workTypes:[], active:true },
  { id:"bc10", name:"Contents",                color:"#6366f1", workTypes:[], active:true },
  { id:"bc11", name:"Labor",                   color:"#14b8a6", workTypes:[], active:true },
  { id:"bc12", name:"General Cleanup",         color:"#a3a3a3", workTypes:[], active:true },
  { id:"bc13", name:"Roofing",                 color:"#dc2626", workTypes:[], active:true },
  { id:"bc14", name:"Windows / Doors",         color:"#7c3aed", workTypes:[], active:true },
  { id:"bc15", name:"Insulation",              color:"#059669", workTypes:[], active:true },
  { id:"bc16", name:"Mitigation",              color:"#0891b2", workTypes:[], active:true },
];
function loadBudgetTemplates() { try { return JSON.parse(localStorage.getItem(LS_BUDGET_TEMPLATES)) || DEFAULT_BUDGET_TEMPLATES; } catch { return DEFAULT_BUDGET_TEMPLATES; } }
function saveBudgetTemplates(t){ try { localStorage.setItem(LS_BUDGET_TEMPLATES, JSON.stringify(t)); } catch {} }

/* ── Invoice storage ── */
const LS_INVOICES = "jd_invoices";
function loadAllInvoices() { try { return JSON.parse(localStorage.getItem(LS_INVOICES)) || []; } catch { return []; } }
function saveAllInvoices(v){ try { localStorage.setItem(LS_INVOICES, JSON.stringify(v)); } catch {} }
function loadProjInvoices(projId) { return loadAllInvoices().filter(inv => inv.projId === projId); }
function pushInvoice(inv) {
  const all = loadAllInvoices().filter(i => i.id !== inv.id);
  saveAllInvoices([...all, inv]);
}

/* ── Per-project Documents (invoices + signed docs that have been pushed here) ── */
const LS_PROJ_DOCS = "jd_proj_docs";
function loadProjDocs(projId) {
  try { const all = JSON.parse(localStorage.getItem(LS_PROJ_DOCS)) || {}; return all[projId] || []; } catch { return []; }
}
function saveProjDocs(projId, docs) {
  try { const all = JSON.parse(localStorage.getItem(LS_PROJ_DOCS)) || {}; all[projId] = docs; localStorage.setItem(LS_PROJ_DOCS, JSON.stringify(all)); } catch {}
}
function pushProjDoc(projId, doc, projName, userName) {
  const docs = loadProjDocs(projId).filter(d => d.id !== doc.id);
  saveProjDocs(projId, [...docs, doc]);
  // Only push activity for non-invoice docs (invoices push their own event)
  if (doc.type !== "invoice") {
    pushActivity({
      actionType: "document",
      action:     `Document added: ${doc.name || doc.number || "Document"}`,
      proj:       projName || projId || "",
      projId:     projId || null,
      user:       userName || "Staff",
    });
  }
}

/* ── Per-project Message Log (emails sent from Documents tab) ── */
const LS_PROJ_MSGS = "jd_proj_msgs";
function loadProjMsgs(projId) {
  try { const all = JSON.parse(localStorage.getItem(LS_PROJ_MSGS)) || {}; return all[projId] || []; } catch { return []; }
}
function saveProjMsgs(projId, msgs) {
  try { const all = JSON.parse(localStorage.getItem(LS_PROJ_MSGS)) || {}; all[projId] = msgs; localStorage.setItem(LS_PROJ_MSGS, JSON.stringify(all)); } catch {}
}
function pushProjMsg(projId, msg) {
  const msgs = loadProjMsgs(projId);
  saveProjMsgs(projId, [...msgs, { ...msg, id: msg.id || `msg-${Date.now()}`, ts: new Date().toISOString() }]);
}

/* ── Job email address helpers ── */
/* ── Vendor Manager LS helpers ────────────────────────────── */
const LS_VENDORS = "jd_vendors";
function loadVendors()        { try { return JSON.parse(localStorage.getItem(LS_VENDORS)) || []; } catch { return []; } }
function saveVendors(arr)     { try { localStorage.setItem(LS_VENDORS, JSON.stringify(arr)); } catch {} }
function upsertVendor(v)      { const all = loadVendors().filter(x => x.id !== v.id); saveVendors([...all, v]); }
function deleteVendor(id)     { saveVendors(loadVendors().filter(v => v.id !== id)); }

/* ── Vendor Bills mirror  (AP bills linked to vendor records) ─── */
const LS_VENDOR_BILLS = "jd_vendor_bills";
function loadVendorBills()              { try { return JSON.parse(localStorage.getItem(LS_VENDOR_BILLS)) || []; } catch { return []; } }
function saveVendorBills(arr)           { try { localStorage.setItem(LS_VENDOR_BILLS, JSON.stringify(arr)); } catch {} }
function upsertVendorBill(bill)         { const all = loadVendorBills().filter(b => b.id !== bill.id); saveVendorBills([...all, bill]); }
function loadBillsByVendor(vendorId)    { return loadVendorBills().filter(b => b.vendorId === vendorId); }
function markVendorBillPaid(id, paid)   {
  const all = loadVendorBills().map(b => b.id === id ? { ...b, status: paid ? "paid" : "approved" } : b);
  saveVendorBills(all);
}

/* ── COI status utility ─────────────────────────────────────────── */
// Returns: "ok" | "expiring" | "expired" | "missing"
function getCoiStatus(vendor) {
  if (!vendor?.coi) return "missing";
  if (!vendor.coi.expiresAt) return "ok";
  const d = new Date(vendor.coi.expiresAt);
  const now = new Date();
  if (d < now) return "expired";
  if (d < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) return "expiring";
  return "ok";
}
const COI_STATUS = {
  ok:       { label:"COI Valid",        color:"var(--green)", bg:"rgba(26,217,138,.12)"  },
  expiring: { label:"COI Expiring",     color:"var(--amber)", bg:"rgba(245,158,11,.15)"  },
  expired:  { label:"COI EXPIRED",      color:"var(--acc)",   bg:"rgba(239,68,68,.15)"   },
  missing:  { label:"COI Missing",      color:"var(--acc)",   bg:"rgba(239,68,68,.1)"    },
};

function getJobEmail(proj, coInfo) {
  if (proj?.jobEmail) return proj.jobEmail;
  // Auto-generate from proj id + company domain
  const slug = (proj?.name || proj?.id || "job").toLowerCase().replace(/[^a-z0-9]/g,"-").slice(0,20);
  const domain = coInfo?.email ? coInfo.email.split("@")[1] : "jobdox.com";
  return `job-${slug}@${domain}`;
}

const DEFAULT_WORK_TYPES    = [];
const DEFAULT_STATUSES      = [];
const DEFAULT_PROJECT_TYPES = [];

function loadCWT()  { try { return JSON.parse(localStorage.getItem(LS_CWT_KEY)) || DEFAULT_WORK_TYPES; }  catch { return DEFAULT_WORK_TYPES; } }
function loadCST()  { try { return JSON.parse(localStorage.getItem(LS_CST_KEY)) || DEFAULT_STATUSES; }    catch { return DEFAULT_STATUSES; } }
function loadCPT()  { try { return JSON.parse(localStorage.getItem(LS_CPT_KEY)) || DEFAULT_PROJECT_TYPES; } catch { return DEFAULT_PROJECT_TYPES; } }
function saveCWT(v) { try { localStorage.setItem(LS_CWT_KEY, JSON.stringify(v)); } catch {} }
function saveCST(v) { try { localStorage.setItem(LS_CST_KEY, JSON.stringify(v)); } catch {} }
function saveCPT(v) { try { localStorage.setItem(LS_CPT_KEY, JSON.stringify(v)); } catch {} }

// Merge WT_META icons into a custom work type
function getWTMeta(name, customWorkTypes=[]) {
  if (WT_META[name]) return WT_META[name];
  const cwt = customWorkTypes.find(w => w.name === name);
  if (cwt) return { color: cwt.color, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg> };
  return { color:"var(--t3)", icon: null };
}

// Status trigger checker — called when a task title is completed
function checkStatusTrigger(taskTitle, currentStatus, customStatuses=[]) {
  const lc = taskTitle.toLowerCase();
  for (const st of customStatuses) {
    if (!st.triggerTask) continue;
    if (lc.includes(st.triggerTask.toLowerCase())) return st.name;
  }
  return null;
}

// Sync all company config to localStorage so mindflow can read it
function syncCompanyConfigToLS(workTypes, statuses, projectTypes) {
  saveCWT(workTypes);
  saveCST(statuses);
  saveCPT(projectTypes);
  // Also write combined summary for mindflow
  try {
    localStorage.setItem("jd_company_config", JSON.stringify({
      workTypes: workTypes.map(w => ({ id:w.id, name:w.name, color:w.color, hasWorkflow:w.hasWorkflow })),
      statuses:  statuses.map(s  => ({ id:s.id, name:s.name, color:s.color, triggerTask:s.triggerTask })),
      projectTypes: projectTypes.map(p => ({ id:p.id, name:p.name, color:p.color })),
    }));
  } catch {}
}

/* ══════════════════════════════════════════════
   WORKFLOW TEMPLATES — saved from CortexAI
   Key: jd_workflow_templates  →  { [workTypeName]: templateObject }
══════════════════════════════════════════════ */
const LS_WF_TEMPLATES_KEY = "jd_workflow_templates";

function loadWorkflowTemplates() {
  try { return JSON.parse(localStorage.getItem(LS_WF_TEMPLATES_KEY)) || {}; }
  catch { return {}; }
}

function saveWorkflowTemplate(workType, templateObj) {
  try {
    const all = loadWorkflowTemplates();
    all[workType] = { ...templateObj, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_WF_TEMPLATES_KEY, JSON.stringify(all));
  } catch {}
}

function deleteWorkflowTemplate(workType) {
  try {
    const all = loadWorkflowTemplates();
    delete all[workType];
    localStorage.setItem(LS_WF_TEMPLATES_KEY, JSON.stringify(all));
  } catch {}
}

function WorkTypePills({ worktypes, customWorkTypes=[] }) {
  if (!worktypes?.length) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
      {worktypes.map((wt,i)=>{
        const meta  = getWTMeta(wt.type, customWorkTypes);
        const phase = WT_PHASE_C[wt.status] || WT_PHASE_C.pending;
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:phase.bg,border:`1px solid ${phase.border}`,borderRadius:7,padding:"4px 8px",borderLeft:`3px solid ${meta.color}`}}>
            <span style={{color:meta.color,display:"flex",alignItems:"center",flexShrink:0}}>{meta.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:meta.color,minWidth:0,flexShrink:0}}>{wt.type}</span>
            <span style={{width:1,height:10,background:phase.border,flexShrink:0}}/>
            <span style={{fontSize:9,color:phase.text,fontFamily:"var(--mono)",letterSpacing:".03em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wt.phase}</span>
            <span style={{width:5,height:5,borderRadius:"50%",background:phase.dot,flexShrink:0,marginLeft:"auto"}}/>
          </div>
        );
      })}
    </div>
  );
}

const PROJECTS = [];
/* ── Activity Feed — every meaningful event writes here ── */
const LS_ACTIVITY = "jd_activity_log";
const ACTIVITY_COLORS = {
  task:     "var(--amber)",
  invoice:  "var(--green)",
  document: "var(--blue)",
  call:     "var(--purple)",
  vendor:   "var(--acc)",
  note:     "var(--teal)",
  project:  "var(--t2)",
};
function loadActivity() {
  try { return JSON.parse(localStorage.getItem(LS_ACTIVITY)) || []; } catch { return []; }
}
function pushActivity({ actionType, action, proj, projId, user }) {
  try {
    const existing = loadActivity();
    const entry = {
      id:         `act-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      actionType,
      action,
      proj:       proj || "",
      projId:     projId || null,
      user:       user || "Staff",
      color:      ACTIVITY_COLORS[actionType] || "var(--t2)",
      time:       new Date().toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" }),
      ts:         Date.now(),
      live:       true,
    };
    const updated = [entry, ...existing.map(e => ({ ...e, live: false }))].slice(0, 200);
    localStorage.setItem(LS_ACTIVITY, JSON.stringify(updated));
  } catch {}
}
const TODAY_ISO = new Date().toISOString().slice(0,10);
const MY_TASKS = [];
const DAILY_NOTES_SEED = [];



const STAFF_POOL = [];
const CONTACTS_SEED = [];
const DOCS_SEED = [];
const TASKS_SEED = [];

const SCOPE_SEED = [];

/* ══════════════════════════════════════════════════════════════════
   PER-PROJECT PERSISTENCE LAYER
   All project-level data is keyed as "jd_p_{key}_{projId}" in
   localStorage so it survives page refreshes, re-deploys, and
   tab switches without needing a Firestore write for every edit.
══════════════════════════════════════════════════════════════════ */
const _PFX = "jd_p_";

function _lsRead(projId, key, def) {
  try {
    const raw = localStorage.getItem(`${_PFX}${key}_${projId}`);
    return raw !== null ? JSON.parse(raw) : def;
  } catch { return def; }
}
function _lsWrite(projId, key, val) {
  try { localStorage.setItem(`${_PFX}${key}_${projId}`, JSON.stringify(val)); } catch(e) {
    // Storage full — warn once per key
    if (!window[`_lsWarn_${key}`]) { console.warn(`[Job-Dox] localStorage full for key "${key}". Consider moving media to cloud storage.`); window[`_lsWarn_${key}`] = true; }
  }
}

// Typed per-project accessors — keys MUST match useProjState call sites exactly
const lsProj = {
  contacts:     { load: (id) => _lsRead(id, "contacts",    null), save: (id,v) => _lsWrite(id, "contacts",    v) },
  scope:        { load: (id) => _lsRead(id, "scope",       null), save: (id,v) => _lsWrite(id, "scope",       v) },
  tasks:        { load: (id) => _lsRead(id, "tasks",       null), save: (id,v) => _lsWrite(id, "tasks",       v) },
  notes:        { load: (id) => _lsRead(id, "notes",       null), save: (id,v) => _lsWrite(id, "notes",       v) },
  worktypes:    { load: (id) => _lsRead(id, "worktypes",   null), save: (id,v) => _lsWrite(id, "worktypes",   v) },
  mediaFolders: { load: (id) => _lsRead(id, "mfolders",    null), save: (id,v) => _lsWrite(id, "mfolders",    v) },
  mediaUploads: { load: (id) => _lsRead(id, "muploads",    null), save: (id,v) => _lsWrite(id, "muploads",    v) },
  emailSched:   { load: (id) => _lsRead(id, "emailsched",  null), save: (id,v) => _lsWrite(id, "emailsched",  v) },
  clientPortal: { load: (id) => _lsRead(id, "cportal",     null), save: (id,v) => _lsWrite(id, "cportal",     v) },
  assigned:     { load: (id) => _lsRead(id, "assigned",    null), save: (id,v) => _lsWrite(id, "assigned",    v) },
};

// React hook: loads from LS on mount, auto-saves on every change,
// re-loads if projId changes (navigating between projects).
function useProjState(projId, key, fallback) {
  const accessor = lsProj[key];
  if (!accessor) throw new Error(`[useProjState] Unknown key: "${key}"`);

  const resolve = (stored, fb) => {
    if (stored !== null) return stored;
    return typeof fb === "function" ? fb() : fb;
  };

  const [val, setValRaw] = useState(() => resolve(accessor.load(projId), fallback));

  // Re-load when projId changes (user navigates between projects)
  const prevProjId = useRef(projId);
  useEffect(() => {
    if (prevProjId.current === projId) return;
    prevProjId.current = projId;
    setValRaw(resolve(accessor.load(projId), fallback));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projId]);

  const setVal = useCallback((updater) => {
    setValRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      accessor.save(projId, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projId, key]);

  return [val, setVal];
}

const PRICE_LIST = [
  {code:"WTR-EXT",desc:"Water Extraction",unit:"SF",price:0.85},
  {code:"EQP-DHU",desc:"LGR Dehumidifier (per day)",unit:"EA",price:85},
  {code:"EQP-AMS",desc:"Air Mover (per day)",unit:"EA",price:28},
  {code:"EQP-ARS",desc:"Air Scrubber HEPA (per day)",unit:"EA",price:65},
  {code:"TRT-ANT",desc:"Antimicrobial Treatment",unit:"SF",price:0.55},
  {code:"DMO-DRY",desc:"Demo — Drywall",unit:"SF",price:1.65},
  {code:"DMO-FLR",desc:"Demo — Flooring (LVP)",unit:"SF",price:2.10},
  {code:"RST-DRY",desc:"Drywall Install & Finish",unit:"SF",price:3.80},
  {code:"RST-FLR",desc:"LVP Flooring Install",unit:"SF",price:4.25},
  {code:"RST-PNT",desc:"Painting (2 coats)",unit:"SF",price:1.20},
];

const MSGS_SEED = [];

const DEFAULT_ATTR_DEFS = [
  {id:1,key:"yearBuilt",   label:"Year Built",         type:"text", placeholder:"e.g. 1998"},
  {id:2,key:"sqft",        label:"Square Footage",     type:"text", placeholder:"e.g. 2,400 SF"},
  {id:3,key:"roofType",    label:"Roof Type",          type:"text", placeholder:"e.g. Asphalt Shingle"},
  {id:4,key:"xactJobNum",  label:"Xactimate Job #",    type:"text", placeholder:"e.g. 4421-88"},
  {id:5,key:"externalLink",label:"External Link",      type:"url",  placeholder:"https://…"},
  {id:6,key:"ppeRequired", label:"PPE Required",       type:"text", placeholder:"e.g. N95, Tyvek"},
];

const fmt$  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const fmt$c = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const pct   = (a,b) => b>0 ? Math.min(100,a/b*100).toFixed(0) : 0;
let _id = 300; const uid = () => ++_id;
const AVCOLORS = ["#5ba3f5","#1ad98a","#e89c18","#a78bfa","#e43531","#22d3ee"];

/* ── Staff constants ── */
const SYSTEM_ROLES = [
  "Project Manager","Lead Technician","Field Technician",
  "Estimator","Subcontractor","Office Admin","Sales",
];
const ROLE_COLORS = {
  "Project Manager":  "#5ba3f5",
  "Lead Technician":  "#1ad98a",
  "Field Technician": "#22d3ee",
  "Estimator":        "#a78bfa",
  "Subcontractor":    "#e89c18",
  "Office Admin":     "#ec4899",
  "Sales":            "#f97316",
};
const PERM_LABELS = { admin:"Admin", manager:"Manager", staff:"Staff" };
const PERM_COLORS = { admin:"var(--acc)", manager:"var(--blue)", staff:"var(--t3)" };

function syncStaffToLS(staffArr, officesArr=[]) {
  try {
    const enriched = staffArr.map(s => ({
      ...s,
      // officeIds is an array — join names for CortexAI so it can match role+office
      officeNames: (s.officeIds||[]).map(id => officesArr.find(o=>o.id===id)?.name).filter(Boolean),
    }));
    localStorage.setItem("jd_staff", JSON.stringify(enriched));
  } catch {}
}

/* ══════════════════════════════════════════════
   FIRESTORE — Staff & Invite helpers
══════════════════════════════════════════════ */
// Listen to all active staff in real-time
function fsListenStaff(companyId, cb) {
  const q = query(collection(db, "companies", companyId, "staff"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
// Listen to pending invites in real-time
function fsListenInvites(companyId, cb) {
  const q = query(collection(db, "companies", companyId, "invites"), where("status","==","pending"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
// Save or update a staff member doc (keyed by memberstackId)
async function fsSetStaff(companyId, memberstackId, data) {
  await setDoc(doc(db, "companies", companyId, "staff", memberstackId), data, { merge: true });
}
// Update a specific field on a staff member (e.g. permission)
async function fsUpdateStaffField(companyId, memberstackId, fields) {
  await updateDoc(doc(db, "companies", companyId, "staff", memberstackId), fields);
}
// Remove a staff member
async function fsRemoveStaff(companyId, memberstackId) {
  await deleteDoc(doc(db, "companies", companyId, "staff", memberstackId));
}
// Get a single staff record (used on login)
async function fsGetStaff(companyId, memberstackId) {
  const snap = await getDoc(doc(db, "companies", companyId, "staff", memberstackId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
// Create an invite
async function fsCreateInvite(companyId, email, permission, invitedByName) {
  const ref = await addDoc(collection(db, "companies", companyId, "invites"), {
    email: email.toLowerCase().trim(),
    permission,
    invitedBy: invitedByName,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
// Cancel/delete an invite
async function fsCancelInvite(companyId, inviteId) {
  await deleteDoc(doc(db, "companies", companyId, "invites", inviteId));
}
// Find a pending invite by email across a company
async function fsFindInviteByEmail(companyId, email) {
  const q = query(
    collection(db, "companies", companyId, "invites"),
    where("email","==", email.toLowerCase().trim()),
    where("status","==","pending")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/* ── Field app invite code helpers ── */
async function fsCreateFieldInviteCode(companyId, companyName) {
  const code = "JDFIELD-" + Math.random().toString(36).substring(2,8).toUpperCase();
  await setDoc(doc(db, "fieldInviteCodes", code), {
    companyId, companyName: companyName||"",
    createdAt: serverTimestamp(), used: false
  });
  return code;
}
 
/* ── Offices helpers ── */
function fsListenOffices(companyId, cb) {
  const q = collection(db, "companies", companyId, "offices");
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
async function fsSetOffice(companyId, officeId, data) {
  await setDoc(doc(db, "companies", companyId, "offices", officeId), data, { merge: true });
}
async function fsDeleteOffice(companyId, officeId) {
  await deleteDoc(doc(db, "companies", companyId, "offices", officeId));
}

function Av({ name, color, size=34 }) {
  const init = (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:color||"var(--s4)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.34,fontWeight:700,flexShrink:0,letterSpacing:"-0.5px"}}>{init}</div>;
}
function Badge({ status, customStatuses=[] }) {
  const cst = customStatuses.find(s=>s.name===status);
  const c = cst?.color || STATUS_C[status]||"var(--t2)";
  return <span className="badge" style={{background:c+"18",color:c}}><span className="dot" style={{background:c}}/>{status}</span>;
}
function TypeTag({ type, customProjectTypes=[] }) {
  const cpt = customProjectTypes.find(t=>t.name===type);
  const c = cpt?.color || TYPE_C[type]||"var(--t2)";
  return <span style={{borderRadius:20,padding:"2px 8px",fontSize:10,background:c+"18",color:c,fontWeight:600}}>{type}</span>;
}
function F({ label, value, onChange, type="text", placeholder, options, span, rows }) {
  const style = span ? {gridColumn:`span ${span}`} : {};
  return (
    <div style={style}>
      {label && <label className="lbl">{label}</label>}
      {options
        ? <select className="sel" value={value} onChange={e=>onChange(e.target.value)}><option value="">Select…</option>{options.map(o=><option key={o}>{o}</option>)}</select>
        : rows
          ? <textarea className="txa" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} rows={rows}/>
          : <input type={type} className="inp" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""}/>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════
   GEO UTILITIES — Haversine distance + Nominatim geocoding
══════════════════════════════════════════════ */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function geocodeAddress(addressStr) {
  if (!addressStr?.trim()) return null;

  // ── Attempt 1: Photon (komoot) — purpose-built for browser use, no key needed ──
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(addressStr)}&limit=3&lang=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      // Prefer US results
      const features = (data.features || []);
      const us = features.find(f => f.properties?.countrycode === 'US') || features[0];
      if (us) {
        const [lng, lat] = us.geometry.coordinates;
        const p = us.properties;
        const display = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(', ');
        return { lat, lng, display };
      }
    }
  } catch { /* fall through to Nominatim */ }

  // ── Attempt 2: Nominatim — browser sends its own User-Agent which usually works ──
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1&countrycodes=us&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en-US,en" } });
    if (res.ok) {
      const data = await res.json();
      if (data.length) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
      }
    }
  } catch { /* both failed */ }

  return null;
}

function nearestOffice(offices, lat, lng) {
  let best = null, bestDist = Infinity;
  for (const o of offices) {
    if (o.lat == null || o.lng == null) continue;
    const d = haversineDistance(lat, lng, o.lat, o.lng);
    if (d < bestDist) { bestDist = d; best = o; }
  }
  return best ? { office: best, miles: Math.round(bestDist * 10) / 10 } : null;
}

const RATE_TABLE = {
  "Lead Technician":   { payRate: 28, chargeRate: 85  },
  "Field Technician":  { payRate: 22, chargeRate: 65  },
  "Project Manager":   { payRate: 42, chargeRate: 95  },
  "Estimator":         { payRate: 35, chargeRate: 75  },
  "Subcontractor":     { payRate: 0,  chargeRate: 55  },
};

const CURRENT_USER = {
  name:     "Tyler Mitchell",
  position: "Project Manager",
};

/* ══════════════════════════════════════════════
   PERMISSION LEVELS  1–10
   ──────────────────────────────────────────────
   Stored as integer in Firestore { permission: 7 }
   Legacy string values ("admin","manager","staff") are
   normalised by normPerm() on read.
══════════════════════════════════════════════ */
const PERM_LEVELS = {
  0:  { label:"Vendor · Subcontractor",   short:"VND", color:"#e89c18" },
  1:  { label:"Level 1 · Field I",        short:"L1",  color:"#6b7280" },
  2:  { label:"Level 2 · Field II",       short:"L2",  color:"#6b7280" },
  3:  { label:"Level 3 · Technician",     short:"L3",  color:"#22d3ee" },
  4:  { label:"Level 4 · Senior Tech",    short:"L4",  color:"#22d3ee" },
  5:  { label:"Level 5 · Coordinator",    short:"L5",  color:"#5ba3f5" },
  6:  { label:"Level 6 · Project Lead",   short:"L6",  color:"#5ba3f5" },
  7:  { label:"Level 7 · Manager",        short:"L7",  color:"#a78bfa" },
  8:  { label:"Level 8 · Sr. Manager",    short:"L8",  color:"#a78bfa" },
  9:  { label:"Level 9 · Director",       short:"L9",  color:"#f97316" },
  10: { label:"Level 10 · Admin",         short:"L10", color:"var(--acc)" },
};

const PERM_DESCRIPTIONS = {
  0:  { title:"Vendor / Subcontractor", desc:"External vendor or subcontractor login. Sees only projects they are personally assigned to. Can clock in/out and upload photos only. Sees only the specific tasks and checklists they are assigned to — no other project data, no financials." },
  1:  { title:"Field I",      desc:"Sees only projects they are personally assigned to. No financial data of any kind. Can clock in/out and update task status only." },
  2:  { title:"Field II",     desc:"Same project visibility as Level 1. Can view task checklists and add media/photos. No financial access." },
  3:  { title:"Technician",   desc:"Sees all projects at their assigned office(s). Can manage tasks and log notes. No financial or billing data." },
  4:  { title:"Senior Tech",  desc:"Office-level project visibility plus basic progress indicators (% complete). Still no dollar figures — can see worktype phases only." },
  5:  { title:"Coordinator",  desc:"Cross-office project visibility. Can create new projects. Can view budget totals and spent amounts, but not individual billing line items or pay rates." },
  6:  { title:"Project Lead",  desc:"Full cross-office project visibility and creation. Sees full budget, DryDox equipment logs, and scope line items. Cannot see client billing rates or staff pay rates." },
  7:  { title:"Manager",      desc:"Full financial visibility including client-facing billing rates on scope/invoices. Can see Shift Reports with billing figures. Cannot view staff pay rates." },
  8:  { title:"Sr. Manager",  desc:"All Level 7 access plus staff pay rate visibility in Shift Reports. Can access General Settings for config changes." },
  9:  { title:"Director",     desc:"All Level 8 access plus full Settings access. Can manage staff records. Cannot change permission levels of other users." },
  10: { title:"Admin",        desc:"Full system access across all offices. Can set permission levels for all staff, manage company configuration, and view all financial data including pay rates." },
};

// Normalise legacy string permissions to numbers
function normPerm(raw) {
  if (typeof raw === "number") return Math.min(10, Math.max(0, raw));
  if (raw === "vendor" || raw === "subcontractor") return 0;
  if (raw === "admin")   return 10;
  if (raw === "manager") return 7;
  return 3; // "staff" or anything else
}

// Lead Technician or higher — qualifies for default Reply-To on outbound emails.
// Threshold: permissionLevel >= 6 (Project Lead) OR a role name that implies lead responsibility.
const LEAD_ROLES = new Set(["Lead Technician","Project Manager","Estimator","Office Admin"]);
function isLeadOrAbove(staffMember) {
  const perm = normPerm(staffMember?.permission ?? staffMember?.permissionLevel ?? 3);
  return perm >= 6 || LEAD_ROLES.has(staffMember?.systemRole);
}

// Capability gates — derive all caps from a numeric level
function permCaps(level) {
  const lv = normPerm(level);
  return {
    level:               lv,
    isVendorPerm:        lv === 0,                // 0: external vendor/subcontractor
    canViewOwnJobsOnly:  lv <= 2,                // 0-2: see only assigned projects
    canViewOfficeJobs:   lv >= 3 && lv <= 4,     // 3-4: same-office projects only
    canViewAllJobs:      lv >= 5,                // 5+: all projects cross-office
    canAddProject:       lv >= 5,                // 5+: create new projects
    canViewBudget:       lv >= 5,                // 5+: budget totals
    canViewBillingScope: lv >= 7,                // 7+: billing rates on scope/invoice
    canViewPayRates:     lv >= 8,                // 8+: staff pay rates in shifts
    canAccessSettings:   lv >= 8,                // 8+: general settings tab
    canManageStaff:      lv >= 9,                // 9+: edit staff records
    canManagePermissions:lv >= 10,               // 10 only: change permission levels
    // convenience alias kept for existing canViewRates call sites
    canViewRates:        lv >= 7,
  };
}

function useElapsed(startTime) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${h > 0 ? h + "h " : ""}${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
}

function ClockInModal({ proj, clockInState, onClockIn, onClockOut, onClose, currentUser, canViewRates }) {
  const user          = currentUser || CURRENT_USER;
  const autoRates     = RATE_TABLE[user.position] || { payRate: 0, chargeRate: 65 };
  const isThisProj    = clockInState?.projId === proj.id;
  const isOtherProj   = clockInState && !isThisProj;
  const [mode, setMode]           = useState("project");
  const [selTask, setSelTask]      = useState("");
  const [selTrade, setSelTrade]    = useState("");
  const [overrideOn, setOverride]  = useState(false);
  const [customRate, setCustomRate]= useState(String(autoRates.chargeRate));
  const elapsed = useElapsed(isThisProj ? clockInState.startTime : null);
  const trades  = ["Water Mitigation","Fire/Smoke Cleaning","Mold Remediation","Demo","Reconstruction","Pack-out","Equipment Check"];

  const effectiveRate = canViewRates && overrideOn
    ? (parseFloat(customRate) || autoRates.chargeRate)
    : autoRates.chargeRate;

  function doClockIn() {
    const label = mode==="task" ? selTask : mode==="trade" ? selTrade : proj.name;
    onClockIn({ projId: proj.id, projName: proj.name, startTime: Date.now(), mode, label,
      rate: effectiveRate, payRate: autoRates.payRate,
      position: user.position, tech: user.name,
    });
    onClose();
  }

  function doClockOut() {
    const durationSec = Math.floor((Date.now() - clockInState.startTime) / 1000);
    const hours = Math.round((durationSec / 3600) * 100) / 100;
    const shift = {
      id: uid(),
      tech: user.name,
      task: clockInState.label,
      mode: clockInState.mode,
      position: clockInState.position,
      rate: clockInState.rate,
      payRate: clockInState.payRate,
      clockIn:  new Date(clockInState.startTime).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),
      clockOut: new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),
      hours,
      notes: "",
      laborCost: Math.round(hours * clockInState.rate * 100) / 100,
    };
    onClockOut(shift);
    onClose();
  }

  if (isThisProj) {
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal modal-sm anim">
          <div className="modal-hd">
            <div>
              <div className="modal-ttl" style={{color:"var(--green)"}}>Currently Clocked In</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{proj.name}</div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
          </div>
          <div className="modal-body">
            <div style={{background:"rgba(26,217,138,.08)",border:"1px solid rgba(26,217,138,.2)",borderRadius:10,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"var(--green)",fontFamily:"var(--mono)",letterSpacing:".05em",marginBottom:6}}>ELAPSED TIME</div>
              <div style={{fontSize:28,fontWeight:700,color:"var(--green)",fontFamily:"var(--mono)"}}>{elapsed}</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>{clockInState.label}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{clockInState.position}</div>
            </div>
            <div style={{background:"var(--s3)",borderRadius:8,padding:"9px 12px",fontSize:11,color:"var(--t2)"}}>
              <div className="lbl" style={{marginBottom:2}}>Clocked in at</div>
              <div style={{fontWeight:600,color:"var(--t1)"}}>{new Date(clockInState.startTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
              {canViewRates && (
                <div style={{marginTop:6,borderTop:"1px solid var(--br)",paddingTop:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                    <span style={{color:"var(--t3)"}}>Charge rate</span>
                    <span className="mono" style={{color:"var(--green)",fontWeight:700}}>${clockInState.rate}/hr</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginTop:3}}>
                    <span style={{color:"var(--t3)"}}>Est. billable so far</span>
                    <span className="mono" style={{color:"var(--amber)",fontWeight:700}}>{fmt$c((Date.now()-clockInState.startTime)/3600000 * clockInState.rate)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-ft" style={{justifyContent:"space-between"}}>
            <button className="btn btn-ghost" onClick={onClose}>Keep Running</button>
            <button className="btn btn-danger btn-lg" style={{background:"var(--acc)",color:"#fff",border:"none"}} onClick={doClockOut}>
              {Ic.stopwatch} Clock Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isOtherProj) {
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal modal-sm anim">
          <div className="modal-hd">
            <div><div className="modal-ttl">Switch Projects?</div><div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{proj.name}</div></div>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
          </div>
          <div className="modal-body">
            <div style={{background:"rgba(232,156,24,.08)",border:"1px solid rgba(232,156,24,.2)",borderRadius:9,padding:"11px 13px",fontSize:11}}>
              <div style={{fontWeight:700,color:"var(--amber)",marginBottom:3}}>You're currently clocked in to:</div>
              <div style={{color:"var(--t1)"}}>{clockInState.projName}</div>
              <div style={{color:"var(--t3)",marginTop:2,fontSize:10}}>{clockInState.label} · {elapsed} elapsed</div>
            </div>
            <div style={{fontSize:12,color:"var(--t2)"}}>
              Clocking in to <strong style={{color:"var(--t1)"}}>{proj.name}</strong> will automatically clock you out of <strong style={{color:"var(--t1)"}}>{clockInState.projName}</strong> and log the shift.
            </div>
          </div>
          <div className="modal-ft" style={{justifyContent:"space-between"}}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={doClockIn}>{Ic.clock} Switch & Clock In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm anim">
        <div className="modal-hd">
          <div><div className="modal-ttl">Clock In</div><div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{proj.name}</div></div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>
        <div className="modal-body">
          <div>
            <div className="lbl">Clock In To</div>
            <div style={{display:"flex",gap:6}}>
              {[["project","Project"],["task","Task"],["trade","Trade"]].map(([k,l])=>(
                <button key={k} className={`chip${mode===k?" on":""}`} onClick={()=>setMode(k)}>{l}</button>
              ))}
            </div>
          </div>
          {mode==="task"  && <F label="Select Task"      value={selTask}  onChange={setSelTask}  options={TASKS_SEED.filter(t=>t.status==="open").map(t=>t.title)}/>}
          {mode==="trade" && <F label="Trade / Activity" value={selTrade} onChange={setSelTrade} options={trades}/>}

          <div style={{background:"var(--s3)",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:12,color:"var(--t1)"}}>{user.name}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{user.position}</div>
            </div>
            <div style={{fontSize:10,color:"var(--t3)",textAlign:"right"}}>
              {new Date().toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>

          {canViewRates && (
            <div style={{borderTop:"1px solid var(--br)",paddingTop:11}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div className="lbl" style={{margin:0}}>Rate Assignment</div>
                <button className="btn btn-ghost btn-xs" style={{fontSize:9,padding:"2px 7px"}} onClick={()=>setOverride(v=>!v)}>
                  {overrideOn ? "Use Auto" : "Override"}
                </button>
              </div>
              {overrideOn ? (
                <div>
                  <div style={{fontSize:11,color:"var(--t3)",marginBottom:6}}>Custom charge rate for this shift:</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{position:"relative",flex:1}}>
                      <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:13}}>$</span>
                      <input type="number" className="inp" value={customRate} onChange={e=>setCustomRate(e.target.value)} style={{paddingLeft:22}} placeholder={autoRates.chargeRate}/>
                    </div>
                    <span style={{fontSize:12,color:"var(--t3)"}}>/hr</span>
                  </div>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"var(--s3)",borderRadius:7,padding:"8px 10px"}}>
                    <div className="lbl">Pay Rate</div>
                    <div className="mono" style={{fontSize:14,fontWeight:700,color:"var(--amber)"}}>
                      ${autoRates.payRate}<span style={{fontSize:10,fontWeight:400,color:"var(--t3)"}}>/hr</span>
                    </div>
                    <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>Internal cost</div>
                  </div>
                  <div style={{background:"var(--s3)",borderRadius:7,padding:"8px 10px"}}>
                    <div className="lbl">Charge Rate</div>
                    <div className="mono" style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>
                      ${autoRates.chargeRate}<span style={{fontSize:10,fontWeight:400,color:"var(--t3)"}}>/hr</span>
                    </div>
                    <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>Billed to client</div>
                  </div>
                </div>
              )}
              {overrideOn && (
                <div style={{fontSize:10,color:"var(--t3)",marginTop:6}}>Auto rates: ${autoRates.payRate} pay · ${autoRates.chargeRate} charge</div>
              )}
            </div>
          )}
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-green btn-lg" onClick={doClockIn}>{Ic.clock} Clock In Now</button>
        </div>
      </div>
    </div>
  );
}

function NotifyModal({ proj, onClose, globalStaff=[] }) {
  // ── Staff selection (full object so we have photoUrl) ──
  const staffList = globalStaff.filter(s => s.firstName || s.lastName);
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || "");
  const selectedStaff = staffList.find(s => s.id === selectedStaffId) || staffList[0] || null;
  const techName  = selectedStaff ? `${selectedStaff.firstName||""} ${selectedStaff.lastName||""}`.trim() : "Crew";
  const photoUrl  = selectedStaff?.photoUrl || "";

  // ── ETA state: "loading" | "ready" | "denied" | "error" | "manual" ──
  const [eta,       setEta]       = useState("30");
  const [etaState,  setEtaState]  = useState("loading"); // drives the UI indicator
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [sendError, setSendError] = useState("");

  const firstName = (proj.client || "there").split(" ")[0];
  const msg = `Hi ${firstName}! Your Job-Dox crew is on the way. ${techName} will arrive in approx. ${eta} min. They are IICRC certified with photo ID. Questions? Reply here or call us. — Job-Dox`;

  // ── Geolocation + Distance Matrix on mount ──
  useEffect(() => {
    if (!navigator.geolocation) { setEtaState("manual"); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
          const dest   = encodeURIComponent(proj.address || "");
          if (!dest) { setEtaState("manual"); return; }

          const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
            `?origins=${origin}&destinations=${dest}` +
            `&departure_time=now&traffic_model=best_guess` +
            `&key=${GMAPS_KEY}`;

          const res  = await fetch(url);
          const data = await res.json();
          const el   = data?.rows?.[0]?.elements?.[0];

          if (el?.status === "OK" && el.duration_in_traffic?.value) {
            const mins = Math.ceil(el.duration_in_traffic.value / 60);
            setEta(String(mins));
            setEtaState("ready");
          } else {
            setEtaState("manual");
          }
        } catch {
          setEtaState("manual");
        }
      },
      () => setEtaState("denied"),    // user denied location
      { timeout: 8000 }
    );
  }, [proj.address]);

  const doSend = async () => {
    if (!proj.clientPhone) { setSendError("No client phone number on this project."); return; }
    setSending(true);
    setSendError("");
    try {
      await sendSMS({
        to:          proj.clientPhone,
        messageBody: msg,
        mediaUrl:    photoUrl,
        from:        phoneSettings?.twilioNumber || "",
        contactName: proj.client || proj.clientPhone,
        companyId,
        projectId:   proj.id,
      });
      setSent(true);
      setTimeout(onClose, 2500);
    } catch (err) {
      setSendError(err?.message || "Send failed — check your Twilio config.");
    } finally {
      setSending(false);
    }
  };

  // ── ETA indicator label ──
  const etaIndicator = {
    loading: { color:"var(--t3)",  text:"Getting your location…" },
    ready:   { color:"var(--green)",text:"Live traffic ETA" },
    denied:  { color:"var(--amber)",text:"Location denied — enter manually" },
    manual:  { color:"var(--amber)",text:"Enter ETA manually" },
    error:   { color:"var(--amber)",text:"Could not calculate — enter manually" },
  }[etaState] || { color:"var(--t3)", text:"" };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-sm anim">
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">{sent ? "Message Sent!" : "Notify Customer"}</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>
              {sent ? `Delivered to ${proj.clientPhone}` : `Auto-text to ${proj.client}`}
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>

        <div className="modal-body">
          {sent ? (
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(26,217,138,.15)",border:"2px solid var(--green)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"var(--green)",fontSize:22}}>
                {Ic.check}
              </div>
              <div style={{fontWeight:700,fontSize:15}}>Message sent{photoUrl ? " with photo" : ""}!</div>
              <div style={{fontSize:12,color:"var(--t2)",marginTop:4}}>Delivered to {proj.clientPhone}</div>
            </div>
          ) : (
            <>
              {/* Crew member selector */}
              <div>
                <label className="lbl">Crew Member</label>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  {/* Show real photo if available, else initials avatar */}
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={techName}
                      style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--br)",flexShrink:0}}
                      onError={e => { e.target.style.display="none"; }}
                    />
                  ) : (
                    <Av name={techName} color="var(--acc)" size={44}/>
                  )}
                  <select className="sel" style={{flex:1}} value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}>
                    {staffList.length > 0
                      ? staffList.map(s => {
                          const n = `${s.firstName||""} ${s.lastName||""}`.trim();
                          return <option key={s.id} value={s.id}>{n}</option>;
                        })
                      : <option value="">Crew</option>}
                  </select>
                </div>
                {/* Photo MMS indicator */}
                <div style={{marginTop:5,fontSize:10,color:photoUrl?"var(--green)":"var(--t3)",display:"flex",alignItems:"center",gap:4}}>
                  {photoUrl
                    ? <>{Ic.photo} Photo will be included as MMS</>
                    : <>No profile photo — will send as plain SMS. Add one in Settings › Staff.</>}
                </div>
              </div>

              {/* ETA field with live indicator */}
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <label className="lbl" style={{margin:0}}>ETA (minutes)</label>
                  <span style={{fontSize:9,color:etaIndicator.color,fontFamily:"var(--mono)",display:"flex",alignItems:"center",gap:4}}>
                    {etaState==="loading" && (
                      <span style={{width:8,height:8,border:"1.5px solid var(--t3)",borderTopColor:"var(--t2)",borderRadius:"50%",display:"inline-block",animation:"jd-spin .7s linear infinite"}}/>
                    )}
                    {etaState==="ready" && <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block"}}/>}
                    {etaIndicator.text}
                  </span>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    type="number"
                    className="inp"
                    value={eta}
                    onChange={e => { setEta(e.target.value); setEtaState("manual"); }}
                    style={{width:90,flexShrink:0}}
                    min="1"
                    max="999"
                  />
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",flex:1}}>
                    {["10","15","20","30","45","60"].map(n => (
                      <button key={n} className={`chip${eta===n?" on":""}`}
                        onClick={() => { setEta(n); setEtaState("manual"); }}
                        style={{fontSize:10,padding:"2px 8px"}}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message preview */}
              <div>
                <div className="lbl" style={{marginBottom:7}}>Message Preview</div>
                <div style={{background:"var(--s3)",borderRadius:10,padding:12,display:"flex",justifyContent:"flex-end",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
                  {photoUrl && (
                    <img src={photoUrl} alt="Staff photo"
                      style={{width:80,height:80,borderRadius:10,objectFit:"cover",border:"2px solid var(--br-hi)"}}
                      onError={e => { e.target.style.display="none"; }}/>
                  )}
                  <div className="sms-bubble">{msg}</div>
                </div>
              </div>

              {sendError && (
                <div style={{fontSize:11,color:"var(--acc)",background:"var(--acc-lo)",border:"1px solid rgba(228,53,49,.2)",borderRadius:7,padding:"8px 11px"}}>
                  {sendError}
                </div>
              )}
            </>
          )}
        </div>

        {!sent && (
          <div className="modal-ft">
            <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={doSend} disabled={sending || !proj.clientPhone}>
              {sending
                ? <><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"jd-spin .7s linear infinite",display:"inline-block"}}/> Sending…</>
                : <>{Ic.sms} Send Now</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommModal({ proj, onClose, currentUser, phoneSettings={}, companyId="" }) {
  const [msg,       setMsg]       = useState("");
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [sendError, setSendError] = useState("");
  const senderName = currentUser?.name || "your Job-Dox team";
  const quick = ["On our way!","Running ~15 min late","Please call us back","Crew arriving tomorrow 8am"];

  const doSend = async () => {
    if (!msg.trim() || !proj.clientPhone) return;
    setSending(true);
    setSendError("");
    try {
      await sendSMS({
        to:          proj.clientPhone,
        messageBody: msg.trim(),
        from:        phoneSettings?.twilioNumber || "",
        contactName: proj.client || proj.clientPhone,
        companyId,
        projectId:   proj.id,
      });
      setSent(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      setSendError(err?.message || "Send failed — check Twilio config.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm anim">
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">{sent ? "Sent!" : "Quick Contact"}</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{proj.client} · {proj.clientPhone}</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>
        <div className="modal-body">
          {sent ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(26,217,138,.12)",border:"2px solid var(--green)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"var(--green)"}}>{Ic.check}</div>
              <div style={{fontWeight:700,fontSize:14}}>Message delivered</div>
              <div style={{fontSize:11,color:"var(--t2)",marginTop:3}}>{proj.clientPhone}</div>
            </div>
          ) : (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <a href={`tel:${proj.clientPhone}`} className="btn btn-green btn-lg" style={{justifyContent:"center",textDecoration:"none"}} onClick={onClose}>{Ic.phone} Call</a>
                <a href={`sms:${proj.clientPhone}`} className="btn btn-blue btn-lg"  style={{justifyContent:"center",textDecoration:"none"}} onClick={onClose}>{Ic.sms} Open SMS</a>
              </div>
              <div>
                <label className="lbl">Custom Message</label>
                <textarea className="txa" value={msg} onChange={e=>setMsg(e.target.value)}
                  placeholder={`Hi ${(proj.client||"").split(" ")[0]}, this is ${senderName} from Job-Dox…`}
                  style={{minHeight:72}}/>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {quick.map(q=><button key={q} className="chip" onClick={()=>setMsg(q)}>{q}</button>)}
              </div>
              {sendError && (
                <div style={{fontSize:11,color:"var(--acc)",background:"var(--acc-lo)",borderRadius:7,padding:"7px 10px",border:"1px solid rgba(228,53,49,.2)"}}>{sendError}</div>
              )}
            </>
          )}
        </div>
        {!sent && (
          <div className="modal-ft">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            {msg.trim() && (
              <button className="btn btn-primary" onClick={doSend} disabled={sending || !proj.clientPhone}>
                {sending
                  ? <><span style={{width:11,height:11,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"jd-spin .7s linear infinite",display:"inline-block"}}/> Sending…</>
                  : <>{Ic.sms} Send SMS</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddProjModal({ onClose, onAdd, customWorkTypes=[], customStatuses=[], customProjectTypes=[], offices=[] }) {
  const [f, setF] = useState({name:"",type:"",address:"",city:"",state:"OK",zip:"",clientName:"",clientPhone:"",clientEmail:"",carrier:"",claim:"",adjuster:"",dateOfLoss:"",notes:"",officeId:""});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const s = (k,v) => setF(p=>({...p,[k]:v}));

  // ── Geo auto-assign ──
  const [geoStatus, setGeoStatus] = useState(null); // null | "pending" | { officeId, officeName, miles } | "fail" | "no-offices"
  const [officeOverridden, setOfficeOverridden] = useState(false);

  const autoAssignOffice = async () => {
    const geocodable = offices.filter(o => o.lat != null && o.lng != null);
    if (!geocodable.length) { setGeoStatus("no-offices"); return; }
    const q = [f.address, f.city, f.state, f.zip].filter(Boolean).join(", ");
    if (!q || q.length < 5) return;
    setGeoStatus("pending");
    const result = await geocodeAddress(q);
    if (!result) { setGeoStatus("fail"); return; }
    const found = nearestOffice(geocodable, result.lat, result.lng);
    if (!found) { setGeoStatus("fail"); return; }
    setF(p => ({ ...p, officeId: found.office.id }));
    setGeoStatus({ officeId: found.office.id, officeName: found.office.name, miles: found.miles });
    setOfficeOverridden(false);
  };

  // Load saved workflow templates once
  const savedTemplates = useMemo(() => loadWorkflowTemplates(), []);

  // Work type toggles — pull from company config
  const WT_OPTIONS = customWorkTypes.map(w=>w.name);
  const [selectedWTs, setSelectedWTs] = useState([]);
  const toggleWT = (type) => {
    setSelectedWTs(prev => {
      const exists = prev.find(w => w.type === type);
      if (exists) return prev.filter(w => w.type !== type);
      return [...prev, { type, status:"active", phase:"Initial Response" }];
    });
  };
  const isWTOn = (type) => !!selectedWTs.find(w => w.type === type);

  // Count how many selected WTs have saved templates
  const templatesAvailable = selectedWTs.filter(w => savedTemplates[w.type]).length;

  const projTypeNames = customProjectTypes.map(t=>t.name);
  const statusNames   = customStatuses.map(s=>s.name);

  const submit = async () => {
    if (!f.name || !f.type) return;
    // Build tasks from saved templates for each selected work type
    const templateTasks = [];
    selectedWTs.forEach(wt => {
      const tpl = savedTemplates[wt.type];
      if (!tpl) return;
      tpl.phases.forEach(ph => {
        ph.tasks.forEach(t => {
          templateTasks.push({
            id: uid(),
            title: t.title,
            assigned: t.assignedTo || "",
            priority: t.priority === "Critical" ? "high" : t.priority === "High" ? "med" : "low",
            status: "open",
            phase: ph.name,
            workType: wt.type,
            checklist: t.checklist || [],
            statusTrigger: t.statusTrigger || null,
            created: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
            due: "",
            comments: 0,
            fromTemplate: tpl.name,
          });
        });
      });
    });
    setSaving(true);
    setSaveError("");
    try {
      await onAdd({
        ...f,
        id: `JD-${new Date().getFullYear()}-${String(uid()).padStart(3,"0")}`,
        status: f.status || "New Lead",
        client: f.clientName,
        clientPhone: f.clientPhone,
        clientEmail: f.clientEmail,
        address: `${f.address}, ${f.city}, ${f.state} ${f.zip}`.trim(),
        created: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
        budget:0, spent:0, tasks: templateTasks.length, tasksOpen: templateTasks.length,
        worktypes: selectedWTs,
        templateTasks,
      });
      onClose();
    } catch(err) {
      setSaveError(err?.message || "Failed to create project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim">
        <div className="modal-hd"><div className="modal-ttl">New Project</div><button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button></div>
        <div className="modal-body">
          {(projTypeNames.length === 0 || statusNames.length === 0) && (
            <div style={{padding:"10px 14px",background:"rgba(232,156,24,.08)",border:"1px solid rgba(232,156,24,.22)",borderRadius:8,fontSize:11,color:"var(--amber)"}}>
              <strong>Setup required:</strong> Go to <strong>Settings › General</strong> to add{projTypeNames.length===0?" Project Types":""}{projTypeNames.length===0&&statusNames.length===0?" and":""}{statusNames.length===0?" Statuses":""} before creating projects.
            </div>
          )}
          <div><div className="sec" style={{marginBottom:7}}>Project</div>
            <F label="Project Name *" value={f.name} onChange={v=>s("name",v)} placeholder="e.g. Henderson Residence" span={2}/>
            <div className="g3" style={{marginTop:10}}>
              {projTypeNames.length > 0
                ? <F label="Loss Type *" value={f.type} onChange={v=>s("type",v)} options={projTypeNames}/>
                : <div><label className="lbl">Loss Type *</label><div style={{fontSize:11,color:"var(--t3)",padding:"8px 11px",background:"var(--s3)",borderRadius:7,border:"1px solid var(--br)"}}>None configured</div></div>}
              <F label="Date of Loss" value={f.dateOfLoss} onChange={v=>s("dateOfLoss",v)} type="date"/>
              {statusNames.length > 0
                ? <F label="Initial Status" value={f.status||statusNames[0]} onChange={v=>s("status",v)} options={statusNames}/>
                : <div><label className="lbl">Status</label><div style={{fontSize:11,color:"var(--t3)",padding:"8px 11px",background:"var(--s3)",borderRadius:7,border:"1px solid var(--br)"}}>None configured</div></div>}
            </div>
          </div>

          {/* ── Work Types ── */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div className="sec">Work Types</div>
              <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>Toggle to enable — drives CortexAI automations</div>
            </div>
            {WT_OPTIONS.length === 0 ? (
              <div style={{padding:"10px 14px",background:"var(--s3)",borderRadius:8,fontSize:11,color:"var(--t3)",border:"1px solid var(--br)"}}>
                No work types configured yet. Add them in <strong style={{color:"var(--t2)"}}>Settings › General › Work Types</strong>.
              </div>
            ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:7}}>
              {WT_OPTIONS.map(type => {
                const meta = getWTMeta(type, customWorkTypes);
                const on   = isWTOn(type);
                const hasTpl = !!savedTemplates[type];
                return (
                  <button key={type} onClick={()=>toggleWT(type)}
                    style={{display:"flex",alignItems:"center",gap:7,padding:"8px 11px",borderRadius:9,
                      border:`1.5px solid ${on ? meta.color : "var(--br)"}`,
                      background: on ? `${meta.color}14` : "var(--s2)",
                      cursor:"pointer",transition:"all .15s",textAlign:"left",flexWrap:"wrap"}}>
                    <span style={{color: on ? meta.color : "var(--t3)", display:"flex",alignItems:"center",flexShrink:0,fontSize:14}}>{meta.icon}</span>
                    <span style={{fontSize:11,fontWeight: on ? 700 : 400, color: on ? meta.color : "var(--t2)", flex:1, lineHeight:1.3}}>{type}</span>
                    {hasTpl
                      ? <span style={{fontSize:8,color:"var(--green)",fontFamily:"var(--mono)",flexShrink:0}}>TEMPLATE</span>
                      : <span style={{fontSize:8,color:"var(--amber)",fontFamily:"var(--mono)",flexShrink:0}}>NO WF</span>}
                  </button>
                );
              })}
            </div>
            )}
            {selectedWTs.length > 0 && (
              <div style={{marginTop:8,padding:"7px 10px",borderRadius:7,fontSize:11,
                background: templatesAvailable > 0 ? "rgba(26,217,138,.07)" : "rgba(232,156,24,.07)",
                border: `1px solid ${templatesAvailable > 0 ? "rgba(26,217,138,.2)" : "rgba(232,156,24,.2)"}`,
                color: templatesAvailable > 0 ? "var(--green)" : "var(--amber)"}}>
                {templatesAvailable > 0
                  ? <><span style={{fontFamily:"var(--mono)",fontWeight:700}}>{templatesAvailable} TEMPLATE{templatesAvailable!==1?"S":""} READY</span> — tasks will be auto-loaded from your saved CortexAI workflows on project creation.</>
                  : <><span style={{fontFamily:"var(--mono)",fontWeight:700}}>NO TEMPLATES YET</span> — build workflows in CortexAI and save them as templates to auto-populate tasks.</>}
              </div>
            )}
          </div>

          <div><div className="sec" style={{marginBottom:7}}>Loss Address</div>
            <div style={{gridColumn:"1/-1",marginBottom:8}}>
              <label className="lbl">Street Address</label>
              <input className="inp" value={f.address} onChange={e=>s("address",e.target.value)}
                onBlur={autoAssignOffice}
                placeholder="123 Main Street"/>
            </div>
            <div className="g3">
              <div>
                <label className="lbl">City</label>
                <input className="inp" value={f.city} onChange={e=>s("city",e.target.value)}
                  onBlur={autoAssignOffice} placeholder="Oklahoma City"/>
              </div>
              <div>
                <label className="lbl">State</label>
                <input className="inp" value={f.state} onChange={e=>s("state",e.target.value)}
                  onBlur={autoAssignOffice} placeholder="OK"/>
              </div>
              <div>
                <label className="lbl">ZIP</label>
                <input className="inp" value={f.zip} onChange={e=>s("zip",e.target.value)}
                  onBlur={autoAssignOffice} placeholder="73008"/>
              </div>
            </div>

            {/* ── Office assignment with geo status ── */}
            {offices.length > 0 && (
              <div style={{marginTop:10}}>
                <label className="lbl">Office Assignment</label>
                {/* Geo status pill */}
                {geoStatus === "pending" && (
                  <div style={{fontSize:10,color:"var(--amber)",fontFamily:"var(--mono)",marginBottom:6}}>
                    📍 Detecting nearest office…
                  </div>
                )}
                {geoStatus && typeof geoStatus === "object" && !officeOverridden && (
                  <div style={{fontSize:10,color:"var(--green)",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontFamily:"var(--mono)",fontWeight:700}}>📍 AUTO-ASSIGNED</span>
                    <span style={{color:"var(--t3)"}}>· {geoStatus.officeName} · {geoStatus.miles} mi away</span>
                  </div>
                )}
                {officeOverridden && (
                  <div style={{fontSize:10,color:"var(--amber)",marginBottom:6,fontFamily:"var(--mono)"}}>
                    ✏ MANUAL OVERRIDE
                  </div>
                )}
                {geoStatus === "fail" && (
                  <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>
                    Could not detect location — select office manually below.
                  </div>
                )}
                <select className="sel" value={f.officeId}
                  onChange={e=>{
                    s("officeId",e.target.value);
                    if (geoStatus && typeof geoStatus === "object" && e.target.value !== geoStatus.officeId) setOfficeOverridden(true);
                    else if (geoStatus && typeof geoStatus === "object") setOfficeOverridden(false);
                  }}>
                  <option value="">— No office assigned —</option>
                  {offices.map(o=><option key={o.id} value={o.id}>{o.name}{o.city?` · ${o.city}`:""}{!o.lat?" ⚠":""}</option>)}
                </select>
              </div>
            )}
          </div>
          <div><div className="sec" style={{marginBottom:7}}>Client / Insured</div>
            <div className="g3">
              <F label="Full Name" value={f.clientName} onChange={v=>s("clientName",v)} placeholder="First Last"/>
              <F label="Phone" value={f.clientPhone} onChange={v=>s("clientPhone",v)} placeholder="(405) 555-0000"/>
              <F label="Email" value={f.clientEmail} onChange={v=>s("clientEmail",v)} type="email" placeholder="name@email.com"/>
            </div>
          </div>
          <div><div className="sec" style={{marginBottom:7}}>Claim Information</div>
            <div className="g3">
              <F label="Insurance Carrier" value={f.carrier} onChange={v=>s("carrier",v)} placeholder="e.g. State Farm"/>
              <F label="Claim Number" value={f.claim} onChange={v=>s("claim",v)} placeholder="CLM-25-00000"/>
              <F label="Adjuster Name" value={f.adjuster} onChange={v=>s("adjuster",v)} placeholder="Full name"/>
            </div>
          </div>
          <F label="Initial Notes" value={f.notes} onChange={v=>s("notes",v)} rows={3} placeholder="Brief description of loss…"/>
        </div>
        <div className="modal-ft">
          {saveError && <span style={{flex:1,fontSize:11,color:"var(--acc)",fontFamily:"var(--mono)"}}>{saveError}</span>}
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-lg" onClick={submit} disabled={saving||!f.name||!f.type} style={{opacity:(!f.name||!f.type||saving)?.5:1}}>
            {saving ? "Saving…" : <>{Ic.plus} Create Project</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedActionPopup({ item, pos, onClose, onNavigate }) {
  const popRef = useRef();
  useEffect(()=>{
    const h = e => { if (popRef.current && !popRef.current.contains(e.target)) onClose(); };
    setTimeout(()=>document.addEventListener("mousedown",h),0);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const actions = [];
  actions.push({ icon:Ic.goto, label:`Open ${item.proj}`, color:"var(--acc)", bold:true, action:()=>{ onNavigate(item.projId, null); onClose(); }});
  if (item.actionType==="document") {
    actions.push({ icon:Ic.eye,     label:`View ${item.docName||"Document"}`,  color:"var(--blue)",   action:()=>{ onNavigate(item.projId, "documents"); onClose(); }});
    actions.push({ icon:Ic.doc,     label:"Open Documents tab",                color:"var(--blue)",   action:()=>{ onNavigate(item.projId, "documents"); onClose(); }});
  }
  if (item.actionType==="task") {
    actions.push({ icon:Ic.tasks,   label:"View task",                         color:"var(--green)",  action:()=>{ onNavigate(item.projId, "tasks"); onClose(); }});
    actions.push({ icon:Ic.comment, label:"Add comment",                       color:"var(--purple)", action:()=>{ onNavigate(item.projId, "tasks"); onClose(); }});
  }
  if (item.actionType==="scope")   actions.push({ icon:Ic.scope,   label:"Open Scope / Invoice",  color:"var(--amber)",  action:()=>{ onNavigate(item.projId, "scope"); onClose(); }});
  if (item.actionType==="message") {
    actions.push({ icon:Ic.msg, label:"View message thread", color:"var(--acc)", action:()=>{ onNavigate(item.projId, "messages"); onClose(); }});
    actions.push({ icon:Ic.sms, label:"Quick reply",         color:"var(--amber)", action:()=>{ onNavigate(item.projId, "messages"); onClose(); }});
  }
  if (item.actionType==="media")   actions.push({ icon:Ic.photo,  label:"View photos",       color:"var(--purple)", action:()=>{ onNavigate(item.projId, "media"); onClose(); }});
  if (item.actionType==="budget")  actions.push({ icon:Ic.dollar, label:"Open Finance tab",   color:"var(--green)",  action:()=>{ onNavigate(item.projId, "finance"); onClose(); }});
  if (item.actionType==="contact") actions.push({ icon:Ic.contact,label:"View Contacts",     color:"var(--blue)",   action:()=>{ onNavigate(item.projId, "contacts"); onClose(); }});
  if (item.actionType==="overview")actions.push({ icon:Ic.chart,  label:"View Overview",     color:"var(--teal)",   action:()=>{ onNavigate(item.projId, "overview"); onClose(); }});

  const style = { top: Math.min(pos.y, window.innerHeight - 320), left: Math.min(pos.x - 290, window.innerWidth - 310) };

  return (
    <div ref={popRef} className="feed-popup" style={style}>
      <div className="feed-popup-hd">
        <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
          <div style={{position:"relative",width:10,height:10,flexShrink:0,marginTop:3}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:item.color}}/>
            {item.live && <div style={{position:"absolute",inset:-2,borderRadius:"50%",border:`2px solid ${item.color}`,animation:"jd-ping 1.5s ease infinite"}}/>}
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",lineHeight:1.35}}>{item.action}</div>
            <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{item.proj} · {item.user} · {item.time}</div>
          </div>
        </div>
      </div>
      {actions.map((a,i)=>(
        <button key={i} className="feed-action-btn" onClick={a.action}>
          <div className="feed-action-icon" style={{background:a.color+"18",color:a.color}}>{a.icon}</div>
          <span style={{fontWeight:a.bold?700:400,color:a.bold?"var(--t1)":"var(--t2)"}}>{a.label}</span>
          {a.bold && <span style={{marginLeft:"auto",color:"var(--t3)"}}>{Ic.chev_r}</span>}
        </button>
      ))}
    </div>
  );
}

function PortfolioSidebar({ onNavigate }) {
  const [popup,    setPopup]    = useState(null);
  const [activity, setActivity] = useState(() => loadActivity());

  // Poll every 4 seconds so the feed updates without a full page refresh
  useEffect(() => {
    const interval = setInterval(() => setActivity(loadActivity()), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (e, item) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPopup({ item, x: r.left, y: r.top });
  };

  return (
    <div className="port-sidebar" style={{position:"relative"}}>
      {popup && <FeedActionPopup item={popup.item} pos={popup} onClose={()=>setPopup(null)} onNavigate={onNavigate}/>}
      <div className="port-sidebar-hd" style={{paddingBottom:10}}>
        <span>Activity Feed</span>
        <span className="mono" style={{fontSize:9,color:"var(--green)"}}>LIVE</span>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {activity.length === 0 && (
          <div style={{padding:"28px 16px",textAlign:"center",color:"var(--t3)"}}>
            <div style={{fontSize:22,opacity:.2,marginBottom:8}}>📋</div>
            <div style={{fontSize:11}}>No activity yet.</div>
            <div style={{fontSize:10,marginTop:4,lineHeight:1.5}}>Events appear here when tasks are created, invoices generated, calls logged, and more.</div>
          </div>
        )}
        {activity.map(item=>(
          <div key={item.id} className="feed-row" style={{cursor:"pointer",transition:"background .1s"}}
            onClick={e=>handleClick(e,item)}
            onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{position:"relative",width:9,height:9,flexShrink:0,marginTop:4}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:item.color}}/>
              {item.live && <div style={{position:"absolute",inset:-2,borderRadius:"50%",border:`2px solid ${item.color}`,animation:"jd-ping 1.5s ease infinite"}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:"var(--t1)",lineHeight:1.35}}>{item.action}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:2,display:"flex",gap:5,flexWrap:"wrap"}}>
                <span style={{color:item.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110,fontWeight:600}}>{item.proj}</span>
                <span>{item.user} · {item.time}</span>
              </div>
            </div>
            <div style={{color:"var(--t3)",flexShrink:0,opacity:.5,marginTop:2}}>{Ic.chev_r}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyDayPage({ onNavigate, currentUser, permissionLevel=1, globalStaff=[], currentMemberId="", companyId="", projects=[] }) {
  const canViewAllStaff = permissionLevel >= 5;

  // ── Staff picker: default to signed-in user, L5+ can toggle ──
  const [viewingStaffId, setViewingStaffId] = useState(currentMemberId || "__self__");
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);

  const viewingStaff = useMemo(() => {
    if (!canViewAllStaff || viewingStaffId === "__self__" || !viewingStaffId) return null;
    return globalStaff.find(s => s.id === viewingStaffId) || null;
  }, [viewingStaffId, globalStaff, canViewAllStaff]);

  const viewingName = viewingStaff
    ? `${viewingStaff.firstName||""} ${viewingStaff.lastName||""}`.trim()
    : currentUser?.name || "Me";

  // ── Tasks & Appointments — persisted to localStorage ──
  const tasksKey = companyId && currentMemberId ? `jd_myday_tasks_${companyId}_${currentMemberId}` : null;
  const [allTasks, setAllTasks] = useState(() => {
    if (!tasksKey) return MY_TASKS;
    try { return JSON.parse(localStorage.getItem(tasksKey)) || MY_TASKS; } catch { return MY_TASKS; }
  });
  const saveTasks = (tasks) => { if (tasksKey) { try { localStorage.setItem(tasksKey, JSON.stringify(tasks)); } catch {} } };

  // ── Pull in project tasks assigned to the current user ──
  const projTasks = useMemo(() => {
    if (!currentMemberId || !projects.length) return [];
    const result = [];
    for (const proj of projects) {
      const stored = _lsRead(proj.id, "tasks", null);
      if (!Array.isArray(stored)) continue;
      for (const t of stored) {
        if (!t.due) continue;
        if (!Array.isArray(t.assignedUserIds) || !t.assignedUserIds.includes(currentMemberId)) continue;
        result.push({
          ...t,
          date:   t.due,
          done:   t.status === "done",
          proj:   proj.name || proj.address || proj.id,
          projId: proj.id,
          _fromProject: true,
        });
      }
    }
    return result;
  }, [projects, currentMemberId, projTasksVersion]);

  // Merged list for display — My Day personal tasks + assigned project tasks, de-duped by id
  const allDisplayTasks = useMemo(() => {
    const ids = new Set(allTasks.map(t => t.id));
    return [...allTasks, ...projTasks.filter(t => !ids.has(t.id))];
  }, [allTasks, projTasks]);
  const [selDate, setSelDate]   = useState(TODAY_ISO);
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Version counter — increment after any write to project task localStorage to force projTasks to re-read
  const [projTasksVersion, setProjTasksVersion] = useState(0);
  const bumpProjTasks = () => setProjTasksVersion(v => v + 1);

  // New / edit task modal
  const [addingModal,  setAddingModal]  = useState(false);
  const [editingTask,  setEditingTask]  = useState(null);   // task object being edited
  const [addType,      setAddType]      = useState("task");
  const [newForm,      setNewForm]      = useState({title:"", priority:"med", due:"", time:"", notes:"", assignedUserIds:[], projId:null});
  const [commentTask,  setCommentTask]  = useState(null);
  const [expandedThread, setExpandedThread] = useState({}); // {taskId: bool}

  const toggleTask = id => {
    // If the task came from a project, toggle its status in project localStorage
    const projTask = projTasks.find(t => t.id === id);
    if (projTask && projTask.projId) {
      const stored = _lsRead(projTask.projId, "tasks", []);
      const updated = stored.map(x => x.id === id ? { ...x, status: x.status === "done" ? "open" : "done" } : x);
      _lsWrite(projTask.projId, "tasks", updated);
      bumpProjTasks();
      return;
    }
    // Otherwise update My Day personal tasks
    const updated = allTasks.map(x => x.id===id ? {...x, done:!x.done} : x);
    setAllTasks(updated);
    saveTasks(updated);
  };

  // Open edit modal pre-populated with an existing task
  const openEditModal = (t) => {
    setEditingTask(t);
    setAddType(t.type || "task");
    setNewForm({
      title:           t.title || "",
      priority:        t.priority || "med",
      due:             t.date || t.due || "",
      time:            t.time || "",
      notes:           t.notes || "",
      assignedUserIds: Array.isArray(t.assignedUserIds) ? t.assignedUserIds : [],
      projId:          t.projId || null,
    });
    setAddingModal(true);
  };

  const saveTask = () => {
    if (!newForm.title.trim()) return;
    const linkedProj = newForm.projId ? projects.find(p => p.id === newForm.projId) : null;

    if (editingTask) {
      // ── Edit existing task ──
      const patch = {
        ...editingTask,
        title:           newForm.title,
        priority:        newForm.priority,
        date:            newForm.due || editingTask.date,
        due:             newForm.due || editingTask.due,
        time:            newForm.time || editingTask.time,
        notes:           newForm.notes,
        assignedUserIds: newForm.assignedUserIds,
        proj:            linkedProj?.name || editingTask.proj || "",
        projId:          newForm.projId || editingTask.projId || null,
        type:            addType,
      };
      if (editingTask._fromProject && editingTask.projId) {
        // Write back to project storage
        const stored = _lsRead(editingTask.projId, "tasks", []);
        _lsWrite(editingTask.projId, "tasks", stored.map(x => x.id === editingTask.id ? { ...x, ...patch, status: x.status } : x));
        bumpProjTasks();
      } else {
        const updated = allTasks.map(x => x.id === editingTask.id ? patch : x);
        setAllTasks(updated);
        saveTasks(updated);
      }
      setEditingTask(null);
      setAddingModal(false);
      setNewForm({title:"", priority:"med", due:"", time:"", notes:"", assignedUserIds:[], projId:null});
      return;
    }

    // ── Create new task ──
    const t = {
      id: uid(),
      title: newForm.title,
      priority: newForm.priority,
      date: newForm.due || selDate,
      due:  newForm.due || selDate,
      type: addType,
      time: newForm.time || "08:00",
      notes: newForm.notes,
      assignedUserIds: newForm.assignedUserIds,
      assigned: viewingName,
      proj:   linkedProj?.name || "",
      projId: newForm.projId || null,
      done: false,
      commentThread: [],
    };
    const updated = [...allTasks, t];
    setAllTasks(updated);
    saveTasks(updated);
    pushActivity({
      actionType: addType === "appointment" ? "note" : "task",
      action:     `${addType === "appointment" ? "Appointment" : "Task"} created: ${newForm.title}`,
      proj:       linkedProj?.name || "Personal",
      projId:     newForm.projId || null,
      user:       currentUser?.name || "Staff",
    });
    setNewForm({title:"", priority:"med", due:"", time:"", notes:"", assignedUserIds:[], projId:null});
    setAddingModal(false);
  };

  const createTask = saveTask; // alias so the modal button can call either

  const toggleNewAssignee = (id) => {
    setNewForm(p => ({
      ...p,
      assignedUserIds: p.assignedUserIds.includes(id)
        ? p.assignedUserIds.filter(x => x !== id)
        : [...p.assignedUserIds, id],
    }));
  };

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const taskDates   = new Set(allDisplayTasks.map(t => t.date));
  const prevMonth = () => { if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); };
  const nextMonth = () => { if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); };

  const dayAppts = allDisplayTasks.filter(t => t.date===selDate && t.type==="appointment").sort((a,b)=>a.time.localeCompare(b.time));
  const dayTasks = allDisplayTasks.filter(t => t.date===selDate && t.type!=="appointment");
  const HOURS    = Array.from({length:12}, (_,i) => i+7);
  const priC     = {high:"var(--acc)", med:"var(--amber)", low:"var(--t3)"};
  const apptAt   = h => dayAppts.filter(a => parseInt(a.time.split(":")[0])===h);
  const dispDate = new Date(selDate+"T12:00:00");
  const isToday  = selDate===TODAY_ISO;

  return (
    <>
      {/* Add / Edit Task Modal */}
      {addingModal && (
        <div className="overlay" onClick={e => { if(e.target===e.currentTarget){setAddingModal(false);setEditingTask(null);} }}>
          <div className="modal modal-sm anim">
            <div className="modal-hd">
              <div>
                <div className="modal-ttl">{editingTask ? "Edit Task" : addType==="appointment" ? "New Appointment" : "New Task"}</div>
                {!editingTask && (
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>
                    {dispDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-xs" onClick={()=>{setAddingModal(false);setEditingTask(null);}}>{Ic.close}</button>
            </div>
            <div className="modal-body">
              {/* Type toggle */}
              {!editingTask && (
                <div style={{display:"flex",gap:5}}>
                  {["task","appointment"].map(tt => (
                    <button key={tt} className={`chip${addType===tt?" on":""}`} onClick={()=>setAddType(tt)}>
                      {tt==="task"?"Task":"Appointment"}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="lbl">{addType==="appointment"?"Title *":"Task *"}</label>
                <input className="inp" value={newForm.title} onChange={e=>setNewForm(p=>({...p,title:e.target.value}))} placeholder={addType==="appointment"?"e.g. Site walk-through":"e.g. Submit moisture readings"} autoFocus/>
              </div>

              <div className="g2" style={{gap:9}}>
                <div>
                  <label className="lbl">Priority</label>
                  <select className="sel" value={newForm.priority} onChange={e=>setNewForm(p=>({...p,priority:e.target.value}))}>
                    <option value="high">High</option>
                    <option value="med">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Due Date</label>
                  <input type="date" className="inp" value={newForm.due} onChange={e=>setNewForm(p=>({...p,due:e.target.value}))}/>
                </div>
                {addType==="appointment" && (
                  <div>
                    <label className="lbl">Time</label>
                    <input type="time" className="inp" value={newForm.time} onChange={e=>setNewForm(p=>({...p,time:e.target.value}))}/>
                  </div>
                )}
              </div>

              {/* Link to Project */}
              {projects.length > 0 && (
                <div>
                  <label className="lbl">Link to Project <span style={{color:"var(--t3)",fontWeight:400}}>(optional)</span></label>
                  <select className="sel" value={newForm.projId || ""} onChange={e=>setNewForm(p=>({...p,projId:e.target.value||null}))}>
                    <option value="">— Personal task —</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Assignment — creator is always auto-included, L5+ can add more */}
              <div>
                <label className="lbl">Assigned To</label>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                  {/* Always show current user as a chip */}
                  {currentMemberId && (() => {
                    const me = globalStaff.find(s=>s.id===currentMemberId);
                    const myName = me ? `${me.firstName||""} ${me.lastName||""}`.trim() : currentUser?.name || "Me";
                    const isSel = newForm.assignedUserIds.includes(currentMemberId);
                    return (
                      <button key={currentMemberId}
                        onClick={()=>toggleNewAssignee(currentMemberId)}
                        style={{
                          display:"flex",alignItems:"center",gap:5,
                          padding:"3px 9px",borderRadius:20,border:`1px solid ${isSel?"var(--acc)":"var(--br)"}`,
                          background:isSel?"var(--acc-lo)":"transparent",
                          color:isSel?"var(--acc)":"var(--t2)",cursor:"pointer",fontSize:11,transition:"all .12s",
                        }}>
                        <Av name={myName} color="var(--acc)" size={18}/>
                        {myName} (me)
                        {isSel && <span style={{color:"var(--acc)"}}>{Ic.check}</span>}
                      </button>
                    );
                  })()}
                  {canViewAllStaff && globalStaff.filter(s=>s.id!==currentMemberId).map((s,i) => {
                    const name = `${s.firstName||""} ${s.lastName||""}`.trim() || s.email || s.id;
                    const sel  = newForm.assignedUserIds.includes(s.id);
                    return (
                      <button key={s.id}
                        onClick={() => toggleNewAssignee(s.id)}
                        style={{
                          display:"flex",alignItems:"center",gap:5,
                          padding:"3px 9px",borderRadius:20,border:`1px solid ${sel?"var(--blue)":"var(--br)"}`,
                          background:sel?"rgba(91,163,245,.12)":"transparent",
                          color:sel?"var(--blue)":"var(--t2)",cursor:"pointer",fontSize:11,transition:"all .12s",
                        }}>
                        <Av name={name} color={AVCOLORS[(i+1) % AVCOLORS.length]} size={18}/>
                        {name}
                        {sel && <span style={{color:"var(--blue)"}}>{Ic.check}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="lbl">Notes</label>
                <textarea className="txa" value={newForm.notes} onChange={e=>setNewForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Optional details…"/>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-ghost" onClick={()=>{setAddingModal(false);setEditingTask(null);}}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTask} disabled={!newForm.title.trim()}>
                {editingTask ? <>{Ic.check} Save Changes</> : addType==="appointment" ? <>{Ic.calendar} Create Appointment</> : <>{Ic.plus} Create Task</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Comment Modal */}
      {commentTask && (
        <TaskCommentModal
          task={commentTask}
          onClose={() => setCommentTask(null)}
          currentUserName={viewingName}
          globalStaff={globalStaff}
          companyId={companyId}
          phoneSettings={phoneSettings}
        />
      )}

      <div className="topbar">
        <div>
          <div className="topbar-ttl" style={{display:"flex",alignItems:"center",gap:8}}>
            My Day
            {/* Staff picker for L5+ */}
            {canViewAllStaff && (
              <div style={{position:"relative"}}>
                <button
                  onClick={() => setStaffPickerOpen(v => !v)}
                  style={{
                    display:"flex",alignItems:"center",gap:6,
                    background:"var(--s3)",border:`1px solid ${viewingStaffId!=="__self__"?"var(--blue)":"var(--br)"}`,
                    borderRadius:20,padding:"2px 10px 2px 6px",cursor:"pointer",
                    color:viewingStaffId!=="__self__"?"var(--blue)":"var(--t2)",fontSize:11,transition:"all .15s",
                  }}>
                  <Av name={viewingName} color={viewingStaffId!=="__self__"?"var(--blue)":"var(--acc)"} size={20}/>
                  <span>{viewingName}</span>
                  <span style={{fontSize:9,opacity:.6}}>{Ic.chevron}</span>
                </button>
                {staffPickerOpen && (
                  <div style={{
                    position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:600,
                    background:"var(--s2)",border:"1px solid var(--br-hi)",borderRadius:10,
                    boxShadow:"0 8px 32px rgba(0,0,0,.35)",minWidth:200,overflow:"hidden",animation:"jd-pop .15s ease",
                  }}>
                    <div style={{padding:"7px 10px",borderBottom:"1px solid var(--br)"}}>
                      <div className="mono" style={{fontSize:9,color:"var(--t3)"}}>VIEW DAY FOR</div>
                    </div>
                    {/* Myself first */}
                    <button onClick={()=>{setViewingStaffId("__self__");setStaffPickerOpen(false);}}
                      style={{
                        width:"100%",background:viewingStaffId==="__self__"?"var(--acc-lo)":"transparent",
                        border:"none",padding:"9px 12px",display:"flex",alignItems:"center",gap:9,
                        cursor:"pointer",borderBottom:"1px solid var(--br)",color:viewingStaffId==="__self__"?"var(--acc)":"var(--t1)",
                        fontSize:12,fontFamily:"var(--ui)",
                      }}>
                      <Av name={currentUser?.name||"Me"} color="var(--acc)" size={28}/>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontWeight:600}}>{currentUser?.name||"Me"}</div>
                        <div style={{fontSize:10,color:"var(--t3)"}}>You · {currentUser?.position||""}</div>
                      </div>
                      {viewingStaffId==="__self__" && <span style={{marginLeft:"auto"}}>{Ic.check}</span>}
                    </button>
                    {globalStaff.filter(s => s.id !== currentMemberId).map((s,i) => {
                      const name = `${s.firstName||""} ${s.lastName||""}`.trim() || s.email || s.id;
                      const isSel = viewingStaffId === s.id;
                      return (
                        <button key={s.id}
                          onClick={()=>{setViewingStaffId(s.id);setStaffPickerOpen(false);}}
                          style={{
                            width:"100%",background:isSel?"var(--acc-lo)":"transparent",
                            border:"none",padding:"9px 12px",display:"flex",alignItems:"center",gap:9,
                            cursor:"pointer",borderBottom:"1px solid var(--br)",color:isSel?"var(--acc)":"var(--t1)",
                            fontSize:12,fontFamily:"var(--ui)",
                          }}>
                          <Av name={name} color={AVCOLORS[(i+1) % AVCOLORS.length]} size={28}/>
                          <div style={{textAlign:"left"}}>
                            <div style={{fontWeight:600}}>{name}</div>
                            <div style={{fontSize:10,color:"var(--t3)"}}>{s.systemRole||s.title||"Staff"}</div>
                          </div>
                          {isSel && <span style={{marginLeft:"auto"}}>{Ic.check}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="topbar-sub">{isToday?"TODAY · ":""}{dispDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase()}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button className="btn btn-ghost btn-xs" onClick={()=>{setEditingTask(null);setAddType("appointment");setNewForm(p=>({...p,assignedUserIds:currentMemberId&&!p.assignedUserIds.includes(currentMemberId)?[...p.assignedUserIds,currentMemberId]:p.assignedUserIds}));setAddingModal(true);}}>{Ic.calendar} Appointment</button>
          <button className="btn btn-primary btn-xs" onClick={()=>{setEditingTask(null);setAddType("task");setNewForm(p=>({...p,assignedUserIds:currentMemberId&&!p.assignedUserIds.includes(currentMemberId)?[...p.assignedUserIds,currentMemberId]:p.assignedUserIds}));setAddingModal(true);}}>{Ic.plus} New Task</button>
          <div style={{width:1,height:18,background:"var(--br)",margin:"0 2px"}}/>
          <button className="btn btn-ghost btn-xs" onClick={()=>setSelDate(TODAY_ISO)} style={isToday?{color:"var(--acc)",borderColor:"var(--acc)"}:{}}>Today</button>
          <button className="btn btn-ghost btn-xs" onClick={()=>{const d=new Date(selDate+"T12:00:00");d.setDate(d.getDate()-1);setSelDate(d.toISOString().slice(0,10));}}>{Ic.chev_l} Prev</button>
          <button className="btn btn-ghost btn-xs" onClick={()=>{const d=new Date(selDate+"T12:00:00");d.setDate(d.getDate()+1);setSelDate(d.toISOString().slice(0,10));}}>Next {Ic.chev_r}</button>
        </div>
      </div>

      <div className="myday-page">
        {/* Left sidebar: mini calendar + stats */}
        <div className="myday-left">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <button className="btn btn-ghost btn-xs" onClick={prevMonth} style={{padding:"3px 7px"}}>{Ic.chev_l}</button>
            <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{MONTHS[calMonth]} {calYear}</div>
            <button className="btn btn-ghost btn-xs" onClick={nextMonth} style={{padding:"3px 7px"}}>{Ic.chev_r}</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d=><div key={d} className="cal-hdr">{d}</div>)}
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day   = i+1;
              const iso   = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isSel = iso===selDate;
              const isTod = iso===TODAY_ISO;
              const hasTsk= taskDates.has(iso);
              return (
                <button key={day} className={`cal-day${isSel?" sel":isTod?" today":""}`} onClick={()=>setSelDate(iso)}>
                  {day}
                  {hasTsk&&!isSel&&<span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:isTod?"var(--acc)":"var(--amber)",display:"block"}}/>}
                </button>
              );
            })}
          </div>

          <div style={{marginTop:16,background:"var(--s2)",borderRadius:9,padding:"10px 12px",border:"1px solid var(--br)"}}>
            <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:8}}>SELECTED DAY</div>
            <div style={{display:"flex",gap:12}}>
              {[["Appointments",dayAppts.length,"var(--blue)"],["Tasks",dayTasks.filter(t=>!t.done).length,"var(--amber)"]].map(([l,n,c])=>(
                <div key={l} style={{flex:1,background:"var(--s3)",borderRadius:7,padding:"7px 9px"}}>
                  <div className="mono" style={{fontSize:16,fontWeight:700,color:c}}>{n}</div>
                  <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {dayAppts.length > 0 && (
            <div style={{marginTop:12}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:6}}>APPOINTMENTS</div>
              {dayAppts.map(a=>(
                <div key={a.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid var(--br)",alignItems:"center",cursor:"pointer"}}
                  onClick={()=>a.projId?onNavigate(a.projId,"overview"):setCommentTask(a)}>
                  <div className="mono" style={{fontSize:10,color:"var(--blue)",flexShrink:0,width:38}}>{a.time}</div>
                  <div style={{flex:1,minWidth:0,fontSize:11,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</div>
                </div>
              ))}
            </div>
          )}

          {/* Staff info panel when viewing another person */}
          {canViewAllStaff && viewingStaff && (
            <div style={{marginTop:12,background:"rgba(91,163,245,.07)",border:"1px solid rgba(91,163,245,.2)",borderRadius:9,padding:"10px 12px"}}>
              <div className="mono" style={{fontSize:9,color:"var(--blue)",marginBottom:6}}>VIEWING AS</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <Av name={viewingName} color="var(--blue)" size={32}/>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{viewingName}</div>
                  <div style={{fontSize:10,color:"var(--t3)"}}>{viewingStaff.systemRole||viewingStaff.title||"Staff"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content: tasks + schedule */}
        <div className="myday-main">
          {dayTasks.length > 0 && (
            <div style={{marginBottom: dayAppts.length > 0 ? 24 : 0}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:10,letterSpacing:".08em"}}>TASKS</div>
              <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,overflow:"hidden"}}>
                {dayTasks.map((t,i)=>{
                  const thread = t.commentThread || [];
                  const threadOpen = !!expandedThread[t.id];
                  return (
                    <div key={t.id} style={{borderBottom:i<dayTasks.length-1?"1px solid var(--br)":"none"}}>
                      <div className="checklist-item">
                        <div className={`chk${t.done?" done":""}`} onClick={()=>toggleTask(t.id)}>
                          {t.done && <span style={{color:"#fff"}}>{Ic.check}</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:t.done?"var(--t3)":"var(--t1)",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
                          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2,flexWrap:"wrap"}}>
                            <span style={{fontSize:10,color:"var(--t3)"}}>{t.proj||"Personal"}</span>
                            {t.due && <span style={{fontSize:9,color:"var(--amber)",fontFamily:"var(--mono)"}}>Due {t.due}</span>}
                          </div>
                          {(Array.isArray(t.assignedUserIds) && t.assignedUserIds.length > 0 && globalStaff.length > 0) && (
                            <div style={{display:"flex",gap:2,marginTop:3}}>
                              {t.assignedUserIds.slice(0,4).map((id,idx) => {
                                const s = globalStaff.find(x=>x.id===id);
                                return s ? <Av key={id} name={`${s.firstName||""} ${s.lastName||""}`.trim()} color={AVCOLORS[idx%AVCOLORS.length]} size={16}/> : null;
                              })}
                              {t.assignedUserIds.length > 4 && <span style={{fontSize:9,color:"var(--t3)",marginLeft:2}}>+{t.assignedUserIds.length-4}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:priC[t.priority]||"var(--t3)"}}/>
                          {!t._fromProject && (
                            <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9}} title="Edit task"
                              onClick={()=>openEditModal(t)}>
                              {Ic.edit||<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>}
                            </button>
                          )}
                          <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9,color:threadOpen?"var(--blue)":"",background:threadOpen?"rgba(91,163,245,.1)":""}}
                            onClick={()=>setExpandedThread(p=>({...p,[t.id]:!p[t.id]}))}>
                            {Ic.comment}
                            {thread.length > 0 && <span className="mono" style={{fontSize:8,marginLeft:2,color:"var(--purple)"}}>{thread.length}</span>}
                          </button>
                          {t.projId && <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9}} onClick={()=>onNavigate(t.projId,"tasks")}>{Ic.goto}</button>}
                        </div>
                      </div>
                      {/* Inline comment thread */}
                      {threadOpen && (
                        <div style={{background:"var(--s3)",borderTop:"1px solid var(--br)",padding:"10px 14px 10px 46px"}}>
                          {thread.length === 0 && (
                            <div style={{fontSize:10,color:"var(--t3)",marginBottom:8}}>No comments yet. Start the conversation below.</div>
                          )}
                          {thread.map((c,ci)=>(
                            <div key={ci} style={{display:"flex",gap:8,marginBottom:8}}>
                              <Av name={c.author||"?"} color={AVCOLORS[ci%AVCOLORS.length]} size={22}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",gap:8,alignItems:"baseline"}}>
                                  <span style={{fontSize:11,fontWeight:600,color:"var(--t1)"}}>{c.author}</span>
                                  <span style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{c.ts ? new Date(c.ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : ""}</span>
                                </div>
                                <div style={{fontSize:11,color:"var(--t2)",marginTop:1,lineHeight:1.45}}>{c.text}</div>
                              </div>
                            </div>
                          ))}
                          <InlineCommentBox
                            authorName={currentUser?.name || "Staff"}
                            onSubmit={(text) => {
                              const newComment = { author: currentUser?.name||"Staff", text, ts: new Date().toISOString() };
                              if (t._fromProject && t.projId) {
                                const stored = _lsRead(t.projId, "tasks", []);
                                _lsWrite(t.projId, "tasks", stored.map(x => x.id===t.id ? {...x, commentThread:[...(x.commentThread||[]),newComment]} : x));
                                bumpProjTasks();
                              } else {
                                const updated = allTasks.map(x => x.id===t.id ? {...x, commentThread:[...(x.commentThread||[]),newComment]} : x);
                                setAllTasks(updated); saveTasks(updated);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dayAppts.length > 0 ? (
            <>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:14,letterSpacing:".08em"}}>SCHEDULE</div>
              {HOURS.map(h=>{
                const appts = apptAt(h);
                const hasAppt = appts.length > 0;
                const timeStr = `${h > 12 ? h-12 : h}:00 ${h>=12?"PM":"AM"}`;
                return (
                  <div key={h} className="time-slot">
                    <div className="time-label">{timeStr}</div>
                    <div className={`time-line${hasAppt?" has-appt":""}`}/>
                    <div style={{flex:1,paddingBottom:4}}>
                      {appts.map(a=>(
                        <div key={a.id} className={`appt-block${a.done?" done-appt":""}`}
                          style={{marginBottom:4,borderLeftColor:priC[a.priority]||"var(--blue)"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                            <div style={{minWidth:0,flex:1}}>
                              <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",textDecoration:a.done?"line-through":"none"}}>{a.title}</div>
                              <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{a.proj||"Personal"} · {a.time}</div>
                              {/* Multi-assignee display */}
                              {(Array.isArray(a.assignedUserIds) && a.assignedUserIds.length > 1 && globalStaff.length > 0) && (
                                <div style={{display:"flex",gap:2,marginTop:3}}>
                                  {a.assignedUserIds.slice(0,4).map((id,idx) => {
                                    const s = globalStaff.find(x=>x.id===id);
                                    return s ? <Av key={id} name={`${s.firstName||""} ${s.lastName||""}`.trim()} color={AVCOLORS[idx%AVCOLORS.length]} size={16}/> : null;
                                  })}
                                </div>
                              )}
                            </div>
                            <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                              <span style={{width:6,height:6,borderRadius:"50%",background:priC[a.priority]||"var(--t3)",display:"block"}}/>
                              <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9}} onClick={()=>setCommentTask(a)}>
                                {Ic.comment}
                              </button>
                              <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9}} onClick={()=>toggleTask(a.id)}>{a.done?"Undo":"Done"}</button>
                              {a.projId && <button className="btn btn-blue btn-xs" style={{padding:"2px 7px",fontSize:9}} onClick={()=>onNavigate(a.projId,"overview")}>{Ic.goto}</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : dayTasks.length === 0 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"44px 0",color:"var(--t3)"}}>
              <div style={{opacity:.15,fontSize:28}}>{Ic.calendar}</div>
              <div className="mono" style={{fontSize:11}}>NOTHING SCHEDULED</div>
              <div style={{fontSize:11}}>No tasks or appointments for this day.</div>
              <div style={{display:"flex",gap:7,marginTop:8}}>
                <button className="btn btn-ghost btn-xs" onClick={()=>{setEditingTask(null);setAddType("appointment");setNewForm(p=>({...p,assignedUserIds:currentMemberId&&!p.assignedUserIds.includes(currentMemberId)?[...p.assignedUserIds,currentMemberId]:p.assignedUserIds}));setAddingModal(true);}}>{Ic.calendar} Add Appointment</button>
                <button className="btn btn-primary btn-xs" onClick={()=>{setEditingTask(null);setAddType("task");setNewForm(p=>({...p,assignedUserIds:currentMemberId&&!p.assignedUserIds.includes(currentMemberId)?[...p.assignedUserIds,currentMemberId]:p.assignedUserIds}));setAddingModal(true);}}>{Ic.plus} Add Task</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PortfolioPage({ projects, onSelect, onAdd, onNavigate, clockInState, onClockIn, onClockOut, currentUser, canViewRates, canViewBudget=false, canAddProject=false, currentMemberId="", globalStaff=[], customWorkTypes=[], customStatuses=[], customProjectTypes=[], offices=[], companyId="", phoneSettings={} }) {
  const [search, setSearch]   = useState("");
  const [fType, setFType]     = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [fOffice, setFOffice] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [clockProj, setClock] = useState(null);
  const [notifyProj, setNotify]= useState(null);
  const [commProj, setComm]   = useState(null);
  const [viewMode, setViewMode]= useState("card");

  // Dynamic filter options from company config
  const statusFilterOpts = ["All", ...customStatuses.map(s=>s.name)];
  const typeFilterOpts   = ["All", ...customProjectTypes.map(t=>t.name)];

  const filtered = projects.filter(p => {
    // Restrict by permission level
    if (!canViewBudget && !canAddProject) {
      // levels 1-4: can only see projects at their office or assigned to them
      const inMyOffice = !p.officeId || (globalStaff.find(s=>s.id===currentMemberId)?.officeIds||[]).some(oid=>oid===p.officeId);
      // level 1-2: only own projects (we use assignedStaffIds if it exists, else show all)
      if (!inMyOffice && !canAddProject) return false;
    }
    const q = search.toLowerCase();
    return (!q || [p.name,p.address,p.client||""].join(" ").toLowerCase().includes(q))
      && (fType==="All"   || p.type===fType)
      && (fStatus==="All" || p.status===fStatus)
      && (fOffice==="All" || p.officeId===fOffice);
  });
  const openMaps = (proj) => window.open(`https://maps.google.com/?q=${encodeURIComponent(proj.address)}`,"_blank");

  return (
    <>
      {showAdd    && <AddProjModal onClose={()=>setShowAdd(false)} onAdd={onAdd} customWorkTypes={customWorkTypes} customStatuses={customStatuses} customProjectTypes={customProjectTypes} offices={offices}/>}
      {clockProj  && <ClockInModal proj={clockProj} clockInState={clockInState} onClockIn={onClockIn} onClockOut={onClockOut} onClose={()=>setClock(null)} currentUser={currentUser} canViewRates={canViewRates}/>}
      {notifyProj && <NotifyModal proj={notifyProj} onClose={()=>setNotify(null)} globalStaff={globalStaff}/>}
      {commProj   && <CommModal    proj={commProj}   onClose={()=>setComm(null)} currentUser={currentUser} phoneSettings={phoneSettings} companyId={companyId}/>}

      <div className="topbar">
        <div><div className="topbar-ttl">Projects</div><div className="topbar-sub">JOB-DOX · PORTFOLIO</div></div>
        <div className="search" style={{flex:1,maxWidth:400,margin:"0 14px"}}>{Ic.search}<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects, clients, addresses…"/></div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginRight:8}}>
          <span className="mono" style={{fontSize:9,color:"var(--t3)",letterSpacing:".06em"}}>VIEW</span>
          <div className="view-toggle">
            <button className={`view-toggle-btn${viewMode==="card"?" on":""}`} title="Card view" onClick={()=>setViewMode("card")}>{Ic.ic_grid}</button>
            <button className={`view-toggle-btn${viewMode==="list"?" on":""}`} title="List view" onClick={()=>setViewMode("list")}>{Ic.ic_list}</button>
          </div>
        </div>
        {canAddProject && <button className="btn btn-primary btn-lg" onClick={()=>setShowAdd(true)}>{Ic.plus} New Project</button>}
      </div>

      <div className="kpi-bar">
        {[["Active",projects.filter(p=>p.status==="In Progress").length,"var(--blue)"],...(canViewBudget?[["Total Budget",fmt$(projects.reduce((s,p)=>s+p.budget,0)),"var(--green)"]]:[[]]),...[["Open Tasks",projects.reduce((s,p)=>s+p.tasksOpen,0),"var(--amber)"],["Completed",projects.filter(p=>p.status==="Completed").length,"var(--t2)"]]].map(([l,v,c])=>(
          <div key={l} className="kpi"><div className="kpi-val" style={{color:c}}>{v}</div><div className="kpi-lbl">{l}</div></div>
        ))}
      </div>

      <div className="port-body">
        <div className="port-projects">
          <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
            <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>TYPE</span>
            {typeFilterOpts.map(t=><button key={t} className={`chip${fType===t?" on":""}`} onClick={()=>setFType(t)}>{t}</button>)}
            <span style={{width:1,height:15,background:"var(--br)",margin:"0 3px"}}/>
            <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>STATUS</span>
            {statusFilterOpts.map(s=>{
              const stConf = customStatuses.find(c=>c.name===s);
              return <button key={s} className={`chip${fStatus===s?" on":""}`} onClick={()=>setFStatus(s)}
                style={fStatus===s && stConf ? {borderColor:stConf.color,color:stConf.color,background:`${stConf.color}18`} : {}}>{s}</button>;
            })}
            {offices.length > 0 && <>
              <span style={{width:1,height:15,background:"var(--br)",margin:"0 3px"}}/>
              <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>OFFICE</span>
              <button className={`chip${fOffice==="All"?" on":""}`} onClick={()=>setFOffice("All")}>All</button>
              {offices.map(o=>{
                const oc = o.color||"var(--teal)";
                return <button key={o.id} className={`chip${fOffice===o.id?" on":""}`} onClick={()=>setFOffice(o.id)}
                  style={fOffice===o.id?{borderColor:oc,color:oc,background:`${oc}18`}:{}}>{o.name}</button>;
              })}
            </>}
          </div>

          {viewMode === "card" && (
            <div className="proj-grid">
              {filtered.map(proj => {
                const ptConf = customProjectTypes.find(t=>t.name===proj.type);
                const tc = ptConf?.color || TYPE_C[proj.type]||"var(--t3)";
                const stConf2 = customStatuses.find(s=>s.name===proj.status);
                const sp = pct(proj.spent, proj.budget);
                const isClocked = clockInState?.projId === proj.id;
                return (
                  <div key={proj.id} className="proj-card anim">
                    <div className="proj-accent" style={{background:tc}}/>
                    <div className="proj-body" onClick={()=>onSelect(proj)}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:7,marginBottom:4}}>
                        <div style={{minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",lineHeight:1.3}}>{proj.name}</div>
                            {isClocked && <span style={{fontSize:8,background:"rgba(26,217,138,.15)",color:"var(--green)",borderRadius:4,padding:"1px 5px",fontFamily:"var(--mono)",flexShrink:0}}>ACTIVE</span>}
                            <FinancialHealthBadge projId={proj.id} companyId={companyId}/>
                          </div>
                          <div className="mono" style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{proj.id}</div>
                        </div>
                        <Badge status={proj.status} customStatuses={customStatuses}/>
                      </div>
                      <div style={{fontSize:11,color:"var(--t2)",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.address}</div>
                      <WorkTypePills worktypes={proj.worktypes} customWorkTypes={customWorkTypes}/>
                      {proj.budget > 0 && (
                        <div style={{marginBottom:7}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t3)",marginBottom:2}}><span>Budget</span><span className="mono">{sp}%</span></div>
                          <div className="bar-track"><div className="bar-fill" style={{width:`${sp}%`,background:sp>85?"var(--acc)":sp>60?"var(--amber)":"var(--green)"}}/></div>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--t2)"}}>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.client}</span>
                        {proj.tasksOpen>0 && <span className="mono" style={{fontSize:10,color:"var(--amber)",flexShrink:0,marginLeft:8}}>{proj.tasksOpen} open</span>}
                      </div>
                    </div>
                    {isClocked && (
                      <div className="clocked-banner">
                        <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"block",animation:"jd-ping 1.5s ease infinite"}}/>
                        You are clocked in to this project
                      </div>
                    )}
                    <div className="proj-actions" onClick={e=>e.stopPropagation()}>
                      <button className={`pab ${isClocked?"pab-danger":"pab-green"}`} onClick={()=>setClock(proj)}>
                        {isClocked ? <>{Ic.stopwatch} Clock Out</> : <>{Ic.clock} Clock In</>}
                      </button>
                      <button className="pab pab-blue" onClick={()=>setNotify(proj)}>{Ic.notify} Notify</button>
                      <button className="pab" onClick={()=>openMaps(proj)}>{Ic.map} Navigate</button>
                      <button className="pab pab-amber" onClick={()=>setComm(proj)}>{Ic.phone} Contact</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "list" && (
            <div className="proj-list">
              <div style={{display:"grid",gridTemplateColumns:"4px 2fr 1.2fr 110px 120px 80px",gap:0,padding:"3px 13px 3px 4px",marginBottom:2}}>
                {["","Project","Work Types","Status","Budget",""].map((h,i)=><div key={i} className="mono" style={{fontSize:9,color:"var(--t3)",padding:"0 8px"}}>{h}</div>)}
              </div>
              {filtered.map(proj=>{
                const tc = TYPE_C[proj.type]||"var(--t3)";
                const sp = pct(proj.spent, proj.budget);
                const isClocked = clockInState?.projId === proj.id;
                return (
                  <div key={proj.id} className="proj-list-row anim" style={{borderLeft:`3px solid ${isClocked?"var(--green)":tc}`}}>
                    <div className="proj-list-body" onClick={()=>onSelect(proj)}>
                      <div style={{minWidth:0,flex:"2"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.name}</span>
                          {isClocked && <span style={{fontSize:8,background:"rgba(26,217,138,.15)",color:"var(--green)",borderRadius:4,padding:"1px 5px",fontFamily:"var(--mono)",flexShrink:0}}>ACTIVE</span>}
                          <FinancialHealthBadge projId={proj.id} companyId={companyId}/>
                        </div>
                        <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{proj.id} · {proj.client}</div>
                      </div>
                      <div style={{flex:"1.2",minWidth:0,display:"flex",flexDirection:"column",gap:3}}>
                        {(proj.worktypes||[]).slice(0,2).map((wt,i)=>{
                          const meta  = WT_META[wt.type]||{color:"var(--t3)",icon:null};
                          const phase = WT_PHASE_C[wt.status]||WT_PHASE_C.pending;
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:phase.bg,border:`1px solid ${phase.border}`,borderRadius:5,padding:"2px 6px",borderLeft:`2px solid ${meta.color}`}}>
                              <span style={{color:meta.color,display:"flex",alignItems:"center",flexShrink:0}}>{meta.icon}</span>
                              <span style={{fontSize:9,fontWeight:700,color:meta.color,flexShrink:0}}>{wt.type}</span>
                              <span style={{fontSize:8,color:phase.text,fontFamily:"var(--mono)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wt.phase}</span>
                            </div>
                          );
                        })}
                        {(proj.worktypes||[]).length > 2 && <span style={{fontSize:9,color:"var(--t3)"}}>+{proj.worktypes.length-2} more</span>}
                      </div>
                      <div style={{width:110,flexShrink:0}}><Badge status={proj.status}/></div>
                      <div style={{width:120,flexShrink:0}}>
                        {proj.budget>0 ? (
                          <>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--t3)",marginBottom:2}}><span>{fmt$(proj.spent)}</span><span>{sp}%</span></div>
                            <div className="bar-track" style={{height:4}}><div className="bar-fill" style={{width:`${sp}%`,background:sp>85?"var(--acc)":sp>60?"var(--amber)":"var(--green)"}}/></div>
                          </>
                        ) : <span style={{fontSize:10,color:"var(--t3)"}}>—</span>}
                      </div>
                      <div style={{width:60,flexShrink:0,textAlign:"right"}}>
                        {proj.tasksOpen>0 && <span className="mono" style={{fontSize:10,color:"var(--amber)"}}>{proj.tasksOpen} open</span>}
                      </div>
                    </div>
                    <div className="proj-list-actions" onClick={e=>e.stopPropagation()}>
                      <button className={`btn btn-xs ${isClocked?"btn-danger":"btn-green"}`} style={isClocked?{background:"var(--acc)",color:"#fff",border:"none"}:{}} onClick={()=>setClock(proj)}>
                        {isClocked ? Ic.stopwatch : Ic.clock}
                      </button>
                      <button className="btn btn-blue btn-xs" onClick={()=>setNotify(proj)}>{Ic.notify}</button>
                      <button className="btn btn-ghost btn-xs" onClick={()=>openMaps(proj)}>{Ic.map}</button>
                      <button className="btn btn-xs" onClick={()=>setComm(proj)} style={{background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",color:"var(--amber)"}}>{Ic.phone}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <PortfolioSidebar onNavigate={onNavigate}/>
      </div>
    </>
  );
}

function OverviewTab({ proj, attrDefs, dailyNotes=[], setDailyNotes=()=>{}, emailSchedule="weekly", setEmailSchedule=()=>{}, clientPortal=false, setClientPortal=()=>{}, globalStaff=[], worktypes=[], setWorktypes=()=>{}, currentUser=null, assignedStaff=[], setAssignedStaff=()=>{} }) {
  const [attrs, setAttrs]           = useState({});
  const assigned    = assignedStaff;
  const setAssigned = setAssignedStaff;
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText]     = useState("");
  const [assignPick, setAssignPick] = useState(false);
  const [coiWarn,   setCoiWarn]     = useState(null); // { staff, vendor, status } — pending assignment blocked by COI

  const unassigned = globalStaff.filter(s => !assigned.find(a => a.id === s.id));

  // When assigning, check if this staff member is a vendor with COI issues
  const handleAssign = (s) => {
    setAssignPick(false);
    const perm = normPerm(s.permission ?? s.permissionLevel ?? 3);
    if (perm === 0) {
      // Look up their vendor record by memberstackId or email
      const vendorRec = loadVendors().find(v =>
        (v.memberstackId && v.memberstackId === s.id) ||
        (v.email && s.email && v.email.toLowerCase() === s.email.toLowerCase())
      );
      const status = getCoiStatus(vendorRec);
      if (status === "expired" || status === "missing") {
        setCoiWarn({ staff: s, vendor: vendorRec, status });
        return;
      }
      if (status === "expiring") {
        // warn but don't block
        setCoiWarn({ staff: s, vendor: vendorRec, status, soft: true });
        return;
      }
    }
    setAssigned(a => [...a, s]);
  };

  const addNote = () => {
    if(!noteText.trim()) return;
    const n = {id:uid(), date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), author:currentUser?.name||"Staff", content:noteText.trim(), visibleToClient:true};
    setDailyNotes(p=>[n,...p]);
    setNoteText(""); setAddingNote(false);
  };
  const schedLabels = {daily:"End of Day",weekly:"End of Week",none:"Never (Manual Only)"};
  const portalLink = `https://portal.job-dox.com/client/${proj.id.toLowerCase()}`;

  // ── WorkType helpers ──
  const WT_OPTIONS = Object.keys(WT_META);
  const WT_PHASES  = ["Initial Response","Active","Monitoring","Testing","Complete","On Hold"];
  const isWTOn = (type) => !!worktypes.find(w => w.type === type && w.status !== "off");
  const toggleWT = (type) => {
    let next;
    const existing = worktypes.find(w => w.type === type);
    if (existing) {
      // Toggle between active and off
      next = worktypes.map(w => w.type === type ? {...w, status: w.status === "off" ? "active" : "off"} : w);
    } else {
      // Add new worktype
      next = [...worktypes, { type, status:"active", phase:"Initial Response" }];
    }
    setWorktypes(next);
    syncWorktypesToLS(proj.id, next);
  };
  const setWTPhase = (type, phase) => {
    const next = worktypes.map(w => w.type === type ? {...w, phase} : w);
    setWorktypes(next);
    syncWorktypesToLS(proj.id, next);
  };

  return (
    <div className="scroll">
      <div style={{maxWidth:980,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))",gap:13}}>
        <div className="card" style={{gridColumn:"1/-1"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13}}>
            {[["Project ID",proj.id],["Loss Type",proj.type],["Status",proj.status],["Created",proj.created],["Client",proj.client||"—"],["Phone",proj.clientPhone||"—"],["Carrier",proj.carrier||"—"],["Claim #",proj.claim||"—"]].map(([l,v])=>(
              <div key={l}><div className="lbl">{l}</div><div style={{fontSize:12,color:"var(--t1)",fontWeight:500}}>{v}</div></div>
            ))}
          </div>
        </div>

        {/* ── Work Types Management Card ── */}
        <div className="card" style={{gridColumn:"1/-1"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>Work Types</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Toggle on/off to activate automations — CortexAI reads these to trigger workflows</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--s3)",border:"1px solid var(--br)",borderRadius:7,padding:"4px 10px"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:worktypes.filter(w=>w.status!=="off").length>0?"var(--green)":"var(--t3)"}}/>
              <span className="mono" style={{fontSize:9,color:worktypes.filter(w=>w.status!=="off").length>0?"var(--green)":"var(--t3)"}}>
                {worktypes.filter(w=>w.status!=="off").length} ACTIVE
              </span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
            {WT_OPTIONS.map(type => {
              const meta    = WT_META[type];
              const wtEntry = worktypes.find(w => w.type === type);
              const on      = wtEntry && wtEntry.status !== "off";
              const phase   = wtEntry?.phase || "Initial Response";
              const phaseC  = WT_PHASE_C[wtEntry?.status] || WT_PHASE_C.pending;
              return (
                <div key={type} style={{border:`1.5px solid ${on ? meta.color : "var(--br)"}`,borderRadius:10,padding:"10px 12px",background: on ? `${meta.color}0d` : "var(--s2)",transition:"all .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom: on ? 8 : 0}}>
                    <span style={{color: on ? meta.color : "var(--t3)",display:"flex",alignItems:"center",flexShrink:0}}>{meta.icon}</span>
                    <span style={{fontSize:12,fontWeight: on ? 700 : 500,color: on ? meta.color : "var(--t2)",flex:1}}>{type}</span>
                    {/* Toggle */}
                    <button onClick={()=>toggleWT(type)} style={{width:34,height:18,borderRadius:9,border:"none",cursor:"pointer",background: on ? meta.color : "var(--s4)",transition:"background .2s",position:"relative",padding:0,flexShrink:0}}>
                      <span style={{position:"absolute",top:2,left: on ? 16 : 2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
                    </button>
                  </div>
                  {on && (
                    <select value={phase} onChange={e=>setWTPhase(type, e.target.value)}
                      style={{width:"100%",background:"transparent",border:`1px solid ${meta.color}40`,borderRadius:6,padding:"3px 7px",fontSize:10,color: meta.color,fontFamily:"var(--mono)",fontWeight:700,cursor:"pointer",outline:"none"}}>
                      {WT_PHASES.map(p=><option key={p} style={{background:"var(--s2)",color:"var(--t1)"}}>{p}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          {worktypes.filter(w=>w.status!=="off").length > 0 && (
            <div style={{marginTop:10,padding:"7px 11px",background:"rgba(26,217,138,.07)",border:"1px solid rgba(26,217,138,.2)",borderRadius:7,fontSize:10,color:"var(--green)"}}>
              <span style={{fontFamily:"var(--mono)",fontWeight:700}}>CORTEXAI SYNC ACTIVE</span> — Active work types written to localStorage. Open CortexAI (mindflow.html) to trigger workflow automations.
            </div>
          )}
        </div>
        <div className="card">
          <div style={{fontSize:13,fontWeight:700,marginBottom:11}}>Budget</div>
          {proj.budget>0 ? (
            <>
              <div className="g3" style={{marginBottom:10}}>
                {[["Budget",fmt$(proj.budget),"var(--t1)"],["Spent",fmt$(proj.spent),"var(--amber)"],["Remaining",fmt$(proj.budget-proj.spent),proj.budget-proj.spent<0?"var(--acc)":"var(--green)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"var(--s3)",borderRadius:7,padding:"8px 10px"}}>
                    <div className="lbl">{l}</div><div className="mono" style={{fontSize:15,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="bar-track" style={{height:6}}><div className="bar-fill" style={{width:`${pct(proj.spent,proj.budget)}%`,background:"var(--green)"}}/></div>
            </>
          ) : <div style={{color:"var(--t3)",fontSize:12}}>No budget set.</div>}
        </div>
        <div className="card">
          <div style={{fontSize:13,fontWeight:700,marginBottom:11}}>Open Tasks</div>
          {TASKS_SEED.filter(t=>t.status==="open").slice(0,5).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:"1px solid var(--br)"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:t.priority==="high"?"var(--acc)":t.priority==="med"?"var(--amber)":"var(--t3)",flexShrink:0}}/>
              <div style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--t1)"}}>{t.title}</div>
              <div style={{fontSize:10,color:"var(--t3)"}}>{t.due}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{gridColumn:"1/-1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
            <div style={{fontSize:13,fontWeight:700}}>Assigned Staff</div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              {globalStaff.length === 0 && (
                <span style={{fontSize:10,color:"var(--t3)"}}>Add staff in Settings first</span>
              )}
              {globalStaff.length > 0 && unassigned.length > 0 && (
                <div style={{position:"relative"}}>
                  <button className="btn btn-ghost btn-xs" onClick={()=>setAssignPick(v=>!v)}>{Ic.plus} Assign Staff / Vendor</button>
                  {assignPick && (
                    <div style={{position:"absolute",right:0,top:"100%",marginTop:4,background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,minWidth:260,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.35)",overflow:"hidden",maxHeight:320,overflowY:"auto"}}>
                      {unassigned.map(s=>{
                        const rc    = ROLE_COLORS[s.systemRole]||"#5ba3f5";
                        const perm  = normPerm(s.permission ?? s.permissionLevel ?? 3);
                        const isVnd = perm === 0;
                        const vRec  = isVnd ? loadVendors().find(v =>
                          (v.memberstackId && v.memberstackId === s.id) ||
                          (v.email && s.email && v.email.toLowerCase() === s.email.toLowerCase())
                        ) : null;
                        const coiSt = isVnd ? getCoiStatus(vRec) : "ok";
                        return (
                          <button key={s.id} style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid var(--br)",padding:"9px 13px",display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontFamily:"var(--ui)"}}
                            onClick={()=>handleAssign(s)}
                            onMouseEnter={e=>e.currentTarget.style.background="var(--s3)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div style={{width:28,height:28,borderRadius:"50%",background:`${rc}18`,border:`1.5px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:rc,flexShrink:0}}>
                              {s.photoUrl?<img src={s.photoUrl} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:`${(s.firstName||"")[0]}${(s.lastName||"")[0]}`}
                            </div>
                            <div style={{textAlign:"left",flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{s.firstName} {s.lastName}</div>
                              <div style={{fontSize:9,color:rc,fontWeight:600}}>{s.systemRole||PERM_LEVELS[perm]?.short}</div>
                            </div>
                            {isVnd && (
                              <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,fontFamily:"var(--mono)",fontWeight:700,flexShrink:0,
                                background:COI_STATUS[coiSt].bg,color:COI_STATUS[coiSt].color}}>
                                {coiSt==="ok"?"COI ✓":coiSt==="expiring"?"COI ⚠":coiSt==="expired"?"COI ✕":"NO COI"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {assigned.length === 0 ? (
            <div style={{padding:"16px 0",color:"var(--t3)",fontSize:11,textAlign:"center"}}>
              {globalStaff.length === 0 ? "No company staff configured. Go to Settings › Staff to add team members." : "No staff assigned to this project yet."}
            </div>
          ) : assigned.map(s=>{
            const rc    = ROLE_COLORS[s.systemRole]||"#5ba3f5";
            const perm  = normPerm(s.permission ?? s.permissionLevel ?? 3);
            const isVnd = perm === 0;
            const vRec  = isVnd ? loadVendors().find(v =>
              (v.memberstackId && v.memberstackId === s.id) ||
              (v.email && s.email && v.email.toLowerCase() === s.email.toLowerCase())
            ) : null;
            const coiSt = isVnd ? getCoiStatus(vRec) : "ok";
            const coiWarnStyle = (coiSt === "expired" || coiSt === "missing")
              ? {border:"1.5px solid var(--acc)",background:"rgba(239,68,68,.04)"}
              : coiSt === "expiring" ? {border:"1.5px solid var(--amber)",background:"rgba(245,158,11,.04)"} : {};
            return (
              <div key={s.id} className="staff-row" style={coiWarnStyle}>
                <div style={{width:32,height:32,borderRadius:"50%",overflow:"hidden",background:`${rc}18`,border:`1.5px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rc,flexShrink:0}}>
                  {s.photoUrl?<img src={s.photoUrl} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:`${(s.firstName||"")[0]}${(s.lastName||"")[0]}`}
                </div>
                <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:600,color:"var(--t1)"}}>{s.firstName} {s.lastName}</div>
                <div style={{fontSize:11,width:170,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,background:`${rc}18`,color:rc}}>{s.systemRole||PERM_LEVELS[perm]?.short}</span>
                  {isVnd && coiSt !== "ok" && (
                    <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,fontFamily:"var(--mono)",fontWeight:700,
                      background:COI_STATUS[coiSt].bg,color:COI_STATUS[coiSt].color}}>
                      {coiSt==="expiring"?"COI ⚠":"COI ✕"}
                    </span>
                  )}
                </div>
                <div style={{fontSize:11,color:"var(--blue)",width:140}}>{s.phone||"—"}</div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn btn-ghost btn-xs">{Ic.phone}</button>
                  <button className="btn btn-ghost btn-xs">{Ic.sms}</button>
                  <button className="btn btn-danger btn-xs" onClick={()=>setAssigned(a=>a.filter(x=>x.id!==s.id))}>{Ic.trash}</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── COI Warning Modal ── */}
        {coiWarn && (
          <div className="overlay" onClick={()=>setCoiWarn(null)}>
            <div className="modal anim" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
              <div className="modal-hd">
                <div>
                  <div className="modal-ttl" style={{color: coiWarn.status==="expiring"?"var(--amber)":"var(--acc)"}}>
                    {coiWarn.status==="expiring" ? "⚠ COI Expiring Soon" :
                     coiWarn.status==="expired"  ? "🚫 COI Expired" : "🚫 Certificate of Insurance Missing"}
                  </div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>
                    {coiWarn.staff.firstName} {coiWarn.staff.lastName} · {coiWarn.staff.systemRole||"Vendor"}
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={()=>setCoiWarn(null)}>✕</button>
              </div>
              <div className="modal-body">
                {coiWarn.status === "expiring" ? (
                  <>
                    <div style={{padding:"12px 14px",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",borderRadius:8,marginBottom:14,fontSize:11,color:"var(--t2)",lineHeight:1.65}}>
                      ⚠ This vendor's Certificate of Insurance expires on <strong>{coiWarn.vendor?.coi?.expiresAt ? new Date(coiWarn.vendor.coi.expiresAt).toLocaleDateString() : "—"}</strong>. You can still assign them to this project, but you should request an updated COI before work begins.
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setCoiWarn(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{background:"var(--amber)",borderColor:"var(--amber)"}}
                        onClick={()=>{ setAssigned(a=>[...a,coiWarn.staff]); setCoiWarn(null); }}>
                        Assign Anyway
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{padding:"12px 14px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,marginBottom:14,fontSize:11,color:"var(--t2)",lineHeight:1.65}}>
                      🚫 {coiWarn.status === "expired"
                        ? `This vendor's Certificate of Insurance expired on ${coiWarn.vendor?.coi?.expiresAt ? new Date(coiWarn.vendor.coi.expiresAt).toLocaleDateString() : "an unknown date"}.`
                        : "This vendor does not have a Certificate of Insurance on file."}
                      {" "}Assigning them to new projects is not recommended until their COI is updated.
                    </div>
                    <div style={{fontSize:11,color:"var(--t3)",marginBottom:14}}>
                      You can upload their updated COI in <strong style={{color:"var(--t2)"}}>Settings → Vendors → {coiWarn.staff.firstName} {coiWarn.staff.lastName} → Documents</strong>.
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setCoiWarn(null)}>Don't Assign</button>
                      <button className="btn btn-danger btn-sm"
                        onClick={()=>{ setAssigned(a=>[...a,coiWarn.staff]); setCoiWarn(null); }}>
                        Assign Anyway (Override)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="card" style={{gridColumn:"1/-1"}}>
          <div style={{marginBottom:13}}>
            <div style={{fontSize:13,fontWeight:700}}>Custom Attributes</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Company-defined fields — manage in Settings › Attribute Templates</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
            {attrDefs.map(def=>(
              <div key={def.id}>
                <label className="lbl">{def.label}</label>
                <input type={def.type==="url"?"url":"text"} className="inp" value={attrs[def.key]||""} onChange={e=>setAttrs(a=>({...a,[def.key]:e.target.value}))} placeholder={def.placeholder}/>
              </div>
            ))}
          </div>
        </div>

        {/* ── Daily Notes ── */}
        <div className="card" style={{gridColumn:"1/-1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:9}} className="portal-chip-row">
            <div>
              <div style={{fontSize:13,fontWeight:700}}>Daily Notes</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Staff field notes — visible to client on portal based on visibility setting</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
              {/* Email schedule */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,color:"var(--t2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".06em"}}>Email</span>
                <select className="inp" value={emailSchedule} onChange={e=>setEmailSchedule(e.target.value)} style={{height:28,fontSize:11,padding:"0 8px",width:"auto"}}>
                  <option value="daily">End of Day</option>
                  <option value="weekly">End of Week</option>
                  <option value="none">Never</option>
                </select>
              </div>
              {/* Client portal toggle */}
              <div style={{display:"flex",alignItems:"center",gap:7,background:"var(--s3)",border:"1px solid var(--br)",borderRadius:8,padding:"4px 10px"}}>
                <span style={{fontSize:10,color:"var(--t2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".06em"}}>Client Portal</span>
                <button onClick={()=>setClientPortal(v=>!v)} style={{width:36,height:18,borderRadius:9,border:"none",cursor:"pointer",background:clientPortal?"var(--green)":"var(--s4)",transition:"background .2s",position:"relative",padding:0,flexShrink:0}}>
                  <span style={{position:"absolute",top:2,left:clientPortal?18:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
                </button>
                <span style={{fontSize:10,fontWeight:700,color:clientPortal?"var(--green)":"var(--t3)"}}>{clientPortal?"ON":"OFF"}</span>
              </div>
              <button className="btn btn-primary btn-xs" onClick={()=>setAddingNote(v=>!v)}>{Ic.plus} Add Note</button>
            </div>
          </div>

          {/* Client portal link */}
          {clientPortal && (
            <div style={{background:"rgba(26,217,138,.07)",border:"1px solid rgba(26,217,138,.2)",borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:"var(--green)",fontFamily:"var(--mono)",fontWeight:700}}>PORTAL ACTIVE</span>
              <span style={{fontSize:11,color:"var(--t2)",flex:1}}>{portalLink}</span>
              <button className="btn btn-ghost btn-xs" onClick={()=>navigator.clipboard?.writeText(portalLink)}>{Ic.copy||Ic.sms} Copy Link</button>
              <span style={{fontSize:10,color:"var(--t3)"}}>Client sees: photos + notes marked visible</span>
            </div>
          )}

          {/* Add note form */}
          {addingNote && (
            <div style={{background:"var(--s3)",border:"1px solid var(--br)",borderRadius:8,padding:12,marginBottom:12}}>
              <label className="lbl">Note (auto-dated today)</label>
              <textarea className="inp" rows={4} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Describe today's activities, moisture readings, observations, client communications…" style={{resize:"vertical",lineHeight:1.6}}/>
              <div style={{display:"flex",justifyContent:"flex-end",gap:7,marginTop:8}}>
                <button className="btn btn-ghost btn-xs" onClick={()=>{setAddingNote(false);setNoteText("");}}>Cancel</button>
                <button className="btn btn-primary btn-xs" onClick={addNote} disabled={!noteText.trim()}>Save Note</button>
              </div>
            </div>
          )}

          {/* Email schedule display */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"6px 10px",background:"var(--s3)",borderRadius:7,border:"1px solid var(--br)"}}>
            <span style={{fontSize:9,color:"var(--amber)",fontFamily:"var(--mono)",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>AUTO-EMAIL</span>
            <span style={{fontSize:11,color:"var(--t2)"}}>
              {emailSchedule==="none" ? "Automatic email disabled — send manually from Messages tab" : `Notes emailed to client at ${schedLabels[emailSchedule].toLowerCase()}`}
            </span>
          </div>

          {/* Note list */}
          {dailyNotes.length===0 && (
            <div style={{textAlign:"center",padding:"28px 0",color:"var(--t3)",fontSize:11}}>No notes yet — add the first field note above.</div>
          )}
          {dailyNotes.map(note=>(
            <div key={note.id} style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:8,padding:"11px 13px",marginBottom:8,position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:700,color:"var(--acc)",textTransform:"uppercase",letterSpacing:".08em"}}>{note.date}</span>
                <span style={{fontSize:11,fontWeight:600,color:"var(--t1)"}}>{note.author}</span>
                <div style={{flex:1}}/>
                <button onClick={()=>setDailyNotes(p=>p.map(n=>n.id===note.id?{...n,visibleToClient:!n.visibleToClient}:n))}
                  style={{display:"flex",alignItems:"center",gap:4,background:note.visibleToClient?"rgba(26,217,138,.1)":"var(--s3)",border:`1px solid ${note.visibleToClient?"rgba(26,217,138,.3)":"var(--br)"}`,borderRadius:20,padding:"2px 8px",cursor:"pointer",fontSize:10,color:note.visibleToClient?"var(--green)":"var(--t3)",fontWeight:600}}>
                  {note.visibleToClient ? "Visible to Client" : "Hidden"}
                </button>
                <button className="btn btn-danger btn-xs" onClick={()=>setDailyNotes(p=>p.filter(n=>n.id!==note.id))}>{Ic.trash}</button>
              </div>
              <div style={{fontSize:12,color:"var(--t1)",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{note.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactsTab({ contacts=[], setContacts=()=>{} }) {
  const [adding, setAdding] = useState(false);
  const [f, setF]           = useState({name:"",role:"",phone:"",email:""});
  const add = () => {
    if (!f.name) return;
    setContacts(c => [...c, {id:uid(), ...f, color:AVCOLORS[c.length % AVCOLORS.length]}]);
    setF({name:"",role:"",phone:"",email:""}); setAdding(false);
  };
  return (
    <div className="scroll"><div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{background:"var(--acc-lo)",border:"1px solid rgba(228,53,49,.2)",borderRadius:8,padding:"9px 12px",fontSize:11,color:"var(--t2)",marginBottom:12}}>
        External contacts only — clients, adjusters, vendors, subcontractors. <strong style={{color:"var(--t1)"}}>For staff see Overview → Assigned Staff.</strong>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div className="sec">External Contacts</div>
        <button className="btn btn-primary btn-xs" onClick={()=>setAdding(v=>!v)}>{Ic.plus} Add Contact</button>
      </div>
      {adding && (
        <div className="card" style={{marginBottom:12}}>
          <div className="g2" style={{gap:9,marginBottom:9}}>
            <F label="Full Name" value={f.name} onChange={v=>setF(p=>({...p,name:v}))} placeholder="First Last"/>
            <F label="Role" value={f.role} onChange={v=>setF(p=>({...p,role:v}))} placeholder="e.g. Adjuster, Insured"/>
            <F label="Phone" value={f.phone} onChange={v=>setF(p=>({...p,phone:v}))} placeholder="(405) 555-0000"/>
            <F label="Email" value={f.email} onChange={v=>setF(p=>({...p,email:v}))} type="email" placeholder="name@email.com"/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={add}>Save</button>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        {contacts.map(c=>(
          <div key={c.id} className="contact-card">
            <Av name={c.name} color={c.color} size={38}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{c.name}</div>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:7}}>{c.role}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {c.phone && <a href={`tel:${c.phone}`} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--blue)",textDecoration:"none"}}>{Ic.phone}{c.phone}</a>}
                {c.email && <a href={`mailto:${c.email}`} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--blue)",textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{Ic.mail}{c.email}</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div></div>
  );
}

function MediaTab({ folders:foldersIn=[], setFolders:setFoldersIn=()=>{}, uploads:uploadsIn=[], setUploads:setUploadsIn=()=>{} }) {
  // Use props directly — parent (ProjectDetail) owns the state and persists it via useProjState.
  // No internal copy; all mutations call the parent setter which auto-saves to localStorage.
  const folders  = foldersIn;
  const uploads  = uploadsIn;
  const setFolders = useCallback((v) => {
    const next = typeof v === "function" ? v(folders) : v;
    setFoldersIn(next);
  }, [folders, setFoldersIn]);
  const setUploads = useCallback((v) => {
    const next = typeof v === "function" ? v(uploads) : v;
    setUploadsIn(next);
  }, [uploads, setUploadsIn]);

  const [active, setActive] = useState(null);
  const [nf, setNf]         = useState("");
  const fileRef             = useRef();

  const handleUp = e => {
    Array.from(e.target.files).forEach(f => {
      // Guard: warn if file is large (base64 in LS can hit quota quickly)
      if (f.size > 2 * 1024 * 1024) {
        console.warn(`[Job-Dox] Photo "${f.name}" is ${(f.size/1024/1024).toFixed(1)} MB. Large photos may fill localStorage. Consider cloud storage.`);
      }
      const r = new FileReader();
      r.onload = ev => setUploads(u => [...u, { id:uid(), name:f.name, dataUrl:ev.target.result, folder:active||"Unfiled", size:f.size }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  if (typeof active==="string") {
    const fu=uploads.filter(u=>u.folder===active);
    return (
      <div className="scroll"><div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
          <button className="back-btn" onClick={()=>setActive(null)}>{Ic.back} Folders</button>
          <span style={{color:"var(--t3)"}}>›</span><span style={{fontSize:13,fontWeight:600}}>{active}</span>
          <div style={{flex:1}}/><input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:"none"}} onChange={handleUp}/>
          <button className="btn btn-primary btn-xs" onClick={()=>fileRef.current.click()}>{Ic.upload} Upload</button>
        </div>
        {fu.length===0
          ? <div style={{border:"1.5px dashed var(--br)",borderRadius:9,display:"flex",flexDirection:"column",alignItems:"center",padding:44,gap:9,cursor:"pointer"}} onClick={()=>fileRef.current.click()}>
              <div style={{opacity:.14,fontSize:28}}>{Ic.photo}</div>
              <div className="mono" style={{fontSize:11,color:"var(--t2)"}}>DROP PHOTOS & VIDEOS HERE</div>
            </div>
          : <div className="media-grid">{fu.map(u=><div key={u.id} className="media-thumb"><img src={u.dataUrl} alt={u.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>)}</div>
        }
      </div></div>
    );
  }
  return (
    <div className="scroll"><div style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div className="sec">Media & Albums</div>
        <div style={{display:"flex",gap:7}}><input className="inp" value={nf} onChange={e=>setNf(e.target.value)} placeholder="New folder…" style={{width:150,height:30,fontSize:11}}/><button className="btn btn-secondary btn-xs" onClick={()=>{if(nf){setFolders(f=>[...f,nf]);setNf("");}}}>{Ic.plus} Create</button></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:9}}>
        {folders.map(f=><div key={f} className="folder-card" onClick={()=>setActive(f)}><div style={{color:"var(--amber)",fontSize:18}}>{Ic.folder}</div><div><div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{f}</div><div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{uploads.filter(u=>u.folder===f).length} items</div></div></div>)}
        <div className="folder-card" style={{border:"1.5px dashed var(--br)",background:"transparent"}} onClick={()=>{const n=window.prompt("Folder name:");if(n)setFolders(v=>[...v,n]);}}><div style={{color:"var(--t3)"}}>{Ic.plus}</div><div style={{fontSize:12,color:"var(--t3)"}}>New Folder</div></div>
      </div>
    </div></div>
  );
}

// DocumentsTab is imported from ./JobDoxDocuments.jsx

/* ── InlineCommentBox: compact comment input used inline in My Day task rows ── */
function InlineCommentBox({ authorName, onSubmit }) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };
  return (
    <div style={{display:"flex",gap:7,alignItems:"flex-start",marginTop:6}}>
      <Av name={authorName||"?"} color="var(--acc)" size={22}/>
      <div style={{flex:1,display:"flex",gap:6,alignItems:"flex-end"}}>
        <textarea
          className="txa"
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}}
          placeholder="Add a comment… (Enter to send)"
          rows={1}
          style={{flex:1,minHeight:32,resize:"none",fontSize:11,padding:"5px 9px"}}
        />
        <button className="btn btn-primary btn-xs" style={{height:32,padding:"0 12px"}} onClick={submit} disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

/* ── TaskCommentModal: opens from both TasksTab and MyDayPage ── */
function TaskCommentModal({ task, onClose, currentUserName="You", globalStaff=[], companyId="", phoneSettings={} }) {
  const [comments, setComments] = useState(task.commentThread || []);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const assigneeNames = (() => {
    if (Array.isArray(task.assignedUserIds) && task.assignedUserIds.length && globalStaff.length) {
      return task.assignedUserIds
        .map(id => globalStaff.find(s => s.id === id))
        .filter(Boolean)
        .map(s => `${s.firstName||""} ${s.lastName||""}`.trim());
    }
    if (task.assigned) return [task.assigned];
    return [];
  })();

  const othersToNotify = assigneeNames.filter(n => n !== currentUserName);

  const postComment = async () => {
    if (!text.trim()) return;
    const newComment = {
      id: uid(),
      author: currentUserName,
      text: text.trim(),
      at: new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) + " · " +
          new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
    };
    setComments(c => [...c, newComment]);
    setText("");

    // ── Send real texts to all other assignees who have a phone number ──
    if (othersToNotify.length) {
      const toNumbers = task.assignedUserIds
        ? task.assignedUserIds
            .filter(id => {
              const s = globalStaff.find(x => x.id === id);
              return s && `${s.firstName||""} ${s.lastName||""}`.trim() !== currentUserName;
            })
            .map(id => globalStaff.find(x => x.id === id)?.phone)
            .filter(Boolean)
        : [];

      if (toNumbers.length) {
        const msgBody = `[Job-Dox] ${currentUserName} commented on "${task.title}"${task.proj ? ` (${task.proj})` : ""}:\n"${text.trim()}"`;
        try {
          await sendSMS({
            to:          toNumbers,
            messageBody: msgBody,
            from:        phoneSettings?.twilioNumber || "",
            companyId,
            staffName:   currentUserName,
            projectId:   task.projId || null,
          });
          setSent(true);
        } catch {
          setSent(true);
        }
      } else {
        // No phone numbers on file — still show confirmation
        setSent(true);
      }
      setTimeout(() => setSent(false), 3500);
    }
  };

  const priC = {high:"var(--acc)", med:"var(--amber)", low:"var(--t3)", undefined:"var(--t3)"};

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal anim" style={{maxWidth:520}}>
        <div className="modal-hd">
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:priC[task.priority]||"var(--t3)",flexShrink:0}}/>
              <div className="modal-ttl" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div>
            </div>
            {task.proj && <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{task.proj}</div>}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>
        <div className="modal-body" style={{gap:10}}>
          {/* Assignees */}
          {assigneeNames.length > 0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>ASSIGNED</span>
              {assigneeNames.map((n,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:5,background:"var(--s3)",borderRadius:20,padding:"2px 9px",border:"1px solid var(--br)"}}>
                  <Av name={n} color={AVCOLORS[i % AVCOLORS.length]} size={18}/>
                  <span style={{fontSize:11,color:"var(--t1)"}}>{n}</span>
                </div>
              ))}
            </div>
          )}

          {/* Task meta */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:10,color:"var(--t3)"}}>
            {task.due && <span>Due <strong style={{color:"var(--t1)"}}>{task.due}</strong></span>}
            {task.status && <span>Status <strong style={{color:task.status==="done"?"var(--green)":"var(--amber)"}}>{task.status}</strong></span>}
            {task.phase && <span>Phase <strong style={{color:"var(--blue)"}}>{task.phase}</strong></span>}
          </div>

          {/* SMS sent notice */}
          {sent && (
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(26,217,138,.1)",border:"1px solid rgba(26,217,138,.25)",borderRadius:8,padding:"8px 12px",animation:"jd-fade .2s ease"}}>
              <span style={{color:"var(--green)"}}>{Ic.sms}</span>
              <span style={{fontSize:11,color:"var(--green)",fontWeight:600}}>
                Text sent to: {othersToNotify.join(", ")}
              </span>
            </div>
          )}

          {/* Comment thread */}
          <div>
            <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:8}}>COMMENT THREAD</div>
            {comments.length === 0 ? (
              <div style={{padding:"18px 0",textAlign:"center",color:"var(--t3)",fontSize:11,fontStyle:"italic"}}>No comments yet — start the conversation.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:240,overflowY:"auto"}}>
                {comments.map(c => (
                  <div key={c.id} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                    <Av name={c.author} color={c.author===currentUserName?"var(--acc)":AVCOLORS[1]} size={26}/>
                    <div style={{flex:1,background:"var(--s3)",borderRadius:8,padding:"7px 10px",border:"1px solid var(--br)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{c.author}</span>
                        <span style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{c.at}</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.55}}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New comment input */}
          <div>
            <textarea
              className="txa"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              onKeyDown={e => { if (e.key==="Enter" && (e.metaKey||e.ctrlKey)) postComment(); }}
              style={{minHeight:60}}
            />
            {othersToNotify.length > 0 && (
              <div style={{fontSize:10,color:"var(--t3)",marginTop:4}}>
                {Ic.sms} Will text: <strong style={{color:"var(--t2)"}}>{othersToNotify.join(", ")}</strong>
              </div>
            )}
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={postComment} disabled={!text.trim()}>
            {othersToNotify.length > 0 ? <>{Ic.comment} Post & Text {othersToNotify.length}</> : <>{Ic.comment} Post Comment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function TasksTab({ projId="", projName="", initialTasks=[], globalStaff=[], companyId="", phoneSettings={}, currentMemberId="", isVendor=false, currentUser }) {
  // Load from LS first; fall back to Firestore initialTasks; then empty
  const [tasks, setTasksRaw] = useState(() => {
    if (projId) {
      const stored = _lsRead(projId, "tasks", null);
      if (stored !== null) return stored;
    }
    return initialTasks.length ? initialTasks : [];
  });

  // Wrap setTasks to auto-save on every change
  const setTasks = useCallback((updater) => {
    setTasksRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (projId) _lsWrite(projId, "tasks", next);
      return next;
    });
  }, [projId]);

  const [filter, setFilter] = useState("open");
  const [adding, setAdding] = useState(false);
  const [commentTask, setCommentTask] = useState(null);
  const [taskType, setTaskType] = useState("task"); // "task" | "appointment"
  const [f, setF] = useState({
    title:"", assignedUserIds:[], due:"", priority:"med",
    time:"", type:"task", notes:""
  });

  const toggle = id => setTasks(t => t.map(x => x.id===id ? {...x, status: x.status==="done"?"open":"done"} : x));

  const add = () => {
    if (!f.title) return;
    const newTask = {
      id: uid(),
      projId: projId || null,
      title: f.title,
      assignedUserIds: f.assignedUserIds,
      // Legacy single-string assigned for backwards compat
      assigned: f.assignedUserIds.length && globalStaff.length
        ? globalStaff.filter(s => f.assignedUserIds.includes(s.id)).map(s=>`${s.firstName||""} ${s.lastName||""}`.trim()).join(", ")
        : "",
      due: f.due,
      priority: f.priority,
      type: taskType,
      time: f.time,
      notes: f.notes,
      status: "open",
      created: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      comments: 0,
      commentThread: [],
    };
    setTasks(t => [...t, newTask]);
    pushActivity({
      actionType: taskType === "appointment" ? "note" : "task",
      action:     `${taskType === "appointment" ? "Appointment" : "Task"} created: ${f.title}`,
      proj:       projName || projId || "Project",
      projId:     projId || null,
      user:       currentUser?.name || "Staff",
    });
    setF({title:"", assignedUserIds:[], due:"", priority:"med", time:"", type:"task", notes:""});
    setAdding(false);
  };

  const toggleAssignee = (id) => {
    setF(p => ({
      ...p,
      assignedUserIds: p.assignedUserIds.includes(id)
        ? p.assignedUserIds.filter(x => x !== id)
        : [...p.assignedUserIds, id],
    }));
  };

  // Vendors only see tasks they are personally assigned to
  const visBase = isVendor && currentMemberId
    ? tasks.filter(t => Array.isArray(t.assignedUserIds) && t.assignedUserIds.includes(currentMemberId))
    : tasks;
  const vis = visBase.filter(t => filter==="all" || t.status===filter);
  const priC = {high:"var(--acc)", med:"var(--amber)", low:"var(--t3)"};

  return (
    <div className="scroll">
      {commentTask && (
        <TaskCommentModal
          task={commentTask}
          onClose={() => {
            setCommentTask(null);
          }}
          globalStaff={globalStaff}
          companyId={companyId}
          phoneSettings={phoneSettings}
        />
      )}
      <div style={{maxWidth:800, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11}}>
          <div style={{display:"flex",gap:5}}>
            {[["open","Open",tasks.filter(t=>t.status==="open").length],
              ["done","Done",tasks.filter(t=>t.status==="done").length],
              ["all","All",tasks.length]
            ].map(([k,l,n]) => (
              <button key={k} className={`chip${filter===k?" on":""}`} onClick={()=>setFilter(k)}>
                {l} <span className="mono" style={{fontSize:8}}>{n}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            {!isVendor && <button className="btn btn-ghost btn-xs" onClick={()=>{setTaskType("appointment");setAdding(v=>!v);}}>{Ic.calendar} Appointment</button>}
            {!isVendor && <button className="btn btn-primary btn-xs" onClick={()=>{setTaskType("task");setAdding(v=>!v);}}>{Ic.plus} Add Task</button>}
            {isVendor && <span style={{fontSize:10,color:"var(--t3)",fontStyle:"italic"}}>Showing your assigned tasks</span>}
          </div>
        </div>

        {adding && (
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)"}}>{taskType==="appointment"?"NEW APPOINTMENT":"NEW TASK"}</div>
              <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
                {["task","appointment"].map(tt => (
                  <button key={tt} className={`chip${taskType===tt?" on":""}`} onClick={()=>setTaskType(tt)} style={{fontSize:9}}>
                    {tt==="task"?"Task":"Appointment"}
                  </button>
                ))}
              </div>
            </div>
            <div className="g2" style={{gap:9,marginBottom:9}}>
              <div style={{gridColumn:"1/-1"}}>
                <label className="lbl">{taskType==="appointment"?"Appointment Title *":"Task *"}</label>
                <input className="inp" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} placeholder={taskType==="appointment"?"e.g. Site inspection":"Task description…"}/>
              </div>
              <div>
                <label className="lbl">Due Date</label>
                <input type="date" className="inp" value={f.due} onChange={e=>setF(p=>({...p,due:e.target.value}))}/>
              </div>
              {taskType==="appointment" && (
                <div>
                  <label className="lbl">Time</label>
                  <input type="time" className="inp" value={f.time} onChange={e=>setF(p=>({...p,time:e.target.value}))}/>
                </div>
              )}
              <div>
                <label className="lbl">Priority</label>
                <select className="sel" value={f.priority} onChange={e=>setF(p=>({...p,priority:e.target.value}))}>
                  <option value="high">High</option>
                  <option value="med">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Multi-user assignment */}
            {globalStaff.length > 0 && (
              <div style={{marginBottom:9}}>
                <label className="lbl">Assign To (select multiple)</label>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                  {globalStaff.map(s => {
                    const name = `${s.firstName||""} ${s.lastName||""}`.trim() || s.email || s.id;
                    const sel  = f.assignedUserIds.includes(s.id);
                    return (
                      <button key={s.id}
                        onClick={() => toggleAssignee(s.id)}
                        style={{
                          display:"flex",alignItems:"center",gap:5,
                          padding:"3px 9px",borderRadius:20,border:`1px solid ${sel?"var(--blue)":"var(--br)"}`,
                          background:sel?"rgba(91,163,245,.12)":"transparent",
                          color:sel?"var(--blue)":"var(--t2)",cursor:"pointer",fontSize:11,transition:"all .12s",
                        }}>
                        <Av name={name} color={AVCOLORS[globalStaff.indexOf(s) % AVCOLORS.length]} size={18}/>
                        {name}
                        {sel && <span style={{color:"var(--blue)"}}>{Ic.check}</span>}
                      </button>
                    );
                  })}
                </div>
                {f.assignedUserIds.length > 1 && (
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:5}}>
                    {Ic.sms} All {f.assignedUserIds.length} assigned staff will be notified via text when this {taskType} is created.
                  </div>
                )}
              </div>
            )}

            {taskType==="task" && (
              <div style={{marginBottom:9}}>
                <label className="lbl">Notes</label>
                <textarea className="txa" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Optional details…"/>
              </div>
            )}

            <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
              <button className="btn btn-ghost btn-xs" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-xs" onClick={add} disabled={!f.title}>
                {taskType==="appointment"?"Create Appointment":"Create Task"}
              </button>
            </div>
          </div>
        )}

        {vis.map(t => (
          <div key={t.id} className="row" style={{display:"flex",alignItems:"flex-start",gap:9}}>
            <div className={`task-chk${t.status==="done"?" done":""}`}
              onClick={() => toggle(t.id)}
              style={{marginTop:2,cursor:"pointer"}}>
              {t.status==="done" && <span style={{color:"#fff"}}>{Ic.check}</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}}>
                <div style={{fontSize:12,fontWeight:600,color:t.status==="done"?"var(--t3)":"var(--t1)",textDecoration:t.status==="done"?"line-through":"none",lineHeight:1.3}}>
                  {t.type==="appointment" && <span style={{marginRight:5,fontSize:10,color:"var(--blue)",fontFamily:"var(--mono)"}}>APPT</span>}
                  {t.title}
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:priC[t.priority]||"var(--t3)",marginTop:4,flexShrink:0}}/>
                  <button className="btn btn-ghost btn-xs" style={{padding:"1px 7px",fontSize:10}}
                    onClick={() => setCommentTask(t)}>
                    {Ic.comment}
                    {(t.commentThread||[]).length > 0 && (
                      <span className="mono" style={{fontSize:8,marginLeft:2,color:"var(--purple)"}}>{(t.commentThread||[]).length}</span>
                    )}
                  </button>
                </div>
              </div>
              <div style={{display:"flex",gap:9,marginTop:3,fontSize:10,color:"var(--t2)",flexWrap:"wrap"}}>
                {/* Multi-user assignees */}
                {(Array.isArray(t.assignedUserIds) && t.assignedUserIds.length > 0 && globalStaff.length > 0) ? (
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {t.assignedUserIds.slice(0,3).map((id,i) => {
                      const s = globalStaff.find(x=>x.id===id);
                      if (!s) return null;
                      const nm = `${s.firstName||""} ${s.lastName||""}`.trim();
                      return <Av key={id} name={nm} color={AVCOLORS[i%AVCOLORS.length]} size={16}/>;
                    })}
                    {t.assignedUserIds.length > 3 && <span style={{fontSize:9,color:"var(--t3)"}}>+{t.assignedUserIds.length-3}</span>}
                    <span style={{marginLeft:2}}>{
                      t.assignedUserIds.slice(0,2).map(id => {
                        const s = globalStaff.find(x=>x.id===id);
                        return s ? `${s.firstName||""}`.trim() : id;
                      }).join(", ")
                    }{t.assignedUserIds.length > 2 ? ` +${t.assignedUserIds.length-2}` : ""}</span>
                  </div>
                ) : t.assigned ? <span>{t.assigned}</span> : null}
                {t.due && <span>Due {t.due}</span>}
                {t.time && <span style={{color:"var(--blue)",fontFamily:"var(--mono)"}}>{t.time}</span>}
                <span style={{color:"var(--t3)"}}>Created {t.created}</span>
              </div>
              {t.notes && <div style={{marginTop:4,fontSize:10,color:"var(--t3)",fontStyle:"italic"}}>{t.notes}</div>}
            </div>
          </div>
        ))}

        {vis.length === 0 && (
          <div style={{textAlign:"center",padding:"36px 0",color:"var(--t3)"}}>
            <div style={{opacity:.15,fontSize:24,marginBottom:8}}>{Ic.tasks}</div>
            <div className="mono" style={{fontSize:11}}>NO {filter.toUpperCase()} TASKS</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Budget category color palette (cycles through work types) ── */
const BUDGET_COLORS = ["var(--blue)","var(--purple)","var(--amber)","var(--green)","var(--acc)","var(--teal)","var(--rose, #f87171)"];

function BudgetTab({ proj, laborCost=0 }) {
  const LS_BUDGETS = "jd_project_budgets";

  // ── Load / save per-project budget amounts ──
  const loadBudgets = () => {
    try { return JSON.parse(localStorage.getItem(LS_BUDGETS)) || {}; } catch { return {}; }
  };
  const saveBudgets = (all) => { try { localStorage.setItem(LS_BUDGETS, JSON.stringify(all)); } catch {} };

  // Build work-type categories from the project, falling back to a generic set
  const projWorkTypes = useMemo(() => {
    const wts = proj?.worktypes;
    if (Array.isArray(wts) && wts.length) return wts.map(w => w.type || w).filter(Boolean);
    if (proj?.type) return [proj.type];
    return ["Mitigation","Equipment","Reconstruction","Contents","Labor"];
  }, [proj]);

  // Stored budget amounts keyed by work-type name
  const [editingKey, setEditingKey]   = useState(null);   // which cat is being edited
  const [editAmount, setEditAmount]   = useState("");

  const storedAmounts = useMemo(() => {
    const all = loadBudgets();
    return all[proj?.id] || {};
  }, [proj?.id, editingKey]); // re-read whenever we save

  const setBudgetFor = (catName, amount) => {
    const all = loadBudgets();
    if (!all[proj?.id]) all[proj?.id] = {};
    all[proj?.id][catName] = Number(amount) || 0;
    saveBudgets(all);
    setEditingKey(null);
    pushActivity({ actionType:"note", action:`Budget updated for ${catName}`, proj:proj?.name||proj?.id||"", projId:proj?.id||null, user:"Staff" });
  };

  // Actual spend: sum all non-void invoices for this project
  const invoices = useMemo(() => loadProjInvoices(proj?.id || ""), [proj?.id]);
  const totalInvoiced = invoices.filter(i => i.status !== "void").reduce((s,i) => s + (i.total || 0), 0);

  // A/R = unpaid invoices
  const totalAR = invoices.filter(i => i.status === "unpaid" || i.status === "sent").reduce((s,i) => s + (i.total || 0), 0);

  // Build category rows
  const cats = projWorkTypes.map((name, idx) => {
    const budgeted = storedAmounts[name] || 0;
    // Attribute invoiced spend to a category if the invoice has a budgetCatId matching the name, else distribute evenly
    const catInvoices = invoices.filter(i => i.status !== "void" && (i.budgetCatId === name || (!i.budgetCatId)));
    // If no budgetCatId tagging, distribute evenly across categories
    const hasTaggedInvoices = invoices.some(i => i.budgetCatId);
    const actual = hasTaggedInvoices
      ? invoices.filter(i => i.status !== "void" && i.budgetCatId === name).reduce((s,i) => s+(i.total||0), 0)
      : (idx === 0 ? totalInvoiced : 0); // show total on first row if untagged
    return { name, budgeted, actual, color: BUDGET_COLORS[idx % BUDGET_COLORS.length] };
  });

  const tB = cats.reduce((s,c) => s + c.budgeted, 0);
  const tA = totalInvoiced;

  return (
    <div className="scroll"><div style={{maxWidth:900,margin:"0 auto"}}>

      {/* KPI header */}
      <div className="g4" style={{gap:9,marginBottom:16}}>
        {[
          ["Total Budget",  fmt$(tB),    "var(--t1)"],
          ["Invoiced",      fmt$(tA),    "var(--amber)"],
          ["Remaining",     fmt$(tB-tA), tB-tA < 0 ? "var(--acc)" : "var(--green)"],
          ["Accounts Rec.", fmt$(totalAR),"var(--blue)"],
        ].map(([l,v,c])=>(
          <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}>
            <div className="kpi-val" style={{color:c}}>{v}</div>
            <div className="kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* Per-worktype category rows */}
      {cats.map(cat => {
        const p = pct(cat.actual, cat.budgeted);
        const isEditing = editingKey === cat.name;
        return (
          <div key={cat.name} className="card" style={{marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7,gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                <div style={{width:10,height:10,borderRadius:3,background:cat.color,flexShrink:0}}/>
                <span style={{fontWeight:600,fontSize:13,color:"var(--t1)"}}>{cat.name}</span>
              </div>
              <div style={{display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
                {/* Budgeted — click to edit */}
                <div style={{textAlign:"right",minWidth:90}}>
                  <div className="lbl">Budgeted</div>
                  {isEditing ? (
                    <div style={{display:"flex",gap:5,alignItems:"center",marginTop:2}}>
                      <input
                        type="number" className="inp" autoFocus
                        value={editAmount}
                        onChange={e=>setEditAmount(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")setBudgetFor(cat.name,editAmount);if(e.key==="Escape")setEditingKey(null);}}
                        style={{width:88,height:26,fontSize:11,textAlign:"right"}}
                        placeholder="0"
                      />
                      <button className="btn btn-primary btn-xs" style={{height:26,padding:"0 8px"}} onClick={()=>setBudgetFor(cat.name,editAmount)}>{Ic.check}</button>
                      <button className="btn btn-ghost btn-xs" style={{height:26,padding:"0 6px"}} onClick={()=>setEditingKey(null)}>{Ic.close}</button>
                    </div>
                  ) : (
                    <div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"flex-end"}}>
                      <div className="mono" style={{fontSize:12,color:"var(--t1)",fontWeight:700}}>{fmt$(cat.budgeted)}</div>
                      <button className="btn btn-ghost btn-xs" style={{padding:"1px 5px",fontSize:9,opacity:.6}}
                        onClick={()=>{setEditingKey(cat.name);setEditAmount(String(cat.budgeted||""));}}
                        title="Edit budget">✎</button>
                    </div>
                  )}
                </div>
                {[["Actual", fmt$(cat.actual), cat.color],["Remaining", fmt$(cat.budgeted-cat.actual), cat.budgeted-cat.actual<0?"var(--acc)":"var(--t2)"]].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"right",minWidth:72}}>
                    <div className="lbl">{l}</div>
                    <div className="mono" style={{fontSize:12,color:c,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bar-track" style={{height:6}}>
              <div className="bar-fill" style={{width:`${p}%`,background:p>90?"var(--acc)":p>70?"var(--amber)":cat.color,transition:"width .4s ease"}}/>
            </div>
            <div style={{fontSize:10,color:"var(--t3)",marginTop:3}}>{p}% of budget utilized{cat.budgeted===0?" — set a budget above to track progress":""}</div>
          </div>
        );
      })}

      {/* Hint when no invoices exist yet */}
      {invoices.length === 0 && (
        <div style={{marginTop:16,padding:"12px 14px",background:"var(--s3)",border:"1px solid var(--br)",borderRadius:9,fontSize:11,color:"var(--t3)"}}>
          No invoices generated yet. Actual spend will populate once invoices are created from the Scope tab.
        </div>
      )}
    </div></div>
  );
}

function ShiftsTab({ projId, externalShifts=[], canViewRates, canViewPayRates=false }) {
  const SEED=[];
  const [manual, setManual] = useState(SEED);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({tech:"",task:"",position:"Lead Technician",rate:"85",clockIn:"",clockOut:"",notes:""});
  const allShifts = [...manual, ...externalShifts].sort((a,b)=>b.id-a.id);
  const add = () => {
    if (!f.tech||!f.clockIn) return;
    const hrs = 4;
    const autoRates = RATE_TABLE[f.position] || { payRate: 0, chargeRate: 65 };
    const rate = canViewRates ? (parseFloat(f.rate) || autoRates.chargeRate) : autoRates.chargeRate;
    setManual(s=>[...s,{id:uid(),tech:f.tech,task:f.task,mode:"manual",position:f.position,rate,payRate:autoRates.payRate,clockIn:f.clockIn,clockOut:f.clockOut,hours:hrs,notes:f.notes,laborCost:hrs*rate}]);
    setF({tech:"",task:"",position:"Lead Technician",rate:"85",clockIn:"",clockOut:"",notes:""}); setAdding(false);
  };
  const totalH     = allShifts.reduce((s,sh)=>s+(sh.hours||0),0);
  const totalLabor = allShifts.reduce((s,sh)=>s+(sh.laborCost||0),0);
  return (
    <div className="scroll"><div style={{maxWidth:800,margin:"0 auto"}}>
      <div className="g4" style={{gap:9,marginBottom:16}}>
        {[
          ["Shifts",    allShifts.length,                                         "var(--t1)"],
          ["Hours",     totalH.toFixed(1)+"h",                                   "var(--blue)"],
          ...(canViewRates ? [
            ["Labor Cost", fmt$(totalLabor),                                      "var(--green)"],
            ["Avg Rate",   "$"+(totalH>0?(totalLabor/totalH).toFixed(0):0)+"/hr","var(--amber)"],
          ] : []),
        ].map(([l,v,c])=>(
          <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}><div className="kpi-val" style={{color:c}}>{v}</div><div className="kpi-lbl">{l}</div></div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div className="sec">Shift Log</div>
        <button className="btn btn-primary btn-xs" onClick={()=>setAdding(v=>!v)}>{Ic.plus} Log Shift</button>
      </div>
      {adding && (
        <div className="card" style={{marginBottom:10}}>
          <div className="g2" style={{gap:9,marginBottom:9}}>
            <F label="Technician" value={f.tech} onChange={v=>setF(p=>({...p,tech:v}))} placeholder="Name"/>
            <F label="Task / Trade" value={f.task} onChange={v=>setF(p=>({...p,task:v}))} placeholder="Activity…"/>
            <F label="Position" value={f.position} onChange={v=>setF(p=>({...p,position:v}))} options={Object.keys(RATE_TABLE)}/>
            {canViewRates && (
              <div><label className="lbl">Charge Rate ($/hr)</label><div style={{position:"relative"}}><span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:13}}>$</span><input type="number" className="inp" value={f.rate} onChange={e=>setF(p=>({...p,rate:e.target.value}))} style={{paddingLeft:20}}/></div></div>
            )}
            <F label="Clock In" value={f.clockIn} onChange={v=>setF(p=>({...p,clockIn:v}))} type="datetime-local"/>
            <F label="Clock Out" value={f.clockOut} onChange={v=>setF(p=>({...p,clockOut:v}))} type="datetime-local"/>
          </div>
          <label className="lbl">Notes</label>
          <textarea className="txa" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} style={{minHeight:50,marginBottom:9}}/>
          <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={add}>Save</button>
          </div>
        </div>
      )}
      {allShifts.map(sh=>(
        <div key={sh.id} className="row" style={{display:"flex",alignItems:"center",gap:10}}>
          <Av name={sh.tech} color={sh.mode==="auto"?"var(--green)":"#5ba3f5"} size={32}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontWeight:600,fontSize:12,color:"var(--t1)"}}>{sh.tech}</span>
              {sh.mode==="auto" && <span style={{fontSize:9,background:"rgba(26,217,138,.15)",color:"var(--green)",borderRadius:4,padding:"1px 5px",fontFamily:"var(--mono)"}}>AUTO</span>}
            </div>
            <div style={{fontSize:11,color:"var(--t2)",marginTop:1}}>{sh.task}</div>
            <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>
              {sh.position}
              {canViewRates && canViewPayRates && <span style={{color:"var(--amber)"}}> · ${sh.rate}/hr</span>}
              {" · "}{sh.clockIn}{sh.clockOut?" → "+sh.clockOut:""}
            </div>
            {sh.notes && <div style={{fontSize:10,color:"var(--t3)",marginTop:1,fontStyle:"italic"}}>{sh.notes}</div>}
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            {canViewRates
              ? <><div className="mono" style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>{fmt$(sh.laborCost)}</div><div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{sh.hours}h</div></>
              : <div className="mono" style={{fontSize:13,fontWeight:700,color:"var(--blue)"}}>{sh.hours}h</div>
            }
          </div>
        </div>
      ))}
      {canViewRates && (
        <div style={{marginTop:14,padding:"10px 13px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,color:"var(--t2)"}}>Total labor cost applied to budget</span>
          <span className="mono" style={{fontWeight:700,fontSize:14,color:"var(--green)"}}>{fmt$(totalLabor)}</span>
        </div>
      )}
    </div></div>
  );
}



function ScopeTab({ proj, scopeItems: items=[], setScopeItems: setItems=()=>{}, contacts=[], onDocGenerated }) {
  const billing   = loadBilling();
  const co        = loadCoInfo();

  // Invoice adjustments state
  const [summary,      setSummary]    = useState(proj?.notes || "");
  const [overhead,     setOverhead]   = useState(billing.defaultOverhead);
  const [discount,     setDiscount]   = useState(billing.defaultDiscount);
  const [selTaxId,     setSelTaxId]   = useState(billing.defaultTaxId || "tx1");
  const [terms,        setTerms]      = useState(billing.terms || "");
  const [addSurcharge, setAddSurcharge] = useState(false);
  const [surcharges,   setSurcharges]  = useState([]);  // [{id,label,pct}]
  const [showPL,       setShowPL]      = useState(false);
  const [showPinned,   setShowPinned]  = useState(false);
  const [filterSrc,    setFilter]      = useState("all");
  const [generated,    setGenerated]   = useState(false);

  // ── New: invoice mode + room support + budget assignment ──
  const [invoiceMode,   setInvoiceMode]   = useState("simple"); // "simple" | "complex"
  const [showRooms,     setShowRooms]     = useState(false);    // show room column in complex mode
  const [budgetCatId,   setBudgetCatId]   = useState("");       // which budget category this invoice is applied to
  const [dueInDays,     setDueInDays]     = useState(30);

  // Budget categories for this project
  const projBudget = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem("jd_project_budgets")) || {};
      return (all[proj?.id]?.categories || []).filter(c => c.active);
    } catch { return []; }
  }, [proj?.id]);

  const selTax    = billing.taxRates?.find(t => t.id === selTaxId) || { name:"No Tax", rate:0 };
  const sub       = items.reduce((s,i) => s + i.qty*i.price, 0);
  const ovAmt     = sub * (overhead/100);
  const surAmt    = surcharges.reduce((s,c) => s + sub*(c.pct/100), 0);
  const discAmt   = (sub + ovAmt + surAmt) * (discount/100);
  const taxBase   = sub + ovAmt + surAmt - discAmt;
  const taxAmt    = taxBase * (selTax.rate/100);
  const total     = taxBase + taxAmt;

  const upd = (id,k,v) => setItems(p=>p.map(i=>i.id===id?{...i,[k]:v}:i));
  const sources   = [...new Set(items.map(i=>i.source||"manual").filter(Boolean))];
  const vis       = filterSrc==="all" ? items : items.filter(i=>(i.source||"manual")===filterSrc);

  const SOURCE_BADGE = {
    drydox:      { label:"DryDox",     color:"var(--blue)"   },
    contentsdox: { label:"ContentsDox",color:"var(--purple)" },
    manual:      { label:"Manual",     color:"var(--t3)"     },
  };

  // Pinned items for this project's work types
  const projWorkTypes = proj?.worktypes?.map(w=>w.type||w) || (proj?.type ? [proj.type] : []);
  const pinnedForProj = projWorkTypes.flatMap(wt => (billing.pinnedItems?.[wt] || []).map(pi=>({...pi, _pinSource:wt})));

  const addPinned = (pi) => {
    setItems(p => [...p, { id:uid(), desc:pi.desc, unit:pi.unit||"EA", qty:1, price:pi.price, source:"manual" }]);
  };

  const generateInvoice = () => {
    const b = loadBilling();
    const num = b.nextInvoiceNum || 1001;
    saveBilling({ ...b, nextInvoiceNum: num+1 });
    const co = loadCoInfo();
    const budgetCat = projBudget.find(c => c.id === budgetCatId) || null;
    const inv = {
      id:          `inv-${Date.now()}`,
      number:      `INV-${num}`,
      projId:      proj?.id || "",
      projName:    proj?.name || "",
      projAddress: proj?.address || "",
      clientName:  proj?.clientName || proj?.client || "",
      clientPhone: proj?.clientPhone || proj?.phone || "",
      company:     co,
      date:        new Date().toISOString(),
      dueDate:     new Date(Date.now() + dueInDays*86400000).toISOString(),
      summary,
      lineItems:   items.map(({_notesOpen, ...rest}) => rest), // strip UI-only flag before saving
      adjustments: { overhead, discount, taxId:selTaxId, taxName:selTax.name, taxRate:selTax.rate, surcharges },
      subtotal:    sub, overheadAmt:ovAmt, surchargeAmt:surAmt, discountAmt:discAmt, taxAmt, total,
      terms,
      status:      "unpaid",
      invoiceMode,                               // "simple" | "complex"
      hasRooms:    invoiceMode === "complex" && showRooms,
      budgetCatId: budgetCatId || null,
      budgetCatName: budgetCat?.name || null,
      createdAt:   new Date().toISOString(),
    };
    // Push to Finance (LS invoices)
    pushInvoice(inv);
    // Push to Documents tab as a sendable document
    pushProjDoc(proj?.id || "", {
      id:        inv.id,
      type:      "invoice",
      number:    inv.number,
      name:      `${inv.number} — ${proj?.name || "Invoice"}`,
      total:     inv.total,
      status:    "unpaid",
      date:      inv.date,
      invoiceMode,
      _inv:      inv,          // full invoice data for preview/print
    });
    // Activity feed
    pushActivity({
      actionType: "invoice",
      action:     `Invoice ${inv.number} generated — ${fmt$c(inv.total)}`,
      proj:       proj?.name || proj?.id || "",
      projId:     proj?.id || null,
      user:       co?.name || "Staff",
    });
    if (onDocGenerated) onDocGenerated();
    setGenerated(true);
    setTimeout(()=>setGenerated(false), 3500);
  };

  return (
    <div className="scroll">
      {/* Price List Modal */}
      {showPL && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowPL(false)}>
          <div className="modal anim">
            <div className="modal-hd"><div className="modal-ttl">Company Price List</div><button className="btn btn-ghost btn-xs" onClick={()=>setShowPL(false)}>{Ic.close}</button></div>
            <div className="modal-body">
              {PRICE_LIST.map(pl=>(
                <div key={pl.code} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{pl.desc}</div><div className="mono" style={{fontSize:10,color:"var(--t3)"}}>{pl.code}</div></div>
                  <div className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt$c(pl.price)}</div>
                  <button className="btn btn-primary btn-xs" onClick={()=>{setItems(p=>[...p,{id:uid(),desc:pl.desc,unit:pl.unit,qty:1,price:pl.price,source:"manual"}]);setShowPL(false);}}>{Ic.plus}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pinned Items Modal */}
      {showPinned && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowPinned(false)}>
          <div className="modal anim">
            <div className="modal-hd"><div className="modal-ttl">Pinned Items for This Project</div><button className="btn btn-ghost btn-xs" onClick={()=>setShowPinned(false)}>{Ic.close}</button></div>
            <div className="modal-body">
              {pinnedForProj.length===0 && (
                <div className="empty" style={{padding:24}}>
                  <div style={{fontSize:11,color:"var(--t3)",textAlign:"center",lineHeight:1.6}}>
                    No pinned items configured for {projWorkTypes.join(", ")||"this project type"}.<br/>
                    Add them in Settings → Billing → Pinned Line Items.
                  </div>
                </div>
              )}
              {pinnedForProj.map((pi,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:"1px solid var(--br)"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{pi.desc}</div>
                    <div className="mono" style={{fontSize:9,color:"var(--blue)"}}>{pi._pinSource} · {pi.unit||"EA"}</div>
                  </div>
                  <div className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt$c(pi.price)}</div>
                  <button className="btn btn-primary btn-xs" onClick={()=>{addPinned(pi);}}>{Ic.plus} Add</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:920,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

        {/* ── Invoice Header ── */}
        <div className="card" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div>
              {co.logo && <img src={co.logo} alt="" style={{height:38,objectFit:"contain",marginBottom:8,display:"block"}}/>}
              <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{co.name||"Your Company"}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:2,lineHeight:1.6}}>
                {[co.address,co.city,co.state,co.zip].filter(Boolean).join(", ")}{co.phone&&<><br/>{co.phone}</>}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="mono" style={{fontSize:10,color:"var(--t3)",marginBottom:2}}>INVOICE FOR</div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{proj?.name||"Project Name"}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:2,lineHeight:1.6}}>
                {proj?.clientName||proj?.client||""}{proj?.address&&<><br/>{proj.address}</>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        <div className="card" style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label className="lbl" style={{margin:0}}>Executive Summary <span style={{color:"var(--t3)",fontWeight:400}}>(optional — printed on invoice)</span></label>
          </div>
          <textarea className="txa" value={summary} onChange={e=>setSummary(e.target.value)}
            placeholder="Brief description of work performed, scope, and conditions found on site…"
            style={{minHeight:64,fontSize:11,lineHeight:1.65}}/>
        </div>

        {/* ── Line Items ── */}
        <div className="card" style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div className="sec" style={{marginBottom:0}}>Line Items</div>
              {sources.length > 1 && (
                <div style={{display:"flex",gap:4,marginLeft:6}}>
                  <button className={`chip btn-xs${filterSrc==="all"?" on":""}`} onClick={()=>setFilter("all")} style={{fontSize:9}}>All ({items.length})</button>
                  {["drydox","contentsdox","manual"].filter(s=>sources.includes(s)).map(s=>(
                    <button key={s} className={`chip btn-xs${filterSrc===s?" on":""}`} onClick={()=>setFilter(s)}
                      style={{fontSize:9,borderColor:filterSrc===s?SOURCE_BADGE[s]?.color:"",color:filterSrc===s?SOURCE_BADGE[s]?.color:""}}>
                      {SOURCE_BADGE[s]?.label||s} ({items.filter(i=>(i.source||"manual")===s).length})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:6}}>
              {pinnedForProj.length>0 && <button className="btn btn-secondary btn-xs" onClick={()=>setShowPinned(true)}>{Ic.pin} Pinned</button>}
              <button className="btn btn-secondary btn-xs" onClick={()=>setShowPL(true)}>{Ic.pricetag} Price List</button>
              <button className="btn btn-primary btn-xs" onClick={()=>setItems(p=>[...p,{id:uid(),desc:"",unit:"SF",qty:1,price:0,source:"manual"}])}>{Ic.plus} Add Line</button>
            </div>
          </div>

          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:invoiceMode==="complex"&&showRooms?"140px 1fr 62px 70px 80px 80px 26px":"1fr 62px 70px 80px 80px 26px",gap:6,padding:"3px 9px",marginBottom:3}}>
            {(invoiceMode==="complex"&&showRooms
              ? ["Room","Description","Unit","Qty","Unit Price","Total",""]
              : ["Description","Unit","Qty","Unit Price","Total",""]
            ).map((h,i)=><div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>)}
          </div>

          {vis.length===0 && (
            <div className="empty" style={{padding:28}}>
              <div style={{fontSize:11,color:"var(--t3)"}}>No line items yet. Add from the Price List, Pinned Items, or manually above.</div>
            </div>
          )}

          {vis.map(it=>{
            const src = SOURCE_BADGE[it.source||"manual"];
            const showRoom = invoiceMode==="complex" && showRooms;
            const notesOpen = !!it._notesOpen;
            return (
              <div key={it.id} style={{marginBottom:3}}>
                {/* Main row */}
                <div style={{display:"grid",gridTemplateColumns:showRoom?"140px 1fr 62px 70px 80px 80px 52px":"1fr 62px 70px 80px 80px 52px",gap:6,alignItems:"center",
                  padding:"5px 9px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:notesOpen?"7px 7px 0 0":"7px",
                  borderLeft:`3px solid ${src?.color||"var(--br)"}`}}>
                  {showRoom && (
                    <input value={it.room||""} onChange={e=>upd(it.id,"room",e.target.value)} className="inp"
                      style={{height:28,fontSize:10}} placeholder="e.g. Master Bed"/>
                  )}
                  <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                    <input value={it.desc} onChange={e=>upd(it.id,"desc",e.target.value)} className="inp" style={{height:28,fontSize:11,flex:1}}/>
                    {it.source && it.source!=="manual" && (
                      <span style={{fontSize:8,fontWeight:700,color:src?.color,borderRadius:3,padding:"1px 5px",
                        background:src?.color+"18",border:`1px solid ${src?.color}35`,flexShrink:0,whiteSpace:"nowrap"}}>
                        {src?.label}
                      </span>
                    )}
                  </div>
                  <select value={it.unit} onChange={e=>upd(it.id,"unit",e.target.value)} className="sel" style={{height:28,fontSize:11}}>
                    {["SF","LF","EA","HR","MO","LS","day"].map(u=><option key={u}>{u}</option>)}
                  </select>
                  <input type="number" value={it.qty} onChange={e=>upd(it.id,"qty",+e.target.value)} className="inp" style={{height:28,fontSize:11}}/>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:11}}>$</span>
                    <input type="number" value={it.price} onChange={e=>upd(it.id,"price",+e.target.value)} className="inp" style={{height:28,fontSize:11,paddingLeft:16}}/>
                  </div>
                  <div className="mono" style={{fontSize:11,fontWeight:700,color:"var(--green)",textAlign:"right"}}>{fmt$c(it.qty*it.price)}</div>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {/* F9 Notes toggle */}
                    <button
                      title="F9 Line note"
                      onClick={()=>upd(it.id,"_notesOpen",!notesOpen)}
                      className="btn btn-ghost btn-xs"
                      style={{padding:"2px 5px",fontSize:9,fontFamily:"var(--mono)",fontWeight:700,
                        color:notesOpen||(it.notes?.trim())?"var(--amber)":"var(--t3)",
                        background:(it.notes?.trim()&&!notesOpen)?"rgba(251,191,36,.12)":"",
                        border:(it.notes?.trim()&&!notesOpen)?"1px solid rgba(251,191,36,.3)":""}}>
                      F9
                    </button>
                    <button className="btn btn-danger btn-xs" style={{padding:"2px 5px"}} onClick={()=>setItems(p=>p.filter(i=>i.id!==it.id))}>{Ic.trash}</button>
                  </div>
                </div>
                {/* F9 Notes row */}
                {notesOpen && (
                  <div style={{padding:"7px 11px",background:"rgba(251,191,36,.05)",border:"1px solid var(--br)",borderTop:"none",borderRadius:"0 0 7px 7px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <span className="mono" style={{fontSize:9,color:"var(--amber)",fontWeight:700}}>F9 LINE NOTE</span>
                      {it.notes?.trim() && <span style={{fontSize:9,color:"var(--t3)"}}>Included on invoice</span>}
                    </div>
                    <textarea
                      className="txa"
                      value={it.notes||""}
                      onChange={e=>upd(it.id,"notes",e.target.value)}
                      placeholder="Add a note for this line item — will print on the invoice under this line…"
                      rows={2}
                      style={{fontSize:11,resize:"vertical"}}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Source breakdown */}
          {sources.filter(s=>s!=="manual").length > 0 && (
            <div style={{marginTop:8,padding:"8px 11px",background:"var(--s3)",border:"1px solid var(--br)",borderRadius:7,display:"flex",gap:14,flexWrap:"wrap"}}>
              {["drydox","contentsdox"].filter(s=>sources.includes(s)).map(s=>{
                const sc=items.filter(i=>(i.source||"manual")===s);
                const total=sc.reduce((sum,i)=>sum+i.qty*i.price,0);
                const badge=SOURCE_BADGE[s];
                return total>0?(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,fontWeight:700,color:badge.color,background:badge.color+"18",borderRadius:4,padding:"1px 7px",border:`1px solid ${badge.color}35`}}>{badge.label}</span>
                    <span className="mono" style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{fmt$c(total)}</span>
                  </div>
                ):null;
              })}
            </div>
          )}
        </div>

        {/* ── Adjustments: Overhead, Surcharges, Discount, Tax ── */}
        <div className="card" style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div className="sec" style={{marginBottom:0}}>Adjustments &amp; Pricing</div>
            <button className="btn btn-ghost btn-xs" onClick={()=>setAddSurcharge(v=>!v)}>{Ic.plus} Add Surcharge</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {/* Overhead */}
            <div>
              <label className="lbl">Overhead / Profit</label>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" className="inp" value={overhead} min={0} max={100} step={0.5}
                  onChange={e=>setOverhead(Math.max(0,parseFloat(e.target.value)||0))} style={{flex:1}}/>
                <span style={{fontSize:12,color:"var(--t2)",fontWeight:600}}>%</span>
                <span className="mono" style={{fontSize:11,color:"var(--amber)",minWidth:70,textAlign:"right"}}>{fmt$c(ovAmt)}</span>
              </div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>Applied to subtotal. Default set in Settings → Billing.</div>
            </div>
            {/* Tax */}
            <div>
              <label className="lbl">Tax Rate</label>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <select className="sel" value={selTaxId} onChange={e=>setSelTaxId(e.target.value)} style={{flex:1}}>
                  {(billing.taxRates||[]).map(t=><option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                </select>
                <span className="mono" style={{fontSize:11,color:"var(--amber)",minWidth:70,textAlign:"right"}}>{fmt$c(taxAmt)}</span>
              </div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>Manage tax rates in Settings → Billing.</div>
            </div>
            {/* Discount */}
            <div>
              <label className="lbl">Discount</label>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" className="inp" value={discount} min={0} max={100} step={0.5}
                  onChange={e=>setDiscount(Math.max(0,parseFloat(e.target.value)||0))} style={{flex:1}}/>
                <span style={{fontSize:12,color:"var(--t2)",fontWeight:600}}>%</span>
                <span className="mono" style={{fontSize:11,color:"var(--acc)",minWidth:70,textAlign:"right"}}>-{fmt$c(discAmt)}</span>
              </div>
            </div>
          </div>

          {/* Custom surcharges */}
          {addSurcharge && (
            <div style={{marginTop:12,padding:"11px 12px",background:"var(--s3)",border:"1px solid var(--br)",borderRadius:8}}>
              <div className="sec" style={{marginBottom:8}}>Add Custom Surcharge</div>
              <SurchargeAdder onAdd={sc=>{setSurcharges(s=>[...s,{...sc,id:uid()}]);setAddSurcharge(false);}} onCancel={()=>setAddSurcharge(false)}/>
            </div>
          )}
          {surcharges.length>0 && (
            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
              {surcharges.map(sc=>(
                <div key={sc.id} style={{display:"flex",alignItems:"center",gap:9,padding:"5px 9px",background:"var(--s3)",borderRadius:6,border:"1px solid var(--br)"}}>
                  <span style={{flex:1,fontSize:11,color:"var(--t2)"}}>{sc.label}</span>
                  <span className="mono" style={{fontSize:10,color:"var(--t3)"}}>{sc.pct}%</span>
                  <span className="mono" style={{fontSize:11,color:"var(--amber)",minWidth:60,textAlign:"right"}}>{fmt$c(sub*(sc.pct/100))}</span>
                  <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}} onClick={()=>setSurcharges(s=>s.filter(x=>x.id!==sc.id))}>{Ic.close}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Totals ── */}
        <div className="card" style={{padding:14,display:"flex",justifyContent:"flex-end"}}>
          <div style={{minWidth:280}}>
            {[
              ["Subtotal",             fmt$c(sub),              "var(--t2)"],
              ...(overhead>0  ? [[`Overhead / Profit (${overhead}%)`, fmt$c(ovAmt), "var(--amber)"]] : []),
              ...surcharges.map(sc=>[`${sc.label} (${sc.pct}%)`, fmt$c(sub*(sc.pct/100)), "var(--amber)"]),
              ...(discount>0  ? [[`Discount (${discount}%)`,      `-${fmt$c(discAmt)}`,   "var(--acc)"   ]] : []),
              ...(selTax.rate>0?[[`${selTax.name}`,               fmt$c(taxAmt),           "var(--t2)"   ]] : []),
              ["TOTAL DUE",            fmt$c(total),            "var(--green)"],
            ].map(([l,v,c],i,arr)=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
                borderBottom:i===arr.length-1?"none":"1px solid var(--br)"}}>
                <span className="mono" style={{fontSize:9,color:c,fontWeight:i===arr.length-1?700:400}}>{l}</span>
                <span className="mono" style={{fontSize:i===arr.length-1?16:12,color:c,fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="card" style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label className="lbl" style={{margin:0}}>Terms &amp; Conditions <span style={{color:"var(--t3)",fontWeight:400}}>(printed on every invoice)</span></label>
            <button className="btn btn-ghost btn-xs" style={{fontSize:9}} onClick={()=>setTerms(billing.terms||"")}>Reset to Default</button>
          </div>
          <textarea className="txa" value={terms} onChange={e=>setTerms(e.target.value)} style={{minHeight:72,fontSize:10,lineHeight:1.7,color:"var(--t2)"}}/>
          <div style={{fontSize:9,color:"var(--t3)",marginTop:4}}>Edit your default Terms in Settings → Billing.</div>
        </div>

        {/* ── Invoice Configuration ── */}
        <div className="card" style={{padding:14}}>
          <div className="sec" style={{marginBottom:12}}>Invoice Configuration</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            {/* Invoice Mode */}
            <div>
              <label className="lbl">Invoice Type</label>
              <div style={{display:"flex",gap:6,marginTop:4}}>
                {[["simple","Simple","Total amount only"],["complex","Complex","Full line-item breakdown"]].map(([val,label,sub])=>(
                  <button key={val} onClick={()=>{setInvoiceMode(val);if(val==="simple")setShowRooms(false);}}
                    style={{flex:1,padding:"8px 10px",borderRadius:8,cursor:"pointer",textAlign:"left",transition:"all .12s",
                      border:`1.5px solid ${invoiceMode===val?"var(--blue)":"var(--br)"}`,
                      background:invoiceMode===val?"rgba(91,163,245,.08)":"var(--s2)"}}>
                    <div style={{fontSize:11,fontWeight:700,color:invoiceMode===val?"var(--blue)":"var(--t1)"}}>{label}</div>
                    <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{sub}</div>
                  </button>
                ))}
              </div>
              {invoiceMode==="complex" && (
                <label style={{display:"flex",alignItems:"center",gap:6,marginTop:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={showRooms} onChange={e=>setShowRooms(e.target.checked)}
                    style={{width:13,height:13,accentColor:"var(--blue)"}}/>
                  <span style={{fontSize:11,color:"var(--t2)"}}>Group by Room / Area</span>
                  <span style={{fontSize:9,color:"var(--t3)"}}>— adds Room column to each line item</span>
                </label>
              )}
            </div>
            {/* Budget Assignment + Due Date */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label className="lbl">Apply to Budget Category</label>
                <select className="sel" value={budgetCatId} onChange={e=>setBudgetCatId(e.target.value)}>
                  <option value="">— None / General —</option>
                  {projBudget.map(c=>(
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {projBudget.length===0 && (
                  <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>No budget categories on this project yet. Add them in the Finance → Budget tab.</div>
                )}
              </div>
              <div>
                <label className="lbl">Payment Due</label>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="number" className="inp" value={dueInDays} min={0} style={{width:60}}
                    onChange={e=>setDueInDays(parseInt(e.target.value)||0)}/>
                  <span style={{fontSize:11,color:"var(--t2)"}}>days from today</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Generate Actions ── */}
        {generated && (
          <div style={{padding:"11px 16px",background:"rgba(26,217,138,.1)",border:"1px solid rgba(26,217,138,.3)",borderRadius:9,color:"var(--green)",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:8}}>
            {Ic.check} Invoice generated → saved to Finance &amp; Documents tabs.
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingBottom:24}}>
          <button className="btn btn-ghost">Preview PDF</button>
          <button className="btn btn-primary btn-lg" onClick={generateInvoice}>{Ic.invoice} Generate Invoice → Finance &amp; Docs</button>
        </div>

      </div>
    </div>
  );
}

/* Mini helper for adding a custom surcharge */
function SurchargeAdder({ onAdd, onCancel }) {
  const [label, setLabel] = useState("");
  const [pct,   setPct]   = useState("");
  return (
    <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
      <div style={{flex:1}}><label className="lbl">Label</label><input className="inp" value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Mobilization Fee"/></div>
      <div style={{width:90}}><label className="lbl">Percent</label><input type="number" className="inp" value={pct} onChange={e=>setPct(e.target.value)} placeholder="10"/></div>
      <button className="btn btn-primary btn-xs" disabled={!label.trim()||!pct} onClick={()=>onAdd({label:label.trim(),pct:parseFloat(pct)||0})}>Add</button>
      <button className="btn btn-ghost btn-xs" onClick={onCancel}>Cancel</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 · ENHANCED ADVANCED TOOLS PANEL (with Price Lists)
// ─────────────────────────────────────────────────────────────────────────────


/* ══════════════════════════════════════════════════════════════════
   DOC EMAIL MODAL  — pick recipients and send documents from the Documents tab
══════════════════════════════════════════════════════════════════ */
function DocEmailModal({ docs=[], contacts=[], proj, assignedStaff=[], onSend, onClose }) {
  const co       = loadCoInfo();
  const jobEmail = getJobEmail(proj, co);

  // Lead-or-above staff on this project who have an email address
  const leadStaff = assignedStaff.filter(s => isLeadOrAbove(s) && s.email);

  // Reply-To defaults: job address always on, lead+ staff pre-checked
  const [replyToJob,    setReplyToJob]    = useState(true);
  const [selReplyStaff, setSelReplyStaff] = useState(() => new Set(leadStaff.map(s => s.id)));

  const [selDocs, setSelDocs] = useState(new Set(docs.map(d => d.id)));
  const [selCts,  setSelCts]  = useState(new Set(contacts.filter(c=>c.email).map(c => c.id)));
  const [subject, setSubject] = useState(`Documents from ${proj?.name || "your project"}`);
  const [body,    setBody]    = useState(
    `Hi,\n\nPlease find the attached document(s) for ${proj?.name || "your project"}.\n\nIf you have any questions, feel free to reply to this email.\n\nThank you.`
  );
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const toggleDoc = id => setSelDocs(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleCt  = id => setSelCts(s  => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleRS  = id => setSelReplyStaff(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });

  const allDocs = selDocs.size === docs.length;
  const allCts  = selCts.size  === contacts.filter(c=>c.email).length;

  const replyToAddresses = [
    replyToJob ? jobEmail : null,
    ...leadStaff.filter(s => selReplyStaff.has(s.id)).map(s => s.email),
  ].filter(Boolean);

  const handleSend = async () => {
    if (!selCts.size) return;
    setSending(true);
    const recipients   = contacts.filter(c => selCts.has(c.id));
    const attachedDocs = docs.filter(d => selDocs.has(d.id));
    const ccStaff      = leadStaff.filter(s => selReplyStaff.has(s.id));
    pushProjMsg(proj?.id || "", {
      type:      "email",
      direction: "outbound",
      from:      jobEmail,
      replyTo:   replyToAddresses.join(", "),
      cc:        ccStaff.map(s => s.email).join(", "),
      to:        recipients.map(c => c.email || c.name).join(", "),
      recipients,
      ccStaff:   ccStaff.map(s => ({ id:s.id, name:`${s.firstName||""} ${s.lastName||""}`.trim(), email:s.email })),
      subject,
      body,
      docs:      attachedDocs.map(d => ({ id:d.id, name:d.name, type:d.type })),
    });
    await new Promise(r => setTimeout(r, 600));
    setSending(false); setSent(true);
    setTimeout(() => { onSend?.(); onClose(); }, 1200);
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal anim" style={{maxWidth:600,maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
        <div className="modal-hd">
          <div>
            <div className="modal-ttl">Send Documents</div>
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:2}}>From: {jobEmail}</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{overflowY:"auto",flex:1}}>

          {/* Documents */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <label className="lbl" style={{margin:0}}>Documents to Attach</label>
              <button className="btn btn-ghost btn-xs" style={{fontSize:10}}
                onClick={()=>setSelDocs(allDocs?new Set():new Set(docs.map(d=>d.id)))}>
                {allDocs?"Deselect All":"Select All"}
              </button>
            </div>
            {docs.length===0 && <div style={{fontSize:11,color:"var(--t3)"}}>No documents on this project yet.</div>}
            {docs.map(d=>(
              <label key={d.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",
                borderRadius:7,border:`1.5px solid ${selDocs.has(d.id)?"var(--blue)":"var(--br)"}`,
                background:selDocs.has(d.id)?"rgba(91,163,245,.07)":"var(--s2)",
                marginBottom:5,cursor:"pointer",transition:"all .1s"}}>
                <input type="checkbox" checked={selDocs.has(d.id)} onChange={()=>toggleDoc(d.id)}
                  style={{width:13,height:13,accentColor:"var(--blue)"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                  <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:1}}>
                    {d.type==="invoice"?"📄 Invoice":"📑 Document"}
                    {d.total ? ` · ${fmt$c(d.total)}`        : ""}
                    {d.status? ` · ${d.status.toUpperCase()}` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* TO: Contacts */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <label className="lbl" style={{margin:0}}>To: Recipients</label>
              <button className="btn btn-ghost btn-xs" style={{fontSize:10}}
                onClick={()=>setSelCts(allCts?new Set():new Set(contacts.filter(c=>c.email).map(c=>c.id)))}>
                {allCts?"Deselect All":"Select All"}
              </button>
            </div>
            {contacts.filter(c=>c.email).length===0 && (
              <div style={{fontSize:11,color:"var(--t3)"}}>No contacts with email addresses. Add them in the Contacts tab.</div>
            )}
            {contacts.filter(c=>c.email).map(c=>(
              <label key={c.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 11px",
                borderRadius:7,border:`1.5px solid ${selCts.has(c.id)?"var(--blue)":"var(--br)"}`,
                background:selCts.has(c.id)?"rgba(91,163,245,.07)":"var(--s2)",
                marginBottom:5,cursor:"pointer",transition:"all .1s"}}>
                <input type="checkbox" checked={selCts.has(c.id)} onChange={()=>toggleCt(c.id)}
                  style={{width:13,height:13,accentColor:"var(--blue)"}}/>
                <Av name={c.name} color={c.color||"#5ba3f5"} size={26}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{c.name}</div>
                  <div style={{fontSize:10,color:"var(--t3)"}}>{c.role} · {c.email}</div>
                </div>
              </label>
            ))}
            {contacts.filter(c=>!c.email).length>0 && (
              <div style={{fontSize:9,color:"var(--t3)",marginTop:4}}>
                {contacts.filter(c=>!c.email).length} contact(s) have no email and are excluded.
              </div>
            )}
          </div>

          {/* REPLY-TO & CC: Staff */}
          <div style={{marginBottom:14}}>
            <div style={{marginBottom:7}}>
              <label className="lbl" style={{margin:0}}>Reply-To &amp; CC: Staff</label>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>
                Contacts who reply will reach all checked addresses. Lead Technician+ are pre-selected.
              </div>
            </div>

            {/* Job address row */}
            <label style={{display:"flex",alignItems:"center",gap:9,padding:"7px 11px",
              borderRadius:7,border:`1.5px solid ${replyToJob?"var(--green)":"var(--br)"}`,
              background:replyToJob?"rgba(26,217,138,.06)":"var(--s2)",
              marginBottom:5,cursor:"pointer",transition:"all .1s"}}>
              <input type="checkbox" checked={replyToJob} onChange={e=>setReplyToJob(e.target.checked)}
                style={{width:13,height:13,accentColor:"var(--green)"}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:"var(--t1)",fontFamily:"var(--mono)"}}>{jobEmail}</div>
                <div style={{fontSize:9,color:"var(--t3)"}}>Job address — logs replies in the Messages tab</div>
              </div>
              <span style={{fontSize:8,background:"rgba(26,217,138,.15)",color:"var(--green)",borderRadius:4,padding:"1px 6px",fontFamily:"var(--mono)",flexShrink:0}}>JOB</span>
            </label>

            {/* Lead+ staff */}
            {leadStaff.length===0 && (
              <div style={{fontSize:11,color:"var(--t3)",padding:"6px 11px",fontStyle:"italic"}}>
                No lead-level staff on this project yet — assign staff (Lead Technician or above) in the Overview tab and they'll appear here automatically.
              </div>
            )}
            {leadStaff.map(s => {
              const rc   = ROLE_COLORS[s.systemRole] || "#5ba3f5";
              const perm = normPerm(s.permission ?? s.permissionLevel ?? 3);
              const pl   = PERM_LEVELS[perm];
              const checked = selReplyStaff.has(s.id);
              return (
                <label key={s.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 11px",
                  borderRadius:7,border:`1.5px solid ${checked?rc:"var(--br)"}`,
                  background:checked?`${rc}0d`:"var(--s2)",
                  marginBottom:5,cursor:"pointer",transition:"all .1s"}}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleRS(s.id)}
                    style={{width:13,height:13,accentColor:rc}}/>
                  <Av name={`${s.firstName||""} ${s.lastName||""}`} color={rc} size={26}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{s.firstName} {s.lastName}</div>
                    <div style={{fontSize:10,color:"var(--t3)"}}>{s.email}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                    <span style={{fontSize:8,background:`${rc}18`,color:rc,borderRadius:4,padding:"1px 6px",fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>{s.systemRole||pl?.short}</span>
                    {checked && <span style={{fontSize:8,color:"var(--t3)"}}>reply-to + cc</span>}
                  </div>
                </label>
              );
            })}

            {/* Reply-To preview */}
            {replyToAddresses.length>0 && (
              <div style={{marginTop:8,padding:"7px 11px",background:"var(--s3)",border:"1px solid var(--br)",borderRadius:7}}>
                <div style={{fontSize:9,color:"var(--t3)",marginBottom:3,fontFamily:"var(--mono)"}}>REPLY-TO HEADER</div>
                <div style={{fontSize:10,color:"var(--t2)",wordBreak:"break-all",lineHeight:1.7,fontFamily:"var(--mono)"}}>
                  {replyToAddresses.join(", ")}
                </div>
              </div>
            )}
          </div>

          {/* Subject + body */}
          <div style={{marginBottom:9}}>
            <label className="lbl">Subject</label>
            <input className="inp" value={subject} onChange={e=>setSubject(e.target.value)}/>
          </div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Message</label>
            <textarea className="txa" value={body} onChange={e=>setBody(e.target.value)} style={{minHeight:100,fontSize:11,lineHeight:1.65}}/>
          </div>

          {/* Routing summary */}
          <div style={{padding:"8px 11px",background:"rgba(91,163,245,.07)",border:"1px solid rgba(91,163,245,.2)",borderRadius:8,fontSize:10,color:"var(--t2)"}}>
            📬 Sent from <strong style={{fontFamily:"var(--mono)"}}>{jobEmail}</strong>.{" "}
            {replyToAddresses.length>1
              ? `Replies reach ${replyToAddresses.length} addresses — job inbox${leadStaff.filter(s=>selReplyStaff.has(s.id)).length>0?` + ${leadStaff.filter(s=>selReplyStaff.has(s.id)).length} staff`:""}.`
              : "Replies go to the job inbox and are logged in the Messages tab."}
          </div>
        </div>

        <div style={{padding:"12px 20px",borderTop:"1px solid var(--br)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontSize:11,color:"var(--t3)"}}>
            {selCts.size} recipient{selCts.size!==1?"s":""} · {selDocs.size} doc{selDocs.size!==1?"s":""}
            {selReplyStaff.size>0 && ` · ${selReplyStaff.size} staff cc'd`}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSend}
            disabled={sending||sent||!selCts.size||!selDocs.size} style={{minWidth:100}}>
            {sent?"✓ Sent!":sending?"Sending…":"Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT DOCUMENTS TAB  — shows invoices + signed docs, email sending
══════════════════════════════════════════════════════════════════ */
function ProjectDocumentsPanel({ proj, contacts=[], assignedStaff=[], onNavigate }) {
  const [docs,      setDocs]      = useState(() => loadProjDocs(proj?.id||""));
  const [emailModal,setEmailModal]= useState(false);
  const [selInv,    setSelInv]    = useState(null);   // invoice preview

  // Re-load if proj changes
  useEffect(()=>{ setDocs(loadProjDocs(proj?.id||"")); }, [proj?.id]);

  const removeDoc = (id) => {
    const updated = docs.filter(d=>d.id!==id);
    saveProjDocs(proj?.id||"", updated);
    setDocs(updated);
  };

  const jobEmail = getJobEmail(proj, loadCoInfo());

  return (
    <div className="scroll"><div style={{maxWidth:900,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div className="sec" style={{marginBottom:2}}>Project Documents</div>
          <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>Job email: {jobEmail}</div>
        </div>
        <div style={{display:"flex",gap:7}}>
          <button className="btn btn-secondary btn-xs" onClick={()=>onNavigate&&onNavigate(proj?.id,"scope")}>
            + Generate Invoice
          </button>
          {docs.length>0 && (
            <button className="btn btn-primary btn-xs" onClick={()=>setEmailModal(true)}>
              ✉ Email Documents
            </button>
          )}
        </div>
      </div>

      {/* Document list */}
      {docs.length===0 ? (
        <div style={{padding:"36px 20px",textAlign:"center",background:"var(--s2)",borderRadius:12,border:"1px dashed var(--br)"}}>
          <div style={{fontSize:28,opacity:.25,marginBottom:10}}>📄</div>
          <div style={{fontSize:13,color:"var(--t2)",marginBottom:6}}>No documents yet</div>
          <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>Generate an invoice from the Scope/Invoice tab — it'll appear here automatically.</div>
          <button className="btn btn-secondary btn-sm" onClick={()=>onNavigate&&onNavigate(proj?.id,"scope")}>
            Go to Scope/Invoice
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {[...docs].reverse().map(doc=>(
            <div key={doc.id} className="card" style={{padding:"12px 15px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:22,flexShrink:0}}>{doc.type==="invoice"?"🧾":"📑"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{doc.name}</span>
                  {doc.invoiceMode && (
                    <span style={{fontSize:9,background:doc.invoiceMode==="complex"?"rgba(139,92,246,.15)":"rgba(91,163,245,.15)",
                      color:doc.invoiceMode==="complex"?"var(--purple)":"var(--blue)",borderRadius:4,padding:"1px 6px",fontFamily:"var(--mono)"}}>
                      {doc.invoiceMode.toUpperCase()}
                    </span>
                  )}
                  {doc.status && (
                    <span style={{fontSize:9,background:doc.status==="paid"?"rgba(26,217,138,.15)":"rgba(245,158,11,.15)",
                      color:doc.status==="paid"?"var(--green)":"var(--amber)",borderRadius:4,padding:"1px 6px",fontFamily:"var(--mono)"}}>
                      {doc.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>
                  {doc.date ? new Date(doc.date).toLocaleDateString() : ""}
                  {doc.total ? ` · ${fmt$c(doc.total)}` : ""}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {doc._inv && (
                  <button className="btn btn-secondary btn-xs" onClick={()=>setSelInv(doc._inv)}>
                    View
                  </button>
                )}
                <button className="btn btn-ghost btn-xs" style={{color:"var(--blue)"}}
                  onClick={()=>setEmailModal({singleDoc:doc})}>
                  ✉
                </button>
                <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}}
                  onClick={()=>{ if(window.confirm("Remove this document?")) removeDoc(doc.id); }}>
                  {Ic.trash}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <DocEmailModal
          docs={emailModal.singleDoc ? [emailModal.singleDoc] : docs}
          contacts={contacts}
          assignedStaff={assignedStaff}
          proj={proj}
          onSend={()=>{ setDocs(loadProjDocs(proj?.id||"")); }}
          onClose={()=>setEmailModal(false)}
        />
      )}

      {/* Invoice preview */}
      {selInv && <InvoicePreviewPortalModal inv={selInv} onClose={()=>setSelInv(null)}/>}
    </div></div>
  );
}

/* Simple inline invoice preview (portal side, doesn't require finance file import) */
function InvoicePreviewPortalModal({ inv, onClose }) {
  // useMemo MUST come before any conditional return to satisfy Rules of Hooks
  const isComplex = inv?.invoiceMode === "complex";
  const hasRooms  = !!(inv?.hasRooms && isComplex);

  // Group by room if applicable
  const roomGroups = useMemo(() => {
    if (!hasRooms || !inv) return null;
    const groups = {};
    (inv.lineItems||[]).forEach(li => {
      const room = li.room || "General";
      if (!groups[room]) groups[room] = [];
      groups[room].push(li);
    });
    return groups;
  }, [inv, hasRooms]);

  if (!inv) return null;

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{alignItems:"flex-start",paddingTop:32,overflowY:"auto"}}>
      <div className="modal anim" style={{maxWidth:700,width:"100%"}}>
        <div className="modal-hd">
          <div className="modal-ttl">{inv.number} Preview</div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-secondary btn-xs" onClick={()=>window.print()}>🖨 Print</button>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body" style={{fontFamily:"var(--font)"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
            <div>
              {inv.company?.logo && <img src={inv.company.logo} alt="" style={{height:36,marginBottom:6,display:"block"}}/>}
              <div style={{fontWeight:700,fontSize:14}}>{inv.company?.name}</div>
              <div style={{fontSize:10,color:"var(--t3)",lineHeight:1.6}}>{inv.company?.phone}<br/>{inv.company?.email}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:800,color:"var(--t1)"}}>{inv.number}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:4}}>
                Date: {inv.date?new Date(inv.date).toLocaleDateString():""}<br/>
                Due: {inv.dueDate?new Date(inv.dueDate).toLocaleDateString():""}
              </div>
              {inv.budgetCatName && (
                <div style={{marginTop:6,fontSize:10,background:"rgba(91,163,245,.12)",color:"var(--blue)",borderRadius:5,padding:"2px 8px",display:"inline-block",fontFamily:"var(--mono)"}}>
                  Budget: {inv.budgetCatName}
                </div>
              )}
            </div>
          </div>
          <div style={{borderBottom:"1px solid var(--br)",marginBottom:16}}/>
          <div style={{display:"flex",gap:20,marginBottom:16}}>
            <div><div style={{fontSize:9,color:"var(--t3)",marginBottom:3}}>BILL TO</div><div style={{fontWeight:600}}>{inv.clientName}</div><div style={{fontSize:10,color:"var(--t3)"}}>{inv.projAddress}</div></div>
            <div><div style={{fontSize:9,color:"var(--t3)",marginBottom:3}}>PROJECT</div><div style={{fontWeight:600}}>{inv.projName}</div></div>
          </div>

          {/* Simple mode: just total */}
          {!isComplex && (
            <div style={{padding:"20px",background:"var(--s2)",borderRadius:10,textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:6}}>TOTAL AMOUNT DUE</div>
              <div style={{fontFamily:"var(--mono)",fontSize:32,fontWeight:800,color:"var(--green)"}}>{fmt$c(inv.total)}</div>
              {inv.summary && <div style={{fontSize:11,color:"var(--t2)",marginTop:10,lineHeight:1.6}}>{inv.summary}</div>}
            </div>
          )}

          {/* Complex mode: full line items */}
          {isComplex && (
            <div style={{marginBottom:16}}>
              {!hasRooms && (inv.lineItems||[]).map((li,i)=>(
                <div key={i} style={{borderBottom:"1px solid var(--br)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 70px",gap:6,
                    padding:"5px 0",fontSize:11}}>
                    <div>{li.desc}</div>
                    <div style={{color:"var(--t3)",textAlign:"center"}}>{li.unit}</div>
                    <div style={{textAlign:"right"}}>{li.qty}</div>
                    <div style={{textAlign:"right"}}>{fmt$c(li.price)}</div>
                    <div style={{textAlign:"right",fontWeight:700,color:"var(--green)"}}>{fmt$c(li.qty*li.price)}</div>
                  </div>
                  {li.notes?.trim() && (
                    <div style={{fontSize:10,color:"var(--t3)",fontStyle:"italic",paddingBottom:5,paddingLeft:2,lineHeight:1.4}}>
                      ↳ {li.notes}
                    </div>
                  )}
                </div>
              ))}
              {hasRooms && Object.entries(roomGroups||{}).map(([room,items])=>(
                <div key={room} style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--blue)",padding:"5px 8px",background:"rgba(91,163,245,.08)",borderRadius:5,marginBottom:4}}>{room}</div>
                  {items.map((li,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 70px",gap:6,
                      padding:"4px 8px",borderBottom:"1px solid var(--br)",fontSize:11}}>
                      <div>{li.desc}</div>
                      <div style={{color:"var(--t3)",textAlign:"center"}}>{li.unit}</div>
                      <div style={{textAlign:"right"}}>{li.qty}</div>
                      <div style={{textAlign:"right"}}>{fmt$c(li.price)}</div>
                      <div style={{textAlign:"right",fontWeight:700,color:"var(--green)"}}>{fmt$c(li.qty*li.price)}</div>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"flex-end",fontSize:11,fontWeight:700,color:"var(--t2)",padding:"3px 8px"}}>
                    Room subtotal: {fmt$c(items.reduce((s,li)=>s+li.qty*li.price,0))}
                  </div>
                </div>
              ))}
              {/* Totals */}
              <div style={{marginTop:10,borderTop:"2px solid var(--br)",paddingTop:10}}>
                {[
                  ["Subtotal", fmt$c(inv.subtotal||0), "var(--t2)"],
                  ...(inv.adjustments?.overhead>0?[[`Overhead (${inv.adjustments.overhead}%)`,fmt$c(inv.overheadAmt||0),"var(--amber)"]]:[]),
                  ...(inv.adjustments?.discount>0?[[`Discount (${inv.adjustments.discount}%)`,`-${fmt$c(inv.discountAmt||0)}`,"var(--acc)"]]:[]),
                  ...(inv.taxAmt>0?[[inv.adjustments?.taxName||"Tax",fmt$c(inv.taxAmt||0),"var(--t2)"]]:[]),
                  ["TOTAL DUE",fmt$c(inv.total||0),"var(--green)"],
                ].map(([l,v,c],i,arr)=>(
                  <div key={l} style={{display:"flex",justifyContent:"flex-end",gap:24,padding:"3px 0",
                    borderBottom:i===arr.length-1?"none":"1px solid var(--br)"}}>
                    <span style={{fontSize:10,color:"var(--t3)",minWidth:140,textAlign:"right"}}>{l}</span>
                    <span className="mono" style={{fontSize:i===arr.length-1?15:11,color:c,fontWeight:700,minWidth:80,textAlign:"right"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.terms && (
            <div style={{marginTop:12,padding:"10px 12px",background:"var(--s2)",borderRadius:7,fontSize:9,color:"var(--t3)",lineHeight:1.7}}>
              <div style={{fontWeight:700,marginBottom:4,color:"var(--t2)"}}>Terms & Conditions</div>
              {inv.terms}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessagesTab({ proj, contacts=[] }) {
  const [msgs, setMsgs] = useState(() => loadProjMsgs(proj?.id||""));
  const [refresh, setRefresh] = useState(0);

  useEffect(()=>{ setMsgs(loadProjMsgs(proj?.id||"")); }, [proj?.id, refresh]);

  const co       = loadCoInfo();
  const jobEmail = getJobEmail(proj, co);

  if (!msgs.length) return (
    <div style={{padding:"32px 0",textAlign:"center",color:"var(--t3)"}}>
      <div style={{fontSize:28,marginBottom:8,opacity:.4}}>💬</div>
      <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:4}}>No messages yet</div>
      <div style={{fontSize:11,marginBottom:4}}>Emails sent from the Documents tab will appear here.</div>
      <div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--blue)",marginTop:8}}>Job email: {jobEmail}</div>
    </div>
  );

  return (
    <div className="scroll"><div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div className="sec">Message Log</div>
        <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>Job email: {jobEmail}</div>
      </div>
      {[...msgs].reverse().map(m=>(
        <div key={m.id} className="card" style={{marginBottom:8,padding:"12px 15px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{fontSize:20,flexShrink:0,marginTop:1}}>{m.type==="email"?"✉️":"💬"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{m.subject}</span>
                <span style={{fontSize:8,background:"rgba(91,163,245,.12)",color:"var(--blue)",borderRadius:3,padding:"1px 5px",fontFamily:"var(--mono)"}}>
                  {m.direction==="outbound"?"SENT":"RECEIVED"}
                </span>
              </div>
              <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>
                <span>To: {m.to}</span>
                <span style={{marginLeft:10}}>From: {m.from}</span>
                <span style={{marginLeft:10,fontFamily:"var(--mono)"}}>{m.ts?new Date(m.ts).toLocaleString():""}</span>
              </div>
              {m.docs?.length>0 && (
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
                  {m.docs.map(d=>(
                    <span key={d.id} style={{fontSize:9,background:"var(--s3)",border:"1px solid var(--br)",borderRadius:4,padding:"2px 7px",color:"var(--t2)"}}>
                      📎 {d.name}
                    </span>
                  ))}
                </div>
              )}
              <div style={{fontSize:10,color:"var(--t2)",lineHeight:1.6,whiteSpace:"pre-wrap",borderTop:"1px solid var(--br)",paddingTop:6}}>
                {m.body}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div></div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MESSAGE CENTER  —  company-wide calls, texts, emails in one place
══════════════════════════════════════════════════════════════════ */
function MessageCenter({ onClose, companyId, globalStaff=[], projects=[] }) {
  const [records,   setRecords]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [typeFilter,setTypeFilter]= useState("all");   // all | call | sms | email
  const [dirFilter, setDirFilter] = useState("all");   // all | inbound | outbound
  const [staffFilter,setStaffFilter]=useState("all");  // all | staffId
  const [projFilter, setProjFilter]=useState("all");   // all | projId
  const [search,    setSearch]    = useState("");
  const [playing,   setPlaying]   = useState(null);
  const audioRef = useRef(null);

  // ── Load all calls + SMS logs from Firestore ──
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    // Stream calls
    const callQ = query(
      collection(db, `companies/${companyId}/calls`),
      orderBy("createdAt","desc")
    );
    const unsubCalls = onSnapshot(callQ, snap => {
      const calls = snap.docs.map(d => {
        const r = { id: d.id, ...d.data() };
        return {
          _id:       r.id,
          type:      "call",
          direction: r.type || "outbound",
          contact:   r.clientName || r.clientPhone || "Unknown",
          phone:     r.clientPhone || "",
          staffName: r.staffName  || "",
          staffId:   r.staffId    || "",
          projectId: r.projectId  || null,
          status:    r.status     || "completed",
          duration:  r.duration   || 0,
          recordingUrl: r.recordingUrl || null,
          createdAt: r.createdAt,
          preview:   r.status === "completed"
            ? `${r.type==="inbound"?"Inbound":"Outbound"} call · ${fmtDurMC(r.duration)}`
            : (r.status||"").charAt(0).toUpperCase()+(r.status||"").slice(1),
        };
      });
      setRecords(prev => {
        const nonCalls = prev.filter(r => r.type !== "call");
        return [...calls, ...nonCalls].sort(sortByDate);
      });
      setLoading(false);
    }, () => setLoading(false));

    // Stream SMS logs
    const smsQ = query(
      collection(db, `companies/${companyId}/smsLogs`),
      orderBy("createdAt","desc")
    );
    const unsubSMS = onSnapshot(smsQ, snap => {
      const msgs = snap.docs.map(d => {
        const r = { id: d.id, ...d.data() };
        return {
          _id:       r.id,
          type:      "sms",
          direction: r.direction || "outbound",
          contact:   r.contactName || r.to || r.from || "Unknown",
          phone:     r.direction==="inbound" ? (r.from||"") : (r.to||""),
          staffName: r.staffName  || "",
          staffId:   r.staffId    || "",
          projectId: r.projectId  || null,
          status:    "delivered",
          createdAt: r.createdAt,
          preview:   r.body || "",
        };
      });
      setRecords(prev => {
        const nonSMS = prev.filter(r => r.type !== "sms");
        return [...nonSMS, ...msgs].sort(sortByDate);
      });
    }, () => {});

    return () => { unsubCalls(); unsubSMS(); };
  }, [companyId]);

  function fmtDurMC(s) {
    if (!s) return "--";
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${String(sec).padStart(2,"0")}`;
  }
  function sortByDate(a,b) {
    const ta = a.createdAt?.seconds||0, tb = b.createdAt?.seconds||0;
    return tb - ta;
  }
  function fmtTs(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    if (diff < 604800000) return d.toLocaleDateString("en-US",{weekday:"short"}) + " " +
      d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  }

  const togglePlay = url => {
    if (playing === url) { audioRef.current?.pause(); setPlaying(null); }
    else setPlaying(url);
  };
  useEffect(() => {
    if (playing && audioRef.current) { audioRef.current.src = playing; audioRef.current.play().catch(()=>{}); }
  }, [playing]);

  // ── Filter pipeline ──
  const visible = records.filter(r => {
    if (typeFilter !== "all"  && r.type      !== typeFilter)  return false;
    if (dirFilter  !== "all"  && r.direction !== dirFilter)   return false;
    if (staffFilter !== "all" && r.staffId   !== staffFilter) return false;
    if (projFilter  !== "all" && r.projectId !== projFilter)  return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.contact.toLowerCase().includes(q) &&
          !r.phone.toLowerCase().includes(q) &&
          !r.preview.toLowerCase().includes(q) &&
          !(r.staffName||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const typeColor = { call:"var(--green)", sms:"var(--blue)", email:"var(--purple)" };
  const typeIcon  = { call:Ic.phone, sms:Ic.sms, email:Ic.mail };
  const dirColor  = { inbound:"var(--blue)", outbound:"var(--green)" };
  const dirIcon   = { inbound:Ic.call_in, outbound:Ic.call_out };
  const statusColor = {
    completed:"var(--green)", delivered:"var(--green)",
    "no-answer":"var(--amber)", busy:"var(--amber)", failed:"var(--acc)",
    connecting:"var(--blue)", ringing:"var(--blue)",
  };

  // Unique projects and staff that appear in records (for filter dropdowns)
  const seenProjIds  = [...new Set(records.map(r=>r.projectId).filter(Boolean))];
  const seenStaffIds = [...new Set(records.map(r=>r.staffId).filter(Boolean))];
  const projOptions  = projects.filter(p => seenProjIds.includes(p.id));
  const staffOptions = globalStaff.filter(s => seenStaffIds.includes(s.id));

  // Summary counts
  const counts = { call:0, sms:0, email:0 };
  records.forEach(r => { if (counts[r.type]!==undefined) counts[r.type]++; });

  return (
    <div className="overlay" style={{zIndex:400}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <audio ref={audioRef} onEnded={()=>setPlaying(null)} style={{display:"none"}}/>
      <div style={{
        position:"fixed",inset:0,background:"var(--bg)",display:"flex",flexDirection:"column",
        zIndex:401,
      }}>
        {/* ── Top bar ── */}
        <div style={{
          padding:"14px 20px",borderBottom:"1px solid var(--br)",
          display:"flex",alignItems:"center",gap:14,flexShrink:0,
          background:"var(--s1)",
        }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{gap:5}}>
            {Ic.back} Back
          </button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:"var(--t1)"}}>Message Center</div>
            <div className="mono" style={{fontSize:9,color:"var(--t3)",marginTop:1}}>COMPANY-WIDE COMMUNICATION LOG</div>
          </div>
          {/* Summary pills */}
          <div style={{display:"flex",gap:6}}>
            {[["call","Calls",counts.call],["sms","Texts",counts.sms],["email","Emails",counts.email]].map(([k,l,n])=>(
              <div key={k} style={{
                padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:700,
                background:`color-mix(in srgb, ${typeColor[k]} 10%, transparent)`,
                color:typeColor[k],border:`1px solid color-mix(in srgb, ${typeColor[k]} 25%, transparent)`,
                fontFamily:"var(--mono)",
              }}>{n} {l}</div>
            ))}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          padding:"10px 20px",borderBottom:"1px solid var(--br)",
          display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",flexShrink:0,
          background:"var(--s1)",
        }}>
          {/* Search */}
          <div style={{position:"relative",flex:"0 0 200px"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",pointerEvents:"none"}}>{Ic.search}</span>
            <input className="inp" placeholder="Search contacts, messages…" value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{paddingLeft:28,fontSize:11,height:30}}/>
          </div>

          {/* Type filter */}
          <div style={{display:"flex",gap:3}}>
            {[["all","All"],["call","Calls"],["sms","Texts"],["email","Emails"]].map(([k,l])=>(
              <button key={k} className={`chip${typeFilter===k?" on":""}`}
                onClick={()=>setTypeFilter(k)} style={{fontSize:10,padding:"3px 10px"}}>{l}</button>
            ))}
          </div>

          {/* Direction filter */}
          <div style={{display:"flex",gap:3}}>
            {[["all","All Directions"],["inbound","Inbound"],["outbound","Outbound"]].map(([k,l])=>(
              <button key={k} className={`chip${dirFilter===k?" on":""}`}
                onClick={()=>setDirFilter(k)} style={{fontSize:10,padding:"3px 10px"}}>{l}</button>
            ))}
          </div>

          {/* Staff filter */}
          {staffOptions.length > 0 && (
            <select className="sel" value={staffFilter} onChange={e=>setStaffFilter(e.target.value)}
              style={{fontSize:10,height:28,padding:"0 8px"}}>
              <option value="all">All Staff</option>
              {staffOptions.map(s=>(
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          )}

          {/* Project filter */}
          {projOptions.length > 0 && (
            <select className="sel" value={projFilter} onChange={e=>setProjFilter(e.target.value)}
              style={{fontSize:10,height:28,padding:"0 8px"}}>
              <option value="all">All Projects</option>
              {projOptions.map(p=>(
                <option key={p.id} value={p.id}>{p.name||p.address||p.id}</option>
              ))}
            </select>
          )}

          <div style={{marginLeft:"auto",fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>
            {visible.length} of {records.length}
          </div>
        </div>

        {/* ── Record list ── */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 20px"}}>
          {loading ? (
            <div style={{padding:"40px 0",textAlign:"center",color:"var(--t3)",fontSize:12}}>
              <span style={{display:"inline-block",width:16,height:16,border:"2px solid var(--br)",borderTopColor:"var(--acc)",borderRadius:"50%",animation:"jd-spin .7s linear infinite",marginRight:8,verticalAlign:"middle"}}/>
              Loading communications…
            </div>
          ) : visible.length === 0 ? (
            <div style={{padding:"48px 0",textAlign:"center",color:"var(--t3)"}}>
              <div style={{fontSize:32,marginBottom:10,opacity:.3}}>📭</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:4}}>No records found</div>
              <div style={{fontSize:11}}>
                {records.length === 0
                  ? "Communications will appear here as calls and texts are made."
                  : "Try adjusting your filters."}
              </div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              {visible.map(r => {
                const proj = projects.find(p=>p.id===r.projectId);
                const tC   = typeColor[r.type]  || "var(--t3)";
                const dC   = dirColor[r.direction] || "var(--t3)";
                const sC   = statusColor[r.status] || "var(--t3)";
                return (
                  <div key={r._id} style={{
                    display:"flex",alignItems:"center",gap:12,
                    padding:"10px 12px",borderRadius:8,
                    background:"var(--s1)",border:"1px solid var(--br)",
                    marginBottom:4,
                  }}>
                    {/* Type + direction icon */}
                    <div style={{
                      width:38,height:38,borderRadius:10,flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      background:`color-mix(in srgb, ${tC} 10%, transparent)`,
                      color: tC,
                    }}>
                      {r.type === "call"
                        ? (r.direction === "inbound" ? Ic.call_in : Ic.call_out)
                        : typeIcon[r.type]}
                    </div>

                    {/* Main info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{fontWeight:600,fontSize:13,color:"var(--t1)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:200}}>
                          {r.contact}
                        </span>
                        {r.phone && (
                          <span style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>{r.phone}</span>
                        )}
                        <span style={{
                          fontSize:9,fontWeight:700,fontFamily:"var(--mono)",
                          padding:"1px 6px",borderRadius:4,
                          color:sC,background:`color-mix(in srgb, ${sC} 12%, transparent)`,
                        }}>{(r.status||"").toUpperCase()}</span>
                      </div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                        {r.staffName && (
                          <span style={{fontSize:10,color:"var(--t2)",display:"flex",alignItems:"center",gap:4}}>
                            <Av name={r.staffName} size={14} color="var(--acc)"/> {r.staffName}
                          </span>
                        )}
                        {proj && (
                          <span style={{fontSize:10,color:"var(--blue)",display:"flex",alignItems:"center",gap:3}}>
                            {Ic.folder} {proj.name||proj.address||"Project"}
                          </span>
                        )}
                        <span style={{fontSize:10,color:"var(--t3)"}}>{fmtTs(r.createdAt)}</span>
                        {r.type==="call" && r.duration>0 && (
                          <span style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>
                            {fmtDurMC(r.duration)}
                          </span>
                        )}
                        {r.type!=="call" && r.preview && (
                          <span style={{fontSize:10,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:300}}>
                            {r.preview}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direction badge */}
                    <div style={{
                      fontSize:9,fontWeight:700,fontFamily:"var(--mono)",
                      padding:"2px 7px",borderRadius:4,flexShrink:0,
                      color:dC,background:`color-mix(in srgb, ${dC} 10%, transparent)`,
                    }}>{(r.direction||"").toUpperCase()}</div>

                    {/* Recording playback for calls */}
                    {r.type==="call" && r.recordingUrl && (
                      <button className="btn btn-ghost btn-xs" onClick={()=>togglePlay(r.recordingUrl)}
                        style={{gap:4,fontSize:11,flexShrink:0}}>
                        {playing===r.recordingUrl ? Ic.pause : Ic.play}
                        {playing===r.recordingUrl ? "Pause" : "Play"}
                      </button>
                    )}
                    {r.type==="call" && !r.recordingUrl && r.status==="completed" && (
                      <span style={{fontSize:9,color:"var(--t3)",fontStyle:"italic",flexShrink:0}}>Processing…</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



const EQUIP_TYPES = [
  { value:"fan",        label:"Air Mover",           icon:"🌀", code:"AM" },
  { value:"dehu",       label:"Dehumidifier (LGR)",  icon:"💧", code:"DH" },
  { value:"dehu-des",   label:"Desiccant Dehu",      icon:"🔵", code:"DD" },
  { value:"scrubber",   label:"HEPA Air Scrubber",   icon:"🌬️", code:"AS" },
  { value:"negair",     label:"Negative Air Machine",icon:"⬇️", code:"NA" },
  { value:"ozone",      label:"Ozone Generator",     icon:"🟡", code:"OZ" },
  { value:"fogger",     label:"Thermal Fogger",      icon:"🌫️", code:"FG" },
  { value:"mat",        label:"Drying Mat",          icon:"🟫", code:"DM" },
  { value:"injectidry", label:"InjectiDry System",   icon:"💉", code:"ID" },
  { value:"thermal",    label:"Thermal Camera",      icon:"📷", code:"TC" },
  { value:"other",      label:"Other Equipment",     icon:"🔧", code:"OT" },
];
const getET = v => EQUIP_TYPES.find(t=>t.value===v) || EQUIP_TYPES[EQUIP_TYPES.length-1];

const INITIAL_PRICE_LISTS = [
  { id:"pl-wm", name:"Water Mitigation — Standard", workType:"Water Mitigation",
    description:"Standard equipment & material pricing for water damage projects", createdAt:"Jan 1, 2025",
    items:[
      { id:"wm-1",  code:"AM-001", desc:"Air Mover (LGR/Axial)",              unit:"day", price:28   },
      { id:"wm-2",  code:"DH-001", desc:"LGR Dehumidifier (Standard ~100pt)", unit:"day", price:85   },
      { id:"wm-3",  code:"DH-002", desc:"LGR Dehumidifier XL (175pt+)",       unit:"day", price:115  },
      { id:"wm-4",  code:"DD-001", desc:"Desiccant Dehumidifier",             unit:"day", price:145  },
      { id:"wm-5",  code:"AS-001", desc:"HEPA Air Scrubber (500–600 CFM)",    unit:"day", price:65   },
      { id:"wm-6",  code:"ID-001", desc:"InjectiDry Wall Drying System",      unit:"day", price:95   },
      { id:"wm-7",  code:"DM-001", desc:"Drying Mat (hardwood/tile)",         unit:"day", price:18   },
      { id:"wm-8",  code:"TC-001", desc:"Thermal Imaging Service",            unit:"day", price:45   },
      { id:"wm-9",  code:"AT-001", desc:"Antimicrobial Treatment",            unit:"SF",  price:0.55 },
      { id:"wm-10", code:"DE-001", desc:"Demo — Drywall Removal",             unit:"SF",  price:3.25 },
    ] },
  { id:"pl-fire", name:"Fire & Smoke — Standard", workType:"Fire/Smoke",
    description:"Equipment pricing for fire and smoke restoration projects", createdAt:"Jan 1, 2025",
    items:[
      { id:"fs-1", code:"AS-002", desc:"HEPA Air Scrubber (1200 CFM)",    unit:"day", price:110 },
      { id:"fs-2", code:"OZ-001", desc:"Ozone Generator",                 unit:"day", price:125 },
      { id:"fs-3", code:"FG-001", desc:"Thermal Fogger",                  unit:"day", price:85  },
      { id:"fs-4", code:"NA-001", desc:"Negative Air Machine",            unit:"day", price:65  },
      { id:"fs-5", code:"DP-001", desc:"Duct Pack / Air Duct Cleaning",   unit:"LS",  price:450 },
    ] },
  { id:"pl-mold", name:"Mold Remediation — Standard", workType:"Mold Remediation",
    description:"Equipment pricing for mold remediation projects", createdAt:"Jan 1, 2025",
    items:[
      { id:"mr-1", code:"NA-002", desc:"Negative Air Machine (600 CFM)",  unit:"day", price:65   },
      { id:"mr-2", code:"AS-003", desc:"HEPA Air Scrubber (600 CFM)",     unit:"day", price:85   },
      { id:"mr-3", code:"DH-003", desc:"LGR Dehumidifier",               unit:"day", price:85   },
      { id:"mr-4", code:"AM-002", desc:"Air Mover",                       unit:"day", price:28   },
      { id:"mr-5", code:"AM-003", desc:"Antimicrobial Treatment",         unit:"SF",  price:0.85 },
    ] },
];

function parseCSVToPriceItems(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const raw = lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,"").toLowerCase().replace(/\s+/g,""));
  const colOf = (...names) => { for(const n of names){ const i=raw.indexOf(n); if(i>-1) return i; } return -1; };
  const cCode=colOf("code","itemcode","sku","#"); const cDesc=colOf("desc","description","name","item","service");
  const cUnit=colOf("unit","uom"); const cPrice=colOf("price","unitprice","rate","cost","amount");
  return lines.slice(1).map(line=>{
    const cols = line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
    const desc = cDesc>-1 ? cols[cDesc] : "";
    if (!desc) return null;
    return { id:uid(), code:cCode>-1?cols[cCode]:"", desc, unit:cUnit>-1?(cols[cUnit]||"EA"):"EA",
             price:cPrice>-1?(parseFloat(cols[cPrice])||0):0 };
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 · PRICE LIST MANAGER MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PriceListManagerModal({ priceLists, setPriceLists, onClose }) {
  const [activeId, setActiveId] = useState(priceLists[0]?.id||null);
  const [addingList, setAddingList] = useState(false);
  const [newListForm, setNewListForm] = useState({ name:"", workType:"Water Mitigation", description:"" });
  const [editItemId, setEditItemId] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [showCSVFor, setShowCSVFor] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const csvFileRef = useRef();
  const currentList = priceLists.find(pl=>pl.id===activeId);

  const createList = () => {
    if (!newListForm.name.trim()) return;
    const nl = { id:uid(), ...newListForm, items:[], createdAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) };
    setPriceLists(pl=>[...pl,nl]); setActiveId(nl.id); setAddingList(false);
    setNewListForm({ name:"", workType:"Water Mitigation", description:"" });
  };
  const removeList = id => {
    const next = priceLists.filter(p=>p.id!==id);
    setPriceLists(next); if(activeId===id) setActiveId(next[0]?.id||null);
  };
  const addItem = () => {
    const ni = { id:uid(), code:"", desc:"New Item", unit:"day", price:0 };
    setPriceLists(pl=>pl.map(p=>p.id===activeId?{...p,items:[...p.items,ni]}:p));
    setEditItemId(ni.id);
  };
  const updItem = (itemId,field,val) => setPriceLists(pl=>pl.map(p=>p.id===activeId
    ?{...p,items:p.items.map(i=>i.id===itemId?{...i,[field]:field==="price"?parseFloat(val)||0:val}:i)}:p));
  const removeItem = itemId => setPriceLists(pl=>pl.map(p=>p.id===activeId?{...p,items:p.items.filter(i=>i.id!==itemId)}:p));

  const importCSV = () => {
    const items = parseCSVToPriceItems(csvText);
    if (!items.length) { setImportStatus("No valid items found. Check CSV format."); return; }
    setPriceLists(pl=>pl.map(p=>p.id===showCSVFor?{...p,items:[...p.items,...items]}:p));
    setImportStatus(`✓ Imported ${items.length} items`); setCsvText(""); setShowCSVFor(null);
  };
  const handleCSVFile = e => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>setCsvText(ev.target.result); r.readAsText(f); e.target.value=""; };

  const WORK_TYPES = ["Water Mitigation","Fire/Smoke","Mold Remediation","Demo","Reconstruction","Pack-out","Contents","General"];

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim" style={{maxHeight:"88vh",height:"88vh",display:"flex",flexDirection:"column"}}>
        <div className="modal-hd" style={{flexShrink:0}}>
          <div><div className="modal-ttl">Price Lists</div><div className="mono" style={{fontSize:9,color:"var(--t3)",marginTop:1}}>COMPANY-WIDE EQUIPMENT & MATERIAL PRICING</div></div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>

        {/* CSV import sub-modal */}
        {showCSVFor && (
          <div className="overlay" style={{zIndex:601}} onClick={e=>e.target===e.currentTarget&&setShowCSVFor(null)}>
            <div className="modal modal-sm anim">
              <div className="modal-hd"><div className="modal-ttl">Import CSV</div><button className="btn btn-ghost btn-xs" onClick={()=>setShowCSVFor(null)}>{Ic.close}</button></div>
              <div className="modal-body">
                <div style={{background:"var(--s3)",borderRadius:8,padding:"10px 12px",fontSize:11,color:"var(--t2)",marginBottom:10,lineHeight:1.7}}>
                  <strong style={{color:"var(--t1)"}}>Required columns:</strong> code, desc (or description/name), unit, price<br/>
                  First row must be column headers. Comma-separated.
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <button className="btn btn-secondary btn-xs" onClick={()=>csvFileRef.current?.click()}>{Ic.upload} Browse File…</button>
                  <input ref={csvFileRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleCSVFile}/>
                </div>
                <label className="lbl">Or paste CSV text</label>
                <textarea className="txa" rows={7} value={csvText} onChange={e=>setCsvText(e.target.value)} placeholder={"code,desc,unit,price\nAM-001,Air Mover,day,28\nDH-001,LGR Dehumidifier,day,85"}/>
                {importStatus && <div style={{fontSize:11,color:importStatus.startsWith("✓")?"var(--green)":"var(--acc)",marginTop:4}}>{importStatus}</div>}
              </div>
              <div className="modal-ft">
                <button className="btn btn-ghost" onClick={()=>setShowCSVFor(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={importCSV} disabled={!csvText.trim()}>{Ic.plus} Import Items</button>
              </div>
            </div>
          </div>
        )}

        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Sidebar — list of price lists */}
          <div style={{width:220,flexShrink:0,borderRight:"1px solid var(--br)",display:"flex",flexDirection:"column",background:"var(--s1)"}}>
            <div style={{padding:"10px 12px",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)"}}>PRICE LISTS</div>
              <button className="btn btn-primary btn-xs" onClick={()=>setAddingList(v=>!v)}>{Ic.plus}</button>
            </div>
            {addingList && (
              <div style={{padding:"10px 12px",borderBottom:"1px solid var(--br)",background:"var(--s2)"}}>
                <label className="lbl">List Name</label>
                <input className="inp" value={newListForm.name} onChange={e=>setNewListForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Water Mitigation 2025" style={{marginBottom:7}}/>
                <label className="lbl">Work Type</label>
                <select className="sel" value={newListForm.workType} onChange={e=>setNewListForm(p=>({...p,workType:e.target.value}))} style={{marginBottom:7}}>
                  {WORK_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
                <div style={{display:"flex",gap:5}}>
                  <button className="btn btn-ghost btn-xs" style={{flex:1}} onClick={()=>setAddingList(false)}>Cancel</button>
                  <button className="btn btn-primary btn-xs" style={{flex:1}} onClick={createList}>Create</button>
                </div>
              </div>
            )}
            <div style={{flex:1,overflowY:"auto"}}>
              {priceLists.map(pl=>(
                <div key={pl.id} onClick={()=>setActiveId(pl.id)} style={{padding:"9px 12px",cursor:"pointer",borderBottom:"1px solid var(--br)",
                  background:activeId===pl.id?"var(--acc-lo)":"transparent",borderLeft:`3px solid ${activeId===pl.id?"var(--acc)":"transparent"}`}}>
                  <div style={{fontSize:12,fontWeight:600,color:activeId===pl.id?"var(--t1)":"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl.name}</div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:2,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span className="mono">{pl.items.length} items</span>
                    <button className="btn btn-danger btn-xs" style={{padding:"1px 5px",fontSize:9}} onClick={e=>{e.stopPropagation();if(window.confirm(`Delete "${pl.name}"?`))removeList(pl.id);}}>{Ic.trash}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — items */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {!currentList ? (
              <div className="empty"><div style={{opacity:.15,fontSize:28}}>{Ic.pricetag}</div><div className="mono" style={{fontSize:11}}>NO LIST SELECTED</div><div style={{fontSize:11}}>Create or select a price list to get started.</div></div>
            ) : (
              <>
                <div style={{padding:"10px 16px",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{currentList.name}</div>
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>
                      <span style={{background:"var(--acc-lo)",color:"var(--acc)",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700,marginRight:6}}>{currentList.workType}</span>
                      {currentList.items.length} items · Created {currentList.createdAt}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-xs" onClick={()=>{setShowCSVFor(currentList.id);setImportStatus(null);}}>{Ic.upload} Import CSV</button>
                  <button className="btn btn-primary btn-xs" onClick={addItem}>{Ic.plus} Add Item</button>
                </div>

                {/* Column headers */}
                <div style={{display:"grid",gridTemplateColumns:"100px 1fr 60px 90px 26px",gap:6,padding:"6px 14px",background:"var(--s1)",borderBottom:"1px solid var(--br)",flexShrink:0}}>
                  {["Code","Description","Unit","Unit Price",""].map((h,i)=><div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>)}
                </div>

                <div style={{flex:1,overflowY:"auto",padding:"6px 10px"}}>
                  {currentList.items.length===0 && (
                    <div className="empty"><div style={{opacity:.12,fontSize:24}}>{Ic.pricetag}</div>
                    <div style={{fontSize:11,color:"var(--t3)"}}>No items yet — add manually or import CSV</div></div>
                  )}
                  {currentList.items.map(item=>(
                    <div key={item.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 60px 90px 26px",gap:6,alignItems:"center",padding:"4px 4px",marginBottom:2}}>
                      {editItemId===item.id ? (
                        <>
                          <input className="inp" value={item.code} onChange={e=>updItem(item.id,"code",e.target.value)} style={{height:28,fontSize:11}} placeholder="Code"/>
                          <input className="inp" value={item.desc} onChange={e=>updItem(item.id,"desc",e.target.value)} style={{height:28,fontSize:11}} placeholder="Description"/>
                          <select className="sel" value={item.unit} onChange={e=>updItem(item.id,"unit",e.target.value)} style={{height:28,fontSize:11}}>
                            {["day","SF","LF","EA","HR","MO","LS","SQ"].map(u=><option key={u}>{u}</option>)}
                          </select>
                          <div style={{position:"relative"}}>
                            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--t3)"}}>$</span>
                            <input type="number" className="inp" value={item.price} onChange={e=>updItem(item.id,"price",e.target.value)} style={{height:28,fontSize:11,paddingLeft:16}}/>
                          </div>
                          <button className="btn btn-green btn-xs" style={{padding:"2px 5px"}} onClick={()=>setEditItemId(null)}>{Ic.check}</button>
                        </>
                      ) : (
                        <>
                          <div className="mono" style={{fontSize:10,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.code||"—"}</div>
                          <div style={{fontSize:12,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}} onClick={()=>setEditItemId(item.id)}>{item.desc}</div>
                          <div className="mono" style={{fontSize:10,color:"var(--t2)"}}>{item.unit}</div>
                          <div className="mono" style={{fontSize:12,fontWeight:700,color:"var(--green)"}}>${item.price.toFixed(2)}</div>
                          <button className="btn btn-danger btn-xs" style={{padding:"2px 5px"}} onClick={()=>removeItem(item.id)}>{Ic.trash}</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 · ENHANCED DRYDOX TAB
// ─────────────────────────────────────────────────────────────────────────────

const DRYDOX_SEED_ROOMS = [
  { id:"dr1", label:"Living Room",  widthFt:18, depthFt:14 },
  { id:"dr2", label:"Kitchen",      widthFt:12, depthFt:10 },
  { id:"dr3", label:"Hallway",      widthFt:6,  depthFt:14 },
];

const DRYDOX_EQUIP_SEED = [
  { id:"deq1", type:"fan",    brand:"Dri-Eaz F203",   serial:"A1234", roomId:"dr1", dayIn:1, dayOut:0, plItemId:"wm-1", notes:"NE corner" },
  { id:"deq2", type:"dehu",   brand:"LGR 7000 XLi",   serial:"D5678", roomId:"dr1", dayIn:1, dayOut:0, plItemId:"wm-2", notes:"Center" },
  { id:"deq3", type:"fan",    brand:"Dri-Eaz F203",   serial:"A1235", roomId:"dr2", dayIn:1, dayOut:3, plItemId:"wm-1", notes:"SW corner" },
  { id:"deq4", type:"scrubber",brand:"AirRestore 500",serial:"S2222", roomId:"dr2", dayIn:1, dayOut:0, plItemId:"wm-5", notes:"By window" },
];

const DRYDOX_SEED = [
  { id:1, day:"Day 1", date:"Dec 12", tech:"Jake R.", temp:72, rh:78, gpp:112, equip:"3× DHU, 8× Air Mover, 1× Air Scrubber", notes:"Initial extraction complete. RH elevated." },
  { id:2, day:"Day 2", date:"Dec 13", tech:"Maria S.", temp:74, rh:62, gpp:88,  equip:"3× DHU, 8× Air Mover, 1× Air Scrubber", notes:"Trending toward dry standard." },
  { id:3, day:"Day 3", date:"Dec 14", tech:"Jake R.", temp:75, rh:52, gpp:71,  equip:"2× DHU, 6× Air Mover, 1× Air Scrubber", notes:"Removed 2 air movers. Kitchen nearing standard." },
];


function DryDoxTab({ proj, priceLists=[], onPushToScope }) {
  const [subtab, setSubtab]   = useState("log");
  const [logs, setLogs]       = useState(DRYDOX_SEED);
  const [expand, setExpand]   = useState(null);
  const [addingLog, setAddLog]= useState(false);
  const [logF, setLogF]       = useState({tech:"",temp:"",rh:"",gpp:"",equip:"",notes:""});
  const [rooms, setRooms]     = useState(DRYDOX_SEED_ROOMS);
  const [equipment, setEquip] = useState(DRYDOX_EQUIP_SEED);
  const [addingEq, setAddEq]  = useState(false);
  const [eqForm, setEqF]      = useState({type:"fan",brand:"",serial:"",roomId:"",dayIn:"1",dayOut:"0",plItemId:"",notes:""});
  const [activePLId, setActivePL] = useState(priceLists[0]?.id || null);
  const [pushStatus, setPushStatus] = useState(null);
  const [billingDays, setBillDays] = useState(3); // override total project days

  const currentPL = priceLists.find(pl=>pl.id===activePLId);

  const rhColor = rh => rh<=55?"var(--green)":rh<=65?"var(--amber)":"var(--acc)";

  // ── equipment billing logic ──
  const calcEquipCost = eq => {
    const dOut = parseInt(eq.dayOut)||0;
    const dIn  = parseInt(eq.dayIn)||1;
    const days = dOut>0 ? Math.max(1, dOut-dIn+1) : Math.max(1, billingDays-dIn+1);
    const plItem = currentPL?.items.find(i=>i.id===eq.plItemId);
    const rate = plItem?.price || 0;
    return { days, rate, total: days*rate, plItem };
  };

  const totalEquipCost = equipment.reduce((sum,eq)=>{ const c=calcEquipCost(eq); return sum+c.total; },0);
  const activeCount    = equipment.filter(eq=>!parseInt(eq.dayOut)).length;

  const saveLog = () => {
    if (!logF.tech) return;
    const n = logs.length+1;
    setLogs(l=>[...l,{id:uid(),day:`Day ${n}`,date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      tech:logF.tech,temp:parseFloat(logF.temp)||72,rh:parseFloat(logF.rh)||0,gpp:parseFloat(logF.gpp)||0,equip:logF.equip,notes:logF.notes}]);
    setLogF({tech:"",temp:"",rh:"",gpp:"",equip:"",notes:""}); setAddLog(false);
  };

  const saveEquip = () => {
    if (!eqForm.brand&&!eqForm.type) return;
    setEquip(e=>[...e,{id:uid(),...eqForm,dayIn:parseInt(eqForm.dayIn)||1,dayOut:parseInt(eqForm.dayOut)||0}]);
    setEqF({type:"fan",brand:"",serial:"",roomId:"",dayIn:"1",dayOut:"0",plItemId:"",notes:""});
    setAddEq(false);
  };

  const pushToScope = () => {
    if (!onPushToScope || !currentPL) return;
    const lineItems = equipment
      .filter(eq=>eq.plItemId)
      .map(eq=>{
        const { days, rate, plItem } = calcEquipCost(eq);
        const et = getET(eq.type);
        const room = rooms.find(r=>r.id===eq.roomId);
        return {
          id: uid(),
          desc:`${eq.brand||et.label} — ${et.label}${room?" ("+room.label+")":""}`,
          unit:"day", qty:days, price:rate,
          source:"drydox",
        };
      }).filter(i=>i.price>0);
    if (!lineItems.length) { setPushStatus("No equipment with pricing found. Assign items to a price list first."); return; }
    onPushToScope(lineItems);
    setPushStatus(`✓ Pushed ${lineItems.length} line items to Scope/Invoice`);
    setTimeout(()=>setPushStatus(null), 4000);
  };

  const SUBTABS = [["log","Drying Log"],["equipment","Equipment"],["billing","Billing & Scope"],["rooms","Rooms"]];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      {/* Sub-tab bar */}
      <div style={{display:"flex",background:"var(--s2)",borderBottom:"1px solid var(--br)",padding:"0 18px",flexShrink:0}}>
        {SUBTABS.map(([k,l])=>(
          <button key={k} onClick={()=>setSubtab(k)} style={{
            background:"none",border:"none",fontFamily:"var(--ui)",fontSize:11,padding:"10px 12px",cursor:"pointer",
            borderBottom:`2px solid ${subtab===k?"var(--acc)":"transparent"}`,
            color:subtab===k?"var(--t1)":"var(--t2)",fontWeight:subtab===k?700:400,transition:"all .12s"}}>
            {l}
          </button>
        ))}
        <div style={{flex:1}}/>
        {priceLists.length>0 && (
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
            <div className="mono" style={{fontSize:9,color:"var(--t3)"}}>PRICE LIST</div>
            <select className="sel" value={activePLId||""} onChange={e=>setActivePL(e.target.value)}
              style={{height:26,fontSize:10,padding:"3px 8px",width:180}}>
              <option value="">— None Selected —</option>
              {priceLists.map(pl=><option key={pl.id} value={pl.id}>{pl.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="scroll">
        <div style={{maxWidth:900,margin:"0 auto"}}>

          {/* ── DRYING LOG TAB ── */}
          {subtab==="log" && (
            <>
              <div className="g4" style={{gap:9,marginBottom:16}}>
                {[["Days Active",logs.length,"var(--blue)"],
                  ["Latest RH",`${logs[logs.length-1]?.rh||0}%`,rhColor(logs[logs.length-1]?.rh||0)],
                  ["Latest GPP",logs[logs.length-1]?.gpp||0,"var(--teal)"],
                  ["Status",(logs[logs.length-1]?.rh||0)<=55?"Dry Standard":"Drying","var(--green)"]
                ].map(([l,v,c])=>(
                  <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}>
                    <div className="kpi-val" style={{color:c}}>{v}</div><div className="kpi-lbl">{l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div className="sec">Drying Log</div>
                <button className="btn btn-primary btn-xs" onClick={()=>setAddLog(v=>!v)}>{Ic.plus} New Reading Day</button>
              </div>
              {addingLog && (
                <div className="card" style={{marginBottom:12}}>
                  <div className="g4" style={{gap:9,marginBottom:9}}>
                    <F label="Technician" value={logF.tech} onChange={v=>setLogF(p=>({...p,tech:v}))} placeholder="Name"/>
                    <F label="Temp (°F)"  value={logF.temp} onChange={v=>setLogF(p=>({...p,temp:v}))} placeholder="72"/>
                    <F label="RH %"       value={logF.rh}   onChange={v=>setLogF(p=>({...p,rh:v}))}   placeholder="55"/>
                    <F label="GPP"        value={logF.gpp}  onChange={v=>setLogF(p=>({...p,gpp:v}))}  placeholder="72"/>
                  </div>
                  <F label="Equipment in Place" value={logF.equip} onChange={v=>setLogF(p=>({...p,equip:v}))} placeholder="3× DHU, 8× Air Mover…"/>
                  <div style={{marginTop:9}}><F label="Notes" value={logF.notes} onChange={v=>setLogF(p=>({...p,notes:v}))} rows={2} placeholder="Observations…"/></div>
                  <div style={{display:"flex",justifyContent:"flex-end",gap:7,marginTop:9}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setAddLog(false)}>Cancel</button>
                    <button className="btn btn-primary btn-xs" onClick={saveLog}>Save Log</button>
                  </div>
                </div>
              )}
              {[...logs].reverse().map(log=>(
                <div key={log.id} className="card" style={{marginBottom:9,cursor:"pointer"}} onClick={()=>setExpand(expand===log.id?null:log.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:9,background:"var(--acc-lo)",display:"flex",alignItems:"center",justifyContent:"center",
                        color:"var(--acc)",flexShrink:0,fontFamily:"var(--mono)",fontSize:10,fontWeight:700}}>{log.day.replace("Day ","D")}</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{log.day} — {log.date}</div>
                        <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>Tech: {log.tech} · {log.equip}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:16,alignItems:"center",flexShrink:0}}>
                      {[["RH",`${log.rh}%`,rhColor(log.rh)],["Temp",`${log.temp}°F`,"var(--t1)"],["GPP",log.gpp,"var(--teal)"]].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:"right"}}><div className="mono" style={{fontSize:13,fontWeight:700,color:c}}>{v}</div><div className="lbl" style={{margin:0}}>{l}</div></div>
                      ))}
                    </div>
                  </div>
                  {expand===log.id && log.notes && (
                    <div style={{marginTop:10,padding:"9px 12px",background:"var(--s3)",borderRadius:7,fontSize:12,color:"var(--t2)",borderTop:"1px solid var(--br)"}}>
                      {log.notes}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── EQUIPMENT TAB ── */}
          {subtab==="equipment" && (
            <>
              <div className="g4" style={{gap:9,marginBottom:16}}>
                {[["Total Units",equipment.length,"var(--t1)"],["Active",activeCount,"var(--green)"],
                  ["Removed",equipment.length-activeCount,"var(--t3)"],
                  ["Types",[...new Set(equipment.map(e=>e.type))].length,"var(--blue)"]
                ].map(([l,v,c])=>(
                  <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}>
                    <div className="kpi-val" style={{color:c}}>{v}</div><div className="kpi-lbl">{l}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div className="sec">Equipment Deployment</div>
                <button className="btn btn-primary btn-xs" onClick={()=>setAddEq(v=>!v)}>{Ic.plus} Add Equipment</button>
              </div>

              {addingEq && (
                <div className="card" style={{marginBottom:12}}>
                  <div className="g4" style={{gap:9,marginBottom:9}}>
                    <F label="Type" value={eqForm.type} onChange={v=>setEqF(p=>({...p,type:v}))} options={EQUIP_TYPES.map(e=>e.value)}/>
                    <F label="Brand / Model" value={eqForm.brand} onChange={v=>setEqF(p=>({...p,brand:v}))} placeholder="e.g. LGR 7000 XLi"/>
                    <F label="Serial #" value={eqForm.serial} onChange={v=>setEqF(p=>({...p,serial:v}))} placeholder="SN-0000"/>
                    <div>
                      <label className="lbl">Room / Location</label>
                      <select className="sel" value={eqForm.roomId} onChange={e=>setEqF(p=>({...p,roomId:e.target.value}))}>
                        <option value="">— Select Room —</option>
                        {rooms.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                        <option value="__other">Other / Multiple</option>
                      </select>
                    </div>
                    <F label="Day In" value={eqForm.dayIn} onChange={v=>setEqF(p=>({...p,dayIn:v}))} placeholder="1"/>
                    <F label="Day Out (0=active)" value={eqForm.dayOut} onChange={v=>setEqF(p=>({...p,dayOut:v}))} placeholder="0"/>
                    <div>
                      <label className="lbl">Price List Item</label>
                      <select className="sel" value={eqForm.plItemId} onChange={e=>setEqF(p=>({...p,plItemId:e.target.value}))}>
                        <option value="">— None —</option>
                        {(currentPL?.items||[]).map(i=><option key={i.id} value={i.id}>{i.desc} (${i.price}/{i.unit})</option>)}
                      </select>
                    </div>
                    <F label="Notes / Placement" value={eqForm.notes} onChange={v=>setEqF(p=>({...p,notes:v}))} placeholder="Corner, facing wall…"/>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setAddEq(false)}>Cancel</button>
                    <button className="btn btn-primary btn-xs" onClick={saveEquip}>Add Equipment</button>
                  </div>
                </div>
              )}

              {/* Column headers */}
              <div style={{display:"grid",gridTemplateColumns:"32px 1fr 120px 80px 90px 100px 26px",gap:8,padding:"4px 12px",marginBottom:3}}>
                {["","Equipment","Room","Days","Status","Price",""].map((h,i)=><div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>)}
              </div>

              {equipment.map(eq=>{
                const et = getET(eq.type);
                const room = rooms.find(r=>r.id===eq.roomId);
                const dOut = parseInt(eq.dayOut)||0;
                const days = dOut>0 ? dOut-parseInt(eq.dayIn)+1 : billingDays-parseInt(eq.dayIn)+1;
                const active = !dOut;
                const plItem = currentPL?.items.find(i=>i.id===eq.plItemId);
                const cost = plItem ? days*plItem.price : null;
                return (
                  <div key={eq.id} className="row" style={{display:"grid",gridTemplateColumns:"32px 1fr 120px 80px 90px 100px 26px",gap:8,alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:18,textAlign:"center"}}>{et.icon}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eq.brand||et.label}</div>
                      {eq.serial && <div className="mono" style={{fontSize:10,color:"var(--t3)"}}>{eq.serial}</div>}
                      {eq.notes  && <div style={{fontSize:10,color:"var(--t3)",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eq.notes}</div>}
                    </div>
                    <div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{room?.label||"—"}</div>
                    <div className="mono" style={{fontSize:11,fontWeight:700,color:"var(--blue)"}}>
                      D{eq.dayIn}→{dOut>0?"D"+dOut:"Active"}
                    </div>
                    <div>
                      {active
                        ? <span style={{fontSize:9,background:"rgba(26,217,138,.12)",color:"var(--green)",borderRadius:4,padding:"2px 6px",fontWeight:700}}>ACTIVE</span>
                        : <span style={{fontSize:9,background:"var(--s3)",color:"var(--t3)",borderRadius:4,padding:"2px 6px",fontWeight:700}}>REMOVED D{dOut}</span>}
                    </div>
                    <div className="mono" style={{fontSize:11,fontWeight:700,color:cost?"var(--amber)":"var(--t3)"}}>
                      {cost!=null ? fmt$c(cost) : "—"}
                    </div>
                    <button className="btn btn-danger btn-xs" style={{padding:"2px 5px"}} onClick={()=>setEquip(e=>e.filter(x=>x.id!==eq.id))}>{Ic.trash}</button>
                  </div>
                );
              })}
            </>
          )}

          {/* ── BILLING & SCOPE TAB ── */}
          {subtab==="billing" && (
            <>
              {!currentPL ? (
                <div style={{background:"rgba(232,156,24,.08)",border:"1px solid rgba(232,156,24,.25)",borderRadius:10,padding:"14px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{color:"var(--amber)",fontSize:16}}>{Ic.pricetag}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--amber)"}}>No Price List Selected</div>
                    <div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>Select a price list above to calculate equipment billing. Manage price lists in Advanced Tools → Price Lists.</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div>
                      <div className="sec" style={{marginBottom:2}}>Equipment Billing Summary</div>
                      <div style={{fontSize:11,color:"var(--t3)"}}>Using: <strong style={{color:"var(--t1)"}}>{currentPL.name}</strong></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div className="mono" style={{fontSize:9,color:"var(--t3)"}}>PROJECT DAYS</div>
                        <input type="number" className="inp" value={billingDays} onChange={e=>setBillDays(Math.max(1,parseInt(e.target.value)||1))}
                          style={{width:60,height:28,fontSize:12,textAlign:"center"}}/>
                      </div>
                      <button className="btn btn-primary" onClick={pushToScope} disabled={!onPushToScope}>
                        {Ic.invoice} Push to Scope
                      </button>
                    </div>
                  </div>

                  {pushStatus && (
                    <div style={{background:pushStatus.startsWith("✓")?"rgba(26,217,138,.1)":"rgba(232,156,24,.1)",
                      border:`1px solid ${pushStatus.startsWith("✓")?"rgba(26,217,138,.25)":"rgba(232,156,24,.25)"}`,
                      borderRadius:8,padding:"9px 12px",fontSize:11,fontWeight:700,
                      color:pushStatus.startsWith("✓")?"var(--green)":"var(--amber)",marginBottom:12}}>
                      {pushStatus}
                    </div>
                  )}

                  {/* Billing table */}
                  <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,overflow:"hidden",marginBottom:12}}>
                    <div style={{display:"grid",gridTemplateColumns:"28px 1fr 110px 60px 80px 90px 100px",gap:8,padding:"8px 14px",background:"var(--s1)",borderBottom:"1px solid var(--br)"}}>
                      {["","Equipment","Room","Day In","Day Out","Days","Total"].map((h,i)=><div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>)}
                    </div>
                    {equipment.length===0 && (
                      <div style={{padding:"24px",textAlign:"center",color:"var(--t3)",fontSize:12}}>No equipment logged yet — add equipment in the Equipment tab.</div>
                    )}
                    {equipment.map(eq=>{
                      const et = getET(eq.type);
                      const room = rooms.find(r=>r.id===eq.roomId);
                      const { days, rate, total, plItem } = calcEquipCost(eq);
                      return (
                        <div key={eq.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 110px 60px 80px 90px 100px",gap:8,alignItems:"center",padding:"9px 14px",borderBottom:"1px solid var(--br)"}}>
                          <div style={{fontSize:15}}>{et.icon}</div>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{eq.brand||et.label}</div>
                            {plItem
                              ? <div style={{fontSize:10,color:"var(--blue)"}}>{plItem.desc} · ${rate}/{plItem.unit}</div>
                              : <div style={{fontSize:10,color:"var(--acc)"}}>⚠ No price list item assigned</div>}
                          </div>
                          <div style={{fontSize:11,color:"var(--t2)"}}>{room?.label||"—"}</div>
                          <div className="mono" style={{fontSize:11,color:"var(--t2)"}}>D{eq.dayIn}</div>
                          <div className="mono" style={{fontSize:11,color:(parseInt(eq.dayOut)||0)>0?"var(--t2)":"var(--green)"}}>
                            {(parseInt(eq.dayOut)||0)>0?"D"+eq.dayOut:"Active"}
                          </div>
                          <div className="mono" style={{fontSize:12,fontWeight:700,color:"var(--blue)"}}>{days}d</div>
                          <div className="mono" style={{fontSize:12,fontWeight:700,color:total>0?"var(--amber)":"var(--t3)"}}>{total>0?fmt$c(total):"—"}</div>
                        </div>
                      );
                    })}
                    <div style={{display:"grid",gridTemplateColumns:"28px 1fr 110px 60px 80px 90px 100px",gap:8,padding:"10px 14px",background:"var(--s1)",borderTop:"2px solid var(--br)"}}>
                      <div/><div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>Equipment Total</div>
                      <div/><div/><div/><div/>
                      <div className="mono" style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>{fmt$c(totalEquipCost)}</div>
                    </div>
                  </div>

                  {!onPushToScope && (
                    <div style={{fontSize:11,color:"var(--t3)",textAlign:"center",padding:"8px"}}>
                      Push to Scope is available when DryDox is opened within a project.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── ROOMS TAB ── */}
          {subtab==="rooms" && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div className="sec">Drying Zones / Rooms</div>
                <button className="btn btn-primary btn-xs" onClick={()=>{
                  const name=window.prompt("Room / zone name:");
                  if(name) setRooms(r=>[...r,{id:uid(),label:name,widthFt:12,depthFt:10}]);
                }}>{Ic.plus} Add Room</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
                {rooms.map(room=>{
                  const roomEquip = equipment.filter(eq=>eq.roomId===room.id);
                  const activeEq  = roomEquip.filter(eq=>!(parseInt(eq.dayOut)||0));
                  return (
                    <div key={room.id} className="card" style={{position:"relative"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:"var(--t1)"}}>{room.label}</div>
                          <div className="mono" style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{room.widthFt}ft × {room.depthFt}ft · {Math.round(room.widthFt*room.depthFt)} SF</div>
                        </div>
                        <button className="btn btn-danger btn-xs" style={{padding:"2px 5px"}} onClick={()=>setRooms(r=>r.filter(x=>x.id!==room.id))}>{Ic.trash}</button>
                      </div>
                      <div style={{display:"flex",gap:10,marginBottom:8}}>
                        {[["Equipment",roomEquip.length,"var(--blue)"],["Active",activeEq.length,"var(--green)"]].map(([l,v,c])=>(
                          <div key={l} style={{flex:1,background:"var(--s3)",borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                            <div className="mono" style={{fontSize:16,fontWeight:700,color:c}}>{v}</div>
                            <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      {activeEq.map(eq=>(
                        <div key={eq.id} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderTop:"1px solid var(--br)"}}>
                          <span style={{fontSize:14}}>{getET(eq.type).icon}</span>
                          <div style={{flex:1,fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eq.brand||getET(eq.type).label}</div>
                          <span style={{fontSize:9,color:"var(--green)",fontFamily:"var(--mono)"}}>D{eq.dayIn}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 · ENHANCED CONTENTSDOX TAB
// ─────────────────────────────────────────────────────────────────────────────

// ContentsDox is now a separate imported component (ContentsDox.jsx)

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 · ENHANCED SCOPE TAB
// ─────────────────────────────────────────────────────────────────────────────


const GBB_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
body.jd-new-theme{--jdv2-bg:#06070d;--jdv2-s1:#0c0e18;--jdv2-s2:#10121e;--jdv2-s3:#161929;--jdv2-s4:#1c2035;--jdv2-acc:#e43531;--jdv2-acc-lo:rgba(228,53,49,.09);--jdv2-acc-glo:rgba(228,53,49,.28);--jdv2-t1:#eef1f8;--jdv2-t2:#8b95b0;--jdv2-t3:#404866;--jdv2-green:#1ad98a;--jdv2-amber:#e89c18;--jdv2-blue:#5ba3f5;--jdv2-purple:#a78bfa;--jdv2-br:rgba(255,255,255,.10);--jdv2-br-hi:rgba(255,255,255,.18);--jdv2-line:rgba(255,255,255,.13);--jdv2-font-ui:'Outfit',sans-serif;--jdv2-font-mono:'Space Mono',monospace;}
body.jd-new-theme.jd-light-mode{--jdv2-bg:#e8ebf2;--jdv2-s1:#f2f4f8;--jdv2-s2:#fff;--jdv2-s3:#e8eaf2;--jdv2-s4:#dde0ed;--jdv2-t1:#0d1117;--jdv2-t2:#374151;--jdv2-t3:#6b7280;--jdv2-green:#059669;--jdv2-amber:#b45309;--jdv2-blue:#1d60c8;--jdv2-purple:#6d28d9;--jdv2-br:rgba(0,0,0,.14);--jdv2-br-hi:rgba(0,0,0,.24);--jdv2-line:rgba(0,0,0,.18);}
:root{--jdv2-bg:#06070d;--jdv2-s1:#0c0e18;--jdv2-s2:#10121e;--jdv2-s3:#161929;--jdv2-s4:#1c2035;--jdv2-acc:#e43531;--jdv2-acc-lo:rgba(228,53,49,.09);--jdv2-acc-glo:rgba(228,53,49,.28);--jdv2-t1:#eef1f8;--jdv2-t2:#8b95b0;--jdv2-t3:#404866;--jdv2-green:#1ad98a;--jdv2-amber:#e89c18;--jdv2-blue:#5ba3f5;--jdv2-purple:#a78bfa;--jdv2-br:rgba(255,255,255,.10);--jdv2-br-hi:rgba(255,255,255,.18);--jdv2-line:rgba(255,255,255,.13);--jdv2-font-ui:'Outfit',sans-serif;--jdv2-font-mono:'Space Mono',monospace;}
.gbb-content{flex:1;display:flex;overflow:hidden;}
.gbb-list-col{width:320px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid var(--jdv2-br);}
.gbb-list-scroll{flex:1;overflow-y:auto;padding:8px 10px 12px;}
.gbb-list-scroll::-webkit-scrollbar{width:3px;}.gbb-list-scroll::-webkit-scrollbar-thumb{background:var(--jdv2-br);border-radius:2px;}
.gbb-detail-panel{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
.gbb-detail-scroll{flex:1;overflow-y:auto;padding:20px 22px;}
.gbb-detail-scroll::-webkit-scrollbar{width:3px;}.gbb-detail-scroll::-webkit-scrollbar-thumb{background:var(--jdv2-br);border-radius:2px;}
.gbb-col-hdr{padding:0 12px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--jdv2-br);}
.gbb-col-label{font-family:var(--jdv2-font-mono);font-size:10px;color:var(--jdv2-t2);letter-spacing:.07em;font-weight:700;text-transform:uppercase;}
.gbb-panel-hdr{height:44px;flex-shrink:0;padding:0 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--jdv2-br);gap:10px;}
.gbb-panel-hdr-l{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;}
.gbb-panel-title{font-size:13px;font-weight:700;color:var(--jdv2-t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gbb-panel-sub{font-family:var(--jdv2-font-mono);font-size:9px;color:var(--jdv2-t3);white-space:nowrap;}
.gbb-panel-hdr-r{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.gbb-breadcrumb{display:flex;align-items:center;gap:4px;font-family:var(--jdv2-font-mono);font-size:9px;}
.gbb-bc-btn{background:none;border:none;color:var(--jdv2-t3);cursor:pointer;font-family:var(--jdv2-font-mono);font-size:9px;padding:0;transition:color .13s;}
.gbb-bc-btn:hover{color:var(--jdv2-acc);}.gbb-bc-cur{color:var(--jdv2-t2);font-weight:700;}.gbb-bc-sep{color:var(--jdv2-t3);font-size:8px;}
.gbb-back-btn{background:none;border:none;color:var(--jdv2-t2);cursor:pointer;display:flex;align-items:center;padding:0 4px 0 0;transition:color .13s;flex-shrink:0;}
.gbb-back-btn:hover{color:var(--jdv2-t1);}.gbb-back-btn svg{width:14px;height:14px;fill:currentColor;}
.gbb-est-card{display:flex;align-items:stretch;cursor:pointer;background:var(--jdv2-s2);border-radius:8px;margin-bottom:4px;overflow:hidden;border:1px solid var(--jdv2-br);transition:all .13s;}
.gbb-est-card:hover{background:var(--jdv2-s3);border-color:var(--jdv2-br-hi);box-shadow:0 2px 12px rgba(0,0,0,.12);}
.gbb-est-card.selected{background:var(--jdv2-s4);border-color:var(--jdv2-br-hi);box-shadow:0 4px 20px rgba(0,0,0,.15);}
.gbb-est-accent{width:3px;flex-shrink:0;}.gbb-est-body{flex:1;padding:10px 12px;min-width:0;}
.gbb-est-r1{display:flex;align-items:center;gap:8px;margin-bottom:4px;}
.gbb-est-name{font-size:13px;font-weight:600;color:var(--jdv2-t1);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gbb-est-id{font-family:var(--jdv2-font-mono);font-size:10px;color:var(--jdv2-t2);flex-shrink:0;}
.gbb-est-r2{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.gbb-est-client{font-size:11px;color:var(--jdv2-t2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gbb-type-badge{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;letter-spacing:.06em;color:var(--jdv2-t2);background:var(--jdv2-s3);border:1px solid var(--jdv2-br);border-radius:3px;padding:1px 5px;flex-shrink:0;}
.gbb-est-r3{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.gbb-tier-pips{display:flex;gap:3px;}
.gbb-tier-pip{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;border:1px solid;}
.gbb-tier-pip.g{color:var(--jdv2-green);border-color:rgba(5,150,105,.3);background:rgba(5,150,105,.07);}
.gbb-tier-pip.b{color:var(--jdv2-blue);border-color:rgba(29,96,200,.3);background:rgba(29,96,200,.07);}
.gbb-tier-pip.x{color:var(--jdv2-acc);border-color:rgba(228,53,49,.3);background:var(--jdv2-acc-lo);}
.gbb-est-date{font-family:var(--jdv2-font-mono);font-size:9px;color:var(--jdv2-t3);margin-left:auto;}
.gbb-est-chevron{width:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--jdv2-t3);transition:color .13s;}
.gbb-est-card.selected .gbb-est-chevron{color:var(--jdv2-acc);}
.gbb-est-chevron svg{width:14px;height:14px;fill:currentColor;}
.gbb-pill{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0;white-space:nowrap;}
.gbb-pill.draft{color:var(--jdv2-t3);background:rgba(107,114,128,.1);border:1px solid rgba(107,114,128,.2);}
.gbb-pill.presented{color:var(--jdv2-blue);background:rgba(29,96,200,.1);border:1px solid rgba(29,96,200,.2);}
.gbb-pill.accepted{color:var(--jdv2-green);background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.2);}
.gbb-kpi-wrap{padding:6px 10px 4px;flex-shrink:0;}
.gbb-kpi-bar{display:flex;background:var(--jdv2-s2);border-radius:8px;border:1px solid var(--jdv2-br);overflow:hidden;}
.gbb-kpi-cell{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7px 0;gap:2px;border-right:1px solid var(--jdv2-br);}
.gbb-kpi-cell:last-child{border-right:none;}
.gbb-kpi-val{font-family:var(--jdv2-font-mono);font-size:16px;font-weight:700;letter-spacing:-.02em;line-height:1;}
.gbb-kpi-label{font-size:9px;color:var(--jdv2-t2);text-transform:uppercase;letter-spacing:.07em;}
.gbb-search-wrap{padding:6px 10px 4px;flex-shrink:0;}
.gbb-search{display:flex;align-items:center;gap:8px;padding:0 10px;background:var(--jdv2-s2);border:1px solid var(--jdv2-br);border-radius:8px;height:34px;transition:all .15s;}
.gbb-search:focus-within{background:var(--jdv2-s3);border-color:var(--jdv2-br-hi);box-shadow:0 0 0 2px rgba(228,53,49,.15);}
.gbb-search svg{width:13px;height:13px;fill:var(--jdv2-t2);flex-shrink:0;}
.gbb-search input{flex:1;background:none;border:none;outline:none;font-size:12px;color:var(--jdv2-t1);font-family:var(--jdv2-font-ui);}
.gbb-search input::placeholder{color:var(--jdv2-t3);}
.gbb-search-clr{background:none;border:none;color:var(--jdv2-t2);cursor:pointer;font-size:14px;line-height:1;padding:0;}
.gbb-tier-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.gbb-tc{background:var(--jdv2-s2);border:2px solid var(--jdv2-br);border-radius:8px;overflow:hidden;position:relative;display:flex;flex-direction:column;transition:all .22s;}
.gbb-tc:hover{box-shadow:0 6px 28px rgba(0,0,0,.18);}
.gbb-tc.t-good{border-color:rgba(5,150,105,.4);}.gbb-tc.t-good:hover{border-color:var(--jdv2-green);box-shadow:0 6px 28px rgba(5,150,105,.14);}
.gbb-tc.t-better{border-color:rgba(29,96,200,.4);}.gbb-tc.t-better:hover{border-color:var(--jdv2-blue);box-shadow:0 6px 28px rgba(29,96,200,.14);}
.gbb-tc.t-best{border-color:var(--jdv2-acc);box-shadow:0 0 0 1px rgba(228,53,49,.12);}.gbb-tc.t-best:hover{box-shadow:0 6px 28px var(--jdv2-acc-glo);}
.gbb-rec-badge{position:absolute;top:10px;right:10px;background:var(--jdv2-amber);color:#fff;font-family:var(--jdv2-font-mono);font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:3px;}
.gbb-tc-top{padding:18px 18px 14px;border-bottom:1px solid var(--jdv2-br);}
.gbb-tc-tier{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;margin-bottom:5px;}
.t-good .gbb-tc-tier{color:var(--jdv2-green);}.t-better .gbb-tc-tier{color:var(--jdv2-blue);}.t-best .gbb-tc-tier{color:var(--jdv2-acc);}
.gbb-tc-title{font-size:16px;font-weight:800;letter-spacing:-.3px;color:var(--jdv2-t1);margin-bottom:3px;}
.gbb-tc-tag{font-size:11px;color:var(--jdv2-t3);line-height:1.45;}
.gbb-tc-price-row{margin-top:14px;padding-top:14px;border-top:1px solid var(--jdv2-br);display:flex;align-items:baseline;gap:5px;}
.gbb-tc-price{font-family:var(--jdv2-font-mono);font-size:26px;font-weight:700;letter-spacing:-1px;line-height:1;color:var(--jdv2-t1);}
.gbb-tc-price-lbl{font-size:11px;color:var(--jdv2-t3);}
.gbb-tc-items{padding:14px 18px;flex:1;}
.gbb-tc-sec{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--jdv2-t3);margin-bottom:8px;}
.gbb-li{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--jdv2-br);}
.gbb-li:last-child{border-bottom:none;}
.gbb-li-l{display:flex;align-items:flex-start;gap:7px;min-width:0;}
.gbb-li-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;}
.t-good .gbb-li-dot{background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.3);}
.t-better .gbb-li-dot{background:rgba(29,96,200,.1);border:1px solid rgba(29,96,200,.3);}
.t-best .gbb-li-dot{background:var(--jdv2-acc-lo);border:1px solid rgba(228,53,49,.3);}
.gbb-li-dot svg{width:7px;height:7px;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}
.t-good .gbb-li-dot svg{stroke:var(--jdv2-green);}.t-better .gbb-li-dot svg{stroke:var(--jdv2-blue);}.t-best .gbb-li-dot svg{stroke:var(--jdv2-acc);}
.gbb-li-name{font-size:11px;font-weight:500;color:var(--jdv2-t1);line-height:1.3;}
.gbb-li-sub{font-family:var(--jdv2-font-mono);font-size:9px;color:var(--jdv2-t3);margin-top:1px;}
.gbb-li-price{font-family:var(--jdv2-font-mono);font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0;color:var(--jdv2-t1);}
.gbb-tc-foot{padding:13px 18px;border-top:1px solid var(--jdv2-br);background:var(--jdv2-s1);}
.gbb-tc-btn{width:100%;padding:9px 14px;border-radius:6px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--jdv2-font-ui);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:6px;}
.t-good .gbb-tc-btn{background:rgba(5,150,105,.1);color:var(--jdv2-green);border:1px solid rgba(5,150,105,.3);}
.t-good .gbb-tc-btn:hover{background:var(--jdv2-green);color:#fff;}
.t-better .gbb-tc-btn{background:rgba(29,96,200,.1);color:var(--jdv2-blue);border:1px solid rgba(29,96,200,.3);}
.t-better .gbb-tc-btn:hover{background:var(--jdv2-blue);color:#fff;}
.t-best .gbb-tc-btn{background:var(--jdv2-acc);color:#fff;border:1px solid var(--jdv2-acc);}
.t-best .gbb-tc-btn:hover{filter:brightness(1.08);box-shadow:0 3px 12px var(--jdv2-acc-glo);}
.gbb-present-hdr{position:sticky;top:0;z-index:10;background:var(--jdv2-s1);border-bottom:1px solid var(--jdv2-br);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.gbb-present-body{padding:36px 28px;max-width:1260px;margin:0 auto;width:100%;}
.gbb-present-intro{text-align:center;margin-bottom:34px;}
.gbb-present-intro h2{font-size:24px;font-weight:800;letter-spacing:-.5px;color:var(--jdv2-t1);margin-bottom:6px;}
.gbb-present-intro p{font-size:13px;color:var(--jdv2-t3);max-width:400px;margin:0 auto;line-height:1.6;}
.gbb-close-btn{width:30px;height:30px;border-radius:6px;background:var(--jdv2-s2);border:1px solid var(--jdv2-br);color:var(--jdv2-t2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.gbb-close-btn:hover{border-color:var(--jdv2-acc);color:var(--jdv2-acc);}
.gbb-det-meta{display:flex;gap:14px;margin-top:6px;flex-wrap:wrap;}
.gbb-det-meta-item{font-size:11px;color:var(--jdv2-t3);}
.gbb-det-meta-item span{color:var(--jdv2-t1);font-weight:600;}
.gbb-det-notes{margin-top:8px;font-size:11px;color:var(--jdv2-t2);background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:6px;padding:7px 11px;}
.gbb-status-panel{background:var(--jdv2-s2);border:1px solid var(--jdv2-br);border-radius:8px;padding:10px 14px;}
.gbb-status-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;}
.gbb-status-chip{padding:3px 10px;border-radius:3px;cursor:pointer;font-family:var(--jdv2-font-ui);font-size:11px;font-weight:600;transition:all .13s;border:1px solid var(--jdv2-br);background:var(--jdv2-s3);color:var(--jdv2-t2);}
.gbb-sign-wrap{max-width:620px;}
.gbb-sign-summary{background:var(--jdv2-s2);border:1px solid var(--jdv2-br);border-radius:8px;padding:16px 20px;margin-bottom:12px;}
.gbb-sign-sum-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
.gbb-sign-tier-lbl{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;}
.gbb-sign-pkg-name{font-size:16px;font-weight:800;letter-spacing:-.3px;color:var(--jdv2-t1);}
.gbb-sign-total{font-family:var(--jdv2-font-mono);font-size:20px;font-weight:700;color:var(--jdv2-acc);letter-spacing:-1px;text-align:right;}
.gbb-sign-total-lbl{font-size:9px;color:var(--jdv2-t3);text-align:right;}
.gbb-sign-items{border-top:1px solid var(--jdv2-br);padding-top:10px;}
.gbb-sign-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--jdv2-br);}
.gbb-sign-row:last-child{border-bottom:none;}
.gbb-sign-row-n{font-size:11px;color:var(--jdv2-t2);}.gbb-sign-row-p{font-family:var(--jdv2-font-mono);font-size:11px;font-weight:600;color:var(--jdv2-t1);}
.gbb-sign-tot-row{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:2px solid var(--jdv2-br-hi);}
.gbb-sign-tot-lbl{font-size:13px;font-weight:700;color:var(--jdv2-t1);}
.gbb-sign-tot-val{font-family:var(--jdv2-font-mono);font-size:19px;font-weight:800;color:var(--jdv2-acc);letter-spacing:-1px;}
.gbb-sign-card{background:var(--jdv2-s2);border:1px solid var(--jdv2-br);border-radius:8px;padding:20px;margin-bottom:12px;}
.gbb-sign-card h3{font-size:13px;font-weight:700;color:var(--jdv2-t1);margin-bottom:4px;}
.gbb-sign-card > p{font-size:11px;color:var(--jdv2-t3);line-height:1.6;margin-bottom:14px;}
.gbb-sign-terms{background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:6px;padding:10px 12px;font-size:10px;color:var(--jdv2-t3);line-height:1.7;max-height:96px;overflow-y:auto;margin-bottom:16px;}
.gbb-sign-input{width:100%;padding:11px 13px 7px;background:var(--jdv2-s1);border:2px solid var(--jdv2-br);border-radius:8px;font-family:'Dancing Script',cursive;font-size:28px;color:var(--jdv2-t1);outline:none;transition:border-color .18s,box-shadow .18s;caret-color:var(--jdv2-acc);}
.gbb-sign-input:focus{border-color:var(--jdv2-acc);box-shadow:0 0 0 3px var(--jdv2-acc-lo);}
.gbb-sign-input::placeholder{font-family:'Dancing Script',cursive;color:var(--jdv2-t3);font-size:22px;}
.gbb-sign-input:disabled{opacity:.5;}
.gbb-sign-hint{font-size:10px;color:var(--jdv2-t3);margin-top:4px;}.gbb-sign-hint.ok{color:var(--jdv2-green);}
.gbb-sign-meta{display:flex;gap:16px;margin-top:14px;}
.gbb-sign-meta-v{font-size:12px;font-weight:600;color:var(--jdv2-t1);margin-top:2px;}
.gbb-sign-btn{width:100%;padding:11px 18px;background:var(--jdv2-acc);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--jdv2-font-ui);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:16px;box-shadow:0 0 12px var(--jdv2-acc-glo);}
.gbb-sign-btn:hover:not(:disabled){filter:brightness(1.08);}.gbb-sign-btn:disabled{opacity:.4;cursor:not-allowed;}
.gbb-sub-log{background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:6px;padding:10px 12px;margin-top:10px;}
.gbb-sub-step{display:flex;align-items:center;gap:10px;padding:4px 0;font-size:11px;color:var(--jdv2-t3);}
.gbb-sub-step.active{color:var(--jdv2-t1);font-weight:600;}.gbb-sub-step.done{color:var(--jdv2-green);}
.gbb-sub-icon{width:18px;height:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.gbb-mini-spin{width:12px;height:12px;border:2px solid var(--jdv2-br);border-top-color:var(--jdv2-acc);border-radius:50%;animation:gbb-spin .8s linear infinite;}
@keyframes gbb-spin{to{transform:rotate(360deg);}}
.gbb-success{text-align:center;padding:48px 20px;max-width:500px;margin:0 auto;}
.gbb-success-check{width:52px;height:52px;border-radius:50%;background:rgba(5,150,105,.1);border:2px solid var(--jdv2-green);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:gbb-pop .4s cubic-bezier(.175,.885,.32,1.275);}
.gbb-success-check svg{width:22px;height:22px;fill:none;stroke:var(--jdv2-green);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}
@keyframes gbb-pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.gbb-success h2{font-size:20px;font-weight:800;letter-spacing:-.4px;color:var(--jdv2-t1);margin-bottom:6px;}
.gbb-success > p{font-size:12px;color:var(--jdv2-t3);line-height:1.6;margin-bottom:16px;}
.gbb-api-log{background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:6px;padding:12px 13px;margin-bottom:16px;text-align:left;}
.gbb-api-log-ttl{font-family:var(--jdv2-font-mono);font-size:9px;color:var(--jdv2-t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;}
.gbb-api-line{display:flex;gap:8px;margin-bottom:4px;font-family:var(--jdv2-font-mono);font-size:10px;}
.gbb-api-meth{color:var(--jdv2-amber);font-weight:700;width:38px;flex-shrink:0;}
.gbb-api-url{color:var(--jdv2-t3);word-break:break-all;flex:1;}.gbb-api-st{color:var(--jdv2-green);font-weight:700;flex-shrink:0;}
.gbb-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;gap:10px;}
.gbb-spinner{width:26px;height:26px;border:2px solid var(--jdv2-br);border-top-color:var(--jdv2-acc);border-radius:50%;animation:gbb-spin .8s linear infinite;}
.gbb-loading p{font-size:11px;color:var(--jdv2-t3);}
.gbb-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:8px;padding:40px 20px;}
.gbb-empty-icon{opacity:.18;margin-bottom:4px;}.gbb-empty-icon svg{width:28px;height:28px;fill:var(--jdv2-t1);}
.gbb-empty-ttl{font-family:var(--jdv2-font-mono);font-size:11px;color:var(--jdv2-t2);letter-spacing:.07em;}
.gbb-empty-sub{font-size:11px;color:var(--jdv2-t3);text-align:center;max-width:180px;line-height:1.5;}
.gbb-create-layout{display:grid;grid-template-columns:260px 1fr;gap:14px;align-items:start;}
.gbb-create-left{display:flex;flex-direction:column;gap:12px;position:sticky;top:0;}
.gbb-create-right{display:flex;flex-direction:column;gap:12px;}
.gbb-section{background:var(--jdv2-s2);border:1px solid var(--jdv2-br);border-radius:8px;overflow:hidden;}
.gbb-section-hdr{padding:9px 13px;border-bottom:1px solid var(--jdv2-br);}
.gbb-section-hdr h4{font-family:var(--jdv2-font-mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--jdv2-t2);}
.gbb-form-body{padding:12px 13px;display:flex;flex-direction:column;gap:9px;}
.gbb-row2{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.gbb-inp{width:100%;padding:7px 10px;background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:6px;font-size:12px;color:var(--jdv2-t1);font-family:var(--jdv2-font-ui);outline:none;transition:border-color .15s;}
.gbb-inp:focus{border-color:var(--jdv2-br-hi);box-shadow:0 0 0 2px rgba(228,53,49,.1);}
.gbb-inp::placeholder{color:var(--jdv2-t3);}
select.gbb-inp{cursor:pointer;}textarea.gbb-inp{resize:vertical;line-height:1.5;}
.gbb-cat-tabs{display:flex;border-bottom:1px solid var(--jdv2-br);overflow-x:auto;}
.gbb-cat-tab{padding:8px 12px;font-size:11px;font-weight:600;color:var(--jdv2-t3);cursor:pointer;border:none;background:transparent;font-family:var(--jdv2-font-ui);white-space:nowrap;border-bottom:2px solid transparent;transition:all .13s;}
.gbb-cat-tab:hover{color:var(--jdv2-t1);}.gbb-cat-tab.active{color:var(--jdv2-acc);border-bottom-color:var(--jdv2-acc);font-weight:700;}
.gbb-item-list{max-height:260px;overflow-y:auto;}
.gbb-price-item{display:flex;align-items:center;gap:10px;padding:8px 13px;border-bottom:1px solid var(--jdv2-br);transition:background .12s;}
.gbb-price-item:last-child{border-bottom:none;}.gbb-price-item:hover{background:var(--jdv2-s1);}.gbb-price-item.sel{background:var(--jdv2-acc-lo);}
.gbb-pi-info{flex:1;min-width:0;}.gbb-pi-name{font-size:12px;font-weight:500;color:var(--jdv2-t1);line-height:1.3;}
.gbb-pi-sub{font-family:var(--jdv2-font-mono);font-size:9px;color:var(--jdv2-t3);margin-top:1px;}
.gbb-pi-price{font-family:var(--jdv2-font-mono);font-size:12px;font-weight:700;color:var(--jdv2-t1);flex-shrink:0;}
.gbb-tier-btns{display:flex;gap:2px;flex-shrink:0;}
.gbb-tier-btn{width:20px;height:20px;border-radius:4px;border:1px solid var(--jdv2-br);background:var(--jdv2-s1);font-family:var(--jdv2-font-mono);font-size:9px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;color:var(--jdv2-t3);}
.gbb-tier-btn.g:hover,.gbb-tier-btn.g.on{border-color:var(--jdv2-green);background:rgba(5,150,105,.1);color:var(--jdv2-green);}
.gbb-tier-btn.b:hover,.gbb-tier-btn.b.on{border-color:var(--jdv2-blue);background:rgba(29,96,200,.1);color:var(--jdv2-blue);}
.gbb-tier-btn.x:hover,.gbb-tier-btn.x.on{border-color:var(--jdv2-acc);background:var(--jdv2-acc-lo);color:var(--jdv2-acc);}
.gbb-tbs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.gbb-tb{background:var(--jdv2-s2);border:2px solid var(--jdv2-br);border-radius:8px;overflow:hidden;}
.gbb-tb.g{border-color:rgba(5,150,105,.35);}.gbb-tb.b{border-color:rgba(29,96,200,.35);}.gbb-tb.x{border-color:rgba(228,53,49,.35);}
.gbb-tb-hdr{padding:9px 11px 7px;border-bottom:1px solid var(--jdv2-br);}
.gbb-tb-hdr-r{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:5px;}
.gbb-tb-tier{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;}
.gbb-tb.g .gbb-tb-tier{color:var(--jdv2-green);}.gbb-tb.b .gbb-tb-tier{color:var(--jdv2-blue);}.gbb-tb.x .gbb-tb-tier{color:var(--jdv2-acc);}
.gbb-tb-total{font-family:var(--jdv2-font-mono);font-size:13px;font-weight:700;color:var(--jdv2-t1);}
.gbb-tb-name{width:100%;padding:5px 8px;background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:5px;font-size:11px;font-weight:600;color:var(--jdv2-t1);font-family:var(--jdv2-font-ui);outline:none;margin-bottom:3px;transition:border-color .13s;}
.gbb-tb-name:focus{border-color:var(--jdv2-br-hi);}
.gbb-tb-tag{width:100%;padding:4px 8px;background:var(--jdv2-s1);border:1px solid var(--jdv2-br);border-radius:5px;font-size:10px;color:var(--jdv2-t2);font-family:var(--jdv2-font-ui);outline:none;transition:border-color .13s;}
.gbb-tb-tag:focus{border-color:var(--jdv2-br-hi);}
.gbb-tb-body{min-height:90px;padding:7px 10px;}
.gbb-tb-empty{display:flex;align-items:center;justify-content:center;height:70px;color:var(--jdv2-t3);font-size:10px;text-align:center;}
.gbb-tb-line{display:flex;align-items:flex-start;gap:5px;padding:5px 0;border-bottom:1px solid var(--jdv2-br);}
.gbb-tb-line:last-child{border-bottom:none;}
.gbb-tb-line-info{flex:1;min-width:0;}.gbb-tb-line-name{font-size:10px;font-weight:500;color:var(--jdv2-t1);line-height:1.3;}
.gbb-tb-line-price{font-family:var(--jdv2-font-mono);font-size:10px;font-weight:700;color:var(--jdv2-t1);white-space:nowrap;flex-shrink:0;}
.gbb-tb-qty{display:flex;align-items:center;gap:3px;margin-top:2px;}
.gbb-tb-q-btn{width:14px;height:14px;border-radius:3px;border:1px solid var(--jdv2-br);background:var(--jdv2-s1);color:var(--jdv2-t2);font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--jdv2-font-mono);transition:border-color .12s;}
.gbb-tb-q-btn:hover{border-color:var(--jdv2-acc);color:var(--jdv2-acc);}
.gbb-tb-q-val{font-family:var(--jdv2-font-mono);font-size:9px;font-weight:700;min-width:12px;text-align:center;color:var(--jdv2-t1);}
.gbb-tb-rem{width:14px;height:14px;border-radius:50%;border:1px solid var(--jdv2-br);background:var(--jdv2-s1);color:var(--jdv2-t3);font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s;font-family:var(--jdv2-font-mono);margin-top:1px;}
.gbb-tb-rem:hover{border-color:var(--jdv2-acc);background:var(--jdv2-acc-lo);color:var(--jdv2-acc);}
.gbb-create-foot{background:var(--jdv2-s2);border:1px solid var(--jdv2-br);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:10px;}
.gbb-create-msg{font-size:11px;color:var(--jdv2-t3);flex:1;}.gbb-create-msg.ok{color:var(--jdv2-green);}
.gbb-hint{padding:7px 10px;border-top:1px solid var(--jdv2-br);flex-shrink:0;text-align:center;font-size:10px;color:var(--jdv2-t3);}
.jdv2-btn-primary{background:var(--jdv2-acc,#e43531);color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--jdv2-font-ui,'Outfit',sans-serif);box-shadow:0 0 10px rgba(228,53,49,.28);transition:all .18s;}
.jdv2-btn-primary:hover:not(:disabled){filter:brightness(1.08);}.jdv2-btn-primary:disabled{opacity:.4;cursor:not-allowed;}
.jdv2-btn-secondary{background:var(--jdv2-s3,#161929);color:var(--jdv2-t1,#eef1f8);border:1px solid var(--jdv2-br,rgba(255,255,255,.10));border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--jdv2-font-ui,'Outfit',sans-serif);transition:all .18s;}
.jdv2-btn-secondary:hover{background:var(--jdv2-s4,#1c2035);border-color:var(--jdv2-br-hi,rgba(255,255,255,.18));}
.jdv2-new-btn{background:var(--jdv2-acc,#e43531);border:none;border-radius:6px;cursor:pointer;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;display:flex;align-items:center;gap:5px;box-shadow:0 0 12px rgba(228,53,49,.28);transition:box-shadow .15s;font-family:var(--jdv2-font-ui,'Outfit',sans-serif);}
.jdv2-new-btn:hover{box-shadow:0 0 20px rgba(228,53,49,.4);}
.jdv2-field-label{display:block;font-family:var(--jdv2-font-mono,'Space Mono',monospace);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--jdv2-t2,#8b95b0);margin-bottom:4px;}
.jdv2-field-input{width:100%;padding:7px 10px;background:var(--jdv2-s1,#0c0e18);border:1px solid var(--jdv2-br,rgba(255,255,255,.10));border-radius:6px;font-size:12px;color:var(--jdv2-t1,#eef1f8);font-family:var(--jdv2-font-ui,'Outfit',sans-serif);outline:none;transition:border-color .15s;}
.jdv2-field-input:focus{border-color:var(--jdv2-br-hi,rgba(255,255,255,.18));box-shadow:0 0 0 2px rgba(228,53,49,.12);}
.jdv2-field-input::placeholder{color:var(--jdv2-t3,#404866);}
.jdv2-field-select{width:100%;padding:7px 10px;background:var(--jdv2-s1,#0c0e18);border:1px solid var(--jdv2-br,rgba(255,255,255,.10));border-radius:6px;font-size:12px;color:var(--jdv2-t1,#eef1f8);font-family:var(--jdv2-font-ui,'Outfit',sans-serif);outline:none;cursor:pointer;transition:border-color .15s;}
.jdv2-field-select:focus{border-color:var(--jdv2-br-hi,rgba(255,255,255,.18));}
@media(max-width:1100px){.gbb-tier-grid{grid-template-columns:1fr;max-width:380px;}.gbb-tbs{grid-template-columns:1fr;}.gbb-create-layout{grid-template-columns:1fr;}.gbb-create-left{position:static;}}
@media(max-width:780px){.gbb-list-col{display:flex;width:100%;}.gbb-detail-panel{display:none;}.gbb-list-col.has-detail{display:none;}.gbb-detail-panel.has-detail{display:flex;width:100%;}}
`;

/* GBB helpers */
function useJsPDF() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.jspdf) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}
const gbbDelay = ms => new Promise(r => setTimeout(r, ms));
async function apiFetchPriceList(t) { await gbbDelay(600); return GBB_PRICE_LISTS[t]||GBB_PRICE_LISTS.hvac; }
async function apiFetchStatuses()   { await gbbDelay(200); return [{key:"accepted",label:"Accepted",color:"#059669"},{key:"approved",label:"Approved",color:"#1d60c8"},{key:"won",label:"Job Won",color:"#b45309"},{key:"contracted",label:"Contracted",color:"#6d28d9"}]; }
async function apiCreateEstimate(p) { await gbbDelay(500); return {id:`EST-${Date.now()}`,...p}; }
async function apiUploadDocument()  { await gbbDelay(900); return {success:true,document_id:`DOC-${Date.now()}`}; }
async function apiUpdateStatus()    { await gbbDelay(400); return {success:true}; }
async function apiTriggerAuto()     { await gbbDelay(300); return {success:true}; }

const GBB_PRICE_LISTS = {
  hvac: {
    labor:    [{id:"L001",name:"Diagnostic / System Inspection",unit:"ea",price:89},{id:"L002",name:"HVAC Installation Labor",unit:"hr",price:125,qty:6},{id:"L003",name:"Ductwork Sealing Labor",unit:"hr",price:95,qty:3},{id:"L004",name:"System Commissioning",unit:"ea",price:175},{id:"L005",name:"Electrical Disconnect & Reconnect",unit:"ea",price:145}],
    equipment:[{id:"E001",name:"14 SEER2 AC (2-ton)",unit:"ea",price:1850},{id:"E002",name:"14 SEER2 AC (3-ton)",unit:"ea",price:2150},{id:"E003",name:"18 SEER2 AC (2-ton)",unit:"ea",price:2650},{id:"E005",name:"20 SEER2 Variable-Speed (2-ton)",unit:"ea",price:3800},{id:"E007",name:"Standard Air Handler",unit:"ea",price:1200},{id:"E008",name:"ECM Air Handler",unit:"ea",price:1650},{id:"E009",name:"Smart Thermostat (WiFi)",unit:"ea",price:245},{id:"E011",name:"UV-C Air Purifier (in-duct)",unit:"ea",price:485}],
    materials:[{id:"M001",name:"Refrigerant R-410A",unit:"lb",price:18,qty:4},{id:"M003",name:"Disconnect Box",unit:"ea",price:135},{id:"M004",name:"Copper Lineset 3/8\" 25ft",unit:"ea",price:185},{id:"M006",name:"Electrical Whip",unit:"ea",price:75},{id:"M007",name:"Condenser Pad",unit:"ea",price:95}],
    service:  [{id:"S001",name:"Annual Maintenance Plan (2 visits)",unit:"ea",price:289},{id:"S002",name:"5-Year Extended Labor Warranty",unit:"ea",price:495},{id:"S003",name:"10-Year Parts & Labor Warranty",unit:"ea",price:695},{id:"S005",name:"Priority Emergency Service",unit:"yr",price:199}],
  },
  plumbing: {
    labor:    [{id:"L001",name:"Diagnostic / Inspection",unit:"ea",price:99},{id:"L002",name:"Plumbing Installation Labor",unit:"hr",price:115,qty:4},{id:"L003",name:"Permit Acquisition",unit:"ea",price:195}],
    equipment:[{id:"E001",name:"Standard Water Heater (40-gal)",unit:"ea",price:650},{id:"E002",name:"High-Efficiency WH (50-gal)",unit:"ea",price:950},{id:"E003",name:"Tankless Water Heater (Gas)",unit:"ea",price:1450},{id:"E005",name:"Whole-Home Water Softener",unit:"ea",price:1200},{id:"E006",name:"Whole-Home Filter (5-stage)",unit:"ea",price:650},{id:"E007",name:"Sump Pump (1/3 HP)",unit:"ea",price:450}],
    materials:[{id:"M001",name:"Supply & Return Lines",unit:"set",price:85},{id:"M002",name:"Expansion Tank",unit:"ea",price:65},{id:"M003",name:"Pressure Relief Valve",unit:"ea",price:45}],
    service:  [{id:"S001",name:"Annual Inspection & Flush",unit:"ea",price:149},{id:"S002",name:"5-Year Labor Warranty",unit:"ea",price:395},{id:"S003",name:"10-Year Parts & Labor Warranty",unit:"ea",price:595}],
  },
  electrical: {
    labor:    [{id:"L001",name:"Electrical Diagnostic",unit:"ea",price:125},{id:"L002",name:"Electrician Labor",unit:"hr",price:145,qty:4},{id:"L003",name:"Permit Acquisition",unit:"ea",price:225}],
    equipment:[{id:"E001",name:"100A Main Panel Upgrade",unit:"ea",price:2200},{id:"E002",name:"200A Main Panel Upgrade",unit:"ea",price:3500},{id:"E003",name:"EV Charger (Level 2, 50A)",unit:"ea",price:850},{id:"E004",name:"Whole-Home Surge Protector",unit:"ea",price:425},{id:"E006",name:"Whole-Home Generator (22kW)",unit:"ea",price:5800},{id:"E007",name:"Auto Transfer Switch (200A)",unit:"ea",price:1200}],
    materials:[{id:"M001",name:"12-Gauge Wire (250ft)",unit:"spool",price:95},{id:"M002",name:"10-Gauge Wire (250ft)",unit:"spool",price:145},{id:"M004",name:"Breaker (15A/20A)",unit:"ea",price:25}],
    service:  [{id:"S001",name:"Annual Electrical Inspection",unit:"ea",price:199},{id:"S002",name:"5-Year Labor Warranty",unit:"ea",price:495},{id:"S003",name:"Priority Emergency Service",unit:"yr",price:249}],
  },
  restoration: {
    labor:    [{id:"L001",name:"Project Management",unit:"hr",price:95,qty:8},{id:"L002",name:"Lead Tech Labor",unit:"hr",price:85,qty:16},{id:"L003",name:"Field Tech Labor",unit:"hr",price:65,qty:24}],
    equipment:[{id:"E001",name:"LGR Dehumidifier (per day)",unit:"ea",price:85},{id:"E002",name:"Air Mover (per day)",unit:"ea",price:28},{id:"E003",name:"Air Scrubber HEPA (per day)",unit:"ea",price:65},{id:"E004",name:"Desiccant Dehumidifier (per day)",unit:"ea",price:145},{id:"E005",name:"Hydroxyl Generator (per day)",unit:"ea",price:95}],
    materials:[{id:"M001",name:"Antimicrobial Treatment",unit:"SF",price:0.55},{id:"M002",name:"Encapsulant",unit:"SF",price:0.95},{id:"M003",name:"Desiccant Bags",unit:"bag",price:12},{id:"M004",name:"Poly Sheeting",unit:"SF",price:0.18}],
    service:  [{id:"S001",name:"Demo — Drywall",unit:"SF",price:1.65},{id:"S002",name:"Demo — Flooring (LVP)",unit:"SF",price:2.10},{id:"S003",name:"Drywall Install & Finish",unit:"SF",price:3.80},{id:"S004",name:"LVP Flooring Install",unit:"SF",price:4.25},{id:"S005",name:"Painting (2 coats)",unit:"SF",price:1.20}],
  },
};

const GBB_JOB_TYPES  = [{v:"restoration",label:"Restoration"},{v:"hvac",label:"HVAC"},{v:"plumbing",label:"Plumbing"},{v:"electrical",label:"Electrical"}];
const GBB_TYPE_SHORT = {restoration:"REST",hvac:"HVAC",plumbing:"PLMB",electrical:"ELEC"};
const GBB_CAT_LABELS = {labor:"Labor",equipment:"Equipment",materials:"Materials",service:"Service"};
const GBB_TIER_KEYS  = ["Good","Better","Best"];
const GBB_TIER_CLS   = {Good:"g",Better:"b",Best:"x"};
const GBB_TIER_COLORS= {Good:"var(--jdv2-green)",Better:"var(--jdv2-blue)",Best:"var(--jdv2-acc)"};
const gbbFmt  = n => "$"+n.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});
const gbbTierTotal = t => (t?.items||[]).reduce((s,i)=>s+(i.total||i.price||0),0);
const gbbTierCls   = lbl => lbl==="Good"?"t-good":lbl==="Better"?"t-better":"t-best";
const gbbAccentColor = s => ({presented:"var(--jdv2-blue)",accepted:"var(--jdv2-green)",draft:"var(--jdv2-t3)"})[s]||"var(--jdv2-t3)";

const GBB_I = {
  chevron:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  back:   <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  plus:   <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  check:  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  monitor:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  x:      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  box:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 7H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 14H4V9h16v12zM4 3h16v2H4z"/></svg>,
};

function generatePDF(est, tier, signer, ts) {
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"portrait",unit:"pt",format:"letter"});
  const W=612,L=48,R=564,TW=516,H=792;
  const sr=h=>{const[r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i+1,i+3),16));doc.setTextColor(r,g,b)};
  const sf=h=>{const[r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i+1,i+3),16));doc.setFillColor(r,g,b)};
  const ss=h=>{const[r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i+1,i+3),16));doc.setDrawColor(r,g,b)};
  const tc=tier.label==="Good"?"#059669":tier.label==="Better"?"#1d60c8":"#e43531";
  let y=0;
  sf("#e43531");doc.rect(0,0,W,60,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.setTextColor(255,255,255);doc.text("JOB-DOX",L,34);
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(255,200,198);doc.text("ESTIMATE & CUSTOMER AUTHORIZATION",L,48);
  sf(tc);doc.roundedRect(R-106,10,106,38,4,4,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(255,255,255);
  doc.text(tier.label.toUpperCase()+" PACKAGE",R-53,26,{align:"center"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text(tier.title,R-53,38,{align:"center"});
  y=72;
  sf("#f8f9fc");doc.rect(L,y,TW,64,"F");ss("#dde3ef");doc.setLineWidth(.4);doc.rect(L,y,TW,64);
  const col=TW/3;
  [["ESTIMATE #",est.id],["CLIENT",est.client],["DATE",est.date],["JOB TYPE",(est.jobType||"").toUpperCase()],["ADDRESS",(est.address||"").slice(0,30)],["STATUS","Accepted"]].forEach(([lbl,val],i)=>{
    const cx=L+(i%3)*col+10,cy=y+(i<3?14:44);
    doc.setFont("helvetica","normal");doc.setFontSize(6.5);sr("#8a9ab5");doc.text(lbl,cx,cy);
    doc.setFont("helvetica","bold");doc.setFontSize(8);sr("#0d1117");doc.text(String(val),cx,cy+10);
  });
  y+=72;const total=gbbTierTotal(tier);
  sf("#0d1117");doc.rect(L,y,TW,18,"F");doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(255,255,255);doc.text("INCLUDED ITEMS",L+8,y+12);y+=18;
  tier.items.forEach((item,i)=>{
    if(i%2===0){sf("#f8f9fc");doc.rect(L,y,TW,20,"F");}
    ss("#dde3ef");doc.setLineWidth(.3);doc.line(L,y+20,R,y+20);
    doc.setFont("helvetica","normal");doc.setFontSize(8);sr("#0d1117");
    doc.text((item.name.length>70?item.name.slice(0,70)+"...":item.name),L+8,y+13);
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text(gbbFmt(item.total||item.price),R-6,y+13,{align:"right"});
    y+=20;
  });
  y+=4;sf("#0d1117");doc.rect(L,y,TW,26,"F");doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text("TOTAL",L+10,y+17);
  sf(tc);doc.rect(R-110,y+3,106,20,"F");doc.setFontSize(11);doc.text(gbbFmt(total),R-7,y+17,{align:"right"});y+=34;
  if(est.notes){y+=4;sf("#fffbeb");doc.roundedRect(L,y,TW,30,3,3,"F");ss("#f59e0b");doc.setLineWidth(.7);doc.roundedRect(L,y,TW,30,3,3);doc.setFont("helvetica","bold");doc.setFontSize(7);sr("#92400e");doc.text("NOTES",L+8,y+10);doc.setFont("helvetica","normal");doc.setFontSize(7.5);sr("#0d1117");doc.text(doc.splitTextToSize(est.notes,TW-16).slice(0,2),L+8,y+19);y+=38;}
  y+=6;const terms=`By signing below, you authorize the contractor to proceed with the ${tier.label} — ${tier.title} package for ${gbbFmt(total)}. Payment due upon completion. Estimate valid 30 days from ${est.date}. All work per applicable codes.`;
  doc.setFont("helvetica","normal");doc.setFontSize(7);sr("#5a6a80");const tLines=doc.splitTextToSize(terms,TW);doc.text(tLines,L,y);y+=tLines.length*9+6;
  ss("#dde3ef");doc.setLineWidth(.4);doc.rect(L,y,TW,76);sf("#f8f9fc");doc.rect(L,y,TW,15,"F");doc.setFont("helvetica","bold");doc.setFontSize(7);sr("#4a5a75");doc.text("CUSTOMER AUTHORIZATION",L+8,y+10);
  const mid=L+TW/2;
  doc.setFont("helvetica","normal");doc.setFontSize(6.5);sr("#8a9ab5");doc.text("SIGNATURE",L+8,y+27);
  doc.setFont("helvetica","bolditalic");doc.setFontSize(22);sr("#1a2540");doc.text(signer,L+8,y+60);
  ss("#1a2540");doc.setLineWidth(.7);doc.line(L+6,y+68,mid-10,y+68);
  doc.setFont("helvetica","normal");doc.setFontSize(6.5);sr("#8a9ab5");doc.text("PRINTED NAME",mid+8,y+27);
  doc.setFont("helvetica","bold");doc.setFontSize(8.5);sr("#0d1117");doc.text(signer,mid+8,y+42);
  doc.setFont("helvetica","normal");doc.setFontSize(6.5);sr("#8a9ab5");doc.text("DATE & TIME",mid+8,y+55);
  doc.setFont("helvetica","normal");doc.setFontSize(8);sr("#0d1117");doc.text(ts,mid+8,y+66);
  sf("#e43531");doc.rect(0,H-24,W,24,"F");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);doc.text("Job-Dox  |  Powered by Cortex AI",W/2,H-13,{align:"center"});
}

function GBBTierCard({ tier, onSelect }) {
  const total = gbbTierTotal(tier);
  return (
    <div className={`gbb-tc ${gbbTierCls(tier.label)}`}>
      {tier.recommended && <div className="gbb-rec-badge">Most Popular</div>}
      <div className="gbb-tc-top">
        <div className="gbb-tc-tier">{tier.label}</div>
        <div className="gbb-tc-title">{tier.title}</div>
        <div className="gbb-tc-tag">{tier.tag}</div>
        <div className="gbb-tc-price-row">
          <div className="gbb-tc-price">{gbbFmt(total)}</div>
          <div className="gbb-tc-price-lbl">total</div>
        </div>
      </div>
      <div className="gbb-tc-items">
        <div className="gbb-tc-sec">Included Items</div>
        {tier.items.map(item => (
          <div className="gbb-li" key={item.id+item.name}>
            <div className="gbb-li-l">
              <div className="gbb-li-dot"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div>
                <div className="gbb-li-name">{item.name}</div>
                {item.qty>1 && <div className="gbb-li-sub">qty {item.qty} x {gbbFmt(item.price)}</div>}
              </div>
            </div>
            <div className="gbb-li-price">{gbbFmt(item.total||item.price)}</div>
          </div>
        ))}
      </div>
      <div className="gbb-tc-foot">
        <button className="gbb-tc-btn" onClick={()=>onSelect(tier)}>Select {tier.label} Package</button>
      </div>
    </div>
  );
}

function GBBSignatureView({ est, tier, onBack, onDone, onComplete }) {
  const [sig, setSig]   = useState("");
  const [step, setStep] = useState(0);
  const [apiLog, setLog]= useState([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const pdfReady = useJsPDF();
  const ts    = new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",hour12:true});
  const total = gbbTierTotal(tier);
  const tc    = tier.label==="Good"?"var(--jdv2-green)":tier.label==="Better"?"var(--jdv2-blue)":"var(--jdv2-acc)";
  const STEPS = ["Generating signed document...","Uploading to Job-Dox...","Updating status...","Triggering automations..."];
  const canSubmit = sig.trim().length>=2 && pdfReady && !busy;
  const submit = async () => {
    if(!canSubmit) return;
    setBusy(true);
    const log=[];
    setStep(1);await gbbDelay(400);generatePDF(est,tier,sig.trim(),ts);
    setStep(2);await apiUploadDocument();log.push({m:"POST",u:`/estimates/${est.id}/documents`,s:"201"});
    setStep(3);await apiUpdateStatus();log.push({m:"PATCH",u:`/estimates/${est.id}`,s:"200"});
    setStep(4);await apiTriggerAuto();log.push({m:"POST",u:`/automations/trigger`,s:"200"});
    setLog(log);setDone(true);onComplete();
  };
  if(done) return (
    <div className="gbb-success">
      <div className="gbb-success-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      <h2>Estimate Accepted</h2>
      <p><strong>{sig.trim()}</strong> authorized the <strong>{tier.label} — {tier.title}</strong> package at <strong>{gbbFmt(total)}</strong>. The signed document has been saved to Job-Dox.</p>
      <div className="gbb-api-log">
        <div className="gbb-api-log-ttl">API Calls</div>
        {apiLog.map((l,i)=>(
          <div className="gbb-api-line" key={i}>
            <span className="gbb-api-meth">{l.m}</span>
            <span className="gbb-api-url">{l.u}</span>
            <span className="gbb-api-st">{l.s}</span>
          </div>
        ))}
      </div>
      <button className="jdv2-btn-primary" onClick={onDone||onBack}>Back to Estimates</button>
    </div>
  );
  return (
    <div className="gbb-sign-wrap">
      <div className="gbb-sign-summary">
        <div className="gbb-sign-sum-hdr">
          <div>
            <div className="gbb-sign-tier-lbl" style={{color:tc}}>{tier.label.toUpperCase()} PACKAGE</div>
            <div className="gbb-sign-pkg-name">{tier.title}</div>
          </div>
          <div>
            <div className="gbb-sign-total">{gbbFmt(total)}</div>
            <div className="gbb-sign-total-lbl">Total Investment</div>
          </div>
        </div>
        <div className="gbb-sign-items">
          {tier.items.map(item=>(
            <div className="gbb-sign-row" key={item.id+item.name}>
              <span className="gbb-sign-row-n">{item.name}{item.qty>1?` (x${item.qty})`:""}</span>
              <span className="gbb-sign-row-p">{gbbFmt(item.total||item.price)}</span>
            </div>
          ))}
          <div className="gbb-sign-tot-row">
            <span className="gbb-sign-tot-lbl">Package Total</span>
            <span className="gbb-sign-tot-val">{gbbFmt(total)}</span>
          </div>
        </div>
      </div>
      <div className="gbb-sign-card">
        <h3>Customer Authorization</h3>
        <p>Please review the terms below and type your full name to authorize this estimate.</p>
        <div className="gbb-sign-terms">
          By signing below, you authorize the contractor to proceed with the {tier.label} — {tier.title} package for a total of {gbbFmt(total)}. Payment is due upon completion of work. This estimate is valid for 30 days from {est.date}. All work performed per applicable local codes.
        </div>
        <label className="jdv2-field-label">Type Full Name to Sign</label>
        <input className="gbb-sign-input" value={sig} onChange={e=>setSig(e.target.value)} placeholder="Sign here..." maxLength={60} disabled={busy} autoComplete="off" spellCheck={false}/>
        <div className={`gbb-sign-hint${sig.trim().length>=2?" ok":""}`}>
          {sig.trim().length>=2 ? "Your name will appear on the document" : "Enter your full legal name"}
        </div>
        <div className="gbb-sign-meta">
          <div><label className="jdv2-field-label">Client</label><div className="gbb-sign-meta-v">{est.client}</div></div>
          <div><label className="jdv2-field-label">Estimate</label><div className="gbb-sign-meta-v">{est.id}</div></div>
          <div><label className="jdv2-field-label">Timestamp</label><div className="gbb-sign-meta-v">{ts}</div></div>
        </div>
        <button className="gbb-sign-btn" onClick={submit} disabled={!canSubmit}>
          {busy ? <><div className="gbb-mini-spin"/>{step>0?STEPS[step-1]:"Starting..."}</> : <>Authorize — {gbbFmt(total)}</>}
        </button>
        {busy && (
          <div className="gbb-sub-log">
            {STEPS.map((lbl,i)=>(
              <div key={lbl} className={`gbb-sub-step${step===i+1?" active":step>i+1?" done":""}`}>
                <div className="gbb-sub-icon">
                  {step>i+1 ? <svg viewBox="0 0 24 24" style={{width:13,height:13,fill:"none",stroke:"var(--jdv2-green)",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round"}}><polyline points="20 6 9 17 4 12"/></svg>
                    : step===i+1 ? <div className="gbb-mini-spin"/>
                    : <svg viewBox="0 0 24 24" style={{width:11,height:11,fill:"none",stroke:"var(--jdv2-t3)",strokeWidth:2}}><circle cx="12" cy="12" r="9"/></svg>}
                </div>
                {lbl}
              </div>
            ))}
          </div>
        )}
        {!pdfReady && <div style={{marginTop:8,fontSize:10,color:"var(--jdv2-t3)",textAlign:"center"}}>Loading document engine...</div>}
      </div>
    </div>
  );
}

function GBBDetailView({ est, onPresent, onSign }) {
  const [statuses, setStatuses] = useState([]);
  const [statusKey, setStatusKey] = useState("accepted");
  useEffect(()=>{apiFetchStatuses().then(s=>{setStatuses(s);if(s.length)setStatusKey(s[0].key);});},[]);
  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:20}}>
        <div>
          <div style={{fontFamily:"var(--jdv2-font-mono)",fontSize:9,fontWeight:700,color:"var(--jdv2-acc)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>{est.id}</div>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.4px",color:"var(--jdv2-t1)",marginBottom:4}}>{est.name}</div>
          <div className="gbb-det-meta">
            <div className="gbb-det-meta-item">Client: <span>{est.client}</span></div>
            <div className="gbb-det-meta-item">Address: <span>{est.address}</span></div>
            <div className="gbb-det-meta-item">Date: <span>{est.date}</span></div>
            <span className={`gbb-pill ${est.status}`}>{est.status}</span>
          </div>
          {est.notes && <div className="gbb-det-notes">{est.notes}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end",flexShrink:0}}>
          {statuses.length>0 && (
            <div className="gbb-status-panel">
              <label className="jdv2-field-label">On Acceptance, Set Status To</label>
              <div className="gbb-status-chips">
                {statuses.map(s=>(
                  <button key={s.key} className="gbb-status-chip" onClick={()=>setStatusKey(s.key)}
                    style={{borderColor:statusKey===s.key?s.color:undefined,background:statusKey===s.key?s.color+"22":undefined,color:statusKey===s.key?s.color:undefined,fontWeight:statusKey===s.key?700:undefined}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="jdv2-btn-secondary" onClick={onPresent} style={{display:"flex",alignItems:"center",gap:7}}>
            {GBB_I.monitor} Present to Customer
          </button>
        </div>
      </div>
      <div className="gbb-tier-grid">
        {est.tiers.map(t=>(
          <GBBTierCard key={t.label} tier={t} onSelect={pkg=>onSign(pkg,statusKey)}/>
        ))}
      </div>
    </div>
  );
}

function GBBCreateEstimate({ onBack, onSave, projContext }) {
  const today = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const [form, setForm] = useState({name:"",client:projContext?.client||"",address:projContext?.address||"",date:today,jobType:"restoration",notes:""});
  const [priceList, setPL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState("labor");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState({
    Good:  {title:"Essential",    tag:"Core services at proven value.",      recommended:false,items:[]},
    Better:{title:"Recommended",  tag:"Best value for most situations.",      recommended:true, items:[]},
    Best:  {title:"Comprehensive",tag:"Maximum coverage & peace of mind.",   recommended:false,items:[]},
  });
  useEffect(()=>{setLoading(true);setPL(null);apiFetchPriceList(form.jobType).then(pl=>{setPL(pl);setLoading(false);});},[form.jobType]);
  const upForm = (k,v) => setForm(f=>({...f,[k]:v}));
  const getItems = () => {
    if(!priceList) return [];
    const raw=priceList[cat]||[];
    const qr=q.trim().toLowerCase();
    return qr?raw.filter(i=>i.name.toLowerCase().includes(qr)||i.id.toLowerCase().includes(qr)):raw;
  };
  const inTier  = (tk,id) => tiers[tk].items.some(i=>i.id===id);
  const toggle  = (tk,item) => setTiers(prev=>{
    const t=prev[tk];
    if(inTier(tk,item.id)) return{...prev,[tk]:{...t,items:t.items.filter(i=>i.id!==item.id)}};
    const ni={...item,qty:item.qty||1,total:(item.qty||1)*item.price};
    return{...prev,[tk]:{...t,items:[...t.items,ni]}};
  });
  const adjQty  = (tk,id,d) => setTiers(prev=>{
    const t=prev[tk];
    return{...prev,[tk]:{...t,items:t.items.map(i=>i.id!==id?i:{...i,qty:Math.max(1,(i.qty||1)+d),total:Math.max(1,(i.qty||1)+d)*i.price})}};
  });
  const remItem = (tk,id) => setTiers(prev=>({...prev,[tk]:{...prev[tk],items:prev[tk].items.filter(i=>i.id!==id)}}));
  const upTier  = (tk,field,val) => setTiers(prev=>({...prev,[tk]:{...prev[tk],[field]:val}}));
  const canSave = form.name.trim()&&form.client.trim()&&!saving;
  const totMsg  = GBB_TIER_KEYS.map(tk=>`${tk}: ${gbbFmt(gbbTierTotal(tiers[tk]))}`).join("  |  ");
  const handleSave = async () => {
    if(!canSave) return; setSaving(true);
    const tiersArr=GBB_TIER_KEYS.map(lbl=>({label:lbl,...tiers[lbl]}));
    const saved=await apiCreateEstimate({...form,tiers:tiersArr,status:"draft"});
    onSave({...form,tiers:tiersArr,status:"draft",id:saved.id||`EST-${Date.now()}`});
    setSaving(false);
  };
  return (
    <div className="gbb-create-layout">
      <div className="gbb-create-left">
        <div className="gbb-section">
          <div className="gbb-section-hdr"><h4>Job Information</h4></div>
          <div className="gbb-form-body">
            <div><label className="jdv2-field-label">Estimate Name *</label><input className="gbb-inp jdv2-field-input" placeholder="e.g. Water Damage Mitigation Scope" value={form.name} onChange={e=>upForm("name",e.target.value)}/></div>
            <div><label className="jdv2-field-label">Client Name *</label><input className="gbb-inp jdv2-field-input" placeholder="Client or insured name" value={form.client} onChange={e=>upForm("client",e.target.value)}/></div>
            <div><label className="jdv2-field-label">Address</label><input className="gbb-inp jdv2-field-input" placeholder="Job site address" value={form.address} onChange={e=>upForm("address",e.target.value)}/></div>
            <div><label className="jdv2-field-label">Trade / Job Type</label>
              <select className="gbb-inp jdv2-field-select" value={form.jobType} onChange={e=>upForm("jobType",e.target.value)}>
                {GBB_JOB_TYPES.map(jt=><option key={jt.v} value={jt.v}>{jt.label}</option>)}
              </select>
            </div>
            <div><label className="jdv2-field-label">Date</label><input className="gbb-inp jdv2-field-input" value={form.date} onChange={e=>upForm("date",e.target.value)}/></div>
            <div><label className="jdv2-field-label">Tech Notes</label><textarea className="gbb-inp jdv2-field-input" rows={3} placeholder="Site conditions, scope details..." value={form.notes} onChange={e=>upForm("notes",e.target.value)}/></div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="jdv2-btn-primary" onClick={handleSave} disabled={!canSave} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            {saving?<><div className="gbb-mini-spin"/>Saving...</>:"Save Estimate"}
          </button>
          <button className="jdv2-btn-secondary" onClick={onBack}>Cancel</button>
        </div>
      </div>
      <div className="gbb-create-right">
        <div className="gbb-section">
          <div className="gbb-section-hdr" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <h4>Job-Dox Price List</h4>
            <div className="gbb-search" style={{width:200,height:28,flex:"none"}}>
              {GBB_I.search}
              <input placeholder="Search items..." value={q} onChange={e=>setQ(e.target.value)} style={{fontSize:11}}/>
              {q && <button className="gbb-search-clr" onClick={()=>setQ("")}>{GBB_I.x}</button>}
            </div>
          </div>
          <div className="gbb-cat-tabs">
            {Object.keys(GBB_CAT_LABELS).map(c=>(
              <button key={c} className={`gbb-cat-tab${cat===c?" active":""}`} onClick={()=>setCat(c)}>{GBB_CAT_LABELS[c]}</button>
            ))}
          </div>
          {loading
            ? <div className="gbb-loading" style={{height:120}}><div className="gbb-spinner" style={{width:20,height:20,borderWidth:2}}/><p>Loading from Job-Dox...</p></div>
            : <div className="gbb-item-list">
                {getItems().length===0 && <div style={{padding:"16px",textAlign:"center",fontSize:11,color:"var(--jdv2-t3)"}}>{q?`No results for "${q}"`:"No items in this category"}</div>}
                {getItems().map(item=>{
                  const inAny=GBB_TIER_KEYS.some(tk=>inTier(tk,item.id));
                  return (
                    <div key={item.id} className={`gbb-price-item${inAny?" sel":""}`}>
                      <div className="gbb-pi-info">
                        <div className="gbb-pi-name">{item.name}</div>
                        <div className="gbb-pi-sub">{item.id} | {item.unit}{item.qty?` — qty ${item.qty}`:""}</div>
                      </div>
                      <div className="gbb-pi-price">{gbbFmt(item.price)}</div>
                      <div className="gbb-tier-btns">
                        {GBB_TIER_KEYS.map((tk,idx)=>{
                          const c=["g","b","x"][idx];const on=inTier(tk,item.id);
                          return <button key={tk} className={`gbb-tier-btn ${c}${on?" on":""}`} title={on?`Remove from ${tk}`:`Add to ${tk}`} onClick={()=>toggle(tk,item)}>{on?"✓":tk[0]}</button>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
        <div className="gbb-tbs">
          {GBB_TIER_KEYS.map((tk,i)=>{
            const t=tiers[tk];const tot=gbbTierTotal(t);const c=GBB_TIER_CLS[tk];
            return (
              <div key={tk} className={`gbb-tb ${c}`}>
                <div className="gbb-tb-hdr">
                  <div className="gbb-tb-hdr-r">
                    <div className="gbb-tb-tier" style={{color:GBB_TIER_COLORS[tk]}}>{tk.toUpperCase()}</div>
                    <div className="gbb-tb-total">{gbbFmt(tot)}</div>
                  </div>
                  <input className="gbb-tb-name" placeholder="Package name..." value={t.title} onChange={e=>upTier(tk,"title",e.target.value)}/>
                  <input className="gbb-tb-tag"  placeholder="Short tagline..." value={t.tag} onChange={e=>upTier(tk,"tag",e.target.value)}/>
                </div>
                <div className="gbb-tb-body">
                  {t.items.length===0
                    ? <div className="gbb-tb-empty">Click <strong style={{color:GBB_TIER_COLORS[tk]}}>{tk[0]}</strong> on any item above</div>
                    : t.items.map(item=>(
                        <div className="gbb-tb-line" key={item.id+item.name}>
                          <div className="gbb-tb-line-info">
                            <div className="gbb-tb-line-name">{item.name}</div>
                            <div className="gbb-tb-qty">
                              <button className="gbb-tb-q-btn" onClick={()=>adjQty(tk,item.id,-1)}>-</button>
                              <span className="gbb-tb-q-val">{item.qty}</span>
                              <button className="gbb-tb-q-btn" onClick={()=>adjQty(tk,item.id,+1)}>+</button>
                              <span style={{fontSize:9,color:"var(--jdv2-t3)",marginLeft:3}}>x {gbbFmt(item.price)}</span>
                            </div>
                          </div>
                          <div className="gbb-tb-line-price">{gbbFmt(item.total||item.price)}</div>
                          <button className="gbb-tb-rem" onClick={()=>remItem(tk,item.id)} title="Remove">x</button>
                        </div>
                      ))
                  }
                </div>
              </div>
            );
          })}
        </div>
        <div className="gbb-create-foot">
          <span className={`gbb-create-msg${canSave?" ok":""}`}>
            {!form.name.trim()||!form.client.trim() ? "Estimate name and client are required." : totMsg}
          </span>
          <button className="jdv2-btn-secondary" onClick={onBack}>Cancel</button>
          <button className="jdv2-btn-primary" onClick={handleSave} disabled={!canSave} style={{display:"flex",alignItems:"center",gap:6}}>
            {saving?<><div className="gbb-mini-spin"/>Saving...</>:"Save Estimate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GBBPresentMode({ est, onClose, onSign, statusKey }) {
  useEffect(()=>{
    const h = e => { if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[onClose]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"var(--jdv2-bg,#06070d)",overflowY:"auto",display:"flex",flexDirection:"column",fontFamily:"var(--jdv2-font-ui,'Outfit',sans-serif)"}}>
      <div className="gbb-present-hdr">
        <div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:"var(--jdv2-acc,#e43531)",letterSpacing:".1em"}}>JOB-DOX</div>
          <div className="gbb-panel-title" style={{fontSize:15}}>{est.name}</div>
          <div className="gbb-panel-sub">{est.client} · {est.address}</div>
        </div>
        <button className="gbb-close-btn" onClick={onClose} title="Exit (Esc)">
          <svg viewBox="0 0 24 24" style={{width:14,height:14,fill:"currentColor"}}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div className="gbb-present-body">
        <div className="gbb-present-intro">
          <h2>Choose Your Package</h2>
          <p>We've prepared three options tailored to your needs. Select the package that best fits your goals and budget.</p>
        </div>
        <div className="gbb-tier-grid">
          {est.tiers.map(t=>(
            <GBBTierCard key={t.label} tier={t} onSelect={pkg=>onSign(pkg,statusKey)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

const GBB_SEED = (proj) => [
  {id:"EST-2025-0841",name:"Water Mitigation Scope",client:proj?.client||"Client",address:proj?.address||"",
   date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
   status:"presented",jobType:"restoration",notes:"Initial scope for water damage mitigation. Adjust quantities per on-site readings.",
   tiers:[
    {label:"Good",  title:"Essential Mitigation",   tag:"Core extraction and drying services.",recommended:false,items:[{id:"L001",name:"Project Management",price:760,qty:1,total:760},{id:"E001",name:"LGR Dehumidifier (per day)",price:85,qty:3,total:255},{id:"E002",name:"Air Mover (per day)",price:28,qty:8,total:224},{id:"M001",name:"Antimicrobial Treatment",price:264,qty:1,total:264}]},
    {label:"Better",title:"Comprehensive Drying",   tag:"Full drying system with air quality control.",recommended:true,items:[{id:"L001",name:"Project Management",price:760,qty:1,total:760},{id:"L002",name:"Lead Tech Labor",price:1360,qty:1,total:1360},{id:"E001",name:"LGR Dehumidifier (per day)",price:255,qty:1,total:255},{id:"E002",name:"Air Mover (per day)",price:224,qty:1,total:224},{id:"E003",name:"Air Scrubber HEPA (per day)",price:195,qty:1,total:195},{id:"M001",name:"Antimicrobial Treatment",price:264,qty:1,total:264}]},
    {label:"Best",  title:"Full Service Restoration",tag:"Mitigation through reconstruction ready.",recommended:false,items:[{id:"L001",name:"Project Management",price:1520,qty:1,total:1520},{id:"L002",name:"Lead Tech Labor",price:2720,qty:1,total:2720},{id:"E001",name:"LGR Dehumidifier (per day)",price:510,qty:1,total:510},{id:"E002",name:"Air Mover (per day)",price:448,qty:1,total:448},{id:"E003",name:"Air Scrubber HEPA (per day)",price:390,qty:1,total:390},{id:"M001",name:"Antimicrobial Treatment",price:528,qty:1,total:528},{id:"S001",name:"Demo — Drywall",price:396,qty:1,total:396},{id:"S002",name:"Demo — Flooring (LVP)",price:504,qty:1,total:504}]},
  ]},
];

function EstimateDoxTab({ proj }) {
  useEffect(()=>{
    const el = document.createElement("style");
    el.id = "gbb-tab-css";
    const existing = document.getElementById("gbb-tab-css");
    if(existing){ existing.textContent = GBB_CSS; }
    else{ el.textContent = GBB_CSS; document.head.appendChild(el); }
    return ()=>{ try{document.head.removeChild(document.getElementById("gbb-tab-css"));}catch(_){} };
  },[]);

  const projContext = { company:"Job-Dox", project:proj.name, client:proj.client||"", address:proj.address||"", id:proj.id };
  const [estimates, setEstimates] = useState(()=>GBB_SEED(proj));
  const [view, setView]           = useState("list");
  const [selEst, setSelEst]       = useState(null);
  const [selTier, setSelTier]     = useState(null);
  const [statusKey, setStatusKey] = useState("accepted");
  const [presenting, setPresenting] = useState(false);
  const [q, setQ]                 = useState("");

  const filtered = q.trim()
    ? estimates.filter(e=>e.name.toLowerCase().includes(q.toLowerCase())||e.client.toLowerCase().includes(q.toLowerCase())||e.id.toLowerCase().includes(q.toLowerCase()))
    : estimates;

  const kpis = {
    total:    estimates.length,
    pipeline: estimates.filter(e=>e.status==="presented").length,
    accepted: estimates.filter(e=>e.status==="accepted").length,
  };

  const openDetail = est => { setSelEst(est); setView("detail"); };
  const goList     = () => { setView("list"); setSelEst(null); setSelTier(null); setPresenting(false); };

  const Breadcrumb = () => (
    <div className="gbb-breadcrumb">
      <button className="gbb-bc-btn" onClick={goList}>EstimateDox</button>
      {selEst && <><span className="gbb-bc-sep">›</span><button className="gbb-bc-btn" onClick={()=>{ setView("detail"); setSelTier(null); setPresenting(false); }}>{selEst.id}</button></>}
      {view==="sign"   && <><span className="gbb-bc-sep">›</span><span className="gbb-bc-cur">Authorize</span></>}
      {view==="create" && <><span className="gbb-bc-sep">›</span><span className="gbb-bc-cur">New Estimate</span></>}
    </div>
  );

  return (
    <>
      {presenting && selEst && (
        <GBBPresentMode est={selEst} statusKey={statusKey} onClose={()=>setPresenting(false)}
          onSign={(pkg,sk)=>{ setSelTier(pkg); setStatusKey(sk); setPresenting(false); setView("sign"); }}/>
      )}
      <div className="gbb-content" style={{flex:1,overflow:"hidden",height:"100%"}}>
        {/* Left list column */}
        <div className={`gbb-list-col${view!=="list"?" has-detail":""}`}>
          <div className="gbb-col-hdr">
            <span className="gbb-col-label">Estimates · {estimates.length}</span>
            <button className="jdv2-new-btn" onClick={()=>setView("create")} style={{display:"flex",alignItems:"center",gap:5}}>
              {GBB_I.plus} New
            </button>
          </div>
          <div className="gbb-kpi-wrap">
            <div className="gbb-kpi-bar">
              <div className="gbb-kpi-cell"><span className="gbb-kpi-val" style={{color:"var(--jdv2-blue)"}}>{kpis.total}</span><span className="gbb-kpi-label">Total</span></div>
              <div className="gbb-kpi-cell"><span className="gbb-kpi-val" style={{color:"var(--jdv2-amber)"}}>{kpis.pipeline}</span><span className="gbb-kpi-label">Presented</span></div>
              <div className="gbb-kpi-cell"><span className="gbb-kpi-val" style={{color:"var(--jdv2-green)"}}>{kpis.accepted}</span><span className="gbb-kpi-label">Accepted</span></div>
            </div>
          </div>
          <div className="gbb-search-wrap">
            <div className="gbb-search">
              {GBB_I.search}
              <input placeholder="Search estimates, clients…" value={q} onChange={e=>setQ(e.target.value)}/>
              {q && <button className="gbb-search-clr" onClick={()=>setQ("")}>{GBB_I.x}</button>}
            </div>
          </div>
          <div className="gbb-list-scroll">
            {filtered.length===0 && (
              <div className="gbb-empty" style={{height:160}}>
                <div className="gbb-empty-icon">{GBB_I.box}</div>
                <div className="gbb-empty-ttl">NO ESTIMATES</div>
                <div className="gbb-empty-sub">{q?`No results for "${q}"`:"Create your first estimate"}</div>
              </div>
            )}
            {filtered.map(est=>(
              <div key={est.id} className={`gbb-est-card${selEst?.id===est.id?" selected":""}`} onClick={()=>openDetail(est)}>
                <div className="gbb-est-accent" style={{background:gbbAccentColor(est.status)}}/>
                <div className="gbb-est-body">
                  <div className="gbb-est-r1">
                    <span className="gbb-est-name">{est.name}</span>
                    <span className={`gbb-pill ${est.status}`}>{est.status}</span>
                  </div>
                  <div className="gbb-est-r2">
                    <span className="gbb-est-client">{est.client}</span>
                    <span className="gbb-type-badge">{GBB_TYPE_SHORT[est.jobType]||est.jobType?.toUpperCase()}</span>
                  </div>
                  <div className="gbb-est-r3">
                    <span className="gbb-est-id">{est.id}</span>
                    <div className="gbb-tier-pips">
                      {est.tiers.map(t=>(
                        <span key={t.label} className={`gbb-tier-pip ${GBB_TIER_CLS[t.label]}`}>
                          {t.label[0]} {gbbFmt(gbbTierTotal(t))}
                        </span>
                      ))}
                    </div>
                    <span className="gbb-est-date">{est.date}</span>
                  </div>
                </div>
                <div className="gbb-est-chevron">{GBB_I.chevron}</div>
              </div>
            ))}
          </div>
          <div className="gbb-hint">Click to open · Present to customer in fullscreen</div>
        </div>

        {/* Right detail panel */}
        <div className={`gbb-detail-panel${view!=="list"?" has-detail":""}`}>
          <div className="gbb-panel-hdr">
            <div className="gbb-panel-hdr-l">
              {view!=="list" && (
                <button className="gbb-back-btn" onClick={view==="detail"?goList:()=>{ setView("detail"); setSelTier(null); }}>
                  {GBB_I.back}
                </button>
              )}
              <div>
                <div className="gbb-panel-title">
                  {view==="list"   && "Select an estimate"}
                  {view==="detail" && selEst?.name}
                  {view==="sign"   && "Customer Authorization"}
                  {view==="create" && "New Estimate"}
                </div>
                <Breadcrumb/>
              </div>
            </div>
            <div className="gbb-panel-hdr-r">
              {view==="detail" && selEst && (
                <button className="jdv2-btn-secondary" onClick={()=>setPresenting(true)} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                  {GBB_I.monitor} Present
                </button>
              )}
            </div>
          </div>
          <div className="gbb-detail-scroll">
            {view==="list" && (
              <div className="gbb-empty">
                <div className="gbb-empty-icon">{GBB_I.box}</div>
                <div className="gbb-empty-ttl">No Estimate Selected</div>
                <div className="gbb-empty-sub">Choose an estimate from the list or create a new one</div>
              </div>
            )}
            {view==="create" && (
              <GBBCreateEstimate onBack={goList} projContext={projContext}
                onSave={est=>{ setEstimates(prev=>[est,...prev]); goList(); }}/>
            )}
            {view==="detail" && selEst && (
              <GBBDetailView est={selEst} onPresent={()=>setPresenting(true)}
                onSign={(pkg,sk)=>{ setSelTier(pkg); setStatusKey(sk); setView("sign"); }}/>
            )}
            {view==="sign" && selEst && selTier && (
              <GBBSignatureView est={selEst} tier={selTier} onBack={()=>setView("detail")} onDone={goList}
                onComplete={()=>setEstimates(prev=>prev.map(e=>e.id===selEst.id?{...e,status:"accepted"}:e))}/>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT REPORT TAB
══════════════════════════════════════════════════════════════════ */
const REPORT_FEED_TYPES = [
  {key:"document", label:"Documents Generated",  color:"var(--blue)"},
  {key:"task",     label:"Tasks Completed",       color:"var(--green)"},
  {key:"message",  label:"Communications",        color:"var(--acc)"},
  {key:"media",    label:"Media / Photos Added",  color:"var(--purple)"},
  {key:"scope",    label:"Scope Changes",         color:"var(--amber)"},
  {key:"contact",  label:"Contact Updates",       color:"var(--t3)"},
];

function ProjectReportTab({ proj, dailyNotes=[], mediaFolders=[], mediaUploads=[], docs=[] }) {
  const [execSummary, setExecSummary] = useState(
    `This report documents the full scope of work performed at ${proj.name||"the project site"} in response to the reported loss event. The following pages include a chronological account of all mitigation activities, moisture data, photographic documentation, and supporting documents relevant to the claim.`
  );
  const [selNotes,    setSelNotes]    = useState(() => new Set(dailyNotes.map(n=>n.id)));
  const [selFolders,  setSelFolders]  = useState(() => new Set(mediaFolders));
  const [selDocs,     setSelDocs]     = useState(() => new Set(docs.map(d=>d.id)));
  const [selFeedTypes,setSelFeedTypes]= useState(() => new Set(REPORT_FEED_TYPES.map(f=>f.key)));
  const [adjEmail,    setAdjEmail]    = useState("");
  const [adjName,     setAdjName]     = useState("Mike Torres");
  const [sentMsg,     setSentMsg]     = useState(false);
  const [previewing,  setPreviewing]  = useState(false);
  const [sending,     setSending]     = useState(false);

  const toggleSet = (setter, key) => setter(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const selectedNotes   = dailyNotes.filter(n => selNotes.has(n.id));
  const selectedFolders = mediaFolders.filter(f => selFolders.has(f));
  const selectedDocs    = docs.filter(d => selDocs.has(d.id));
  const feedEvents      = ACTIVITY.filter(a => a.proj===proj.name && selFeedTypes.has(a.actionType));

  const today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const sectionCount = [selectedNotes.length>0, selectedFolders.length>0, selectedDocs.length>0, feedEvents.length>0].filter(Boolean).length + 1;

  const handleSend = async () => {
    if (!adjEmail.trim() && !adjName.trim()) return;
    setSending(true);
    await new Promise(r=>setTimeout(r,1600));
    setSending(false); setSentMsg(true);
    setTimeout(()=>setSentMsg(false),4000);
  };

  const handlePrint = () => {
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(`
      <html><head><title>Project Report — ${proj.name}</title>
      <style>
        body{font-family:'Georgia',serif;color:#0d1117;margin:0;padding:0;background:#fff;}
        .cover{background:#e43531;color:#fff;padding:60px 56px;min-height:220px;}
        .cover-logo{font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:.2em;opacity:.8;margin-bottom:28px;}
        .cover-title{font-size:32px;font-weight:700;letter-spacing:-.5px;margin-bottom:8px;}
        .cover-sub{font-size:14px;opacity:.8;margin-bottom:24px;}
        .cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;background:rgba(0,0,0,.18);border-radius:8px;padding:16px 20px;margin-top:24px;}
        .meta-lbl{font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin-bottom:3px;}
        .meta-val{font-size:13px;font-weight:600;}
        .body{padding:40px 56px;max-width:800px;margin:0 auto;}
        .section{margin-bottom:36px;page-break-inside:avoid;}
        .section-hdr{font-family:'Courier New',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e43531;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e43531;}
        .exec{font-size:13px;line-height:1.75;color:#374151;}
        .note{background:#f8f9fc;border-left:3px solid #e43531;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:10px;}
        .note-meta{font-family:'Courier New',monospace;font-size:10px;color:#8a9ab5;margin-bottom:6px;}
        .note-body{font-size:12px;line-height:1.65;color:#374151;}
        .doc-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e8eaf2;font-size:12px;}
        .doc-badge{padding:2px 7px;border-radius:3px;font-size:9px;font-weight:700;font-family:'Courier New',monospace;}
        .feed-item{padding:8px 0;border-bottom:1px solid #e8eaf2;font-size:12px;display:flex;align-items:flex-start;gap:10px;}
        .feed-dot{width:8px;height:8px;border-radius:50%;background:#e43531;flex-shrink:0;margin-top:4px;}
        .album-chip{display:inline-block;padding:4px 10px;background:#e8eaf2;border-radius:20px;font-size:11px;margin:3px;}
        .footer{background:#f2f4f8;border-top:3px solid #e43531;padding:16px 56px;font-family:'Courier New',monospace;font-size:9px;color:#8a9ab5;display:flex;justify-content:space-between;}
        @media print{.no-print{display:none;}}
      </style></head><body>
      <div class="cover">
        <div class="cover-logo">JOB-DOX · PROJECT REPORT</div>
        <div class="cover-title">${proj.name}</div>
        <div class="cover-sub">${proj.address||""}</div>
        <div class="cover-meta">
          <div><div class="meta-lbl">Project ID</div><div class="meta-val">${proj.id}</div></div>
          <div><div class="meta-lbl">Loss Type</div><div class="meta-val">${(proj.type||"").toUpperCase()}</div></div>
          <div><div class="meta-lbl">Report Date</div><div class="meta-val">${today}</div></div>
          <div><div class="meta-lbl">Status</div><div class="meta-val">${proj.status||""}</div></div>
          <div><div class="meta-lbl">Carrier</div><div class="meta-val">${proj.carrier||"—"}</div></div>
          <div><div class="meta-lbl">Claim #</div><div class="meta-val">${proj.claim||"—"}</div></div>
        </div>
      </div>
      <div class="body">
        <div class="section">
          <div class="section-hdr">Executive Summary</div>
          <div class="exec">${execSummary.replace(/\n/g,"<br/>")}</div>
        </div>
        ${selectedNotes.length>0?`
        <div class="section">
          <div class="section-hdr">Field Notes (${selectedNotes.length})</div>
          ${selectedNotes.map(n=>`
            <div class="note">
              <div class="note-meta">${n.date} · ${n.author}</div>
              <div class="note-body">${n.content}</div>
            </div>
          `).join("")}
        </div>`:""}
        ${selectedFolders.length>0?`
        <div class="section">
          <div class="section-hdr">Photo Albums Included (${selectedFolders.length})</div>
          <div style="margin-top:6px;">${selectedFolders.map(f=>`<span class="album-chip">${f}</span>`).join("")}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:10px;">Full-resolution photos available in the Job-Dox client portal.</div>
        </div>`:""}
        ${selectedDocs.length>0?`
        <div class="section">
          <div class="section-hdr">Attached Documents (${selectedDocs.length})</div>
          ${selectedDocs.map(d=>`
            <div class="doc-item">
              <span class="doc-badge" style="background:#e8eaf2;color:#374151;">${d.type}</span>
              <span style="flex:1;">${d.name}</span>
              <span style="color:#8a9ab5;font-size:11px;">${d.size} · ${d.date}</span>
            </div>
          `).join("")}
        </div>`:""}
        ${feedEvents.length>0?`
        <div class="section">
          <div class="section-hdr">Activity Timeline (${feedEvents.length} events)</div>
          ${feedEvents.map(e=>`
            <div class="feed-item">
              <div class="feed-dot"></div>
              <div style="flex:1;">${e.action}<span style="color:#8a9ab5;font-size:10px;margin-left:8px;">${e.user} · ${e.time}</span></div>
            </div>
          `).join("")}
        </div>`:""}
      </div>
      <div class="footer">
        <span>Job-Dox · ${proj.id} · ${today}</span>
        <span>CONFIDENTIAL — For adjuster review only</span>
      </div>
      </body></html>
    `);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };

  const docBadgeColors = {DryDox:"var(--blue)",ContentsDox:"var(--green)",Invoice:"var(--amber)",Contract:"var(--purple)",Uploaded:"var(--t2)",EstimateDox:"var(--acc)"};

  if (previewing) return (
    <div className="scroll">
      <div style={{maxWidth:820,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:18}}>
          <button className="back-btn" onClick={()=>setPreviewing(false)}>{Ic.back} Builder</button>
          <span style={{color:"var(--t3)"}}>›</span>
          <span style={{fontSize:13,fontWeight:600}}>Report Preview</span>
          <div style={{flex:1}}/>
          <button className="btn btn-primary btn-xs" onClick={handlePrint}>{Ic.pdf} Print / Save PDF</button>
        </div>

        {/* Report cover */}
        <div style={{background:"var(--acc)",borderRadius:"12px 12px 0 0",padding:"36px 40px 28px",color:"#fff"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700,letterSpacing:".18em",opacity:.75,marginBottom:20}}>JOB-DOX · PROJECT REPORT</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.5px",marginBottom:4}}>{proj.name}</div>
          <div style={{fontSize:12,opacity:.8,marginBottom:20}}>{proj.address}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,background:"rgba(0,0,0,.18)",borderRadius:8,padding:"12px 16px"}}>
            {[["Project ID",proj.id],["Loss Type",(proj.type||"").toUpperCase()],["Report Date",new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})],["Status",proj.status],["Carrier",proj.carrier||"—"],["Claim #",proj.claim||"—"]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:8,letterSpacing:".1em",textTransform:"uppercase",opacity:.65,marginBottom:2,fontFamily:"var(--mono)"}}>{l}</div>
                <div style={{fontSize:11,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Report body */}
        <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:"0 0 12px 12px",padding:"28px 36px"}}>
          {/* Exec summary */}
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--acc)",marginBottom:10,paddingBottom:6,borderBottom:"2px solid var(--acc)"}}>Executive Summary</div>
            <div style={{fontSize:13,lineHeight:1.75,color:"var(--t1)"}}>{execSummary}</div>
          </div>

          {/* Notes */}
          {selectedNotes.length>0 && (
            <div style={{marginBottom:28}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--acc)",marginBottom:10,paddingBottom:6,borderBottom:"2px solid var(--acc)"}}>Field Notes ({selectedNotes.length})</div>
              {selectedNotes.map(n=>(
                <div key={n.id} style={{borderLeft:"3px solid var(--acc)",background:"var(--s3)",borderRadius:"0 7px 7px 0",padding:"10px 14px",marginBottom:9}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)",marginBottom:5}}>{n.date} · {n.author}</div>
                  <div style={{fontSize:12,color:"var(--t1)",lineHeight:1.65}}>{n.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Albums */}
          {selectedFolders.length>0 && (
            <div style={{marginBottom:28}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--acc)",marginBottom:10,paddingBottom:6,borderBottom:"2px solid var(--acc)"}}>Photo Albums ({selectedFolders.length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:8}}>
                {selectedFolders.map(f=>(
                  <span key={f} style={{display:"flex",alignItems:"center",gap:5,background:"var(--s3)",border:"1px solid var(--br)",borderRadius:20,padding:"4px 12px",fontSize:11,color:"var(--t1)"}}>
                    <span style={{color:"var(--amber)"}}>{Ic.folder}</span>{f}
                    <span style={{fontSize:9,color:"var(--t3)",marginLeft:3}}>{mediaUploads.filter(u=>u.folder===f).length} photos</span>
                  </span>
                ))}
              </div>
              <div style={{fontSize:11,color:"var(--t3)"}}>Full-resolution photos accessible via Job-Dox client portal link.</div>
            </div>
          )}

          {/* Documents */}
          {selectedDocs.length>0 && (
            <div style={{marginBottom:28}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--acc)",marginBottom:10,paddingBottom:6,borderBottom:"2px solid var(--acc)"}}>Documents ({selectedDocs.length})</div>
              {selectedDocs.map(d=>{const c=docBadgeColors[d.type]||"var(--t2)";return(
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
                  <div style={{width:28,height:28,borderRadius:6,background:c+"18",display:"flex",alignItems:"center",justifyContent:"center",color:c,flexShrink:0}}>{Ic.pdf}</div>
                  <div style={{flex:1,fontSize:12,color:"var(--t1)",fontWeight:500}}>{d.name}</div>
                  <span style={{borderRadius:20,padding:"2px 8px",fontSize:9,background:c+"18",color:c,fontWeight:600,fontFamily:"var(--mono)"}}>{d.type}</span>
                  <span style={{fontSize:10,color:"var(--t3)"}}>{d.size} · {d.date}</span>
                </div>
              );})}
            </div>
          )}

          {/* Activity timeline */}
          {feedEvents.length>0 && (
            <div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--acc)",marginBottom:10,paddingBottom:6,borderBottom:"2px solid var(--acc)"}}>Activity Timeline ({feedEvents.length} events)</div>
              {feedEvents.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:e.color||"var(--acc)",flexShrink:0,marginTop:5}}/>
                  <div style={{flex:1,fontSize:12,color:"var(--t1)"}}>{e.action}</div>
                  <div style={{fontSize:10,color:"var(--t3)",flexShrink:0}}>{e.user} · {e.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{marginTop:1,background:"var(--s3)",border:"1px solid var(--br)",borderTop:"3px solid var(--acc)",borderRadius:"0 0 10px 10px",padding:"10px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>Job-Dox · {proj.id} · {today}</span>
          <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>CONFIDENTIAL — For adjuster review only</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="scroll">
      <div style={{maxWidth:980,margin:"0 auto",display:"grid",gridTemplateColumns:"320px 1fr",gap:14,alignItems:"start"}} className="report-builder">

        {/* Left — builder controls */}
        <div style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:0}}>

          {/* Section 1 — exec summary */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--acc)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>1</span>
              Executive Summary
            </div>
            <textarea className="inp" rows={5} value={execSummary} onChange={e=>setExecSummary(e.target.value)} placeholder="Write an overview narrative for the adjuster…" style={{resize:"vertical",lineHeight:1.6,fontSize:12}}/>
          </div>

          {/* Section 2 — daily notes */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--acc)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>2</span>
              Field Notes
              <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>{selNotes.size}/{dailyNotes.length} selected</span>
            </div>
            {dailyNotes.length===0 && <div style={{fontSize:11,color:"var(--t3)"}}>No notes yet — add daily notes in Overview.</div>}
            {dailyNotes.map(n=>(
              <label key={n.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}>
                <input type="checkbox" checked={selNotes.has(n.id)} onChange={()=>toggleSet(setSelNotes,n.id)} style={{marginTop:2,accentColor:"var(--acc)",flexShrink:0}}/>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)",marginBottom:2}}>{n.date} · {n.author}</div>
                  <div style={{fontSize:11,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{n.content}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Section 3 — photo albums */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--acc)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>3</span>
              Photo Albums
              <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>{selFolders.size}/{mediaFolders.length} selected</span>
            </div>
            {mediaFolders.length===0 && <div style={{fontSize:11,color:"var(--t3)"}}>No albums yet — upload photos in Media tab.</div>}
            {mediaFolders.map(f=>(
              <label key={f} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}>
                <input type="checkbox" checked={selFolders.has(f)} onChange={()=>toggleSet(setSelFolders,f)} style={{accentColor:"var(--acc)",flexShrink:0}}/>
                <span style={{color:"var(--amber)",flexShrink:0}}>{Ic.folder}</span>
                <span style={{flex:1,fontSize:11,color:"var(--t1)"}}>{f}</span>
                <span style={{fontSize:9,color:"var(--t3)",flexShrink:0}}>{mediaUploads.filter(u=>u.folder===f).length} photos</span>
              </label>
            ))}
          </div>

          {/* Section 4 — documents */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--acc)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>4</span>
              Documents
              <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>{selDocs.size}/{docs.length} selected</span>
            </div>
            {docs.map(d=>{const c=docBadgeColors[d.type]||"var(--t2)";return(
              <label key={d.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}>
                <input type="checkbox" checked={selDocs.has(d.id)} onChange={()=>toggleSet(setSelDocs,d.id)} style={{accentColor:"var(--acc)",flexShrink:0}}/>
                <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",color:c,background:c+"18",borderRadius:3,padding:"1px 5px",flexShrink:0}}>{d.type}</span>
                <span style={{flex:1,fontSize:11,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
              </label>
            );})}
          </div>

          {/* Section 5 — newsfeed event types */}
          <div className="card">
            <div style={{fontSize:12,fontWeight:700,marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
              <span style={{background:"var(--acc)",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0}}>5</span>
              Activity Timeline
              <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--t3)"}}>{feedEvents.length} events</span>
            </div>
            <div style={{fontSize:10,color:"var(--t3)",marginBottom:8}}>Choose which event types to include:</div>
            {REPORT_FEED_TYPES.map(ft=>(
              <label key={ft.key} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid var(--br)",cursor:"pointer"}}>
                <input type="checkbox" checked={selFeedTypes.has(ft.key)} onChange={()=>toggleSet(setSelFeedTypes,ft.key)} style={{accentColor:"var(--acc)",flexShrink:0}}/>
                <span style={{width:8,height:8,borderRadius:"50%",background:ft.color,flexShrink:0}}/>
                <span style={{fontSize:11,color:"var(--t1)"}}>{ft.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right — summary + send panel */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Report summary card */}
          <div className="card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:14,fontWeight:800,letterSpacing:"-.3px"}}>Project Report</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{proj.name} · {proj.id}</div>
              </div>
              <button className="btn btn-secondary btn-xs" onClick={()=>setPreviewing(true)} style={{display:"flex",alignItems:"center",gap:5}}>
                {Ic.pdf} Preview Report
              </button>
            </div>

            {/* Section summary chips */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}} className="report-summary-chips">
              {[
                {label:"Executive Summary",   value:"1 section",               color:"var(--acc)",   active:true},
                {label:"Field Notes",          value:`${selNotes.size} notes`,  color:"var(--blue)",  active:selNotes.size>0},
                {label:"Photo Albums",         value:`${selFolders.size} albums`,color:"var(--amber)", active:selFolders.size>0},
                {label:"Documents",            value:`${selDocs.size} files`,   color:"var(--green)", active:selDocs.size>0},
                {label:"Activity Timeline",    value:`${feedEvents.length} events`,color:"var(--purple)",active:feedEvents.length>0},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",gap:8,background:s.active?"var(--s3)":"var(--s2)",border:`1px solid ${s.active?s.color+"33":"var(--br)"}`,borderRadius:8,padding:"9px 12px",opacity:s.active?1:.45}}>
                  <div style={{width:8,height:8,borderRadius:2,background:s.active?s.color:"var(--t3)",flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"var(--t1)"}}>{s.label}</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:9,color:s.active?s.color:"var(--t3)"}}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{borderTop:"1px solid var(--br)",paddingTop:12,fontSize:11,color:"var(--t3)"}}>
              <strong style={{color:"var(--t1)"}}>{sectionCount} section{sectionCount!==1?"s":""}</strong> included in this report ·&nbsp;
              Generated {today}
            </div>
          </div>

          {/* Send to adjuster */}
          <div className="card">
            <div style={{fontSize:13,fontWeight:700,marginBottom:11,display:"flex",alignItems:"center",gap:7}}>
              {Ic.mail} Send to Adjuster
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
              <div>
                <label className="lbl">Adjuster Name</label>
                <input className="inp" value={adjName} onChange={e=>setAdjName(e.target.value)} placeholder="e.g. Mike Torres"/>
              </div>
              <div>
                <label className="lbl">Adjuster Email</label>
                <input className="inp" type="email" value={adjEmail} onChange={e=>setAdjEmail(e.target.value)} placeholder="adjuster@insurance.com"/>
              </div>
            </div>

            {sentMsg && (
              <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(26,217,138,.1)",border:"1px solid rgba(26,217,138,.25)",borderRadius:8,padding:"10px 14px",marginBottom:11}}>
                <span style={{color:"var(--green)",fontSize:14}}>{Ic.check}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--green)"}}>Report Sent</div>
                  <div style={{fontSize:11,color:"var(--t2)"}}>Sent to {adjName||adjEmail} · {new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</div>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn btn-primary btn-xs" onClick={handleSend} disabled={sending||(!adjEmail&&!adjName)} style={{flex:1,justifyContent:"center",display:"flex",alignItems:"center",gap:6}}>
                {sending ? <><div style={{width:11,height:11,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"jd-spin 0.7s linear infinite"}}/> Sending…</> : <>{Ic.mail} Send Report</>}
              </button>
              <button className="btn btn-secondary btn-xs" onClick={handlePrint} style={{display:"flex",alignItems:"center",gap:5}}>
                {Ic.pdf} Print / PDF
              </button>
            </div>
          </div>

          {/* Client portal note card */}
          <div className="card" style={{border:"1px solid rgba(232,156,24,.25)",background:"rgba(232,156,24,.04)"}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--amber)"}}>Client Portal</div>
            <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.65,marginBottom:10}}>
              Your client can access a <strong style={{color:"var(--t1)"}}>lite view</strong> of this project — photos from selected albums and notes marked "Visible to Client" — without seeing financials, internal notes, or private documents.
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t3)",marginBottom:8}}>Enable or disable in Overview → Daily Notes → Client Portal toggle</div>
            <div style={{display:"flex",gap:7}}>
              <button className="btn btn-ghost btn-xs">{Ic.sms} Text Portal Link</button>
              <button className="btn btn-ghost btn-xs">{Ic.mail} Email Portal Link</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PROJ_TABS = [
  {key:"overview",     label:"Overview",       icon:Ic.chart   },
  {key:"drydox",       label:"DryDox",         icon:Ic.drydox  },
  {key:"contentsdox",  label:"ContentsDox",    icon:Ic.contents},
  {key:"estimatedox",  label:"EstimateDox",    icon:Ic.estimate},
  {key:"contacts",    label:"Contacts",       icon:Ic.contact },
  {key:"media",       label:"Media",          icon:Ic.photo   },
  {key:"documents",   label:"Documents",      icon:Ic.doc     },
  {key:"tasks",       label:"Tasks",          icon:Ic.tasks   },
  {key:"finance",     label:"Finance",        icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg> },
  {key:"shifts",      label:"Shift Reports",  icon:Ic.clock   },
  {key:"scope",       label:"Scope/Invoice",  icon:Ic.scope   },
  {key:"messages",       label:"Messages",       icon:Ic.msg         },
  {key:"calls",          label:"Calls",          icon:Ic.phone       },
  {key:"project-report", label:"Project Report", icon:Ic.proj_report },
];



function ProjectDetail({ proj, onBack, attrDefs, initialTab, clockInState, onClockIn, onClockOut, projectShifts, currentUser, canViewRates, canViewBudget=false, canViewBillingScope=false, canViewPayRates=false, canManageStaff=false, globalStaff=[], priceLists=[], setPriceLists, companyId="", phoneSettings={}, isVendor=false, currentMemberId="", onNavigate }) {
  const [tab,setTab]           = useState(initialTab||"overview");
  const [notifyModal,setNotify]= useState(false);
  const [commModal,setComm]    = useState(false);
  const [clockModal,setClock]  = useState(false);
  // ── All shared tab state is now persisted via useProjState ──
  // useProjState(projId, key, fallback) saves to localStorage automatically
  // and re-loads when navigating between projects.
  const DEFAULT_MEDIA_FOLDERS = ["Day 1 — Initial Documentation","Moisture Mapping","Equipment Setup"];

  const [dailyNotes,   setDailyNotes]  = useProjState(proj.id, "notes",        []);
  const [emailSchedule,setEmailSched]  = useProjState(proj.id, "emailSched",   "weekly");
  const [clientPortal, setClientPortal]= useProjState(proj.id, "clientPortal", true);
  const [mediaFolders, setMediaFolders]= useProjState(proj.id, "mediaFolders", DEFAULT_MEDIA_FOLDERS);
  const [mediaUploads, setMediaUploads]= useProjState(proj.id, "mediaUploads", []);
  // Contacts lifted here so Documents + Messages tabs can use them
  const [contacts,     setContacts]    = useProjState(proj.id, "contacts",     []);
  // Assigned staff lifted here so Documents tab can use lead+ for Reply-To
  const [assignedStaff, setAssignedStaff] = useProjState(proj.id, "assigned",  []);
  // Scope items lifted here so DryDox + ContentsDox can push to it
  const [scopeItems,   setScopeItems]  = useProjState(proj.id, "scope",        []);
  // Project-level work type assignments (separate from company work type definitions)
  const [worktypes,    setWorktypes]   = useProjState(proj.id, "worktypes",    proj.worktypes || []);
  // projDocs state kept for legacy ProjectReportTab compatibility; canonical source is lsProj.docs (loadProjDocs)
  const [projDocs, setProjDocs]        = useState(DOCS_SEED);

  const openMaps = () => window.open(`https://maps.google.com/?q=${encodeURIComponent(proj.address)}`,"_blank");
  const isClocked = clockInState?.projId === proj.id;
  const myShifts  = projectShifts[proj.id] || [];
  const laborCost = myShifts.reduce((s,sh)=>s+(sh.laborCost||0),0);

  // Callback for DryDox/ContentsDox to push items to Scope
  const handlePushToScope = (newItems) => {
    setScopeItems(prev => {
      // Remove any existing items from same source to avoid duplication
      const source = newItems[0]?.source;
      const filtered = source ? prev.filter(i=>(i.source||"manual")!==source) : prev;
      return [...filtered, ...newItems];
    });
    setTab("scope"); // auto-navigate to scope
  };

  return (
    <>
      {clockModal  && <ClockInModal proj={proj} clockInState={clockInState} onClockIn={onClockIn} onClockOut={onClockOut} onClose={()=>setClock(false)} currentUser={currentUser} canViewRates={canViewRates}/>}
      {notifyModal && <NotifyModal proj={proj} onClose={()=>setNotify(false)} globalStaff={globalStaff}/>}
      {commModal   && <CommModal    proj={proj} onClose={()=>setComm(false)} currentUser={currentUser} phoneSettings={phoneSettings} companyId={companyId}/>}
      <div className="topbar">
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <button className="back-btn" onClick={onBack}>{Ic.back} Projects</button>
          <span style={{color:"var(--br-hi)"}}>›</span>
          <div><div className="topbar-ttl">{proj.name}</div><div className="topbar-sub">{proj.id} · {proj.type.toUpperCase()}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <Badge status={proj.status}/>
          <TypeTag type={proj.type}/>
          {isClocked && (
            <span style={{display:"flex",alignItems:"center",gap:4,background:"rgba(26,217,138,.12)",border:"1px solid rgba(26,217,138,.25)",borderRadius:20,padding:"2px 9px",fontSize:10,color:"var(--green)",fontWeight:700}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"block",animation:"jd-ping 1.5s ease infinite"}}/>CLOCKED IN
            </span>
          )}
          <div style={{width:1,height:18,background:"var(--br)",margin:"0 4px"}}/>
          <button className={`btn btn-xs ${isClocked?"btn-danger":"btn-green"}`} onClick={()=>setClock(true)} style={isClocked?{background:"var(--acc)",color:"#fff",border:"none"}:{}}>
            {isClocked ? <>{Ic.stopwatch} Clock Out</> : <>{Ic.clock} Clock In</>}
          </button>
          <button className="btn btn-blue  btn-xs" onClick={()=>setNotify(true)}>{Ic.notify} Notify</button>
          <span className="proj-detail-btns-secondary" style={{display:"contents"}}>
            <button className="btn btn-ghost btn-xs" onClick={openMaps}>{Ic.map} Navigate</button>
            <button className="btn btn-xs" onClick={()=>setComm(true)} style={{background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",color:"var(--amber)"}}>{Ic.phone} Contact</button>
          </span>
        </div>
      </div>
      <div className="tabs">
        {PROJ_TABS.filter(t=>{
          if (t.key==="finance" && !canViewBudget) return false;
          if (t.key==="scope"  && !canViewBillingScope) return false;
          if (t.key==="shifts" && !canViewBudget) return false;
          if ((t.key==="drydox"||t.key==="contentsdox"||t.key==="estimatedox") && !canViewBudget) return false;
          return true;
        }).map(t=>(
          <button key={t.key} className={`tab${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>
            <span style={{opacity:.7}}>{t.icon}</span>{t.label}
            {t.key==="tasks"    && proj.tasksOpen>0 && <span className="mono" style={{fontSize:8,background:"var(--acc)",color:"#fff",borderRadius:9,padding:"1px 5px",marginLeft:2}}>{proj.tasksOpen}</span>}
            {t.key==="messages" && <span className="mono" style={{fontSize:8,background:"var(--acc)",color:"#fff",borderRadius:9,padding:"1px 5px",marginLeft:2}}>2</span>}
            {t.key==="shifts"   && myShifts.length>0 && <span className="mono" style={{fontSize:8,background:"var(--green)",color:"#fff",borderRadius:9,padding:"1px 5px",marginLeft:2}}>{myShifts.length} new</span>}
            {t.key==="scope"    && scopeItems.filter(i=>i.source).length>0 && (
              <span className="mono" style={{fontSize:8,background:"var(--blue)",color:"#fff",borderRadius:9,padding:"1px 5px",marginLeft:2}}>
                {scopeItems.filter(i=>i.source).length}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab==="overview"       && <OverviewTab    proj={proj} attrDefs={attrDefs} dailyNotes={dailyNotes} setDailyNotes={setDailyNotes} emailSchedule={emailSchedule} setEmailSchedule={setEmailSched} clientPortal={clientPortal} setClientPortal={setClientPortal} globalStaff={globalStaff} worktypes={worktypes} setWorktypes={setWorktypes} currentUser={currentUser} assignedStaff={assignedStaff} setAssignedStaff={setAssignedStaff}/>}
      {tab==="drydox"         && <DryDoxTab      proj={proj} priceLists={priceLists} onPushToScope={handlePushToScope}/>}
         {tab==="contentsdox"    && <ContentsDox proj={proj} companyId={companyId} db={db} onPushToScope={handlePushToScope}/>}
      {tab==="estimatedox"    && <EstimateDoxTab proj={proj}/>}
      {tab==="contacts"       && <ContactsTab contacts={contacts} setContacts={setContacts}/>}
      {tab==="media"          && <MediaTab       folders={mediaFolders} setFolders={setMediaFolders} uploads={mediaUploads} setUploads={setMediaUploads}/>}
      {tab==="documents"      && <ProjectDocumentsPanel proj={proj} contacts={contacts} assignedStaff={assignedStaff} onNavigate={onNavigate}/>}
      {tab==="tasks"          && <TasksTab projId={proj.id} projName={proj.name} initialTasks={proj.templateTasks||[]} globalStaff={globalStaff} companyId={companyId} phoneSettings={phoneSettings} currentMemberId={currentMemberId} isVendor={isVendor} currentUser={currentUser}/>}
      {tab==="finance"        && <FinancialTab proj={proj} companyId={companyId} laborCost={laborCost} invoices={loadProjInvoices(proj.id)} onInvoiceVoid={id=>{const all=loadAllInvoices().map(i=>i.id===id?{...i,status:"void"}:i);saveAllInvoices(all);}}/>}
      {tab==="shifts"         && <ShiftsTab projId={proj.id} externalShifts={myShifts} canViewRates={canViewRates}/>}
      {tab==="scope"          && <ScopeTab proj={proj} scopeItems={scopeItems} setScopeItems={setScopeItems} contacts={contacts}/>}
      {tab==="messages"       && <MessagesTab proj={proj} contacts={contacts}/>}
      {tab==="calls"          && <CallLogTab proj={proj} companyId={companyId} globalStaff={globalStaff} currentUser={currentUser} phoneSettings={phoneSettings}/>}
      {tab==="project-report" && <ProjectReportTab proj={proj} dailyNotes={dailyNotes} mediaFolders={mediaFolders} mediaUploads={mediaUploads} docs={projDocs}/>}
    </>
  );
}






function AdvToolsPanel({ onClose, priceLists, setPriceLists, companyId, globalStaff=[], projects=[] }) {
  const [showPLManager,    setShowPLManager]    = useState(false);
  const [showMsgCenter,    setShowMsgCenter]    = useState(false);
  const [showDocTemplates, setShowDocTemplates] = useState(false);
  const TOOLS = [
    { icon:Ic.msg,      label:"Message Center",       desc:"Company-wide calls, texts & emails", action:()=>setShowMsgCenter(true) },
    { icon:Ic.mindflow, label:"CortexAI",              desc:"AI-powered workflow generation", link:"/mindflow.html" },
    { icon:Ic.pricetag, label:"Price Lists",            desc:`${priceLists.length} lists · Manage equipment & material pricing`, action:()=>setShowPLManager(true) },
    { icon:Ic.doc,      label:"Document Templates",    desc:"Manage reusable contracts, authorizations & change orders", action:()=>setShowDocTemplates(true) },
    { icon:Ic.attr,     label:"Attribute Templates",   desc:"Configure custom project fields" },
    { icon:Ic.report,   label:"Reporting",              desc:"Advanced analytics & exports" },
  ];
  return (
    <>
      {showPLManager && (
        <PriceListManagerModal
          priceLists={priceLists}
          setPriceLists={setPriceLists}
          onClose={()=>setShowPLManager(false)}
        />
      )}
      {showMsgCenter && (
        <MessageCenter
          onClose={()=>setShowMsgCenter(false)}
          companyId={companyId}
          globalStaff={globalStaff}
          projects={projects}
        />
      )}
      {showDocTemplates && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowDocTemplates(false)}>
          <div style={{background:"var(--s1)",borderRadius:14,width:"min(760px,96vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <DocumentTemplateCenter onClose={()=>setShowDocTemplates(false)}/>
          </div>
        </div>
      )}
      <div style={{position:"fixed",inset:0,zIndex:300}} onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="tools-panel">
          <div style={{padding:"15px 16px 10px",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"var(--t1)"}}>Advanced Tools</div>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginTop:1}}>JOB-DOX PLATFORM</div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
            {TOOLS.map(tool=>(
              <button key={tool.label} className="tool-item"
                onClick={()=>{ if(tool.action){tool.action();}else if(tool.link){window.open(tool.link,"_blank");}else onClose(); }}>
                <div style={{width:32,height:32,borderRadius:8,background:"var(--acc-lo)",color:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{tool.icon}</div>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{tool.label}</div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{tool.desc}</div>
                </div>
                {tool.link && <div style={{fontSize:10,color:"var(--blue)",flexShrink:0}}>Open</div>}
                {tool.action && <div style={{fontSize:10,color:"var(--acc)",flexShrink:0}}>{Ic.chev_r}</div>}
              </button>
            ))}
          </div>
          <div style={{padding:"11px 14px",borderTop:"1px solid var(--br)",flexShrink:0,fontSize:10,color:"var(--t3)"}}>
            More tools coming soon. Configure in Settings › Roadmap.
          </div>
        </div>
      </div>
    </>
  );
}




function syncWorktypesToLS(projId, worktypes) {
  try {
    const existing = JSON.parse(localStorage.getItem("jd_cortex_worktypes") || "{}");
    existing[projId] = worktypes;
    localStorage.setItem("jd_cortex_worktypes", JSON.stringify(existing));
  } catch(_) {}
}

/* ── COLOR PALETTE for pickers ── */
const COLOR_SWATCHES = ["#e43531","#f97316","#e89c18","#10b981","#1ad98a","#3b82f6","#5ba3f5","#8b5cf6","#a78bfa","#ec4899","#f472b6","#22d3ee","#6b7280","#8b95b0"];

function ColorPicker({ value, onChange }) {
  return (
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
      {COLOR_SWATCHES.map(c=>(
        <button key={c} onClick={()=>onChange(c)} style={{width:18,height:18,borderRadius:"50%",background:c,border:value===c?"2px solid var(--t1)":"2px solid transparent",cursor:"pointer",flexShrink:0,outline:"none"}}/>
      ))}
      <input type="color" value={value} onChange={e=>onChange(e.target.value)}
        style={{width:18,height:18,border:"none",background:"none",cursor:"pointer",padding:0}}
        title="Custom color"/>
    </div>
  );
}

function GeneralSettingsTab() {
  const [sec, setSec]         = useState("company");
  const [coInfo, setCoInfo]   = useState(loadCoInfo);
  const [coSaved, setCoSaved] = useState(false);
  const [workTypes, setWT]    = useState(loadCWT);
  const [statuses,  setST]    = useState(loadCST);
  const [projTypes, setPT]    = useState(loadCPT);
  const [editId,    setEditId]= useState(null);

  const saveCompany = () => {
    saveCoInfo(coInfo);
    setCoSaved(true);
    setTimeout(() => setCoSaved(false), 2000);
  };
  const [draft,     setDraft] = useState({});
  const [newMode,   setNewMode]= useState(false);

  const save = (wt, st, pt) => {
    syncCompanyConfigToLS(wt, st, pt);
  };

  /* ── WORK TYPES ── */
  const saveWT = (list) => { setWT(list); save(list, statuses, projTypes); };
  const addWT  = () => {
    const n = { id:`wt-${Date.now()}`, name:"New Work Type", color:"#5ba3f5", hasWorkflow:false };
    const list = [...workTypes, n];
    saveWT(list);
    setEditId(n.id);
    setDraft({name:n.name, color:n.color, hasWorkflow:false});
    setNewMode(true);
  };
  const commitWT = (id) => {
    if (!draft.name?.trim()) return;
    saveWT(workTypes.map(w => w.id===id ? {...w,...draft} : w));
    setEditId(null); setDraft({}); setNewMode(false);
  };
  const deleteWT = (id) => saveWT(workTypes.filter(w=>w.id!==id));
  const toggleHasWorkflow = (id) => saveWT(workTypes.map(w=>w.id===id?{...w,hasWorkflow:!w.hasWorkflow}:w));

  /* ── STATUSES ── */
  const saveST = (list) => { setST(list); save(workTypes, list, projTypes); };
  const addST  = () => {
    const n = { id:`st-${Date.now()}`, name:"New Status", color:"#5ba3f5", triggerTask:"" };
    const list = [...statuses, n];
    saveST(list);
    setEditId(n.id);
    setDraft({name:n.name, color:n.color, triggerTask:""});
    setNewMode(true);
  };
  const commitST = (id) => {
    if (!draft.name?.trim()) return;
    saveST(statuses.map(s => s.id===id ? {...s,...draft} : s));
    setEditId(null); setDraft({}); setNewMode(false);
  };
  const deleteST = (id) => saveST(statuses.filter(s=>s.id!==id));

  /* ── PROJECT TYPES ── */
  const savePT = (list) => { setPT(list); save(workTypes, statuses, list); };
  const addPT  = () => {
    const n = { id:`pt-${Date.now()}`, name:"New Project Type", color:"#5ba3f5" };
    const list = [...projTypes, n];
    savePT(list);
    setEditId(n.id);
    setDraft({name:n.name, color:n.color});
    setNewMode(true);
  };
  const commitPT = (id) => {
    if (!draft.name?.trim()) return;
    savePT(projTypes.map(p => p.id===id ? {...p,...draft} : p));
    setEditId(null); setDraft({}); setNewMode(false);
  };
  const deletePT = (id) => savePT(projTypes.filter(p=>p.id!==id));

  const [billingCfg, setBillingCfg] = useState(loadBilling);
  const [billingSaved, setBillingSaved] = useState(false);

  const saveBillingSettings = () => {
    saveBilling(billingCfg);
    setBillingSaved(true);
    setTimeout(()=>setBillingSaved(false), 2000);
  };

  const addTaxRate = () => {
    const n = { id:`tx-${Date.now()}`, name:"New Rate", rate:0 };
    setBillingCfg(b=>({...b, taxRates:[...(b.taxRates||[]),n]}));
  };
  const updTax = (id, k, v) => setBillingCfg(b=>({...b, taxRates:(b.taxRates||[]).map(t=>t.id===id?{...t,[k]:v}:t)}));
  const delTax = (id)       => setBillingCfg(b=>({...b, taxRates:(b.taxRates||[]).filter(t=>t.id!==id)}));

  const addPinnedItem = (wt) => {
    const curr = billingCfg.pinnedItems?.[wt] || [];
    setBillingCfg(b=>({...b, pinnedItems:{...(b.pinnedItems||{}),[wt]:[...curr,{id:`pi-${Date.now()}`,desc:"",unit:"SF",price:0}]}}));
  };
  const updPinnedItem = (wt, id, k, v) => {
    setBillingCfg(b=>({...b, pinnedItems:{...(b.pinnedItems||{}),[wt]:(b.pinnedItems?.[wt]||[]).map(pi=>pi.id===id?{...pi,[k]:v}:pi)}}));
  };
  const delPinnedItem = (wt, id) => {
    setBillingCfg(b=>({...b, pinnedItems:{...(b.pinnedItems||{}),[wt]:(b.pinnedItems?.[wt]||[]).filter(pi=>pi.id!==id)}}));
  };

  /* ── BUDGET CATEGORY TEMPLATES ── */
  const [budgetTpls,  setBudgetTpls]  = useState(loadBudgetTemplates);
  const [budgetSaved, setBudgetSaved] = useState(false);
  const saveBudgetTpls = () => { saveBudgetTemplates(budgetTpls); setBudgetSaved(true); setTimeout(()=>setBudgetSaved(false),2000); };
  const addBudgetCat = () => {
    const n = { id:`bc-${Date.now()}`, name:"New Category", color:"#5ba3f5", workTypes:[], active:true };
    setBudgetTpls(t=>[...t,n]);
  };
  const updBudgetCat = (id, k, v) => setBudgetTpls(t=>t.map(c=>c.id===id?{...c,[k]:v}:c));
  const delBudgetCat = (id) => setBudgetTpls(t=>t.filter(c=>c.id!==id));
  const toggleBudgetCatWT = (id, wt) => setBudgetTpls(t=>t.map(c=>{
    if (c.id!==id) return c;
    const has = (c.workTypes||[]).includes(wt);
    return {...c, workTypes: has ? c.workTypes.filter(w=>w!==wt) : [...(c.workTypes||[]),wt]};
  }));
  const moveBudgetCat = (id, dir) => setBudgetTpls(t=>{
    const i = t.findIndex(c=>c.id===id);
    if (i<0) return t;
    const j = i+dir;
    if (j<0||j>=t.length) return t;
    const n=[...t]; [n[i],n[j]]=[n[j],n[i]]; return n;
  });
  const resetBudgetDefaults = () => { if(window.confirm("Reset to default categories? Custom changes will be lost.")) setBudgetTpls(DEFAULT_BUDGET_TEMPLATES); };

  const SECTIONS = [
    {id:"company",    label:"Company Info"},
    {id:"billing",    label:"Billing"},
    {id:"budget",     label:"Budget Categories"},
    {id:"worktypes",  label:"Work Types"},
    {id:"statuses",   label:"Statuses"},
    {id:"projtypes",  label:"Project Types"},
  ];

  const cancelEdit = () => {
    if (newMode) {
      // Remove the unsaved new item
      if (sec==="worktypes") saveWT(workTypes.filter(w=>w.id!==editId));
      else if (sec==="statuses") saveST(statuses.filter(s=>s.id!==editId));
      else if (sec==="projtypes") savePT(projTypes.filter(p=>p.id!==editId));
    }
    setEditId(null); setDraft({}); setNewMode(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Section tabs */}
      <div style={{display:"flex",gap:4,borderBottom:"1px solid var(--br)",paddingBottom:0}}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>{setSec(s.id);setEditId(null);setDraft({});setNewMode(false);}}
            style={{padding:"8px 14px",background:"none",border:"none",borderBottom:`2px solid ${sec===s.id?"var(--blue)":"transparent"}`,
              fontSize:12,fontWeight:sec===s.id?700:500,color:sec===s.id?"var(--t1)":"var(--t2)",cursor:"pointer",transition:"all .12s",fontFamily:"var(--font)"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── COMPANY INFO ── */}
      {sec==="company" && (
        <div className="card" style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Company Information</div>
          <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>Used in documents, reports, and AI templates as <code style={{fontFamily:"var(--mono)",fontSize:10}}>{"{{company.*}}"}</code> tokens.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              ["Company Name","name","full"],
              ["Phone","phone",""],
              ["Email","email",""],
              ["Website","website",""],
              ["Address","address",""],
              ["City","city",""],
              ["State","state",""],
              ["ZIP","zip",""],
            ].map(([label, key, span]) => (
              <div key={key} style={{gridColumn: span==="full"?"1/-1":"auto"}}>
                <div style={{fontSize:11,color:"var(--t3)",marginBottom:3}}>{label}</div>
                <input className="inp" value={coInfo[key]||""} onChange={e=>setCoInfo(c=>({...c,[key]:e.target.value}))}
                  style={{width:"100%",fontSize:13}}/>
              </div>
            ))}
          </div>
          <LogoUploadSection coInfo={coInfo} setCoInfo={setCoInfo} />
          <button className="btn btn-p btn-sm" style={{marginTop:16}} onClick={saveCompany}>
            {coSaved ? "✓ Saved" : "Save Company Info"}
          </button>
        </div>
      )}

      {/* ── BILLING ── */}
      {sec==="billing" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Tax Rates */}
          <div className="card" style={{padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>Tax Rates</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Define available tax rates. Select per-invoice in the Scope/Invoice tab.</div>
              </div>
              <button className="btn btn-primary btn-xs" onClick={addTaxRate}>{Ic.plus} Add Rate</button>
            </div>
            {(billingCfg.taxRates||[]).map(t=>(
              <div key={t.id} style={{display:"grid",gridTemplateColumns:"1fr 120px 28px",gap:8,marginBottom:7,alignItems:"center"}}>
                <input className="inp" value={t.name||""} onChange={e=>updTax(t.id,"name",e.target.value)} placeholder="Tax name" style={{fontSize:11}}/>
                <div style={{position:"relative"}}>
                  <input type="number" className="inp" value={t.rate||""} step=".01" onChange={e=>updTax(t.id,"rate",parseFloat(e.target.value)||0)} style={{fontSize:11,paddingRight:24}}/>
                  <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--t3)"}}>%</span>
                </div>
                <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}} onClick={()=>delTax(t.id)}>{Ic.close}</button>
              </div>
            ))}
          </div>

          {/* Defaults */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:10}}>Invoice Defaults</div>
            <div className="g2" style={{gap:10,marginBottom:12}}>
              <div>
                <label className="lbl">Default Overhead / Profit %</label>
                <div style={{position:"relative"}}>
                  <input type="number" className="inp" value={billingCfg.defaultOverhead||0} step=".5"
                    onChange={e=>setBillingCfg(b=>({...b,defaultOverhead:parseFloat(e.target.value)||0}))} style={{paddingRight:24}}/>
                  <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--t3)"}}>%</span>
                </div>
              </div>
              <div>
                <label className="lbl">Default Tax Rate</label>
                <select className="sel" value={billingCfg.defaultTaxId||""} onChange={e=>setBillingCfg(b=>({...b,defaultTaxId:e.target.value}))}>
                  {(billingCfg.taxRates||[]).map(t=><option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="lbl">Default Terms &amp; Conditions</label>
              <textarea className="txa" value={billingCfg.terms||""} onChange={e=>setBillingCfg(b=>({...b,terms:e.target.value}))} style={{minHeight:88,fontSize:10,lineHeight:1.75,color:"var(--t2)"}}/>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>These terms appear on every invoice by default. You can edit per-invoice in the Scope tab.</div>
            </div>
          </div>

          {/* Pinned Line Items */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Pinned Line Items by Work Type</div>
            <div style={{fontSize:11,color:"var(--t3)",marginBottom:14,lineHeight:1.6}}>
              Line items pinned here will appear as quick-add options in the Scope/Invoice tab for projects matching that work type.
            </div>
            {workTypes.length===0 && <div style={{fontSize:11,color:"var(--t3)"}}>No work types defined yet. Add them in the Work Types tab first.</div>}
            {workTypes.map(wt=>{
              const pinned = billingCfg.pinnedItems?.[wt.name] || [];
              return (
                <div key={wt.id} style={{marginBottom:16,borderRadius:9,border:"1px solid var(--br)",overflow:"hidden"}}>
                  <div style={{background:"var(--s3)",padding:"8px 13px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:wt.color,flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{wt.name}</span>
                      <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>{pinned.length} items</span>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={()=>addPinnedItem(wt.name)}>{Ic.plus} Add Item</button>
                  </div>
                  {pinned.length===0 && <div style={{padding:"12px 14px",fontSize:11,color:"var(--t3)"}}>No pinned items — click Add Item above.</div>}
                  {pinned.map(pi=>(
                    <div key={pi.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:7,padding:"7px 13px",borderTop:"1px solid var(--br)",alignItems:"center"}}>
                      <input className="inp" value={pi.desc||""} onChange={e=>updPinnedItem(wt.name,pi.id,"desc",e.target.value)} placeholder="Description" style={{fontSize:11}}/>
                      <select className="sel" value={pi.unit||"SF"} onChange={e=>updPinnedItem(wt.name,pi.id,"unit",e.target.value)} style={{fontSize:11}}>
                        {["SF","LF","EA","HR","MO","LS","day"].map(u=><option key={u}>{u}</option>)}
                      </select>
                      <div style={{position:"relative"}}>
                        <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",fontSize:11}}>$</span>
                        <input type="number" className="inp" value={pi.price||""} onChange={e=>updPinnedItem(wt.name,pi.id,"price",parseFloat(e.target.value)||0)} style={{fontSize:11,paddingLeft:16}}/>
                      </div>
                      <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}} onClick={()=>delPinnedItem(wt.name,pi.id)}>{Ic.close}</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary" onClick={saveBillingSettings}>
            {billingSaved?"✓ Saved":"Save Billing Settings"}
          </button>
        </div>
      )}

      {/* ── BUDGET CATEGORIES ── */}
      {sec==="budget" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="card" style={{padding:18}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>Budget Category Templates</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:3,lineHeight:1.65,maxWidth:560}}>
                  Define reusable budget categories for tracking project costs. In the Finance tab, you can
                  apply these to a project or import them directly from an Xactimate PDF. Set which Work Types
                  each category applies to (leave blank = applies to all projects).
                </div>
              </div>
              <button className="btn btn-primary btn-xs" onClick={addBudgetCat}>{Ic.plus} Add Category</button>
            </div>

            {/* Column headers */}
            <div style={{display:"grid",gridTemplateColumns:"18px 1fr 160px 56px 36px 36px",gap:8,
              padding:"4px 10px",marginBottom:4}}>
              {["","Category Name","Applies to Work Types","Active","",""].map((h,i)=>(
                <div key={i} style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{h}</div>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {budgetTpls.map((cat, idx) => (
                <div key={cat.id} style={{display:"grid",gridTemplateColumns:"18px 1fr 160px 56px 36px 36px",
                  gap:8,padding:"8px 10px",background:"var(--s2)",borderRadius:8,border:"1px solid var(--br)",alignItems:"center"}}>
                  {/* Color picker */}
                  <input type="color" value={cat.color} onChange={e=>updBudgetCat(cat.id,"color",e.target.value)}
                    style={{width:18,height:18,border:"none",borderRadius:4,cursor:"pointer",padding:0,background:"none"}}/>
                  {/* Name */}
                  <input className="inp" value={cat.name} style={{fontSize:12,height:28}}
                    onChange={e=>updBudgetCat(cat.id,"name",e.target.value)}/>
                  {/* Work type multi-select pills */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {workTypes.length===0 && <span style={{fontSize:9,color:"var(--t3)"}}>All projects</span>}
                    {workTypes.map(wt=>{
                      const on = (cat.workTypes||[]).includes(wt.name);
                      return (
                        <button key={wt.id} onClick={()=>toggleBudgetCatWT(cat.id,wt.name)}
                          style={{padding:"1px 6px",fontSize:9,borderRadius:4,cursor:"pointer",
                            background: on?`${wt.color}25`:"var(--s3)",
                            border: on?`1.5px solid ${wt.color}`:"1px solid var(--br)",
                            color: on?wt.color:"var(--t3)",fontWeight:on?700:400,transition:"all .1s"}}>
                          {wt.name}
                        </button>
                      );
                    })}
                    {(cat.workTypes||[]).length===0 && workTypes.length>0 && (
                      <span style={{fontSize:9,color:"var(--t3)",alignSelf:"center"}}>All</span>
                    )}
                  </div>
                  {/* Active toggle */}
                  <div style={{display:"flex",justifyContent:"center"}}>
                    <input type="checkbox" checked={!!cat.active} onChange={e=>updBudgetCat(cat.id,"active",e.target.checked)}
                      style={{width:14,height:14,accentColor:"var(--blue)",cursor:"pointer"}}/>
                  </div>
                  {/* Move up/down */}
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    <button className="btn btn-ghost btn-xs" disabled={idx===0}
                      style={{padding:"1px 5px",fontSize:9,lineHeight:1}}
                      onClick={()=>moveBudgetCat(cat.id,-1)}>▲</button>
                    <button className="btn btn-ghost btn-xs" disabled={idx===budgetTpls.length-1}
                      style={{padding:"1px 5px",fontSize:9,lineHeight:1}}
                      onClick={()=>moveBudgetCat(cat.id,1)}>▼</button>
                  </div>
                  {/* Delete */}
                  <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}}
                    onClick={()=>delBudgetCat(cat.id)}>{Ic.close}</button>
                </div>
              ))}
            </div>

            {budgetTpls.length===0 && (
              <div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSize:12}}>
                No categories defined. Click "Add Category" or{" "}
                <button onClick={resetBudgetDefaults}
                  style={{background:"none",border:"none",color:"var(--blue)",cursor:"pointer",fontSize:12,textDecoration:"underline"}}>
                  load defaults
                </button>.
              </div>
            )}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,color:"var(--t3)"}} onClick={resetBudgetDefaults}>
              ↺ Reset to Defaults
            </button>
            <button className="btn btn-primary" onClick={saveBudgetTpls}>
              {budgetSaved?"✓ Saved":"Save Budget Categories"}
            </button>
          </div>
        </div>
      )}

      {/* ── WORK TYPES ── */}
      {sec==="worktypes" && (
        <div className="card" style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>Work Types</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Define the service lines your company performs. Mark which have built-out workflows in CortexAI.</div>
            </div>
            <button className="btn btn-primary btn-xs" onClick={addWT}>{Ic.plus} Add Work Type</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {workTypes.map(wt=>(
              <div key={wt.id} style={{borderRadius:9,border:`1.5px solid ${editId===wt.id?"var(--blue)":"var(--br)"}`,background:editId===wt.id?"var(--s3)":"var(--s2)",overflow:"hidden"}}>
                {editId===wt.id ? (
                  <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",gap:10}}>
                      <div style={{flex:1}}>
                        <div className="lbl">Name</div>
                        <input className="inp" value={draft.name||""} onChange={e=>setDraft(p=>({...p,name:e.target.value}))} autoFocus/>
                      </div>
                    </div>
                    <div>
                      <div className="lbl">Color</div>
                      <ColorPicker value={draft.color||"#5ba3f5"} onChange={c=>setDraft(p=>({...p,color:c}))}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={()=>setDraft(p=>({...p,hasWorkflow:!p.hasWorkflow}))}
                        style={{width:32,height:17,borderRadius:9,border:"none",cursor:"pointer",
                          background:draft.hasWorkflow?"var(--green)":"var(--s4)",transition:"background .2s",position:"relative",padding:0}}>
                        <span style={{position:"absolute",top:1.5,left:draft.hasWorkflow?16:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                      </button>
                      <span style={{fontSize:11,color:draft.hasWorkflow?"var(--green)":"var(--t2)"}}>
                        {draft.hasWorkflow ? "Workflow built in CortexAI" : "No workflow yet — mark when ready"}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      <button className="btn btn-primary btn-xs" onClick={()=>commitWT(wt.id)}>Save</button>
                      <button className="btn btn-ghost btn-xs" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:wt.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{wt.name}</span>
                      {!wt.hasWorkflow && <span style={{marginLeft:8,fontSize:9,color:"var(--amber)",fontFamily:"var(--mono)",background:"rgba(232,156,24,.12)",padding:"1px 6px",borderRadius:4}}>NO WORKFLOW</span>}
                      {wt.hasWorkflow  && <span style={{marginLeft:8,fontSize:9,color:"var(--green)",fontFamily:"var(--mono)",background:"rgba(26,217,138,.12)",padding:"1px 6px",borderRadius:4}}>WORKFLOW READY</span>}
                    </div>
                    <button className="btn btn-ghost btn-xs" style={{padding:"2px 8px"}} onClick={()=>{setEditId(wt.id);setDraft({name:wt.name,color:wt.color,hasWorkflow:wt.hasWorkflow});setNewMode(false);}}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{padding:"2px 8px",color:"var(--acc)"}} onClick={()=>deleteWT(wt.id)}>{Ic.close}</button>
                  </div>
                )}
              </div>
            ))}
            {workTypes.length===0 && <div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSize:12}}>No work types yet. Add one to get started.</div>}
          </div>
          <div style={{marginTop:12,padding:"8px 11px",background:"rgba(91,163,245,.07)",border:"1px solid rgba(91,163,245,.2)",borderRadius:7,fontSize:10,color:"var(--blue)"}}>
            Work types sync to <strong>CortexAI</strong> automatically. Types marked <strong>NO WORKFLOW</strong> will be flagged in mindflow so you know to build one.
          </div>
        </div>
      )}

      {/* ── STATUSES ── */}
      {sec==="statuses" && (
        <div className="card" style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>Project Statuses</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Define your project lifecycle stages. Set trigger keywords to auto-advance status when matching tasks are completed.</div>
            </div>
            <button className="btn btn-primary btn-xs" onClick={addST}>{Ic.plus} Add Status</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {statuses.map(st=>(
              <div key={st.id} style={{borderRadius:9,border:`1.5px solid ${editId===st.id?"var(--blue)":"var(--br)"}`,background:editId===st.id?"var(--s3)":"var(--s2)",overflow:"hidden"}}>
                {editId===st.id ? (
                  <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",gap:10}}>
                      <div style={{flex:1}}>
                        <div className="lbl">Status Name</div>
                        <input className="inp" value={draft.name||""} onChange={e=>setDraft(p=>({...p,name:e.target.value}))} autoFocus/>
                      </div>
                    </div>
                    <div>
                      <div className="lbl">Color</div>
                      <ColorPicker value={draft.color||"#5ba3f5"} onChange={c=>setDraft(p=>({...p,color:c}))}/>
                    </div>
                    <div>
                      <div className="lbl">Auto-Trigger Keyword</div>
                      <input className="inp" value={draft.triggerTask||""} onChange={e=>setDraft(p=>({...p,triggerTask:e.target.value}))}
                        placeholder='e.g. "contract signed" — auto-moves to this status when task with this keyword is completed'/>
                      <div style={{fontSize:10,color:"var(--t3)",marginTop:4,lineHeight:1.5}}>
                        When a task title contains this text and is marked complete, the project automatically moves to <strong style={{color:"var(--t1)"}}>{draft.name||"this status"}</strong>.
                      </div>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      <button className="btn btn-primary btn-xs" onClick={()=>commitST(st.id)}>Save</button>
                      <button className="btn btn-ghost btn-xs" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:st.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{st.name}</span>
                      {st.triggerTask && <span style={{marginLeft:8,fontSize:9,color:"var(--purple)",fontFamily:"var(--mono)",background:"rgba(167,139,250,.12)",padding:"1px 6px",borderRadius:4}}>TRIGGER: "{st.triggerTask}"</span>}
                    </div>
                    <button className="btn btn-ghost btn-xs" style={{padding:"2px 8px"}} onClick={()=>{setEditId(st.id);setDraft({name:st.name,color:st.color,triggerTask:st.triggerTask||""});setNewMode(false);}}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{padding:"2px 8px",color:"var(--acc)"}} onClick={()=>deleteST(st.id)}>{Ic.close}</button>
                  </div>
                )}
              </div>
            ))}
            {statuses.length===0 && <div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSize:12}}>No statuses yet.</div>}
          </div>
          <div style={{marginTop:12,padding:"8px 11px",background:"rgba(167,139,250,.07)",border:"1px solid rgba(167,139,250,.2)",borderRadius:7,fontSize:10,color:"var(--purple)"}}>
            <strong>How triggers work:</strong> When a task containing your keyword is marked complete in any project, Job-Dox checks if the project should advance to this status. Example: completing "Contract Signed" moves the project from "New Lead" to "In Progress".
          </div>
        </div>
      )}

      {/* ── PROJECT TYPES ── */}
      {sec==="projtypes" && (
        <div className="card" style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>Project Types</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>The loss/job types that appear in the New Project dropdown and portfolio filters.</div>
            </div>
            <button className="btn btn-primary btn-xs" onClick={addPT}>{Ic.plus} Add Type</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {projTypes.map(pt=>(
              <div key={pt.id} style={{borderRadius:9,border:`1.5px solid ${editId===pt.id?"var(--blue)":"var(--br)"}`,background:editId===pt.id?"var(--s3)":"var(--s2)",overflow:"hidden"}}>
                {editId===pt.id ? (
                  <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{flex:1}}>
                      <div className="lbl">Type Name</div>
                      <input className="inp" value={draft.name||""} onChange={e=>setDraft(p=>({...p,name:e.target.value}))} autoFocus/>
                    </div>
                    <div>
                      <div className="lbl">Color</div>
                      <ColorPicker value={draft.color||"#5ba3f5"} onChange={c=>setDraft(p=>({...p,color:c}))}/>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      <button className="btn btn-primary btn-xs" onClick={()=>commitPT(pt.id)}>Save</button>
                      <button className="btn btn-ghost btn-xs" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:pt.color,flexShrink:0}}/>
                    <div style={{flex:1,fontSize:12,fontWeight:600,color:"var(--t1)"}}>{pt.name}</div>
                    <button className="btn btn-ghost btn-xs" style={{padding:"2px 8px"}} onClick={()=>{setEditId(pt.id);setDraft({name:pt.name,color:pt.color});setNewMode(false);}}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{padding:"2px 8px",color:"var(--acc)"}} onClick={()=>deletePT(pt.id)}>{Ic.close}</button>
                  </div>
                )}
              </div>
            ))}
            {projTypes.length===0 && <div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSize:12}}>No project types yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CALL LOG TAB  — shows all calls linked to a project, with playback
══════════════════════════════════════════════════════════════════ */
function CallLogTab({ proj, companyId, globalStaff=[], currentUser, phoneSettings={} }) {
  const [calls,    setCalls]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [calling,  setCalling]  = useState(false);
  const [callErr,  setCallErr]  = useState("");
  const [playing,  setPlaying]  = useState(null);   // recordingUrl currently playing
  const audioRef   = useRef(null);

  // ── Stream calls for this project ──
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const q = query(
      collection(db, `companies/${companyId}/calls`),
      where("projectId", "==", proj.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setCalls(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [companyId, proj.id]);

  const fmtDur = s => {
    if (!s) return "--";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2,"0")}`;
  };
  const fmtTs = ts => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " " +
           d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  };

  // ── Outbound call: staff clicks to call client ──
  const doCall = async () => {
    const staffRecord = globalStaff.find(s =>
      `${s.firstName||""} ${s.lastName||""}`.trim() === currentUser?.name
    );
    if (!staffRecord?.phone) { setCallErr("Your staff profile has no phone number. Add it in Settings → Staff."); return; }
    if (!proj.clientPhone)    { setCallErr("This project has no client phone number."); return; }
    if (!phoneSettings.twilioNumber) { setCallErr("No Twilio number configured. Set it in Settings → Phone & Calls."); return; }

    setCalling(true); setCallErr("");
    try {
      await initiateCall({
        staffPhone:    staffRecord.phone,
        clientPhone:   proj.clientPhone,
        clientName:    proj.client || proj.clientPhone,
        staffName:     currentUser?.name || "Staff",
        companyId,
        projectId:     proj.id,
        twilioNumber:  phoneSettings.twilioNumber,
      });
    } catch (e) {
      setCallErr(e?.message || "Call failed.");
    } finally {
      setCalling(false);
    }
  };

  const togglePlay = (url) => {
    if (playing === url) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      setPlaying(url);
    }
  };

  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.src = playing;
      audioRef.current.play().catch(() => {});
    }
  }, [playing]);

  const statusColor = { completed:"var(--green)", "no-answer":"var(--amber)", busy:"var(--amber)", failed:"var(--acc)", connecting:"var(--blue)", ringing:"var(--blue)" };

  return (
    <div>
      {/* Hidden audio element for recording playback */}
      <audio ref={audioRef} onEnded={() => setPlaying(null)} style={{display:"none"}}/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Call Log</div>
          <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>All calls linked to this project</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {callErr && <span style={{fontSize:11,color:"var(--acc)",maxWidth:220}}>{callErr}</span>}
          <button className="btn btn-green" onClick={doCall} disabled={calling}
            style={{gap:6,fontSize:12}}>
            {calling
              ? <><span style={{width:11,height:11,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"jd-spin .7s linear infinite",display:"inline-block"}}/> Calling…</>
              : <>{Ic.call_out} Call {proj.client||"Client"}</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{padding:"32px 0",textAlign:"center",color:"var(--t3)",fontSize:12}}>Loading calls…</div>
      ) : calls.length === 0 ? (
        <div className="card" style={{padding:28,textAlign:"center",color:"var(--t3)"}}>
          <div style={{fontSize:28,marginBottom:8,opacity:.4}}>📞</div>
          <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:4}}>No calls yet</div>
          <div style={{fontSize:11}}>Use the button above to call {proj.client||"the client"} from this project.</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {calls.map(call => (
            <div key={call.id} className="card" style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
              {/* Direction icon */}
              <div style={{
                width:34,height:34,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                background: call.type==="inbound" ? "rgba(91,163,245,.1)" : "rgba(26,217,138,.1)",
                color:      call.type==="inbound" ? "var(--blue)" : "var(--green)",
              }}>
                {call.type === "inbound" ? Ic.call_in : Ic.call_out}
              </div>

              {/* Call info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,fontSize:13,color:"var(--t1)"}}>
                    {call.type === "inbound" ? (call.clientName||call.clientPhone) : (call.clientName||call.clientPhone)}
                  </span>
                  <span style={{
                    fontSize:9,fontWeight:700,fontFamily:"var(--mono)",letterSpacing:".5px",
                    padding:"2px 6px",borderRadius:4,
                    color: statusColor[call.status] || "var(--t3)",
                    background: `color-mix(in srgb, ${statusColor[call.status]||"var(--t3)"} 12%, transparent)`,
                  }}>{(call.status||"").toUpperCase()}</span>
                  {call.type === "inbound" && call.callGroupName && (
                    <span style={{fontSize:10,color:"var(--t3)"}}>→ {call.callGroupName}</span>
                  )}
                </div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                  {call.staffName && <span>{call.staffName}</span>}
                  <span>{fmtTs(call.createdAt)}</span>
                  {call.duration > 0 && <span>{fmtDur(call.duration)}</span>}
                </div>
              </div>

              {/* Recording playback */}
              {call.recordingUrl ? (
                <button className="btn btn-ghost btn-xs" onClick={() => togglePlay(call.recordingUrl)}
                  style={{gap:5,fontSize:11,flexShrink:0}}>
                  {playing === call.recordingUrl ? Ic.pause : Ic.play}
                  {playing === call.recordingUrl ? "Pause" : "Play"}
                </button>
              ) : (
                call.status === "completed" && (
                  <span style={{fontSize:10,color:"var(--t3)",fontStyle:"italic"}}>Processing…</span>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PHONE SETTINGS TAB  — disclosure message + call groups
══════════════════════════════════════════════════════════════════ */
function PhoneSettingsTab({ companyId, globalStaff=[], permLevel=1 }) {
  const isAdmin = permLevel >= 8;

  // ── Load existing phone settings from Firestore ──
  const [settings,  setSettings]  = useState(null);  // null = loading
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveErr,   setSaveErr]   = useState("");

  // Form state
  const [twilioNum,     setTwilioNum]     = useState("");
  const [disclosure,    setDisclosure]    = useState("Thank you for calling. This call may be recorded for quality and training purposes.");
  const [callGroups,    setCallGroups]    = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // New group form
  const [addingGroup,   setAddingGroup]   = useState(false);
  const [groupName,     setGroupName]     = useState("");
  const [groupMembers,  setGroupMembers]  = useState([]);
  const [editGroupId,   setEditGroupId]   = useState(null);

  useEffect(() => {
    if (!companyId) return;
    getDoc(doc(db, `companies/${companyId}/settings/phone`)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setTwilioNum(d.twilioNumber || "");
        setDisclosure(d.disclosureMessage || disclosure);
        setCallGroups(d.callGroups || []);
        setActiveGroupId(d.activeCallGroupId || null);
      }
      setSettings(snap.exists() ? snap.data() : {});
    }).catch(() => setSettings({}));
  }, [companyId]);

  const doSave = async () => {
    if (!companyId) return;
    setSaving(true); setSaveErr(""); setSaved(false);
    try {
      await savePhoneSettings({ companyId, twilioNumber: twilioNum, disclosureMessage: disclosure, callGroups, activeCallGroupId: activeGroupId });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const openAddGroup = () => { setGroupName(""); setGroupMembers([]); setEditGroupId(null); setAddingGroup(true); };
  const openEditGroup = g => { setGroupName(g.name); setGroupMembers(g.memberIds||[]); setEditGroupId(g.id); setAddingGroup(true); };
  const saveGroup = () => {
    if (!groupName.trim()) return;
    const newGroup = { id: editGroupId || `grp-${Date.now()}`, name: groupName.trim(), memberIds: groupMembers };
    setCallGroups(prev => editGroupId ? prev.map(g => g.id === editGroupId ? newGroup : g) : [...prev, newGroup]);
    if (!activeGroupId && !editGroupId) setActiveGroupId(newGroup.id);
    setAddingGroup(false);
  };
  const deleteGroup = id => {
    setCallGroups(prev => prev.filter(g => g.id !== id));
    if (activeGroupId === id) setActiveGroupId(null);
  };
  const toggleMember = id => setGroupMembers(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  const staffList = globalStaff.filter(s => s.firstName || s.lastName);

  if (settings === null) return <div style={{padding:"32px 0",textAlign:"center",color:"var(--t3)",fontSize:12}}>Loading…</div>;
  if (!isAdmin) return (
    <div className="card" style={{padding:28,textAlign:"center",color:"var(--t3)"}}>
      <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>Access Restricted</div>
      <div style={{fontSize:11}}>Level 8 or higher required to configure Phone & Calls.</div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* ── Twilio number ── */}
      <div className="card" style={{padding:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Twilio Phone Number</div>
        <div style={{fontSize:11,color:"var(--t3)",marginBottom:12}}>
          Your company's dedicated Twilio number. Customers call this number; outbound calls show this as the caller ID.
          Get this from your Twilio dashboard → Phone Numbers.
        </div>
        <input className="inp" placeholder="+19185551234" value={twilioNum}
          onChange={e => setTwilioNum(e.target.value)}
          style={{maxWidth:240,fontFamily:"var(--mono)",fontSize:13}}/>
        <div style={{fontSize:10,color:"var(--t3)",marginTop:6}}>
          After saving, configure your Twilio number's inbound webhook to:<br/>
          <code style={{fontFamily:"var(--mono)",color:"var(--blue)",fontSize:10}}>
            https://[region]-[project].cloudfunctions.net/handleInboundCall
          </code>
        </div>
      </div>

      {/* ── Recording disclosure ── */}
      <div className="card" style={{padding:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Call Recording Disclosure</div>
        <div style={{fontSize:11,color:"var(--t3)",marginBottom:12}}>
          This message is read aloud to the caller before connecting. Required for recording compliance.
          You're in a one-party consent state, but this keeps you protected and professional.
        </div>
        <textarea className="txa" value={disclosure} onChange={e => setDisclosure(e.target.value)}
          style={{minHeight:64,fontSize:13}}/>
        <div style={{fontSize:10,color:"var(--t3)",marginTop:5}}>
          Twilio reads this with Alice (a natural-sounding voice). Keep it under 25 words for best results.
        </div>
      </div>

      {/* ── Call groups ── */}
      <div className="card" style={{padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>Call Groups</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>
              When someone calls your number, everyone in the active group is rung simultaneously.
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={openAddGroup} style={{gap:5}}>
            {Ic.plus} Add Group
          </button>
        </div>

        {/* Group list */}
        {callGroups.length === 0 && !addingGroup && (
          <div style={{padding:"16px 0",textAlign:"center",color:"var(--t3)",fontSize:11}}>
            No call groups yet. Add one to enable simultaneous ringing.
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
          {callGroups.map(g => {
            const members = staffList.filter(s => g.memberIds?.includes(s.id));
            const isActive = activeGroupId === g.id;
            return (
              <div key={g.id} style={{
                border:`1px solid ${isActive?"var(--acc)":"var(--br)"}`,
                borderRadius:8,padding:"10px 13px",
                background: isActive ? "rgba(228,53,49,.04)" : "var(--s2)",
                display:"flex",alignItems:"center",gap:10,
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>{g.name}</span>
                    {isActive && <span style={{fontSize:9,fontFamily:"var(--mono)",background:"var(--acc)",color:"#fff",padding:"1px 6px",borderRadius:4}}>ACTIVE</span>}
                  </div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
                    {members.length === 0
                      ? <span style={{fontSize:10,color:"var(--t3)"}}>No members</span>
                      : members.map(s => (
                          <span key={s.id} style={{
                            fontSize:10,background:"var(--s3)",border:"1px solid var(--br)",
                            borderRadius:12,padding:"2px 8px",color:"var(--t2)",display:"flex",alignItems:"center",gap:4,
                          }}>
                            <Av name={`${s.firstName||""} ${s.lastName||""}`.trim()} size={14} color={s.color||"var(--acc)"}/>
                            {s.firstName} {s.lastName}
                          </span>
                        ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  {!isActive && (
                    <button className="btn btn-ghost btn-xs" onClick={() => setActiveGroupId(g.id)} style={{fontSize:10}}>
                      Set Active
                    </button>
                  )}
                  <button className="btn btn-ghost btn-xs" onClick={() => openEditGroup(g)} style={{fontSize:11}}>{Ic.tools}</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => deleteGroup(g.id)} style={{color:"var(--acc)",fontSize:11}}>{Ic.trash}</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline add/edit group form */}
        {addingGroup && (
          <div style={{marginTop:12,border:"1px solid var(--br)",borderRadius:8,padding:14,background:"var(--s2)"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:10}}>
              {editGroupId ? "Edit Group" : "New Call Group"}
            </div>
            <input className="inp" placeholder="Group name (e.g. After-Hours Team)"
              value={groupName} onChange={e => setGroupName(e.target.value)}
              style={{marginBottom:10}}/>
            <div style={{fontSize:11,color:"var(--t2)",marginBottom:8,fontWeight:600}}>Members (all will ring simultaneously)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:6,marginBottom:12}}>
              {staffList.map(s => {
                const name = `${s.firstName||""} ${s.lastName||""}`.trim();
                const on   = groupMembers.includes(s.id);
                return (
                  <div key={s.id} onClick={() => toggleMember(s.id)} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:7,
                    border:`1px solid ${on?"var(--acc)":"var(--br)"}`,
                    background: on ? "rgba(228,53,49,.06)" : "var(--s3)",
                    cursor:"pointer",userSelect:"none",
                  }}>
                    <Av name={name} size={24} color={s.color||"var(--acc)"}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:on?"var(--acc)":"var(--t1)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                      {s.phone
                        ? <div style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--t3)"}}>{s.phone}</div>
                        : <div style={{fontSize:9,color:"var(--acc)",fontStyle:"italic"}}>no phone</div>}
                    </div>
                    {on && <span style={{color:"var(--acc)",flexShrink:0}}>{Ic.check}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ghost btn-xs" onClick={() => setAddingGroup(false)}>Cancel</button>
              <button className="btn btn-primary btn-xs" onClick={saveGroup} disabled={!groupName.trim()}>
                {editGroupId ? "Save Changes" : "Add Group"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Save bar ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:10}}>
        {saved   && <span style={{fontSize:11,color:"var(--green)"}}>✓ Saved</span>}
        {saveErr && <span style={{fontSize:11,color:"var(--acc)"}}>{saveErr}</span>}
        <button className="btn btn-primary" onClick={doSave} disabled={saving} style={{gap:6}}>
          {saving
            ? <><span style={{width:11,height:11,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"jd-spin .7s linear infinite",display:"inline-block"}}/> Saving…</>
            : "Save Phone Settings"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VENDOR MANAGER TAB
   Lives inside Settings. Stores W9, COI, portal login info.
   Cross-references jd_invoices for revenue + AP paid per project.
══════════════════════════════════════════════════════════════════════ */
/* Single AP bill row in Vendor Invoices tab */
function BillRow({ bill, onTogglePaid }) {
  const STATUS_C = { received:"var(--blue)", approved:"var(--purple)", scheduled:"var(--amber)", paid:"var(--green)" };
  const isPaid = bill.status === "paid";
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,
      marginBottom:5,background:"var(--s2)",border:`1px solid ${isPaid?"var(--br)":"rgba(232,156,24,.25)"}`}}>
      <div style={{fontSize:18,flexShrink:0,opacity:isPaid?0.4:1}}>📬</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,color:isPaid?"var(--t3)":"var(--t1)",
          textDecoration:isPaid?"line-through":"none",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {bill.description||"Bill"}
        </div>
        <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:1}}>
          {bill.date}{bill.projName?` · ${bill.projName}`:""}{bill.category?` · ${bill.category}`:""}
        </div>
      </div>
      <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--mono)",padding:"2px 6px",borderRadius:4,
        background:`${STATUS_C[bill.status]||"var(--t3)"}18`,color:STATUS_C[bill.status]||"var(--t3)"}}>
        {(bill.status||"open").toUpperCase()}
      </span>
      <div style={{textAlign:"right",flexShrink:0,minWidth:72}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:"var(--mono)",color:isPaid?"var(--t3)":"#e89c18"}}>
          {fmt$(bill.amount||0)}
        </div>
      </div>
      <button className={`btn btn-xs ${isPaid?"btn-ghost":"btn-primary"}`}
        style={isPaid?{}:{background:"var(--green)",borderColor:"var(--green)"}}
        onClick={()=>onTogglePaid(bill.id, !isPaid)}
        title={isPaid?"Mark as Outstanding":"Mark as Paid"}>
        {isPaid ? "↩ Unmark" : "✓ Paid"}
      </button>
    </div>
  );
}

function VendorManagerTab({ projects=[], globalStaff=[], companyId="" }) {
  const [vendors,    setVendors]    = useState(loadVendors);
  const [selected,   setSelected]   = useState(null); // vendor id open in detail panel
  const [detailTab,  setDetailTab]  = useState("profile");
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const BLANK = {
    id:"", firstName:"", lastName:"", company:"", trade:"", email:"", phone:"",
    status:"active", permissionLevel:0, notes:"",
    w9:    null,  // { fileName, base64, uploadedAt }
    coi:   null,  // { fileName, base64, uploadedAt, expiresAt }
    memberstackId:"",
  };
  const [form, setForm] = useState(BLANK);
  const fld = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = () => {
    if (!form.firstName && !form.company) return;
    setSaving(true);
    const v = { ...form, id: form.id || uid(), permissionLevel: 0 };
    upsertVendor(v);
    setVendors(loadVendors());
    setTimeout(()=>{ setSaving(false); setShowForm(false); setForm(BLANK); }, 400);
  };

  const del = (id) => {
    if (!window.confirm("Remove this vendor? This cannot be undone.")) return;
    deleteVendor(id);
    setVendors(loadVendors());
    if (selected === id) setSelected(null);
  };

  const openNew  = ()  => { setForm(BLANK);  setShowForm(true); };
  const openEdit = (v) => { setForm({...BLANK,...v}); setShowForm(true); };

  // File upload → base64
  const handleFile = async (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target.result;
      fld(field, { fileName: file.name, base64, uploadedAt: new Date().toISOString(), expiresAt: form[field]?.expiresAt || "" });
    };
    reader.readAsDataURL(file);
  };

  // For existing vendor detail panel — reload from LS when vendors change
  const currentVendor = vendors.find(v => v.id === selected) || null;

  // ── Per-vendor project stats ──────────────────────────────────────
  // A vendor is "on" a project if they appear in jd_p_assigned_{projId}
  const vendorProjects = (vendor) => {
    if (!vendor) return [];
    const allInvoices = loadAllInvoices();
    return projects.map(p => {
      const assigned = _lsRead(p.id, "assigned", null) || [];
      const onJob = assigned.some(s =>
        s.id === vendor.id ||
        s.email === vendor.email ||
        (`${s.firstName||""} ${s.lastName||""}`.trim().toLowerCase() === `${vendor.firstName||""} ${vendor.lastName||""}`.trim().toLowerCase())
      );
      if (!onJob) return null;

      const projInvs = allInvoices.filter(i => i.projId === p.id);
      // Revenue = client invoices (type==="invoice" or no type, not bill/expense/payroll/payment_out)
      const AP_TYPES = new Set(["bill","payment_out","expense","payroll"]);
      const revenue = projInvs
        .filter(i => !AP_TYPES.has(i.type) && i.status !== "void")
        .reduce((s,i) => s + (i.total ?? i.amount ?? 0), 0);
      // Paid to this vendor = AP bills/payments matching vendor name or id
      const vendorName = [vendor.firstName, vendor.lastName].filter(Boolean).join(" ").toLowerCase();
      const vendorCompany = (vendor.company || "").toLowerCase();
      const paid = projInvs
        .filter(i => AP_TYPES.has(i.type) && (
          (i.vendor || "").toLowerCase().includes(vendorName) ||
          (vendorName && (i.vendor || "").toLowerCase().includes(vendorName)) ||
          (vendorCompany && (i.vendor || "").toLowerCase().includes(vendorCompany))
        ))
        .reduce((s,i) => s + (i.amount ?? 0), 0);

      return { proj: p, revenue, paid, pct: revenue > 0 ? (paid/revenue*100) : 0 };
    }).filter(Boolean);
  };

  // Filter + search
  const vis = vendors.filter(v => {
    if (filterStatus !== "all" && v.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${v.firstName} ${v.lastName} ${v.company} ${v.trade} ${v.email}`.toLowerCase().includes(q);
  });

  // COI expiry warning
  const coiExpired = (v) => {
    if (!v.coi?.expiresAt) return false;
    return new Date(v.coi.expiresAt) < new Date();
  };
  const coiExpiringSoon = (v) => {
    if (!v.coi?.expiresAt) return false;
    const d = new Date(v.coi.expiresAt);
    const now = new Date();
    return d >= now && d < new Date(now.getTime() + 30*24*60*60*1000);
  };

  // Overall stats across ALL vendors
  const allInvoices   = loadAllInvoices();
  const AP_TYPES_GLOB = new Set(["bill","payment_out","expense","payroll"]);
  const totalVendorPaid = vendors.reduce((sum, v) => {
    const vn = `${v.firstName||""} ${v.lastName||""}`.trim().toLowerCase();
    const vc = (v.company||"").toLowerCase();
    return sum + allInvoices
      .filter(i => AP_TYPES_GLOB.has(i.type) &&
        ((vn && (i.vendor||"").toLowerCase().includes(vn)) ||
         (vc && (i.vendor||"").toLowerCase().includes(vc))))
      .reduce((s,i) => s+(i.amount||0), 0);
  }, 0);

  const STATUS_COLORS = { active:"var(--green)", inactive:"var(--t3)" };

  return (
    <div style={{display:"flex",gap:0,height:"100%",minHeight:500}}>
      {/* ── LEFT PANEL: list ── */}
      <div style={{width:selected?320:undefined,flex:selected?undefined:1,flexShrink:0,display:"flex",flexDirection:"column",gap:0,
        borderRight:selected?"1px solid var(--br)":"none",paddingRight:selected?20:0,marginRight:selected?20:0}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Vendor &amp; Subcontractor Registry</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>
              {vendors.length} vendor{vendors.length!==1?"s":""} · ${fmt$(totalVendorPaid)} total paid out
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openNew}>{Ic.plus} Add Vendor</button>
        </div>

        {/* Search + filter */}
        <div style={{display:"flex",gap:7,marginBottom:12}}>
          <input className="inp" placeholder="Search vendors…" value={search}
            onChange={e=>setSearch(e.target.value)} style={{flex:1,fontSize:11}}/>
          {["all","active","inactive"].map(s=>(
            <button key={s} className={`chip${filterStatus===s?" on":""}`} onClick={()=>setFilterStatus(s)}
              style={{fontSize:10,textTransform:"capitalize"}}>{s}</button>
          ))}
        </div>

        {/* Summary KPI row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[
            ["Total Vendors",   vendors.length,                      "var(--blue)"],
            ["Active",          vendors.filter(v=>v.status==="active").length, "var(--green)"],
            ["COI Expiring",    vendors.filter(coiExpiringSoon).length + vendors.filter(coiExpired).length, "var(--amber)"],
          ].map(([l,v,c])=>(
            <div key={l} style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,padding:"10px 13px"}}>
              <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"var(--mono)"}}>{v}</div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:2,fontFamily:"var(--ui)"}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Vendor list */}
        {vis.length === 0 && (
          <div style={{padding:32,textAlign:"center",color:"var(--t3)",fontSize:11,fontStyle:"italic"}}>
            {vendors.length===0 ? "No vendors yet — click Add Vendor to get started." : "No vendors match your search."}
          </div>
        )}
        {vis.map(v => {
          const vp   = vendorProjects(v);
          const paid = vp.reduce((s,p)=>s+p.paid,0);
          const rev  = vp.reduce((s,p)=>s+p.revenue,0);
          const hasW9  = !!v.w9;
          const hasCOI = !!v.coi;
          const expired = coiExpired(v);
          const expiring = coiExpiringSoon(v);
          return (
            <div key={v.id}
              onClick={()=>{ setSelected(v.id===selected?null:v.id); setDetailTab("profile"); }}
              style={{padding:"12px 14px",borderRadius:10,cursor:"pointer",marginBottom:5,
                border:`1.5px solid ${selected===v.id?"var(--blue)":"var(--br)"}`,
                background:selected===v.id?"rgba(91,163,245,.06)":"var(--s2)",transition:"all .1s"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                  background:"rgba(232,156,24,.12)",border:"1.5px solid #e89c18",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#e89c18"}}>
                  {(v.firstName?.[0]||v.company?.[0]||"V").toUpperCase()}{(v.lastName?.[0]||"").toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {v.firstName||""} {v.lastName||""} {v.company?<span style={{color:"var(--t3)",fontWeight:400}}>· {v.company}</span>:null}
                  </div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{v.trade||"General"} · {vp.length} project{vp.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                  <span style={{fontSize:8,background:`${STATUS_COLORS[v.status]}20`,color:STATUS_COLORS[v.status],
                    borderRadius:4,padding:"1px 6px",fontFamily:"var(--mono)",fontWeight:700,textTransform:"uppercase"}}>{v.status}</span>
                  <div style={{display:"flex",gap:3}}>
                    <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,fontFamily:"var(--mono)",fontWeight:700,
                      background:hasW9?"rgba(26,217,138,.12)":"rgba(239,68,68,.1)",
                      color:hasW9?"var(--green)":"var(--acc)"}}>W9</span>
                    <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,fontFamily:"var(--mono)",fontWeight:700,
                      background:expired?"rgba(239,68,68,.15)":expiring?"rgba(245,158,11,.15)":hasCOI?"rgba(26,217,138,.12)":"rgba(239,68,68,.1)",
                      color:expired?"var(--acc)":expiring?"var(--amber)":hasCOI?"var(--green)":"var(--acc)"}}>
                      COI{expired?" !":" "}
                    </span>
                  </div>
                </div>
              </div>
              {!selected && (
                <div style={{display:"flex",gap:14,marginTop:8,paddingTop:8,borderTop:"1px solid var(--br)"}}>
                  {[["Revenue",`$${fmt$(rev)}`,"var(--t2)"],["Paid","$"+fmt$(paid),"var(--amber)"],["Margin",rev>0?`${(100-paid/rev*100).toFixed(0)}%`:"—","var(--green)"]].map(([l,val,c])=>(
                    <div key={l}>
                      <div style={{fontSize:11,fontWeight:700,color:c,fontFamily:"var(--mono)"}}>{val}</div>
                      <div style={{fontSize:9,color:"var(--t3)"}}>{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── RIGHT PANEL: detail ── */}
      {selected && currentVendor && (() => {
        const v   = currentVendor;
        const vp  = vendorProjects(v);
        const totalRev  = vp.reduce((s,p)=>s+p.revenue,0);
        const totalPaid = vp.reduce((s,p)=>s+p.paid,0);
        const overallPct = totalRev > 0 ? (totalPaid/totalRev*100) : 0;
        const expired  = coiExpired(v);
        const expiring = coiExpiringSoon(v);

        return (
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
            {/* Detail header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(232,156,24,.12)",border:"2px solid #e89c18",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#e89c18",flexShrink:0}}>
                  {(v.firstName?.[0]||v.company?.[0]||"V").toUpperCase()}{(v.lastName?.[0]||"").toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:"var(--t1)"}}>{v.firstName} {v.lastName}</div>
                  <div style={{fontSize:11,color:"var(--t3)"}}>{v.company||""}{v.company&&v.trade?" · ":""}{v.trade||""}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(v)}>✏ Edit</button>
                <button className="btn btn-danger btn-xs" onClick={()=>del(v.id)}>🗑 Remove</button>
                <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
              </div>
            </div>

            {/* KPI strip */}
            {(() => {
              const bills        = loadBillsByVendor(v.id);
              const billsTotal   = bills.reduce((s,b)=>s+(b.amount||0),0);
              const billsPaid    = bills.filter(b=>b.status==="paid").reduce((s,b)=>s+(b.amount||0),0);
              const billsOpen    = billsTotal - billsPaid;
              return (
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
                  {[
                    ["Projects",     vp.length,                "var(--blue)"],
                    ["Total Revenue","$"+fmt$(totalRev),       "var(--t2)"],
                    ["Total Paid",   "$"+fmt$(totalPaid),       "#e89c18"],
                    ["Outstanding",  "$"+fmt$(billsOpen),      billsOpen>0?"var(--acc)":"var(--t3)"],
                    ["Cost/Rev",     totalRev>0?`${overallPct.toFixed(1)}%`:"—", overallPct>60?"var(--acc)":overallPct>40?"var(--amber)":"var(--green)"],
                  ].map(([l,val,c])=>(
                    <div key={l} style={{background:"var(--s2)",border:`1px solid ${l==="Outstanding"&&billsOpen>0?"var(--acc)":"var(--br)"}`,borderRadius:9,padding:"10px 13px"}}>
                      <div style={{fontSize:15,fontWeight:800,color:c,fontFamily:"var(--mono)"}}>{val}</div>
                      <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Sub-tabs */}
            <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--br)",marginBottom:16}}>
              {[["profile","Profile"],["documents","Documents"],["projects","Projects"],["invoices","Invoices / AP"]].map(([k,l])=>(
                <button key={k} onClick={()=>setDetailTab(k)} style={{padding:"7px 16px",background:"none",border:"none",
                  borderBottom:detailTab===k?"2px solid var(--blue)":"2px solid transparent",
                  color:detailTab===k?"var(--t1)":"var(--t3)",fontWeight:detailTab===k?700:400,
                  fontSize:11,cursor:"pointer",fontFamily:"var(--ui)",marginBottom:-1}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Profile tab */}
            {detailTab === "profile" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card">
                  <div style={{fontSize:11,fontWeight:700,color:"var(--t2)",marginBottom:10}}>Contact Information</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    {[["Name",`${v.firstName||""} ${v.lastName||""}`.trim()||"—"],
                      ["Company", v.company||"—"],
                      ["Trade / Specialty", v.trade||"—"],
                      ["Email", v.email||"—"],
                      ["Phone", v.phone||"—"],
                      ["Status", v.status||"active"],
                    ].map(([label,val])=>(
                      <div key={label}>
                        <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:2}}>{label.toUpperCase()}</div>
                        <div style={{fontSize:11,color:"var(--t1)",fontWeight:500}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {v.memberstackId && (
                  <div className="card">
                    <div style={{fontSize:11,fontWeight:700,color:"var(--t2)",marginBottom:6}}>Portal Access</div>
                    <div style={{fontSize:10,color:"var(--t3)"}}>Memberstack ID: <span style={{fontFamily:"var(--mono)",color:"var(--t2)"}}>{v.memberstackId}</span></div>
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:3}}>Permission: <span style={{fontFamily:"var(--mono)",color:"#e89c18",fontWeight:700}}>VND · Vendor/Subcontractor</span></div>
                  </div>
                )}
                {v.notes && (
                  <div className="card">
                    <div style={{fontSize:11,fontWeight:700,color:"var(--t2)",marginBottom:6}}>Notes</div>
                    <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{v.notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Documents tab */}
            {detailTab === "documents" && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* W9 */}
                <div className="card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>W-9 Form</div>
                      <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>IRS Form W-9 — required for 1099 reporting</div>
                    </div>
                    <span style={{fontSize:9,padding:"2px 8px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:700,
                      background:v.w9?"rgba(26,217,138,.12)":"rgba(239,68,68,.1)",
                      color:v.w9?"var(--green)":"var(--acc)"}}>
                      {v.w9 ? "ON FILE" : "MISSING"}
                    </span>
                  </div>
                  {v.w9 ? (
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"var(--s3)",borderRadius:7,border:"1px solid var(--br)"}}>
                      <span style={{fontSize:18}}>📄</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.w9.fileName}</div>
                        <div style={{fontSize:9,color:"var(--t3)"}}>Uploaded {new Date(v.w9.uploadedAt).toLocaleDateString()}</div>
                      </div>
                      <a href={v.w9.base64} download={v.w9.fileName}
                        style={{fontSize:10,color:"var(--blue)",textDecoration:"none",fontWeight:600}}>↓ Download</a>
                      <button className="btn btn-danger btn-xs" onClick={()=>{
                        const updated = {...v, w9:null};
                        upsertVendor(updated);
                        setVendors(loadVendors());
                      }}>✕</button>
                    </div>
                  ) : (
                    <label style={{display:"flex",alignItems:"center",gap:9,padding:"10px 14px",border:"1.5px dashed var(--br)",
                      borderRadius:8,cursor:"pointer",color:"var(--t3)",fontSize:11,transition:"all .12s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--br)"}>
                      <span style={{fontSize:20}}>📎</span>
                      <span>Click to upload W-9 (PDF)</span>
                      <input type="file" accept=".pdf,image/*" style={{display:"none"}}
                        onChange={async e=>{
                          if(!e.target.files[0]) return;
                          await handleFile("w9", e.target.files[0]);
                          // wait for state then save
                          setTimeout(()=>{
                            const latest = loadVendors().find(x=>x.id===v.id)||v;
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const updated = {...latest, w9:{fileName:e.target.files[0].name, base64:ev.target.result, uploadedAt:new Date().toISOString()}};
                              upsertVendor(updated);
                              setVendors(loadVendors());
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }, 0);
                        }}/>
                    </label>
                  )}
                </div>

                {/* Certificate of Insurance */}
                <div className="card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>Certificate of Insurance</div>
                      <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>General liability + workers' comp COI</div>
                    </div>
                    <span style={{fontSize:9,padding:"2px 8px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:700,
                      background:expired?"rgba(239,68,68,.15)":expiring?"rgba(245,158,11,.15)":v.coi?"rgba(26,217,138,.12)":"rgba(239,68,68,.1)",
                      color:expired?"var(--acc)":expiring?"var(--amber)":v.coi?"var(--green)":"var(--acc)"}}>
                      {v.coi ? (expired?"EXPIRED":expiring?"EXPIRING SOON":"ON FILE") : "MISSING"}
                    </span>
                  </div>
                  {v.coi && (
                    <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"var(--s3)",borderRadius:7,border:"1px solid var(--br)"}}>
                      <span style={{fontSize:18}}>🛡️</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.coi.fileName}</div>
                        <div style={{fontSize:9,color:"var(--t3)"}}>
                          Uploaded {new Date(v.coi.uploadedAt).toLocaleDateString()}
                          {v.coi.expiresAt ? ` · Expires ${new Date(v.coi.expiresAt).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                      <a href={v.coi.base64} download={v.coi.fileName}
                        style={{fontSize:10,color:"var(--blue)",textDecoration:"none",fontWeight:600}}>↓ Download</a>
                      <button className="btn btn-danger btn-xs" onClick={()=>{
                        const updated = {...v, coi:null};
                        upsertVendor(updated);
                        setVendors(loadVendors());
                      }}>✕</button>
                    </div>
                  )}
                  {/* Expiry date input — always shown */}
                  <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
                    <label style={{fontSize:10,color:"var(--t3)",whiteSpace:"nowrap"}}>COI Expiry Date</label>
                    <input type="date" className="inp" style={{flex:1,fontSize:11}}
                      value={v.coi?.expiresAt?.substring(0,10)||""}
                      onChange={e=>{
                        const updated = {...v, coi: v.coi ? {...v.coi, expiresAt:e.target.value} : null};
                        upsertVendor(updated); setVendors(loadVendors());
                      }}/>
                  </div>
                  {!v.coi && (
                    <label style={{display:"flex",alignItems:"center",gap:9,padding:"10px 14px",border:"1.5px dashed var(--br)",
                      borderRadius:8,cursor:"pointer",color:"var(--t3)",fontSize:11,transition:"all .12s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--br)"}>
                      <span style={{fontSize:20}}>📎</span>
                      <span>Click to upload COI (PDF)</span>
                      <input type="file" accept=".pdf,image/*" style={{display:"none"}}
                        onChange={e=>{
                          if(!e.target.files[0]) return;
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const latest = loadVendors().find(x=>x.id===v.id)||v;
                            const updated = {...latest, coi:{fileName:file.name, base64:ev.target.result, uploadedAt:new Date().toISOString(), expiresAt:latest.coi?.expiresAt||""}};
                            upsertVendor(updated); setVendors(loadVendors());
                          };
                          reader.readAsDataURL(file);
                        }}/>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Projects tab */}
            {detailTab === "projects" && (
              <div>
                {vp.length === 0 && (
                  <div style={{padding:28,textAlign:"center",color:"var(--t3)",fontSize:11,fontStyle:"italic"}}>
                    This vendor hasn't been assigned to any projects yet. Assign them in a project's Overview tab.
                  </div>
                )}
                {vp.length > 0 && (
                  <>
                    {/* Column headers */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 80px 70px",gap:8,
                      padding:"6px 12px",marginBottom:4}}>
                      {["Project","Revenue","Paid Out","% Rev","Status"].map(h=>(
                        <div key={h} style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",fontWeight:700}}>{h.toUpperCase()}</div>
                      ))}
                    </div>
                    {vp.map(({proj:p, revenue, paid, pct}) => (
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 80px 70px",gap:8,
                        padding:"10px 12px",borderRadius:8,marginBottom:4,
                        background:"var(--s2)",border:"1px solid var(--br)",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                          <div style={{fontSize:9,color:"var(--t3)",marginTop:1}}>{p.address||"No address"}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:"var(--t2)",fontFamily:"var(--mono)"}}>${fmt$(revenue)}</div>
                        <div style={{fontSize:12,fontWeight:700,color:"#e89c18",fontFamily:"var(--mono)"}}>${fmt$(paid)}</div>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,fontFamily:"var(--mono)",
                            color:pct>60?"var(--acc)":pct>40?"var(--amber)":"var(--green)"}}>
                            {revenue>0?`${pct.toFixed(1)}%`:"—"}
                          </div>
                          {/* Mini bar */}
                          {revenue > 0 && (
                            <div style={{height:3,background:"var(--s3)",borderRadius:2,marginTop:3,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.min(pct,100)}%`,
                                background:pct>60?"var(--acc)":pct>40?"var(--amber)":"var(--green)",
                                transition:"width .4s"}}/>
                            </div>
                          )}
                        </div>
                        <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:700,textTransform:"uppercase",
                          background:`${STATUS_COLORS[p.status==="completed"?"active":"active"]}18`,
                          color:"var(--t3)"}}>{p.status||"active"}</span>
                      </div>
                    ))}
                    {/* Totals row */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 80px 70px",gap:8,
                      padding:"10px 12px",borderRadius:8,marginTop:6,
                      background:"var(--s3)",border:"1px solid var(--br)",alignItems:"center"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--t2)"}}>TOTALS</div>
                      <div style={{fontSize:12,fontWeight:800,color:"var(--t1)",fontFamily:"var(--mono)"}}>${fmt$(totalRev)}</div>
                      <div style={{fontSize:12,fontWeight:800,color:"#e89c18",fontFamily:"var(--mono)"}}>{"$"+fmt$(totalPaid)}</div>
                      <div style={{fontSize:11,fontWeight:800,fontFamily:"var(--mono)",
                        color:overallPct>60?"var(--acc)":overallPct>40?"var(--amber)":"var(--green)"}}>
                        {totalRev>0?`${overallPct.toFixed(1)}%`:"—"}
                      </div>
                      <div/>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Invoices / AP tab ── */}
            {detailTab === "invoices" && (() => {
              const [billsState, setBillsState] = [
                loadBillsByVendor(v.id),
                () => {},  // reload trigger handled inline
              ];
              const bills     = loadBillsByVendor(v.id);
              const outstanding = bills.filter(b => b.status !== "paid");
              const paid        = bills.filter(b => b.status === "paid");
              const totalBilled = bills.reduce((s,b)=>s+(b.amount||0),0);
              const totalPaid   = paid.reduce((s,b)=>s+(b.amount||0),0);
              const totalOpen   = totalBilled - totalPaid;

              return (
                <div>
                  {/* AP summary */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                    {[
                      ["Total Billed", "$"+fmt$(totalBilled), "var(--t2)"],
                      ["Paid",         "$"+fmt$(totalPaid),   "var(--green)"],
                      ["Outstanding",  "$"+fmt$(totalOpen),   totalOpen>0?"var(--acc)":"var(--t3)"],
                    ].map(([l,val,c])=>(
                      <div key={l} style={{background:"var(--s2)",border:`1px solid ${l==="Outstanding"&&totalOpen>0?"var(--acc)":"var(--br)"}`,borderRadius:9,padding:"10px 13px"}}>
                        <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"var(--mono)"}}>{val}</div>
                        <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {bills.length === 0 && (
                    <div style={{padding:28,textAlign:"center",color:"var(--t3)",fontSize:11,fontStyle:"italic"}}>
                      No bills linked to this vendor yet. In the Finance module, add a Bill and select this vendor from the vendor dropdown — it will appear here automatically.
                    </div>
                  )}

                  {/* Outstanding bills first */}
                  {outstanding.length > 0 && (
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"var(--acc)",fontFamily:"var(--mono)",marginBottom:6,letterSpacing:".05em"}}>OUTSTANDING — {outstanding.length} bill{outstanding.length!==1?"s":""}</div>
                      {outstanding.map(bill => (
                        <BillRow key={bill.id} bill={bill} onTogglePaid={(id,paid)=>{
                          markVendorBillPaid(id,paid);
                          setSelected(s=>s); // force re-render
                        }}/>
                      ))}
                    </div>
                  )}

                  {/* Paid bills */}
                  {paid.length > 0 && (
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:"var(--green)",fontFamily:"var(--mono)",marginBottom:6,letterSpacing:".05em"}}>PAID — {paid.length} bill{paid.length!==1?"s":""}</div>
                      {paid.map(bill => (
                        <BillRow key={bill.id} bill={bill} onTogglePaid={(id,paid)=>{
                          markVendorBillPaid(id,paid);
                          setSelected(s=>s);
                        }}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── ADD / EDIT FORM (modal) ── */}
      {showForm && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal anim" style={{maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div className="modal-hd">
              <div className="modal-ttl">{form.id ? "Edit Vendor" : "Add Vendor / Subcontractor"}</div>
              <button className="btn btn-ghost btn-xs" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body" style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:10}}>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label className="lbl">First Name</label>
                  <input className="inp" value={form.firstName} onChange={e=>fld("firstName",e.target.value)}/></div>
                <div><label className="lbl">Last Name</label>
                  <input className="inp" value={form.lastName} onChange={e=>fld("lastName",e.target.value)}/></div>
              </div>
              <div><label className="lbl">Company / Business Name</label>
                <input className="inp" value={form.company} onChange={e=>fld("company",e.target.value)} placeholder="Optional"/></div>
              <div><label className="lbl">Trade / Specialty</label>
                <input className="inp" value={form.trade} onChange={e=>fld("trade",e.target.value)}
                  placeholder="e.g. Electrical, Plumbing, Drywall, HVAC…"/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label className="lbl">Email</label>
                  <input className="inp" type="email" value={form.email} onChange={e=>fld("email",e.target.value)}/></div>
                <div><label className="lbl">Phone</label>
                  <input className="inp" type="tel" value={form.phone} onChange={e=>fld("phone",e.target.value)}/></div>
              </div>
              <div><label className="lbl">Status</label>
                <select className="sel" value={form.status} onChange={e=>fld("status",e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div><label className="lbl">Memberstack ID (for portal login)</label>
                <input className="inp" value={form.memberstackId} onChange={e=>fld("memberstackId",e.target.value)}
                  placeholder="mem_xxxx — links this record to their portal account"/>
                <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>
                  Portal logins for this vendor use <strong style={{fontFamily:"var(--mono)",color:"#e89c18"}}>VND</strong> permission — they can only see assigned jobs, assigned tasks, clock in/out, and upload photos.
                </div>
              </div>
              <div><label className="lbl">Notes</label>
                <textarea className="txa" value={form.notes} onChange={e=>fld("notes",e.target.value)}
                  placeholder="Internal notes about this vendor…" style={{minHeight:64,fontSize:11}}/></div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid var(--br)",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving||(!form.firstName&&!form.company)}>
                {saving?"Saving…":form.id?"Save Changes":"Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ globalStaff, setGlobalStaff, pendingInvites=[], companyId, currentPermission=1, currentMemberId, currentMemberName, onPermissionChange, offices=[], projects=[] }) {
  const [tab,      setTab]      = useState("staff");
  const [editId,   setEditId]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");
  const [inviteSaved, setInviteSaved] = useState(false);
  const blank = { firstName:"", lastName:"", email:"", phone:"", systemRole:"", title:"", photoUrl:"", officeIds:[], permissionLevel:3 };
  const [form, setForm] = useState(blank);
  const [inviteForm, setInviteForm] = useState({ email:"", permission:3 });

  // ── Offices local state (mirrors Firestore via prop) ──
  const officeBlank = { name:"", street:"", street2:"", city:"", state:"", zip:"", color:"#22d3ee", lat:null, lng:null };
  const [officeForm, setOfficeForm] = useState(officeBlank);
  const [officeEditId, setOfficeEditId] = useState(null);
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [officeSaving, setOfficeSaving] = useState(false);
  const [officeError, setOfficeError] = useState("");
  const [officeGeoStatus, setOfficeGeoStatus] = useState(null); // null | "pending" | "ok" | "fail"
  const fileRef = useRef();
  const permLevel = normPerm(currentPermission);
  const isAdmin = permLevel >= 10;
  const canManageStaffLocal = permLevel >= 9;
  const canChangePerms = permLevel >= 10;

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photoUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const openAdd  = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = s => {
    setForm({ firstName:s.firstName||"", lastName:s.lastName||"", email:s.email||"",
              phone:s.phone||"", systemRole:s.systemRole||"",
              title:s.title||"", photoUrl:s.photoUrl||"", officeIds:s.officeIds||[], permissionLevel:normPerm(s.permission??3) });
    setEditId(s.id);
    setShowForm(true);
    setSaveError("");
  };
  const cancelForm = () => { setShowForm(false); setEditId(null); setSaveError(""); };

  const saveStaff = async () => {
    if (!form.firstName.trim() || !form.email.trim() || !companyId) {
      setSaveError(!companyId ? "Company ID not loaded yet — please wait." : "First name and email are required.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (editId) {
        await fsSetStaff(companyId, editId, { ...form, permission: form.permissionLevel, color: ROLE_COLORS[form.systemRole] || "#5ba3f5" });
      } else {
        const newId = `manual-${Date.now()}`;
        await fsSetStaff(companyId, newId, {
          ...form,
          id: newId,
          color: ROLE_COLORS[form.systemRole] || "#5ba3f5",
          permission: form.permissionLevel || 3,
          status: "active",
          joinedAt: new Date().toISOString(),
        });
      }
      setShowForm(false);
      setEditId(null);
      setSaveError("");
    } catch(e) {
      setSaveError(e?.message || "Save failed — check your connection and try again.");
    }
    setSaving(false);
  };

  const removeStaff = async (memberId) => {
    if (!companyId || memberId === currentMemberId) return; // can't remove yourself
    if (!window.confirm("Remove this person from the team?")) return;
    try { await fsRemoveStaff(companyId, memberId); } catch(e) { console.error(e); }
  };

  const changePermission = async (memberId, newPerm) => {
    if (!companyId || permLevel < 9) return;
    try {
      await fsUpdateStaffField(companyId, memberId, { permission: newPerm });
      if (onPermissionChange) onPermissionChange(memberId, newPerm);
    } catch(e) { console.error("Permission change failed:", e); }
  };

  const sendInvite = async () => {
    if (!inviteForm.email.trim() || !companyId) return;
    setSaving(true);
    try {
      await fsCreateInvite(companyId, inviteForm.email, inviteForm.permission, currentMemberName || "Admin");
      setInviteSaved(true);
      setTimeout(() => setInviteSaved(false), 3000);
      setInviteForm({ email:"", permission:3 });
    } catch(e) { console.error("Invite failed:", e); }
    setSaving(false);
  };

  const cancelInvite = async (inviteId) => {
    if (!companyId) return;
    try { await fsCancelInvite(companyId, inviteId); } catch(e) { console.error(e); }
  };

  // ── Office CRUD ──
  const openAddOffice = () => {
    setOfficeForm(officeBlank);
    setOfficeEditId(null);
    setShowOfficeForm(true);
    setOfficeError("");
    setOfficeGeoStatus(null);
  };
  const openEditOffice = o => {
    setOfficeForm({ name:o.name||"", street:o.street||"", street2:o.street2||"", city:o.city||"", state:o.state||"", zip:o.zip||"", color:o.color||"#22d3ee", lat:o.lat||null, lng:o.lng||null });
    setOfficeEditId(o.id);
    setShowOfficeForm(true);
    setOfficeError("");
    setOfficeGeoStatus(o.lat ? "ok" : null);
  };
  const geocodeOffice = async () => {
    const parts = [officeForm.street, officeForm.street2, officeForm.city, officeForm.state, officeForm.zip].filter(Boolean);
    const q = parts.join(", ");
    if (!q) { setOfficeError("Enter at least a city and state to geocode."); return; }
    setOfficeGeoStatus("pending");
    setOfficeError("");
    try {
      const result = await geocodeAddress(q);
      if (result && result.lat != null && result.lng != null) {
        setOfficeForm(f => ({ ...f, lat: result.lat, lng: result.lng }));
        setOfficeGeoStatus("ok");
      } else {
        throw new Error("No result");
      }
    } catch {
      setOfficeGeoStatus("fail");
      setOfficeError("Address not found — check the street address and ZIP, or enter coordinates manually.");
    }
  };
  const saveOffice = async () => {
    if (!officeForm.name.trim() || !companyId) { setOfficeError("Office name is required."); return; }
    setOfficeSaving(true); setOfficeError("");
    try {
      const oid = officeEditId || `office-${Date.now()}`;
      await fsSetOffice(companyId, oid, { ...officeForm, id: oid });
      setShowOfficeForm(false); setOfficeEditId(null); setOfficeGeoStatus(null);
    } catch(e) { setOfficeError(e?.message || "Save failed — check your connection."); }
    setOfficeSaving(false);
  };
  const deleteOffice = async (officeId) => {
    if (!companyId || !window.confirm("Remove this office? Projects assigned to it will lose their office assignment.")) return;
    try { await fsDeleteOffice(companyId, officeId); } catch(e) { console.error(e); }
  };

  const inviteLink = companyId ? `${window.location.origin}${window.location.pathname}?invite=${companyId}` : "";

  const fld = (label, key, opts={}) => (
    <div>
      <label className="lbl">{label}{opts.required && <span style={{color:"var(--acc)",marginLeft:2}}>*</span>}</label>
      {opts.options
        ? <select className="sel" value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}>
            {opts.options.map(o=><option key={o}>{o}</option>)}
          </select>
        : <input type={opts.type||"text"} className="inp" value={form[key]}
            onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
            placeholder={opts.placeholder||""}/>
      }
    </div>
  );

  const TABS = [["staff","Staff"],["vendors","Vendors"],["offices","Offices"],["phone","Phone & Calls"],["cortex","CortexAI"],["general","General"],["roadmap","Roadmap"]];

  return (
    <div className="scroll" style={{flex:1,overflow:"auto"}}>
      <div style={{padding:"20px 24px",maxWidth:1060,margin:"0 auto"}}>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:800,color:"var(--t1)"}}>Settings</div>
          <div className="mono" style={{fontSize:10,color:"var(--t3)",marginTop:3}}>WORKSPACE CONFIGURATION</div>
        </div>

        {/* Tab nav */}
        <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--br)",marginBottom:22}}>
          {TABS.map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{
              padding:"8px 16px",background:"transparent",border:"none",
              borderBottom:tab===k?"2px solid var(--acc)":"2px solid transparent",
              color:tab===k?"var(--t1)":"var(--t2)",fontWeight:tab===k?700:400,
              fontSize:12,cursor:"pointer",fontFamily:"var(--ui)",marginBottom:-1,
            }}>{l}</button>
          ))}
        </div>

        {/* ── STAFF TAB ── */}
        {tab==="staff" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Company Staff</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:3,maxWidth:520}}>
                  {canManageStaffLocal
                    ? "Manage your team, adjust permissions, and invite new members."
                    : "Your company's team roster."}
                </div>
              </div>
              {canManageStaffLocal && !showForm && !showInvite && (
                <div style={{display:"flex",gap:7}}>
                  <button className="btn btn-secondary" onClick={()=>setShowInvite(true)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    Invite Member
                  </button>
                  <button className="btn btn-primary" onClick={openAdd}>{Ic.plus} Add Manually</button>
                </div>
              )}
            </div>

            {/* ── INVITE FORM ── */}
            {showInvite && canManageStaffLocal && (
              <div style={{background:"var(--s2)",border:"1px solid var(--blue)",borderRadius:10,padding:20,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:"var(--t1)"}}>Invite a Team Member</div>
                <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>
                  They'll receive a link to join your company workspace. Once they sign in, they'll be added automatically.
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 180px",gap:12,marginBottom:14}}>
                  <div>
                    <label className="lbl">Email Address <span style={{color:"var(--acc)"}}>*</span></label>
                    <input className="inp" type="email" placeholder="colleague@company.com"
                      value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="lbl">Permission Level</label>
                    <select className="sel" value={String(inviteForm.permission||3)}
                      onChange={e=>setInviteForm(f=>({...f,permission:parseInt(e.target.value)}))}
                      style={{fontSize:11}}>
                      {[1,2,3,4,5,6,7,8,9].map(n=>(
                        <option key={n} value={n}>{PERM_LEVELS[n].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Invite link to share */}
                <div style={{marginBottom:14}}>
                  <label className="lbl">Shareable Invite Link</label>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <input className="inp" readOnly value={inviteLink}
                      style={{fontSize:10,color:"var(--t3)",flex:1}}/>
                    <button className="btn btn-ghost btn-xs"
                      onClick={()=>{navigator.clipboard.writeText(inviteLink);}}>
                      {Ic.copy} Copy
                    </button>
                  </div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:5}}>
                    Share this link + their email invite. When they sign in via this link, they'll be automatically added to your team.
                  </div>
                </div>

                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button className="btn btn-primary" onClick={sendInvite} disabled={saving||!inviteForm.email.trim()}>
                    {saving ? "Sending…" : "Send Invite"}
                  </button>
                  <button className="btn btn-ghost" onClick={()=>{setShowInvite(false);setInviteForm({email:"",permission:"staff"});}}>Cancel</button>
                  {inviteSaved && <span style={{fontSize:11,color:"var(--green)",fontWeight:600}}>✓ Invite created</span>}
                </div>
              </div>
            )}

            {/* ── PENDING INVITES ── */}
            {canManageStaffLocal && pendingInvites.length > 0 && !showForm && (
              <div style={{marginBottom:16}}>
                <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:8}}>PENDING INVITES ({pendingInvites.length})</div>
                {pendingInvites.map(inv => (
                  <div key={inv.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
                    background:"rgba(232,156,24,.07)",border:"1px solid rgba(232,156,24,.2)",
                    borderRadius:8,marginBottom:5}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"var(--amber)",flexShrink:0,
                      boxShadow:"0 0 6px var(--amber)"}}/>
                    <div style={{flex:1}}>
                      <span style={{fontSize:12,color:"var(--t1)",fontWeight:600}}>{inv.email}</span>
                      <span style={{fontSize:10,color:"var(--t3)",marginLeft:10}}>Invited by {inv.invitedBy}</span>
                    </div>
                    <span style={{fontSize:10,color:"var(--amber)",fontFamily:"var(--mono)",
                      background:"rgba(232,156,24,.12)",padding:"2px 8px",borderRadius:4,marginRight:4}}>
                      {PERM_LEVELS[normPerm(inv.permission??3)]?.short||"L3"}
                    </span>
                    <span style={{fontSize:10,color:"var(--t3)",marginRight:8}}>Awaiting sign-in</span>
                    <button className="btn btn-ghost btn-xs" style={{color:"var(--acc)"}}
                      onClick={()=>cancelInvite(inv.id)}>Cancel</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── ADD / EDIT FORM ── */}
            {showForm && (
              <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,padding:20,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:16,color:"var(--t1)"}}>
                  {editId ? "Edit Staff Member" : "Add Staff Member Manually"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  {fld("First Name","firstName",{required:true,placeholder:"First name"})}
                  {fld("Last Name","lastName",{placeholder:"Last name"})}
                  {fld("Email Address","email",{required:true,type:"email",placeholder:"name@company.com"})}
                  {fld("Phone Number","phone",{placeholder:"(405) 555-0000"})}
                  {fld("Job Role / Title for CortexAI","systemRole",{placeholder:"e.g. Lead Technician, Estimator, PM"})}
                  {fld("Public Title","title",{placeholder:"e.g. Senior Technician, Field Lead"})}
                </div>

                {/* Office assignment — multi-select chips */}
                {offices.length > 0 && (
                  <div style={{marginBottom:12}}>
                    <label className="lbl">Office Locations <span style={{color:"var(--t3)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(select all that apply)</span></label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                      {offices.map(o => {
                        const on = (form.officeIds||[]).includes(o.id);
                        const oc = o.color||"var(--teal)";
                        return (
                          <button key={o.id} type="button"
                            onClick={()=>setForm(f=>({...f,officeIds:on?(f.officeIds||[]).filter(id=>id!==o.id):[...(f.officeIds||[]),o.id]}))}
                            style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,
                              border:`1.5px solid ${on?oc:"var(--br)"}`,
                              background:on?`${oc}18`:"transparent",
                              color:on?oc:"var(--t2)",
                              cursor:"pointer",fontSize:11,fontWeight:on?700:400,transition:"all .12s"}}>
                            <span style={{width:7,height:7,borderRadius:"50%",background:on?oc:"var(--t3)",flexShrink:0}}/>
                            {o.name}{o.city?` · ${o.city}`:""}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:5}}>
                      CortexAI uses office + System Role to route task assignments. Regional managers can be assigned to multiple offices.
                    </div>
                  </div>
                )}

                {form.systemRole && (
                  <div style={{background:"var(--s3)",borderRadius:7,padding:"8px 13px",marginBottom:14,
                    display:"flex",alignItems:"center",gap:8,fontSize:11,color:"var(--t2)"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#5ba3f5",flexShrink:0}}/>
                    <span>CortexAI will use <strong style={{color:"var(--t1)"}}>{form.systemRole}</strong> to auto-assign tasks to this person.</span>
                  </div>
                )}

                <div style={{marginBottom:16}}>
                  <label className="lbl">Profile Photo</label>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",
                      background:"var(--s3)",border:`2px solid #5ba3f5`,
                      flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {form.photoUrl
                        ? <img src={form.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : <span style={{fontWeight:700,fontSize:16,color:"#5ba3f5"}}>
                            {(form.firstName||"?")[0]}{(form.lastName||"")[0]||""}
                          </span>}
                    </div>
                    <div>
                      <button className="btn btn-ghost btn-xs" onClick={()=>fileRef.current?.click()}>
                        {Ic.upload} Upload Photo
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
                      <div style={{fontSize:10,color:"var(--t3)",marginTop:5}}>JPG or PNG · Recommended 200×200px</div>
                    </div>
                  </div>
                </div>

                {/* ── Permission Level selector ── */}
                {canChangePerms && (
                  <div style={{marginBottom:14}}>
                    <label className="lbl">Permission Level</label>
                    <select className="sel" value={String(form.permissionLevel||3)}
                      onChange={e=>setForm(f=>({...f,permissionLevel:parseInt(e.target.value)}))}>
                      {[1,2,3,4,5,6,7,8,9].map(n=>(
                        <option key={n} value={n}>{PERM_LEVELS[n].label}</option>
                      ))}
                    </select>
                    {/* Description of selected level */}
                    {PERM_DESCRIPTIONS[form.permissionLevel||3] && (
                      <div style={{marginTop:7,padding:"8px 12px",background:"var(--s3)",borderRadius:7,
                        border:"1px solid var(--br)",fontSize:11,color:"var(--t2)",lineHeight:1.6}}>
                        <span style={{fontWeight:700,color:PERM_LEVELS[form.permissionLevel||3]?.color}}>{PERM_DESCRIPTIONS[form.permissionLevel||3].title}: </span>
                        {PERM_DESCRIPTIONS[form.permissionLevel||3].desc}
                      </div>
                    )}
                  </div>
                )}

                {saveError && (
                  <div style={{marginBottom:12,padding:"8px 12px",background:"rgba(228,53,49,.08)",
                    border:"1px solid rgba(228,53,49,.2)",borderRadius:7,fontSize:11,color:"var(--acc)"}}>
                    {saveError}
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                  <button className="btn btn-ghost" onClick={cancelForm} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveStaff} disabled={saving}>
                    {saving ? "Saving…" : editId ? "Save Changes" : "Add Member"}
                  </button>
                </div>
              </div>
            )}

            {/* ── STAFF ROSTER ── */}
            {globalStaff.length === 0 ? (
              <div style={{textAlign:"center",padding:"52px 0",color:"var(--t3)",background:"var(--s1)",borderRadius:10,border:"1px solid var(--br)"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No staff members yet</div>
                <div style={{fontSize:11}}>
                  {canManageStaffLocal ? "Add your first team member or send an invite to get started." : "Your admin hasn't added any team members yet."}
                </div>
              </div>
            ) : (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"48px 1fr 150px 190px 160px 130px 110px",
                  gap:10,padding:"3px 14px",marginBottom:6}}>
                  {["","Name","System Role","Email","Phone","Permission",""].map((h,i) => (
                    <div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>
                  ))}
                </div>
                {globalStaff.map(s => {
                  const rc   = ROLE_COLORS[s.systemRole] || "#5ba3f5";
                  const slv  = normPerm(s.permission ?? 3);
                  const pc   = PERM_LEVELS[slv]?.color || "var(--t3)";
                  const isSelf = s.id === currentMemberId;
                  return (
                    <div key={s.id} style={{display:"grid",
                      gridTemplateColumns:"48px 1fr 150px 190px 160px 130px 110px",
                      gap:10,alignItems:"center",padding:"10px 14px",
                      background:isSelf?"rgba(91,163,245,.04)":"var(--s2)",
                      border:`1px solid ${isSelf?"rgba(91,163,245,.25)":"var(--br)"}`,
                      borderRadius:9,marginBottom:6}}>
                      {/* Avatar */}
                      <div style={{width:40,height:40,borderRadius:"50%",overflow:"hidden",
                        background:`${rc}18`,border:`2px solid ${rc}`,flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {s.photoUrl
                          ? <img src={s.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          : <span style={{fontWeight:700,fontSize:14,color:rc}}>
                              {(s.firstName||"?")[0]}{(s.lastName||"")[0]||""}
                            </span>}
                      </div>
                      {/* Name */}
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>
                          {s.firstName} {s.lastName}
                          {isSelf && <span style={{marginLeft:7,fontSize:9,color:"var(--blue)",fontFamily:"var(--mono)",
                            background:"rgba(91,163,245,.12)",padding:"1px 6px",borderRadius:4}}>YOU</span>}
                        </div>
                        {s.title && <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{s.title}</div>}
                        {(s.officeIds||[]).length > 0 && (
                          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
                            {(s.officeIds).map(id=>{
                              const ov = offices.find(o=>o.id===id);
                              if (!ov) return null;
                              return <span key={id} style={{fontSize:8,color:ov.color||"var(--teal)",background:`${ov.color||"var(--teal)"}18`,border:`1px solid ${ov.color||"var(--teal)"}35`,borderRadius:10,padding:"1px 6px",fontFamily:"var(--mono)"}}>{ov.name}</span>;
                            })}
                          </div>
                        )}
                      </div>
                      {/* System role */}
                      <div>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,
                          borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,
                          background:`${rc}18`,color:rc,border:`1px solid ${rc}35`}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:rc,flexShrink:0}}/>
                          {s.systemRole||"—"}
                        </span>
                      </div>
                      {/* Email */}
                      <div style={{fontSize:11,color:"var(--blue)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.email}</div>
                      {/* Phone */}
                      <div style={{fontSize:11,color:"var(--t2)"}}>{s.phone||"—"}</div>
                      {/* Permission — dropdown for admins, badge for others */}
                      <div>
                        {canChangePerms && !isSelf ? (
                          <select className="sel" value={String(slv)}
                            onChange={e=>changePermission(s.id,parseInt(e.target.value))}
                            style={{fontSize:11,padding:"4px 8px",height:"auto",
                              color:pc,background:"var(--s3)"}}>
                            {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                              <option key={n} value={n}>{PERM_LEVELS[n].label}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{display:"inline-flex",alignItems:"center",gap:5,
                            borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,
                            background:`${pc}18`,color:pc,border:`1px solid ${pc}35`}}>
                            {PERM_LEVELS[slv]?.label||"—"}
                          </span>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{display:"flex",gap:4}}>
                        {canManageStaffLocal && <button className="btn btn-ghost btn-xs" title="Edit" onClick={()=>openEdit(s)}>{Ic.doc}</button>}
                        {canManageStaffLocal && !isSelf && (
                          <button className="btn btn-danger btn-xs" title="Remove from team" onClick={()=>removeStaff(s.id)}>{Ic.trash}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PERMISSION LEVELS REFERENCE ── */}
            {canManageStaffLocal && (
              <div style={{marginTop:20,background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid var(--br)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>Permission Level Reference</div>
                  <div style={{fontSize:10,color:"var(--t3)"}}>Levels 1–10 — set per staff member above</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n=>{
                    const lv = PERM_LEVELS[n];
                    const dc = PERM_DESCRIPTIONS[n];
                    const caps = permCaps(n);
                    return (
                      <div key={n} style={{padding:"10px 14px",borderBottom:"1px solid var(--br)",borderRight:n%2!==0?"1px solid var(--br)":"none"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                          <span style={{fontSize:10,fontWeight:800,fontFamily:"var(--mono)",color:"#fff",
                            background:lv.color,borderRadius:5,padding:"2px 7px",flexShrink:0}}>{lv.short}</span>
                          <span style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{dc.title}</span>
                        </div>
                        <div style={{fontSize:10,color:"var(--t3)",lineHeight:1.5,marginBottom:6}}>{dc.desc}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                          {[
                            [caps.canViewAllJobs,       "All Projects"],
                            [caps.canAddProject,        "Add Projects"],
                            [caps.canViewBudget,        "Budget"],
                            [caps.canViewBillingScope,  "Billing/Scope"],
                            [caps.canViewPayRates,      "Pay Rates"],
                            [caps.canAccessSettings,    "Settings"],
                            [caps.canManageStaff,       "Manage Staff"],
                            [caps.canManagePermissions, "Set Permissions"],
                          ].map(([on,label])=>(
                            <span key={label} style={{fontSize:8,padding:"1px 6px",borderRadius:4,fontFamily:"var(--mono)",
                              background:on?"rgba(26,217,138,.12)":"rgba(107,114,128,.1)",
                              color:on?"var(--green)":"var(--t3)",
                              border:`1px solid ${on?"rgba(26,217,138,.25)":"rgba(107,114,128,.2)"}`}}>
                              {on?"✓":"✗"} {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CortexAI sync notice */}
            <div style={{marginTop:20,background:"rgba(91,163,245,0.07)",border:"1px solid rgba(91,163,245,0.18)",
              borderRadius:9,padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{color:"var(--blue)",flexShrink:0,marginTop:1}}>{Ic.mindflow}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--blue)",marginBottom:4}}>CortexAI Staff Sync</div>
                <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.7}}>
                  Staff are stored in Firestore and synced to <code style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t1)"}}>localStorage</code> automatically
                  for CortexAI (mindflow.html) task assignment by System Role and Office.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── OFFICES TAB ── */}
        {tab==="vendors" && (
          <VendorManagerTab projects={projects} globalStaff={globalStaff} companyId={companyId}/>
        )}
        {tab==="offices" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Office Locations</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:3,maxWidth:560}}>
                  Define your company's office locations. Assign staff and projects to offices so CortexAI knows which pool of people to draw from when auto-assigning tasks.
                </div>
              </div>
              {canManageStaffLocal && !showOfficeForm && (
                <button className="btn btn-primary" onClick={openAddOffice}>{Ic.plus} Add Office</button>
              )}
            </div>

            {/* ── OFFICE FORM ── */}
            {showOfficeForm && canManageStaffLocal && (
              <div style={{background:"var(--s2)",border:"1px solid var(--blue)",borderRadius:10,padding:20,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:16,color:"var(--t1)"}}>
                  {officeEditId ? "Edit Office" : "Add Office"}
                </div>

                {/* Name */}
                <div style={{marginBottom:12}}>
                  <label className="lbl">Office Name <span style={{color:"var(--acc)"}}>*</span></label>
                  <input className="inp" value={officeForm.name} onChange={e=>setOfficeForm(f=>({...f,name:e.target.value}))}
                    placeholder="e.g. Oklahoma City, Dallas, Denver"/>
                </div>

                {/* Address fields */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label className="lbl">Street Address</label>
                    <input className="inp" value={officeForm.street} onChange={e=>setOfficeForm(f=>({...f,street:e.target.value}))}
                      placeholder="1234 Commerce Dr"/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label className="lbl">Address Line 2 <span style={{color:"var(--t3)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(Building, Suite, Unit, etc.)</span></label>
                    <input className="inp" value={officeForm.street2||""} onChange={e=>setOfficeForm(f=>({...f,street2:e.target.value}))}
                      placeholder="Building 2, Suite 100"/>
                  </div>
                  <div>
                    <label className="lbl">City</label>
                    <input className="inp" value={officeForm.city} onChange={e=>setOfficeForm(f=>({...f,city:e.target.value}))}
                      placeholder="Oklahoma City"/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div>
                      <label className="lbl">State</label>
                      <input className="inp" value={officeForm.state} onChange={e=>setOfficeForm(f=>({...f,state:e.target.value}))}
                        placeholder="OK"/>
                    </div>
                    <div>
                      <label className="lbl">ZIP</label>
                      <input className="inp" value={officeForm.zip} onChange={e=>setOfficeForm(f=>({...f,zip:e.target.value}))}
                        placeholder="73102"
                        onBlur={()=>{ if(officeForm.street && officeForm.city && officeForm.zip) geocodeOffice(); }}/>
                    </div>
                  </div>
                </div>

                {/* Geocode button + status */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 13px",background:"var(--s3)",borderRadius:8,border:"1px solid var(--br)"}}>
                  <div style={{flex:1}}>
                    {officeGeoStatus === "ok" && officeForm.lat ? (
                      <div style={{fontSize:11,color:"var(--green)"}}>
                        <span style={{fontWeight:700,fontFamily:"var(--mono)"}}>✓ GEOCODED</span>
                        <span style={{color:"var(--t3)",marginLeft:8}}>{officeForm.lat.toFixed(5)}, {officeForm.lng.toFixed(5)}</span>
                      </div>
                    ) : officeGeoStatus === "pending" ? (
                      <div style={{fontSize:11,color:"var(--amber)",fontFamily:"var(--mono)"}}>Geocoding…</div>
                    ) : officeGeoStatus === "fail" ? (
                      <div style={{fontSize:11,color:"var(--acc)"}}>Geocode failed — address not found</div>
                    ) : (
                      <div style={{fontSize:11,color:"var(--t3)"}}>No coordinates yet — geocode the address for automatic project assignment</div>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={geocodeOffice} disabled={officeGeoStatus==="pending"}
                    style={{flexShrink:0,whiteSpace:"nowrap"}}>
                    {officeGeoStatus==="pending" ? "…" : officeGeoStatus==="ok" ? "Re-geocode" : "📍 Geocode Address"}
                  </button>
                </div>

                {/* Manual lat/lng override */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  <div>
                    <label className="lbl">Latitude <span style={{color:"var(--t3)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(or enter manually)</span></label>
                    <input className="inp" type="number" step="0.00001" value={officeForm.lat||""}
                      onChange={e=>{ const v=parseFloat(e.target.value); setOfficeForm(f=>({...f,lat:isNaN(v)?null:v})); setOfficeGeoStatus(v?"ok":null); }}
                      placeholder="35.46756"/>
                  </div>
                  <div>
                    <label className="lbl">Longitude</label>
                    <input className="inp" type="number" step="0.00001" value={officeForm.lng||""}
                      onChange={e=>{ const v=parseFloat(e.target.value); setOfficeForm(f=>({...f,lng:isNaN(v)?null:v})); }}
                      placeholder="-97.51643"/>
                  </div>
                </div>

                {/* Color */}
                <div style={{marginBottom:14}}>
                  <label className="lbl">Office Color</label>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                    {["#22d3ee","#5ba3f5","#1ad98a","#a78bfa","#f97316","#e43531","#e89c18","#ec4899"].map(c=>(
                      <button key={c} onClick={()=>setOfficeForm(f=>({...f,color:c}))}
                        style={{width:22,height:22,borderRadius:"50%",background:c,border:officeForm.color===c?"3px solid var(--t1)":"2px solid transparent",cursor:"pointer",outline:"none"}}/>
                    ))}
                    <input type="color" value={officeForm.color} onChange={e=>setOfficeForm(f=>({...f,color:e.target.value}))}
                      style={{width:22,height:22,border:"none",background:"none",cursor:"pointer",padding:0}}/>
                  </div>
                </div>

                {officeError && (
                  <div style={{marginBottom:10,padding:"7px 11px",background:"rgba(228,53,49,.08)",
                    border:"1px solid rgba(228,53,49,.2)",borderRadius:7,fontSize:11,color:"var(--acc)"}}>
                    {officeError}
                  </div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-primary" onClick={saveOffice} disabled={officeSaving}>
                    {officeSaving ? "Saving…" : officeEditId ? "Save Changes" : "Create Office"}
                  </button>
                  <button className="btn btn-ghost" onClick={()=>{setShowOfficeForm(false);setOfficeEditId(null);setOfficeError("");setOfficeGeoStatus(null);}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── OFFICES LIST ── */}
            {offices.length === 0 && !showOfficeForm ? (
              <div style={{textAlign:"center",padding:"52px 0",color:"var(--t3)",background:"var(--s1)",borderRadius:10,border:"1px solid var(--br)"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No offices added yet</div>
                <div style={{fontSize:11}}>Add your first office location to enable office-based filtering and CortexAI staff routing.</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {offices.map(o => {
                  const staffCount = globalStaff.filter(s=>(s.officeIds||[]).includes(o.id)).length;
                  const hasGeo = o.lat != null && o.lng != null;
                  const addrLine = [o.street, o.city, o.state, o.zip].filter(Boolean).join(", ");
                  return (
                    <div key={o.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 16px",
                      background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10}}>
                      <div style={{width:14,height:14,borderRadius:"50%",background:o.color||"var(--teal)",flexShrink:0,
                        marginTop:3,boxShadow:`0 0 10px ${o.color||"var(--teal)"}55`}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{o.name}</div>
                        {addrLine && <div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>{addrLine}</div>}
                        <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",
                            background:"var(--s3)",padding:"2px 8px",borderRadius:5}}>
                            {staffCount} staff
                          </span>
                          {hasGeo ? (
                            <span style={{fontSize:9,color:"var(--green)",fontFamily:"var(--mono)",
                              background:"rgba(26,217,138,.1)",border:"1px solid rgba(26,217,138,.25)",
                              padding:"2px 7px",borderRadius:5}}>
                              📍 {o.lat.toFixed(4)}, {o.lng.toFixed(4)}
                            </span>
                          ) : (
                            <span style={{fontSize:9,color:"var(--amber)",fontFamily:"var(--mono)",
                              background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",
                              padding:"2px 7px",borderRadius:5}}>
                              ⚠ NO COORDINATES — auto-assign disabled
                            </span>
                          )}
                        </div>
                      </div>
                      {canManageStaffLocal && (
                        <div style={{display:"flex",gap:5,flexShrink:0}}>
                          <button className="btn btn-ghost btn-xs" onClick={()=>openEditOffice(o)}>{Ic.doc} Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={()=>deleteOffice(o.id)}>{Ic.trash}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info card */}
            <div style={{marginTop:20,background:"rgba(34,211,238,0.07)",border:"1px solid rgba(34,211,238,0.18)",
              borderRadius:9,padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{color:"var(--teal)",flexShrink:0,marginTop:1}}>{Ic.mindflow}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--teal)",marginBottom:4}}>Office Auto-Assignment</div>
                <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.8}}>
                  1. Add a street address to each office and click <strong style={{color:"var(--t1)"}}>📍 Geocode Address</strong> to save coordinates.<br/>
                  2. When you enter a project address in the New Project form, it will be geocoded and automatically assigned to the closest office.<br/>
                  3. You can always override the auto-assignment by selecting a different office from the dropdown.<br/>
                  4. CortexAI uses <strong style={{color:"var(--t1)"}}>System Role + Office</strong> together to route task assignments to the right team.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CORTEXAI TAB ── */}
        {tab==="phone" && (
          <PhoneSettingsTab companyId={companyId} globalStaff={globalStaff} permLevel={permLevel}/>
        )}
        {tab==="cortex" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="card">
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>CortexAI Integration</div>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:14}}>
                Connect this workspace to CortexAI (mindflow.html) for AI-powered workflow generation and auto task assignment.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label className="lbl">API Base URL</label><input className="inp" defaultValue="https://app.job-dox.ai/api/v1"/></div>
                <div><label className="lbl">CortexAI File Path</label><input className="inp" defaultValue="mindflow.html"/></div>
              </div>
              <div style={{marginTop:14,display:"flex",gap:8}}>
                <button className="btn btn-primary" onClick={()=>window.open("mindflow.html","_blank")}>Open CortexAI</button>
                <button className="btn btn-ghost">Test Connection</button>
              </div>
            </div>
            <div className="card" style={{background:"rgba(91,163,245,0.05)",border:"1px solid rgba(91,163,245,0.18)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--blue)",marginBottom:8}}>How Integration Works</div>
              <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.9}}>
                1. Add staff in <strong style={{color:"var(--t1)"}}>Settings › Staff</strong> — they sync to CortexAI via localStorage automatically.<br/>
                2. Open <strong style={{color:"var(--t1)"}}>mindflow.html</strong> in the same browser tab — it reads staff in real time.<br/>
                3. Build a mind map in CortexAI, generate a workflow — tasks are auto-assigned by System Role.<br/>
                4. Push the generated workflow to Job-Dox to pre-populate task lists on new projects.
              </div>
            </div>
          </div>
        )}

        {tab==="general" && (permLevel >= 8 ? (
          <GeneralSettingsTab/>
        ) : (
          <div className="card" style={{padding:28,textAlign:"center",color:"var(--t3)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>Access Restricted</div>
            <div style={{fontSize:11}}>Level 8 or higher required to access General Settings.</div>
          </div>
        ))}
        {tab==="roadmap" && (
          <div className="card" style={{padding:28,textAlign:"center",color:"var(--t3)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>Feature Roadmap</div>
            <div style={{fontSize:11}}>Vote for upcoming features — coming soon.</div>
          </div>
        )}
      </div>
    </div>
  );
}


export default function JobDoxPortal() {
  const [projects,      setProjects]     = useState([]);
  const [selected,      setSelected]     = useState(null);
  const [selTab,        setSelTab]       = useState("overview");
  const [page,          setPage]         = useState("portfolio");
  const [isLight,       setIsLight]      = useState(() => localStorage.getItem("jd-theme") === "light");
  const [showTools,     setShowTools]    = useState(false);
  const [clockInState,  setClockInState] = useState(null);
  const [projectShifts, setProjectShifts]= useState({});
  const [permission,    setPermission]   = useState(1); // numeric 1-10, loaded from Firestore
  const [globalStaff,      setGlobalStaff]     = useState([]);
  const [pendingInvites,   setPendingInvites]   = useState([]);
  const [offices,          setOffices]          = useState([]);
  const [companyId,        setCompanyId]       = useState(null);
  const [currentMember,    setCurrentMember]   = useState(null); // Memberstack member object
  const [priceLists,       setPriceLists]      = useState(INITIAL_PRICE_LISTS);
  const [customWorkTypes,  setCustomWorkTypes] = useState(loadCWT);
  const [customStatuses,   setCustomStatuses]  = useState(loadCST);
  const [customProjectTypes,setCustomProjectTypes] = useState(loadCPT);
  const [phoneSettings,     setPhoneSettings]      = useState({});  // loaded from Firestore on companyId resolve
  const attrDefs = DEFAULT_ATTR_DEFS;

  // Re-sync if another tab updates localStorage config
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_CWT_KEY) setCustomWorkTypes(loadCWT());
      if (e.key === LS_CST_KEY) setCustomStatuses(loadCST());
      if (e.key === LS_CPT_KEY) setCustomProjectTypes(loadCPT());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const caps = permCaps(permission);
  const { canViewRates, canViewBudget, canViewBillingScope, canViewPayRates, canAddProject, canManageStaff, canManagePermissions, canAccessSettings, canViewOwnJobsOnly, canViewOfficeJobs, canViewAllJobs } = caps;
  const currentUser  = currentMember
    ? { name: `${currentMember.customFields?.firstName||""} ${currentMember.customFields?.lastName||""}`.trim() || currentMember.auth?.email || "User",
        position: currentMember.customFields?.systemRole || "Project Manager" }
    : CURRENT_USER;

  // ── Resolve companyId + permission from Memberstack, then stream Firestore ──
  useEffect(() => {
    let unsubProjects = null;
    let unsubStaff    = null;
    let unsubInvites  = null;
    let unsubOffices  = null;

    async function initMember(member) {
      setCurrentMember(member);
      const email = member.auth?.email || "";

      // Check if this user belongs to a company as a staff member
      // companyId is stored in their Memberstack custom fields after accepting an invite
      let cid = member.customFields?.["company-id"] || null;

      // If no stored companyId, this user is the account owner — their own ID IS the companyId
      if (!cid) cid = member.id;

      setCompanyId(cid);

      // ── Check for invite in URL: ?invite={companyId} ──
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCid = urlParams.get("invite");
      if (inviteCid && email) {
        try {
          const invite = await fsFindInviteByEmail(inviteCid, email);
          if (invite) {
            // Accept the invite: write staff record, store companyId in Memberstack
            await fsSetStaff(inviteCid, member.id, {
              firstName: member.customFields?.firstName || "",
              lastName:  member.customFields?.lastName  || "",
              email,
              phone:      member.customFields?.phone || "",
              systemRole: member.customFields?.systemRole || "Field Technician",
              title:      "",
              photoUrl:   "",
              permission: invite.permission,
              status:     "active",
              joinedAt:   new Date().toISOString(),
            });
            // Mark invite as accepted
            await updateDoc(doc(db, "companies", inviteCid, "invites", invite.id), { status: "accepted" });
            // Store companyId in Memberstack so future logins know which company they belong to
            if (window.$memberstackDom?.updateMember) {
              await window.$memberstackDom.updateMember({ customFields: { "company-id": inviteCid } });
            }
            cid = inviteCid;
            setCompanyId(cid);
            // Clean up URL
            const url = new URL(window.location);
            url.searchParams.delete("invite");
            window.history.replaceState({}, "", url);
          }
        } catch(e) { console.warn("Invite acceptance failed:", e); }
      }

      // ── Load this user's permission from their staff record ──
      try {
        const staffRecord = await fsGetStaff(cid, member.id);
        const isOwner = cid === member.id;

        if (isOwner) {
          // Account owner is ALWAYS admin — create or force-correct the record
          const needsWrite = !staffRecord || staffRecord.permission !== "admin";
          if (needsWrite) {
            await fsSetStaff(cid, member.id, {
              firstName:  member.customFields?.firstName || "",
              lastName:   member.customFields?.lastName  || "",
              email,
              phone:      member.customFields?.phone || "",
              systemRole: staffRecord?.systemRole || "Project Manager",
              title:      "Account Owner",
              photoUrl:   staffRecord?.photoUrl || "",
              permission: 10,
              status:     "active",
              joinedAt:   staffRecord?.joinedAt || new Date().toISOString(),
            });
          }
          // Pre-populate company info from Memberstack if not already saved
          const existingCo = loadCoInfo();
          if (!existingCo.name && member.customFields?.["company-name"]) {
            saveCoInfo({ ...existingCo, name: member.customFields["company-name"] });
          }
          setPermission(10);
          try { localStorage.setItem("jd_current_user", JSON.stringify({ permissionLevel: 10, memberId: member.id })); } catch {}
        } else if (staffRecord) {
          const lv = normPerm(staffRecord.permission ?? 3);
          setPermission(lv);
          try { localStorage.setItem("jd_current_user", JSON.stringify({ permissionLevel: lv, memberId: member.id })); } catch {}
        }
      } catch(e) { console.warn("Staff record load failed:", e); }

      // ── Stream projects ──
      const pq = query(collection(db, "companies", cid, "projects"), orderBy("createdAt","desc"));
      unsubProjects = onSnapshot(pq, snap => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // ── Stream staff roster (for SettingsPage + NotifyModal etc.) ──
      unsubStaff = fsListenStaff(cid, list => {
        setGlobalStaff(list);
        syncStaffToLS(list, loadOfficesLS()); // keep CortexAI in sync with role+office
      });

      // ── Stream offices ──
      unsubOffices = fsListenOffices(cid, list => {
        setOffices(list);
        saveOfficesToLS(list);
        // Re-sync staff with updated office names
        syncStaffToLS(JSON.parse(localStorage.getItem("jd_staff") || "[]"), list);
      });

      // ── Load phone settings (one-time, not a stream — changes rarely) ──
      getDoc(doc(db, `companies/${cid}/settings/phone`)).then(snap => {
        if (snap.exists()) setPhoneSettings(snap.data());
      }).catch(() => {});

      // ── Stream pending invites (admin only, but harmless to load) ──
      unsubInvites = fsListenInvites(cid, list => setPendingInvites(list));
    }

    function getMember() {
      if (!window.$memberstackDom) { setTimeout(getMember, 250); return; }
      window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
        if (member) {
          initMember(member);
        } else {
          // Not logged in — send back to landing page
          window.location.href = "https://job-dox.ai";
        }
      });
      // Watch for auth changes — handles concurrent login kicks and manual logouts
      window.$memberstackDom.onAuthChange((member) => {
        if (!member) {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "https://job-dox.ai";
        }
      });
    }
    getMember();

    return () => {
      if (unsubProjects) unsubProjects();
      if (unsubStaff)    unsubStaff();
      if (unsubInvites)  unsubInvites();
      if (unsubOffices)  unsubOffices();
    };
  }, []);

  // ── Add project ──
  const handleAddProject = async (p) => {
    if (!companyId) throw new Error("Not authenticated — company ID missing.");
    await addDoc(collection(db, "companies", companyId, "projects"), {
      ...p,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleNavigate = (projId, tab) => {
    const proj = projects.find(p=>p.id===projId);
    if (proj) { setSelected(proj); setSelTab(tab||"overview"); setPage("portfolio"); }
  };

  const handleClockIn = (state) => {
    if (clockInState && clockInState.projId !== state.projId) {
      const durationSec = Math.floor((Date.now() - clockInState.startTime) / 1000);
      const hours = Math.round((durationSec / 3600) * 100) / 100;
      const autoShift = {
        id: uid(), tech: currentUser?.name||"Staff", task: clockInState.label, mode: "auto",
        position: clockInState.position, rate: clockInState.rate,
        clockIn: new Date(clockInState.startTime).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),
        clockOut: new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),
        hours, notes: "Auto clocked out — switched to another project",
        laborCost: Math.round(hours * clockInState.rate * 100) / 100,
      };
      setProjectShifts(ps=>({ ...ps, [clockInState.projId]: [...(ps[clockInState.projId]||[]), autoShift] }));
    }
    setClockInState(state);
  };

  const handleClockOut = (shift) => {
    if (!clockInState) return;
    setProjectShifts(ps=>({ ...ps, [clockInState.projId]: [...(ps[clockInState.projId]||[]), shift] }));
    setClockInState(null);
  };

  useEffect(()=>{
    // ── Memberstack script ──
    if (!document.querySelector(`script[data-memberstack-app="${MS_APP_ID}"]`)) {
      const msScript = document.createElement("script");
      msScript.setAttribute("data-memberstack-app", MS_APP_ID);
      msScript.src = "https://static.memberstack.com/scripts/v2/memberstack.js";
      msScript.type = "text/javascript";
      msScript.async = true;
      msScript.onload = () => {
        window.__JD_MS_PLAN_ID  = MS_PLAN_ID;
        window.__JD_MS_PRICE_ID = MS_PRICE_ID;
        window.__JD_MS_TRIAL_DAYS = MS_TRIAL_DAYS;
      };
      document.head.appendChild(msScript);
    }
    if (!document.querySelector('meta[name="viewport"]')) {
      const vp = document.createElement("meta");
      vp.name = "viewport";
      vp.content = "width=device-width, initial-scale=1, viewport-fit=cover";
      document.head.appendChild(vp);
    }
    const el = document.createElement("style"); el.id="jdp2css";
    const existing = document.getElementById("jdp2css");
    if (existing) { existing.textContent=CSS; }
    else { el.textContent=CSS; document.head.appendChild(el); }
    document.body.classList.add("jd-new-theme");
    // Apply persisted theme on mount
    if (localStorage.getItem("jd-theme") === "light") {
      document.body.classList.add("jd-light-mode");
    } else {
      document.body.classList.remove("jd-light-mode");
    }
    const obs = new MutationObserver(()=>setIsLight(document.body.classList.contains("jd-light-mode")));
    obs.observe(document.body,{attributes:true,attributeFilter:["class"]});
    return ()=>{ obs.disconnect(); document.body.classList.remove("jd-new-theme"); try{document.head.removeChild(document.getElementById("jdp2css"));}catch(_){} };
  },[]);

  const toggleTheme = () => {
    if (window.JDTheme?.toggleColorMode) {
      window.JDTheme.toggleColorMode();
    } else {
      const next = !document.body.classList.contains("jd-light-mode");
      document.body.classList.toggle("jd-light-mode", next);
      localStorage.setItem("jd-theme", next ? "light" : "dark");
      setIsLight(next);
    }
  };

  const navTo = (pg) => { setPage(pg); setSelected(null); setShowTools(false); };

  return (
    <div className={`jdp${isLight?" lt":""}`}>
      {showTools && <AdvToolsPanel onClose={()=>setShowTools(false)} priceLists={priceLists} setPriceLists={setPriceLists} companyId={companyId} globalStaff={globalStaff} projects={projects}/>}
      <nav className="rail">
        <div className="rail-logo">JD</div>
        <button className={`rail-btn${page==="portfolio"&&!selected?" active":""}`} data-tip="Projects"
          onClick={()=>navTo("portfolio")}>
          {Ic.folder}
        </button>
        <button className={`rail-btn${page==="myday"?" active":""}`} data-tip="My Day"
          onClick={()=>navTo("myday")}>
          {Ic.calendar}
        </button>
        <button className="rail-btn" data-tip="All Tasks">{Ic.tasks}</button>
        <button className="rail-btn" data-tip="Messages">{Ic.msg}</button>
        <button className="rail-btn" data-tip="Reports">{Ic.chart}</button>
        <button className={`rail-btn${page==="finance"?" active":""}`} data-tip="Financial Dashboard"
          onClick={()=>navTo("finance")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
        </button>
        <button className={`rail-btn${page==="settings"?" active":""}`} data-tip="Settings"
          onClick={()=>navTo("settings")}>
          {Ic.settings}
        </button>
        <div className="rail-div"/>
        <div className="rail-lbl">TOOLS</div>
        <button className={`rail-btn${showTools?" active":""}`} data-tip="Advanced Tools" onClick={()=>setShowTools(v=>!v)}>
          {Ic.tools}
        </button>
        <div className="rail-sp"/>
        <button className={`rail-btn${clockInState?" clocked-in":""}`} data-tip={clockInState?`Clocked in: ${clockInState.projName}`:"Not clocked in"}>
          {Ic.stopwatch}
        </button>
        <button className="rail-btn" data-tip="History">{Ic.history}</button>
        <button className="rail-btn" data-tip={`Signed in as ${PERM_LEVELS[caps.level]?.label||"Staff"}`}
          style={{position:"relative",cursor:"default"}}>
          {Ic.account}
          <span style={{position:"absolute",bottom:5,right:5,fontSize:7,fontFamily:"var(--mono)",fontWeight:700,
            background:PERM_LEVELS[caps.level]?.color||"var(--t3)",
            color:"#fff",borderRadius:3,padding:"1px 3px",lineHeight:1.2,letterSpacing:".02em"}}>
            {PERM_LEVELS[caps.level]?.short||"?"}
          </span>
        </button>
        <button className="rail-btn" data-tip={isLight?"Dark mode":"Light mode"} onClick={toggleTheme} style={{color:isLight?"var(--t2)":"#f5c518"}}>
          {isLight ? Ic.sun : Ic.moon}
        </button>
        <button className="rail-btn" data-tip="Sign Out" onClick={async()=>{
          try {
            await window.$memberstackDom.logout();
          } catch(e) {
            // If logout fails, force it manually
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "https://job-dox.ai";
          }
        }} style={{color:"var(--t3)"}}>
          {Ic.logout}
        </button>
      </nav>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="mobile-bottom-nav">
        <button className={`mob-tab${page==="portfolio"&&!selected?"active":""}`}
          onClick={()=>navTo("portfolio")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
          Projects
        </button>
        <button className={`mob-tab${page==="myday"?"active":""}`}
          onClick={()=>navTo("myday")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>
          My Day
        </button>
        <button className="mob-tab" onClick={()=>setShowTools(v=>!v)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
          Tools
        </button>
        <button className={`mob-tab${clockInState?" active":""}`} style={clockInState?{color:"var(--green)"}:{}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>
          {clockInState ? "Clocked In" : "Clock"}
        </button>
        <button className={`mob-tab${page==="settings"?"active":""}`} onClick={()=>navTo("settings")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          Settings
        </button>
      </nav>

      <div className="jdp-main">
        {page==="settings" ? (
          <>
            <div className="topbar">
              <div>
                <div className="topbar-ttl">Settings</div>
                <div className="topbar-sub">WORKSPACE CONFIGURATION</div>
              </div>
            </div>
            <SettingsPage
              globalStaff={globalStaff}
              setGlobalStaff={setGlobalStaff}
              pendingInvites={pendingInvites}
              companyId={companyId}
              currentPermission={permission}
              currentMemberId={currentMember?.id}
              currentMemberName={currentUser?.name}
              offices={offices}
              projects={projects}
              onPermissionChange={(memberId, newPerm) => {
                if (memberId === currentMember?.id) {
                  setPermission(normPerm(newPerm));
                  try { localStorage.setItem("jd_current_user", JSON.stringify({ permissionLevel: normPerm(newPerm), memberId: currentMember.id })); } catch {}
                }
              }}
            />
          </>
        ) : page==="myday" ? (
          <MyDayPage
            onNavigate={handleNavigate}
            currentUser={currentUser}
            permissionLevel={permission}
            globalStaff={globalStaff}
            currentMemberId={currentMember?.id||""}
            companyId={companyId}
            projects={projects}
          />
        ) : page==="finance" ? (
          <FinancialDashboard
            projects={projects}
            companyId={companyId}
            onNavigate={handleNavigate}
          />
        ) : selected ? (
          <ProjectDetail
            proj={selected}
            initialTab={selTab}
            onBack={()=>setSelected(null)}
            attrDefs={attrDefs}
            clockInState={clockInState}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            projectShifts={projectShifts}
            currentUser={currentUser}
            canViewRates={canViewRates}
            canViewBudget={canViewBudget}
            canViewBillingScope={canViewBillingScope}
            canViewPayRates={canViewPayRates}
            canManageStaff={canManageStaff}
            globalStaff={globalStaff}
            priceLists={priceLists}
            setPriceLists={setPriceLists}
            companyId={companyId}
            phoneSettings={phoneSettings}
            isVendor={caps.isVendorPerm}
            currentMemberId={currentMember?.id || ""}
            onNavigate={handleNavigate}
          />
        ) : (
          <PortfolioPage
            projects={projects}
            onSelect={p=>{setSelected(p);setSelTab("overview");}}
            onAdd={handleAddProject}
            onNavigate={handleNavigate}
            clockInState={clockInState}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            currentUser={currentUser}
            canViewRates={canViewRates}
            canViewBudget={canViewBudget}
            canAddProject={canAddProject}
            currentMemberId={currentMember?.id||""}
            globalStaff={globalStaff}
            customWorkTypes={customWorkTypes}
            customStatuses={customStatuses}
            customProjectTypes={customProjectTypes}
            offices={offices}
            companyId={companyId}
            phoneSettings={phoneSettings}
          />
        )}
      </div>
    </div>
  );
}
