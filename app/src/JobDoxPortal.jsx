import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAFwSEDPqKgAUbwbh_2KZNwLDdGCZEiq3E",
  authDomain:        "cortex-717c6.firebaseapp.com",
  projectId:         "cortex-717c6",
  storageBucket:     "cortex-717c6.firebasestorage.app",
  messagingSenderId: "496631882511",
  appId:             "1:496631882511:web:3f7be61bcbb83a6ab4d47a",
};
const _fbApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(_fbApp);

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
.proj-actions{padding:7px 9px;border-top:1px solid var(--br);display:flex;gap:4px;background:var(--s3);}

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
  .proj-actions{flex-wrap:wrap;gap:4px;}
  
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
  .proj-actions .btn-xs{font-size:9px;padding:3px 6px;}
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
  estimate:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/></svg>,
  proj_report:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  ic_grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>,
  stopwatch:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 1.58l-1.06 1.95C13.43 3.2 12.73 3 12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.87-1.35-5.43-3.44-7.07l1.05-1.93-1.54-.42zM12 19c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm.5-11h-1.5v5.25l4.5 2.67.75-1.23-3.75-2.23V8z"/></svg>,
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

const DEFAULT_WORK_TYPES = [
  { id:"wt-1", name:"Water Mitigation", color:"#3b82f6", hasWorkflow:true  },
  { id:"wt-2", name:"Fire & Smoke",     color:"#f97316", hasWorkflow:false },
  { id:"wt-3", name:"Mold Remediation", color:"#10b981", hasWorkflow:false },
  { id:"wt-4", name:"Storm Damage",     color:"#8b5cf6", hasWorkflow:false },
  { id:"wt-5", name:"Reconstruction",   color:"#6b7280", hasWorkflow:false },
  { id:"wt-6", name:"Demo",             color:"#f43f5e", hasWorkflow:false },
  { id:"wt-7", name:"Contents",         color:"#ec4899", hasWorkflow:false },
];

const DEFAULT_STATUSES = [
  { id:"st-1", name:"New Lead",         color:"#8b95b0", triggerTask:"" },
  { id:"st-2", name:"Scoping",          color:"#e89c18", triggerTask:"" },
  { id:"st-3", name:"In Progress",      color:"#5ba3f5", triggerTask:"contract signed" },
  { id:"st-4", name:"Pending Approval", color:"#a78bfa", triggerTask:"scope approved" },
  { id:"st-5", name:"On Hold",          color:"#e43531", triggerTask:"" },
  { id:"st-6", name:"Completed",        color:"#1ad98a", triggerTask:"certificate of completion" },
];

const DEFAULT_PROJECT_TYPES = [
  { id:"pt-1", name:"Water Damage",    color:"#3b82f6" },
  { id:"pt-2", name:"Fire & Smoke",    color:"#f97316" },
  { id:"pt-3", name:"Storm Damage",    color:"#8b5cf6" },
  { id:"pt-4", name:"Mold Remediation",color:"#10b981" },
  { id:"pt-5", name:"Reconstruction",  color:"#6b7280" },
  { id:"pt-6", name:"Contents",        color:"#ec4899" },
  { id:"pt-7", name:"Demo",            color:"#f43f5e" },
];

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
const ACTIVITY = [];
const TODAY_ISO = new Date().toISOString().slice(0,10);
const MY_TASKS = [];
const DAILY_NOTES_SEED = [];



const STAFF_POOL = [];
const CONTACTS_SEED = [];
const DOCS_SEED = [];
const TASKS_SEED = [];

const SCOPE_SEED = [
  {id:1,desc:"Water Extraction — Per sq ft",unit:"SF",qty:480,price:0.85},
  {id:2,desc:"LGR Dehumidifier — Per Day",unit:"EA",qty:3,price:85},
  {id:3,desc:"Air Mover — Per Day",unit:"EA",qty:8,price:28},
  {id:4,desc:"Antimicrobial Treatment",unit:"SF",qty:480,price:0.55},
  {id:5,desc:"Demo — Drywall",unit:"SF",qty:120,price:1.65},
];

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

const PERM_CONFIG = {
  admin:   { label:"Admin",   canViewRates: true  },
  manager: { label:"Manager", canViewRates: true  },
  staff:   { label:"Staff",   canViewRates: false },
};

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
  const staffNames = globalStaff.map(s=>`${s.firstName} ${s.lastName}`.trim()).filter(Boolean);
  const [tech, setTech] = useState(staffNames[0]||"Crew");
  const [eta, setEta]   = useState("30");
  const [sent, setSent] = useState(false);
  const firstName = (proj.client||"there").split(" ")[0];
  const msg = `Hi ${firstName}! Your Job-Dox crew is on the way. ${tech} will arrive in approx. ${eta} min. He is IICRC certified with photo ID. Questions? Reply here or call us. — Job-Dox`;

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm anim">
        <div className="modal-hd">
          <div><div className="modal-ttl">{sent?"Message Sent!":"Notify Customer"}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>Auto-text to {proj.client}</div></div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>
        <div className="modal-body">
          {sent ? (
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"#1a8c4e",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"#fff",fontSize:22}}>{Ic.sms}</div>
              <div style={{fontWeight:700,fontSize:15}}>Text message sent</div>
              <div style={{fontSize:12,color:"var(--t2)",marginTop:4}}>Delivered to {proj.clientPhone}</div>
            </div>
          ) : (
            <>
              <div>
                <label className="lbl">Crew Member</label>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <Av name={tech} color="var(--acc)" size={40}/>
                  <select className="sel" style={{flex:1}} value={tech} onChange={e=>setTech(e.target.value)}>
                    {staffNames.length > 0
                      ? staffNames.map(n=><option key={n}>{n}</option>)
                      : <option>Crew</option>}
                  </select>
                </div>
              </div>
              <F label="ETA (minutes)" value={eta} onChange={setEta} options={["10","15","20","30","45","60","90"]}/>
              <div>
                <div className="lbl" style={{marginBottom:7}}>Message Preview</div>
                <div style={{background:"var(--s3)",borderRadius:10,padding:12,display:"flex",justifyContent:"flex-end"}}>
                  <div className="sms-bubble">{msg}</div>
                </div>
              </div>
            </>
          )}
        </div>
        {!sent && (
          <div className="modal-ft">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={()=>{setSent(true);setTimeout(onClose,2000);}}>{Ic.sms} Send Now</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommModal({ proj, onClose }) {
  const [msg, setMsg] = useState("");
  const quick = ["On our way!","Running ~15 min late","Please call us back","Crew arriving tomorrow 8am"];
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm anim">
        <div className="modal-hd">
          <div><div className="modal-ttl">Quick Contact</div><div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{proj.client} · {proj.clientPhone}</div></div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button>
        </div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <a href={`tel:${proj.clientPhone}`} className="btn btn-green btn-lg" style={{justifyContent:"center",textDecoration:"none"}} onClick={onClose}>{Ic.phone} Call</a>
            <a href={`sms:${proj.clientPhone}`}  className="btn btn-blue btn-lg"  style={{justifyContent:"center",textDecoration:"none"}} onClick={onClose}>{Ic.sms} Open SMS</a>
          </div>
          <div>
            <label className="lbl">Custom Message</label>
            <textarea className="txa" value={msg} onChange={e=>setMsg(e.target.value)} placeholder={`Hi ${(proj.client||"").split(" ")[0]}, this is Tyler from Job-Dox…`} style={{minHeight:72}}/>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {quick.map(q=><button key={q} className="chip" onClick={()=>setMsg(q)}>{q}</button>)}
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {msg && <button className="btn btn-primary" onClick={onClose}>{Ic.sms} Send SMS</button>}
        </div>
      </div>
    </div>
  );
}

function AddProjModal({ onClose, onAdd, customWorkTypes=[], customStatuses=[], customProjectTypes=[] }) {
  const [f, setF] = useState({name:"",type:"",address:"",city:"",state:"OK",zip:"",clientName:"",clientPhone:"",clientEmail:"",carrier:"",claim:"",adjuster:"",dateOfLoss:"",notes:""});
  const s = (k,v) => setF(p=>({...p,[k]:v}));

  // Load saved workflow templates once
  const savedTemplates = React.useMemo(() => loadWorkflowTemplates(), []);

  // Work type toggles — pull from company config
  const WT_OPTIONS = customWorkTypes.length ? customWorkTypes.map(w=>w.name) : Object.keys(WT_META);
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

  const projTypeNames = customProjectTypes.length ? customProjectTypes.map(t=>t.name) : ["Water Damage","Fire & Smoke","Mold Remediation","Storm Damage","Reconstruction","Other"];
  const statusNames   = customStatuses.length     ? customStatuses.map(s=>s.name)     : ["New Lead","Scoping","In Progress"];

  const submit = () => {
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
    onAdd({
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
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg anim">
        <div className="modal-hd"><div className="modal-ttl">New Project</div><button className="btn btn-ghost btn-xs" onClick={onClose}>{Ic.close}</button></div>
        <div className="modal-body">
          <div><div className="sec" style={{marginBottom:7}}>Project</div>
            <F label="Project Name *" value={f.name} onChange={v=>s("name",v)} placeholder="e.g. Henderson Residence" span={2}/>
            <div className="g3" style={{marginTop:10}}>
              <F label="Loss Type *" value={f.type} onChange={v=>s("type",v)} options={projTypeNames}/>
              <F label="Date of Loss" value={f.dateOfLoss} onChange={v=>s("dateOfLoss",v)} type="date"/>
              <F label="Initial Status" value={f.status||"New Lead"} onChange={v=>s("status",v)} options={statusNames}/>
            </div>
          </div>

          {/* ── Work Types ── */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div className="sec">Work Types</div>
              <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>Toggle to enable — drives CortexAI automations</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:7}}>
              {WT_OPTIONS.map(type => {
                const meta = getWTMeta(type, customWorkTypes);
                const on   = isWTOn(type);
                const cwt  = customWorkTypes.find(w=>w.name===type);
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
            <F label="Street Address" value={f.address} onChange={v=>s("address",v)} placeholder="123 Main Street" span={2}/>
            <div className="g3" style={{marginTop:10}}>
              <F label="City" value={f.city} onChange={v=>s("city",v)} placeholder="Oklahoma City"/>
              <F label="State" value={f.state} onChange={v=>s("state",v)} placeholder="OK"/>
              <F label="ZIP" value={f.zip} onChange={v=>s("zip",v)} placeholder="73008"/>
            </div>
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
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-lg" onClick={submit} style={{opacity:(!f.name||!f.type)?.5:1}}>{Ic.plus} Create Project</button>
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
  if (item.actionType==="budget")  actions.push({ icon:Ic.dollar, label:"Open Budget tab",   color:"var(--green)",  action:()=>{ onNavigate(item.projId, "budget"); onClose(); }});
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
  const [popup, setPopup] = useState(null);
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
        {ACTIVITY.map(item=>(
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

function MyDayPage({ onNavigate }) {
  const [allTasks, setAllTasks] = useState(MY_TASKS);
  const [selDate, setSelDate]   = useState(TODAY_ISO);
  const [calYear,  setCalYear]  = useState(2025);
  const [calMonth, setCalMonth] = useState(11);
  const toggleTask = id => setAllTasks(t=>t.map(x=>x.id===id?{...x,done:!x.done}:x));
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay   = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth= new Date(calYear, calMonth+1, 0).getDate();
  const taskDates  = new Set(allTasks.map(t=>t.date));
  const prevMonth = () => { if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); };
  const nextMonth = () => { if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); };
  const dayAppts  = allTasks.filter(t=>t.date===selDate && t.type==="appointment").sort((a,b)=>a.time.localeCompare(b.time));
  const dayTasks  = allTasks.filter(t=>t.date===selDate && t.type==="task");
  const HOURS = Array.from({length:12}, (_,i)=>i+7);
  const priC = {high:"var(--acc)",med:"var(--amber)",low:"var(--t3)"};
  const apptAt = h => dayAppts.filter(a=>parseInt(a.time.split(":")[0])===h);
  const dispDate = new Date(selDate+"T12:00:00");
  const isToday  = selDate===TODAY_ISO;
  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-ttl">My Day</div>
          <div className="topbar-sub">{isToday?"TODAY · ":""}{dispDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase()}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="btn btn-ghost btn-xs" onClick={()=>setSelDate(TODAY_ISO)} style={isToday?{color:"var(--acc)",borderColor:"var(--acc)"}:{}}>Today</button>
          <button className="btn btn-ghost btn-xs" onClick={()=>{const d=new Date(selDate+"T12:00:00");d.setDate(d.getDate()-1);setSelDate(d.toISOString().slice(0,10));}}>{Ic.chev_l} Prev</button>
          <button className="btn btn-ghost btn-xs" onClick={()=>{const d=new Date(selDate+"T12:00:00");d.setDate(d.getDate()+1);setSelDate(d.toISOString().slice(0,10));}}>Next {Ic.chev_r}</button>
        </div>
      </div>
      <div className="myday-page">
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
                <div key={a.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid var(--br)",alignItems:"center",cursor:"pointer"}} onClick={()=>onNavigate(a.projId,"overview")}>
                  <div className="mono" style={{fontSize:10,color:"var(--blue)",flexShrink:0,width:38}}>{a.time}</div>
                  <div style={{flex:1,minWidth:0,fontSize:11,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="myday-main">
          {dayTasks.length > 0 && (
            <div style={{marginBottom: dayAppts.length > 0 ? 24 : 0}}>
              <div className="mono" style={{fontSize:9,color:"var(--t3)",marginBottom:10,letterSpacing:".08em"}}>TASKS</div>
              <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,overflow:"hidden"}}>
                {dayTasks.map((t,i)=>(
                  <div key={t.id} className="checklist-item" style={{borderBottom:i<dayTasks.length-1?"1px solid var(--br)":"none"}}>
                    <div className={`chk${t.done?" done":""}`} onClick={()=>toggleTask(t.id)}>
                      {t.done && <span style={{color:"#fff"}}>{Ic.check}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:t.done?"var(--t3)":"var(--t1)",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
                      <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{t.proj}</div>
                    </div>
                    <div style={{display:"flex",gap:5,flexShrink:0}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:priC[t.priority],marginTop:4}}/>
                      <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9}} onClick={()=>onNavigate(t.projId,"tasks")}>{Ic.goto}</button>
                    </div>
                  </div>
                ))}
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
                          style={{marginBottom:4,borderLeftColor:priC[a.priority]}}
                          onClick={()=>onNavigate(a.projId,"overview")}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",textDecoration:a.done?"line-through":"none"}}>{a.title}</div>
                              <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{a.proj} · {a.time}</div>
                            </div>
                            <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                              <span style={{width:6,height:6,borderRadius:"50%",background:priC[a.priority],display:"block"}}/>
                              <button className="btn btn-ghost btn-xs" style={{padding:"2px 6px",fontSize:9}} onClick={e=>{e.stopPropagation();toggleTask(a.id);}}>{a.done?"Undo":"Done"}</button>
                              <button className="btn btn-blue btn-xs" style={{padding:"2px 7px",fontSize:9}} onClick={e=>{e.stopPropagation();onNavigate(a.projId,"overview");}}>{Ic.goto}</button>
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PortfolioPage({ projects, onSelect, onAdd, onNavigate, clockInState, onClockIn, onClockOut, currentUser, canViewRates, globalStaff=[], customWorkTypes=[], customStatuses=[], customProjectTypes=[] }) {
  const [search, setSearch]   = useState("");
  const [fType, setFType]     = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [clockProj, setClock] = useState(null);
  const [notifyProj, setNotify]= useState(null);
  const [commProj, setComm]   = useState(null);
  const [viewMode, setViewMode]= useState("card");

  // Dynamic filter options from company config
  const statusFilterOpts = ["All", ...(customStatuses.length ? customStatuses.map(s=>s.name) : Object.keys(STATUS_C))];
  const typeFilterOpts   = ["All", ...(customProjectTypes.length ? customProjectTypes.map(t=>t.name) : Object.keys(TYPE_C))];

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (!q || [p.name,p.address,p.client||""].join(" ").toLowerCase().includes(q))
      && (fType==="All"   || p.type===fType)
      && (fStatus==="All" || p.status===fStatus);
  });
  const openMaps = (proj) => window.open(`https://maps.google.com/?q=${encodeURIComponent(proj.address)}`,"_blank");

  return (
    <>
      {showAdd    && <AddProjModal onClose={()=>setShowAdd(false)} onAdd={p=>{onAdd(p);setShowAdd(false);}} customWorkTypes={customWorkTypes} customStatuses={customStatuses} customProjectTypes={customProjectTypes}/>}
      {clockProj  && <ClockInModal proj={clockProj} clockInState={clockInState} onClockIn={onClockIn} onClockOut={onClockOut} onClose={()=>setClock(null)} currentUser={currentUser} canViewRates={canViewRates}/>}
      {notifyProj && <NotifyModal proj={notifyProj} onClose={()=>setNotify(null)} globalStaff={globalStaff}/>}
      {commProj   && <CommModal    proj={commProj}   onClose={()=>setComm(null)}/>}

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
        <button className="btn btn-primary btn-lg" onClick={()=>setShowAdd(true)}>{Ic.plus} New Project</button>
      </div>

      <div className="kpi-bar">
        {[["Active",projects.filter(p=>p.status==="In Progress").length,"var(--blue)"],["Total Budget",fmt$(projects.reduce((s,p)=>s+p.budget,0)),"var(--green)"],["Open Tasks",projects.reduce((s,p)=>s+p.tasksOpen,0),"var(--amber)"],["Completed",projects.filter(p=>p.status==="Completed").length,"var(--t2)"]].map(([l,v,c])=>(
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
                      <button className={`btn btn-xs ${isClocked?"btn-danger":"btn-green"}`} style={isClocked?{background:"var(--acc)",color:"#fff",border:"none"}:{}} onClick={()=>setClock(proj)}>
                        {isClocked ? <>{Ic.stopwatch} Clock Out</> : <>{Ic.clock} Clock In</>}
                      </button>
                      <button className="btn btn-blue btn-xs" onClick={()=>setNotify(proj)}>{Ic.notify} Notify</button>
                      <button className="btn btn-ghost btn-xs" onClick={()=>openMaps(proj)}>{Ic.map} Navigate</button>
                      <div style={{flex:1}}/>
                      <button className="btn btn-amber btn-xs" onClick={()=>setComm(proj)} style={{background:"rgba(232,156,24,.1)",border:"1px solid rgba(232,156,24,.25)",color:"var(--amber)"}}>{Ic.phone} Contact</button>
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

function OverviewTab({ proj, attrDefs, dailyNotes=[], setDailyNotes=()=>{}, emailSchedule="weekly", setEmailSchedule=()=>{}, clientPortal=false, setClientPortal=()=>{}, globalStaff=[], worktypes=[], setWorktypes=()=>{} }) {
  const [attrs, setAttrs]           = useState({});
  const [assigned, setAssigned]     = useState([]);   // project-level assignments from globalStaff
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText]     = useState("");
  const [assignPick, setAssignPick] = useState(false);

  const unassigned = globalStaff.filter(s => !assigned.find(a => a.id === s.id));

  const addNote = () => {
    if(!noteText.trim()) return;
    const n = {id:uid(), date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), author:"Tyler Mitchell", content:noteText.trim(), visibleToClient:true};
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
                  <button className="btn btn-ghost btn-xs" onClick={()=>setAssignPick(v=>!v)}>{Ic.plus} Assign Staff</button>
                  {assignPick && (
                    <div style={{position:"absolute",right:0,top:"100%",marginTop:4,background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,minWidth:220,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.35)",overflow:"hidden"}}>
                      {unassigned.map(s=>{
                        const rc = ROLE_COLORS[s.systemRole]||"#5ba3f5";
                        return (
                          <button key={s.id} style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid var(--br)",padding:"9px 13px",display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontFamily:"var(--ui)"}}
                            onClick={()=>{setAssigned(a=>[...a,s]);setAssignPick(false);}}
                            onMouseEnter={e=>e.currentTarget.style.background="var(--s3)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div style={{width:28,height:28,borderRadius:"50%",background:`${rc}18`,border:`1.5px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:rc,flexShrink:0}}>
                              {s.photoUrl?<img src={s.photoUrl} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:`${(s.firstName||"")[0]}${(s.lastName||"")[0]}`}
                            </div>
                            <div style={{textAlign:"left"}}>
                              <div style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{s.firstName} {s.lastName}</div>
                              <div style={{fontSize:9,color:rc,fontWeight:600}}>{s.systemRole}</div>
                            </div>
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
            const rc = ROLE_COLORS[s.systemRole]||"#5ba3f5";
            return (
              <div key={s.id} className="staff-row">
                <div style={{width:32,height:32,borderRadius:"50%",overflow:"hidden",background:`${rc}18`,border:`1.5px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rc,flexShrink:0}}>
                  {s.photoUrl?<img src={s.photoUrl} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:`${(s.firstName||"")[0]}${(s.lastName||"")[0]}`}
                </div>
                <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:600,color:"var(--t1)"}}>{s.firstName} {s.lastName}</div>
                <div style={{fontSize:11,width:170}}>
                  <span style={{borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,background:`${rc}18`,color:rc}}>{s.systemRole}</span>
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

function ContactsTab() {
  const [contacts, setContacts] = useState(CONTACTS_SEED);
  const [adding, setAdding]     = useState(false);
  const [f, setF]               = useState({name:"",role:"",phone:"",email:""});
  const add = () => {
    if (!f.name) return;
    setContacts(c=>[...c,{id:uid(),...f,color:AVCOLORS[contacts.length%AVCOLORS.length]}]);
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

function MediaTab({ folders:foldersIn, setFolders:setFoldersIn, uploads:uploadsIn, setUploads:setUploadsIn }) {
  const [folders, setFoldersL] = useState(foldersIn || ["Day 1 — Initial Documentation","Moisture Mapping","Equipment Setup"]);
  const [active, setActive]    = useState(null);
  const [uploads, setUploadsL] = useState(uploadsIn || []);
  const [nf, setNf]            = useState("");
  const fileRef                = useRef();
  const setFolders = v => { const val = typeof v === "function" ? v(folders) : v; setFoldersL(val); if(setFoldersIn) setFoldersIn(val); };
  const setUploads = v => { const val = typeof v === "function" ? v(uploads) : v; setUploadsL(val); if(setUploadsIn) setUploadsIn(val); };
  const handleUp = e => { Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>setUploads(u=>[...u,{id:uid(),name:f.name,dataUrl:ev.target.result,folder:active||"Unfiled"}]);r.readAsDataURL(f);}); e.target.value=""; };
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

function DocumentsTab({ docs:docsIn, setDocs:setDocsIn }) {
  const [docsL, setDocsL] = useState(docsIn || DOCS_SEED);
  const docs = docsIn || docsL;
  const setDocs = v => { const val = typeof v === "function" ? v(docs) : v; setDocsL(val); if(setDocsIn) setDocsIn(val); };
  const fileRef = useRef();
  const typeC = {DryDox:"var(--blue)",ContentsDox:"var(--green)",Invoice:"var(--amber)",Contract:"var(--purple)",Uploaded:"var(--t2)"};
  const handleUp = e => { Array.from(e.target.files).forEach(f=>setDocs(d=>[...d,{id:uid(),name:f.name,type:"Uploaded",size:`${(f.size/1024).toFixed(0)} KB`,date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),gen:false}])); e.target.value=""; };
  return (
    <div className="scroll"><div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div className="sec">Documents</div>
        <div style={{display:"flex",gap:7}}><input ref={fileRef} type="file" accept=".pdf,.doc,.docx" multiple style={{display:"none"}} onChange={handleUp}/><button className="btn btn-secondary btn-xs" onClick={()=>fileRef.current.click()}>{Ic.upload} Upload</button></div>
      </div>
      {docs.map(d=>{const c=typeC[d.type]||"var(--t2)";return(
        <div key={d.id} className="row" style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <div style={{width:30,height:30,borderRadius:7,background:c+"18",display:"flex",alignItems:"center",justifyContent:"center",color:c,flexShrink:0}}>{Ic.pdf}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div><div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{d.size} · {d.date}</div></div>
          <span style={{borderRadius:20,padding:"2px 8px",fontSize:9,background:c+"18",color:c,fontWeight:600}}>{d.type}</span>
          <button className="btn btn-danger btn-xs" onClick={()=>setDocs(p=>p.filter(x=>x.id!==d.id))}>{Ic.trash}</button>
        </div>
      );})}
    </div></div>
  );
}

function TasksTab({ initialTasks=[] }) {
  const [tasks,setTasks]=useState(()=> initialTasks.length ? initialTasks : TASKS_SEED);
  const [filter,setFilter]=useState("open");
  const [adding,setAdding]=useState(false);
  const [exp,setExp]=useState(null);
  const [f,setF]=useState({title:"",assigned:"",due:"",priority:"med"});
  const toggle=id=>setTasks(t=>t.map(x=>x.id===id?{...x,status:x.status==="done"?"open":"done"}:x));
  const add=()=>{if(!f.title)return;setTasks(t=>[...t,{id:uid(),...f,status:"open",created:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),comments:0}]);setF({title:"",assigned:"",due:"",priority:"med"});setAdding(false);};
  const vis=tasks.filter(t=>filter==="all"||t.status===filter);
  const priC={high:"var(--acc)",med:"var(--amber)",low:"var(--t3)"};
  return (
    <div className="scroll"><div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
        <div style={{display:"flex",gap:5}}>{[["open","Open",tasks.filter(t=>t.status==="open").length],["done","Done",tasks.filter(t=>t.status==="done").length],["all","All",tasks.length]].map(([k,l,n])=><button key={k} className={`chip${filter===k?" on":""}`} onClick={()=>setFilter(k)}>{l} <span className="mono" style={{fontSize:8}}>{n}</span></button>)}</div>
        <button className="btn btn-primary btn-xs" onClick={()=>setAdding(v=>!v)}>{Ic.plus} Add Task</button>
      </div>
      {adding && <div className="card" style={{marginBottom:10}}><div className="g2" style={{gap:9,marginBottom:9}}><F label="Task *" value={f.title} onChange={v=>setF(p=>({...p,title:v}))} placeholder="Task description…" span={2}/><F label="Assigned To" value={f.assigned} onChange={v=>setF(p=>({...p,assigned:v}))} placeholder="Team member"/><F label="Due Date" value={f.due} onChange={v=>setF(p=>({...p,due:v}))} type="date"/><F label="Priority" value={f.priority} onChange={v=>setF(p=>({...p,priority:v}))} options={["high","med","low"]}/></div><div style={{display:"flex",justifyContent:"flex-end",gap:7}}><button className="btn btn-ghost btn-xs" onClick={()=>setAdding(false)}>Cancel</button><button className="btn btn-primary btn-xs" onClick={add}>Create</button></div></div>}
      {vis.map(t=>(
        <div key={t.id} className="row" style={{display:"flex",alignItems:"flex-start",gap:9,cursor:"pointer"}} onClick={()=>setExp(exp===t.id?null:t.id)}>
          <div className={`task-chk${t.status==="done"?" done":""}`} onClick={e=>{e.stopPropagation();toggle(t.id);}}>{t.status==="done"&&<span style={{color:"#fff"}}>{Ic.check}</span>}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:t.status==="done"?"var(--t3)":"var(--t1)",textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</div>
            <div style={{display:"flex",gap:9,marginTop:3,fontSize:10,color:"var(--t2)"}}>{t.assigned&&<span>{t.assigned}</span>}{t.due&&<span>Due {t.due}</span>}<span style={{color:"var(--t3)"}}>Created {t.created}</span></div>
            {exp===t.id&&<div style={{marginTop:8,padding:"8px 10px",background:"var(--s3)",borderRadius:7,fontSize:11,color:"var(--t3)",fontStyle:"italic"}}>No comments yet.</div>}
          </div>
          <div style={{width:7,height:7,borderRadius:"50%",background:priC[t.priority],flexShrink:0,marginTop:3}}/>
        </div>
      ))}
    </div></div>
  );
}

function BudgetTab({ proj, laborCost=0 }) {
  const cats=[{name:"Mitigation",budgeted:15000,actual:12400,color:"var(--blue)"},{name:"Equipment",budgeted:8500,actual:6800,color:"var(--purple)"},{name:"Demo",budgeted:6000,actual:0,color:"var(--amber)"},{name:"Reconstruction",budgeted:10000,actual:0,color:"var(--green)"},{name:"Contents",budgeted:2500,actual:1200,color:"var(--acc)"},{name:"Labor",budgeted:12000,actual:laborCost+1068.75,color:"var(--teal)"}];
  const tB=cats.reduce((s,c)=>s+c.budgeted,0),tA=cats.reduce((s,c)=>s+c.actual,0);
  return (
    <div className="scroll"><div style={{maxWidth:900,margin:"0 auto"}}>
      <div className="g4" style={{gap:9,marginBottom:16}}>
        {[["Total Budget",fmt$(tB),"var(--t1)"],["Invoiced",fmt$(tA),"var(--amber)"],["Remaining",fmt$(tB-tA),"var(--green)"],["Accounts Rec.",fmt$(8400),"var(--blue)"]].map(([l,v,c])=>(
          <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}><div className="kpi-val" style={{color:c}}>{v}</div><div className="kpi-lbl">{l}</div></div>
        ))}
      </div>
      {cats.map(cat=>{const p=pct(cat.actual,cat.budgeted);return(
        <div key={cat.name} className="card" style={{marginBottom:9}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <span style={{fontWeight:600,fontSize:13}}>{cat.name}</span>
            <div style={{display:"flex",gap:16}}>
              {[["Budgeted",fmt$(cat.budgeted),"var(--t1)"],["Actual",fmt$(cat.actual),cat.color],["Remaining",fmt$(cat.budgeted-cat.actual),cat.budgeted-cat.actual<0?"var(--acc)":"var(--t2)"]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"right"}}><div className="lbl">{l}</div><div className="mono" style={{fontSize:12,color:c,fontWeight:700}}>{v}</div></div>
              ))}
            </div>
          </div>
          <div className="bar-track" style={{height:6}}><div className="bar-fill" style={{width:`${p}%`,background:p>90?"var(--acc)":p>70?"var(--amber)":cat.color}}/></div>
          <div style={{fontSize:10,color:"var(--t3)",marginTop:3}}>{p}% utilized</div>
        </div>
      );})}
    </div></div>
  );
}

function ShiftsTab({ projId, externalShifts=[], canViewRates }) {
  const SEED=[{id:1,tech:"Jake Reynolds",task:"Initial extraction & setup",mode:"trade",position:"Lead Technician",rate:85,payRate:28,clockIn:"Dec 12 07:45 AM",clockOut:"Dec 12 04:30 PM",hours:8.75,notes:"Extracted ~480 SF, placed 8 air movers",laborCost:743.75},{id:2,tech:"Maria Santos",task:"Equipment monitoring",mode:"trade",position:"Field Technician",rate:65,payRate:22,clockIn:"Dec 13 08:00 AM",clockOut:"Dec 13 01:00 PM",hours:5.0,notes:"Day 2 readings logged in DryDox",laborCost:325}];
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
              {canViewRates && <span style={{color:"var(--amber)"}}> · ${sh.rate}/hr</span>}
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



function ScopeTab({ scopeItems: externalItems, setScopeItems: setExternal }) {
  const [internalItems, setInternal] = useState(SCOPE_SEED);
  const items    = externalItems !== undefined ? externalItems : internalItems;
  const setItems = externalItems !== undefined ? setExternal   : setInternal;

  const [showPL, setShowPL]     = useState(false);
  const [filterSrc, setFilter]  = useState("all");
  const upd = (id,k,v) => setItems(p=>p.map(i=>i.id===id?{...i,[k]:v}:i));
  const sub = items.reduce((s,i)=>s+i.qty*i.price, 0);
  const sources = [...new Set(items.map(i=>i.source||"manual").filter(Boolean))];

  const vis = filterSrc==="all" ? items : items.filter(i=>(i.source||"manual")===filterSrc);

  const SOURCE_BADGE = {
    drydox:     { label:"DryDox",     color:"var(--blue)"   },
    contentsdox:{ label:"ContentsDox",color:"var(--purple)" },
    manual:     { label:"Manual",     color:"var(--t3)"     },
  };

  return (
    <div className="scroll">
      {showPL && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowPL(false)}>
          <div className="modal anim">
            <div className="modal-hd"><div className="modal-ttl">Company Price List</div><button className="btn btn-ghost btn-xs" onClick={()=>setShowPL(false)}>{Ic.close}</button></div>
            <div className="modal-body">
              {PRICE_LIST.map(pl=>(
                <div key={pl.code} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:"1px solid var(--br)"}}>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{pl.desc}</div><div className="mono" style={{fontSize:10,color:"var(--t3)"}}>{pl.code}</div></div>
                  <div className="mono" style={{fontWeight:700,color:"var(--green)"}}>{fmt$c(pl.price)}</div>
                  <button className="btn btn-primary btn-xs" onClick={()=>{setItems(p=>[...p,{id:uid(),desc:pl.desc,unit:pl.unit,qty:1,price:pl.price}]);setShowPL(false);}}>{Ic.plus}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:900,margin:"0 auto"}}>
        {/* Source filter + header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div className="sec" style={{marginBottom:0}}>Scope of Work</div>
            {sources.length > 1 && (
              <div style={{display:"flex",gap:4,marginLeft:8}}>
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
          <div style={{display:"flex",gap:7}}>
            <button className="btn btn-secondary btn-xs" onClick={()=>setShowPL(true)}>{Ic.pricetag} Price List</button>
            <button className="btn btn-secondary btn-xs" onClick={()=>setItems(p=>[...p,{id:uid(),desc:"",unit:"SF",qty:1,price:0,source:"manual"}])}>{Ic.plus} Add Line</button>
          </div>
        </div>

        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 62px 70px 80px 80px 26px",gap:6,padding:"3px 9px",marginBottom:3}}>
          {["Description","Unit","Qty","Unit Price","Total",""].map((h,i)=><div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>)}
        </div>

        {vis.map(it=>{
          const src = SOURCE_BADGE[it.source||"manual"];
          return (
            <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 62px 70px 80px 80px 26px",gap:6,alignItems:"center",
              padding:"5px 9px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:7,marginBottom:3,
              borderLeft:`3px solid ${src?.color||"var(--br)"}`}}>
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
              <button className="btn btn-danger btn-xs" onClick={()=>setItems(p=>p.filter(i=>i.id!==it.id))}>{Ic.trash}</button>
            </div>
          );
        })}

        {/* Totals */}
        <div className="card" style={{marginTop:11,display:"flex",justifyContent:"flex-end"}}>
          <div style={{minWidth:260}}>
            {[["Subtotal",fmt$c(sub),"var(--t2)"],["Tax (0%)","$0.00","var(--t3)"],["TOTAL DUE",fmt$c(sub),"var(--green)"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:l==="TOTAL DUE"?"none":"1px solid var(--br)"}}>
                <span className="mono" style={{fontSize:9,color:c,fontWeight:l==="TOTAL DUE"?700:400}}>{l}</span>
                <span className="mono" style={{fontSize:l==="TOTAL DUE"?16:12,color:c,fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source summary */}
        {sources.filter(s=>s!=="manual").length > 0 && (
          <div style={{marginTop:8,padding:"9px 12px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,display:"flex",gap:14,flexWrap:"wrap"}}>
            {["drydox","contentsdox"].filter(s=>sources.includes(s)).map(s=>{
              const sc = items.filter(i=>(i.source||"manual")===s);
              const total = sc.reduce((sum,i)=>sum+i.qty*i.price,0);
              const badge = SOURCE_BADGE[s];
              return total>0?(
                <div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:badge.color,background:badge.color+"18",borderRadius:4,padding:"1px 7px",border:`1px solid ${badge.color}35`}}>{badge.label}</span>
                  <span className="mono" style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{fmt$c(total)}</span>
                </div>
              ):null;
            })}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",marginTop:9,gap:7}}>
          <button className="btn btn-ghost">Preview PDF</button>
          <button className="btn btn-primary btn-lg" onClick={()=>alert("Invoice generated and saved to Documents.")}>{Ic.invoice} Generate Invoice</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 · ENHANCED ADVANCED TOOLS PANEL (with Price Lists)
// ─────────────────────────────────────────────────────────────────────────────


function MessagesTab() {
  const [filter,setFilter]=useState("all");
  const [compose,setCompose]=useState(false);
  const [d,setD]=useState({to:"",subject:"",body:"",type:"email"});
  const typeC={email:"var(--blue)",call:"var(--green)",sms:"var(--amber)"};
  const typeI={email:Ic.mail,call:Ic.phone,sms:Ic.sms};
  const vis=filter==="all"?MSGS_SEED:MSGS_SEED.filter(m=>m.type===filter);
  return (
    <div className="scroll"><div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
        <div style={{display:"flex",gap:5}}>{[["all","All"],["email","Email"],["sms","SMS"],["call","Calls"]].map(([k,l])=><button key={k} className={`chip${filter===k?" on":""}`} onClick={()=>setFilter(k)}>{l}</button>)}</div>
        <button className="btn btn-primary btn-xs" onClick={()=>setCompose(v=>!v)}>{Ic.msg} Compose</button>
      </div>
      {compose && <div className="card" style={{marginBottom:11}}><div className="g3" style={{gap:9,marginBottom:9}}><F label="Type" value={d.type} onChange={v=>setD(p=>({...p,type:v}))} options={["email","sms","call"]}/><F label="To" value={d.to} onChange={v=>setD(p=>({...p,to:v}))} placeholder="Contact…" span={2}/></div>{d.type==="email"&&<div style={{marginBottom:9}}><F label="Subject" value={d.subject} onChange={v=>setD(p=>({...p,subject:v}))} placeholder="Subject"/></div>}<label className="lbl">Message</label><textarea className="txa" value={d.body} onChange={e=>setD(p=>({...p,body:e.target.value}))} style={{marginBottom:9}}/><div style={{display:"flex",justifyContent:"flex-end",gap:7}}><button className="btn btn-ghost btn-xs" onClick={()=>setCompose(false)}>Cancel</button><button className="btn btn-primary btn-xs">Send</button></div></div>}
      {vis.map(m=>{const c=typeC[m.type]||"var(--t2)";return(
        <div key={m.id} className="msg-row" style={{opacity:m.read?.8:1}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:c+"18",color:c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{typeI[m.type]}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontWeight:m.read?400:700,fontSize:12,color:"var(--t1)"}}>{m.from}</span><span style={{fontSize:10,color:"var(--t3)"}}>{m.time}</span></div>
            <div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.preview}</div>
          </div>
          {!m.read && <div style={{width:7,height:7,borderRadius:"50%",background:"var(--acc)",flexShrink:0,marginTop:3}}/>}
        </div>
      );})}
    </div></div>
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

const CONTENTS_SEED = [
  { id:1, room:"Living Room",   item:"Samsung 65\" QLED TV",           qty:1, condition:"Total Loss", repVal:1299, acvVal:780,  status:"claim"   },
  { id:2, room:"Living Room",   item:"Ashley Sectional Sofa (Gray)",    qty:1, condition:"Total Loss", repVal:1899, acvVal:1140, status:"claim"   },
  { id:3, room:"Living Room",   item:"Coffee Table — Wood",             qty:1, condition:"Damaged",    repVal:349,  acvVal:175,  status:"restore" },
  { id:4, room:"Kitchen",       item:"KitchenAid Stand Mixer (Red)",    qty:1, condition:"Restorable", repVal:479,  acvVal:320,  status:"restore" },
  { id:5, room:"Master Bedroom",item:"Casper King Mattress",            qty:1, condition:"Total Loss", repVal:1695, acvVal:1017, status:"claim"   },
  { id:6, room:"Master Bedroom",item:"IKEA Malm Dresser (6-drawer)",    qty:1, condition:"Damaged",    repVal:299,  acvVal:120,  status:"pending" },
];

const ITEM_STATUS = {
  pending:  { label:"Pending",  color:"var(--t3)" },
  claim:    { label:"To Claim", color:"var(--acc)" },
  restore:  { label:"Restore",  color:"var(--amber)" },
  cleared:  { label:"Cleared",  color:"var(--green)" },
};


function ContentsDoxTab({ proj, onPushToScope }) {
  const [items, setItems]   = useState(CONTENTS_SEED);
  const [roomF, setRoomF]   = useState("All");
  const [adding, setAdding] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);
  const [f, setF] = useState({room:"",item:"",qty:"1",condition:"Damaged",repVal:"",acvVal:"",status:"pending"});
  const rooms  = ["All",...new Set(items.map(i=>i.room))];
  const vis    = roomF==="All" ? items : items.filter(i=>i.room===roomF);
  const totRep = vis.reduce((s,i)=>s+i.repVal*(i.qty||1),0);
  const totAcv = vis.reduce((s,i)=>s+i.acvVal*(i.qty||1),0);

  const addItem = () => {
    if (!f.item) return;
    setItems(p=>[...p,{id:uid(),...f,qty:parseInt(f.qty)||1,repVal:parseFloat(f.repVal)||0,acvVal:parseFloat(f.acvVal)||0}]);
    setF({room:"",item:"",qty:"1",condition:"Damaged",repVal:"",acvVal:"",status:"pending"}); setAdding(false);
  };

  const pushClaimsToScope = () => {
    if (!onPushToScope) return;
    const claimItems = items.filter(i=>i.status==="claim");
    if (!claimItems.length) { setPushStatus("No items marked 'To Claim'. Set item status to 'claim' first."); return; }
    const lineItems = claimItems.map(i=>({
      id: uid(),
      desc: `Contents — ${i.item} (${i.room})`,
      unit: "EA", qty: i.qty||1, price: i.repVal,
      source: "contentsdox",
    }));
    onPushToScope(lineItems);
    setPushStatus(`✓ Pushed ${lineItems.length} contents claims to Scope/Invoice`);
    setTimeout(()=>setPushStatus(null), 4000);
  };

  return (
    <div className="scroll"><div style={{maxWidth:960,margin:"0 auto"}}>
      <div className="g4" style={{gap:9,marginBottom:16}}>
        {[["Total Items",items.length,"var(--t1)"],["Replacement Value",fmt$(totRep),"var(--amber)"],
          ["ACV",fmt$(totAcv),"var(--green)"],["To Claim",items.filter(i=>i.status==="claim").length,"var(--acc)"]
        ].map(([l,v,c])=>(
          <div key={l} className="kpi" style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9}}>
            <div className="kpi-val" style={{color:c}}>{v}</div><div className="kpi-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* Push to scope banner */}
      {onPushToScope && (
        <div style={{background:"rgba(91,163,245,.07)",border:"1px solid rgba(91,163,245,.2)",borderRadius:9,
          padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--blue)"}}>Push Contents Claims to Invoice</div>
            <div style={{fontSize:11,color:"var(--t2)",marginTop:1}}>{items.filter(i=>i.status==="claim").length} items marked "To Claim" · Replacement value {fmt$(items.filter(i=>i.status==="claim").reduce((s,i)=>s+i.repVal*(i.qty||1),0))}</div>
          </div>
          {pushStatus && <div style={{fontSize:11,fontWeight:700,color:pushStatus.startsWith("✓")?"var(--green)":"var(--amber)"}}>{pushStatus}</div>}
          <button className="btn btn-blue" onClick={pushClaimsToScope}>{Ic.invoice} Push Claims to Scope</button>
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:11,flexWrap:"wrap"}}>
        <span className="mono" style={{fontSize:9,color:"var(--t3)"}}>ROOM</span>
        {rooms.map(r=><button key={r} className={`chip${roomF===r?" on":""}`} onClick={()=>setRoomF(r)}>{r}</button>)}
        <div style={{flex:1}}/>
        <button className="btn btn-primary btn-xs" onClick={()=>setAdding(v=>!v)}>{Ic.plus} Add Item</button>
      </div>

      {adding && (
        <div className="card" style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px 120px",gap:9,marginBottom:9}}>
            <F label="Room" value={f.room} onChange={v=>setF(p=>({...p,room:v}))} placeholder="e.g. Living Room"/>
            <F label="Item Description" value={f.item} onChange={v=>setF(p=>({...p,item:v}))} placeholder="Brand + item name"/>
            <F label="Qty" value={f.qty} onChange={v=>setF(p=>({...p,qty:v}))} placeholder="1"/>
            <F label="Condition" value={f.condition} onChange={v=>setF(p=>({...p,condition:v}))} options={["Damaged","Total Loss","Restorable","Undamaged"]}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:9}}>
            <F label="Replacement Value ($)" value={f.repVal} onChange={v=>setF(p=>({...p,repVal:v}))} placeholder="0.00"/>
            <F label="ACV ($)" value={f.acvVal} onChange={v=>setF(p=>({...p,acvVal:v}))} placeholder="0.00"/>
            <F label="Status" value={f.status} onChange={v=>setF(p=>({...p,status:v}))} options={["pending","claim","restore","cleared"]}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:7}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-xs" onClick={addItem}>Add to List</button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 130px 90px 100px 100px 84px 24px",gap:4,padding:"3px 11px",marginBottom:4}}>
        {["Item","Room","Condition","Rep. Value","ACV","Status",""].map((h,i)=><div key={i} className="mono" style={{fontSize:8,color:"var(--t3)"}}>{h}</div>)}
      </div>
      {vis.map(it=>{
        const st = ITEM_STATUS[it.status]||ITEM_STATUS.pending;
        return (
          <div key={it.id} className="row" style={{display:"grid",gridTemplateColumns:"1fr 130px 90px 100px 100px 84px 24px",gap:4,alignItems:"center",marginBottom:4}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.item}</div>
              {(it.qty||1)>1&&<div style={{fontSize:10,color:"var(--t3)"}}>Qty: {it.qty}</div>}
            </div>
            <div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.room}</div>
            <div style={{fontSize:11,color:it.condition==="Total Loss"?"var(--acc)":it.condition==="Restorable"?"var(--amber)":"var(--t2)"}}>{it.condition}</div>
            <div className="mono" style={{fontSize:11,fontWeight:700,color:"var(--amber)"}}>{fmt$(it.repVal*(it.qty||1))}</div>
            <div className="mono" style={{fontSize:11,fontWeight:700,color:"var(--green)"}}>{fmt$(it.acvVal*(it.qty||1))}</div>
            <select className="sel" value={it.status} onChange={e=>setItems(p=>p.map(x=>x.id===it.id?{...x,status:e.target.value}:x))}
              style={{height:26,fontSize:10,padding:"2px 6px",color:st.color,fontWeight:700}}>
              {Object.keys(ITEM_STATUS).map(k=><option key={k} value={k}>{ITEM_STATUS[k].label}</option>)}
            </select>
            <button className="btn btn-danger btn-xs" style={{padding:"2px 5px"}} onClick={()=>setItems(p=>p.filter(x=>x.id!==it.id))}>{Ic.trash}</button>
          </div>
        );
      })}
      <div style={{marginTop:12,padding:"10px 13px",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:9,display:"flex",gap:24,justifyContent:"flex-end",alignItems:"center"}}>
        <div style={{fontSize:11,color:"var(--t3)"}}>{vis.length} items shown</div>
        <div><div className="lbl">Rep. Value</div><div className="mono" style={{fontSize:13,fontWeight:700,color:"var(--amber)"}}>{fmt$(vis.reduce((s,i)=>s+i.repVal*(i.qty||1),0))}</div></div>
        <div><div className="lbl">ACV Total</div><div className="mono" style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>{fmt$(vis.reduce((s,i)=>s+i.acvVal*(i.qty||1),0))}</div></div>
      </div>
    </div></div>
  );
}

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
  {key:"budget",      label:"Budget",         icon:Ic.dollar  },
  {key:"shifts",      label:"Shift Reports",  icon:Ic.clock   },
  {key:"scope",       label:"Scope/Invoice",  icon:Ic.scope   },
  {key:"messages",       label:"Messages",       icon:Ic.msg         },
  {key:"project-report", label:"Project Report", icon:Ic.proj_report },
];



function ProjectDetail({ proj, onBack, attrDefs, initialTab, clockInState, onClockIn, onClockOut, projectShifts, currentUser, canViewRates, globalStaff=[], priceLists=[], setPriceLists }) {
  const [tab,setTab]           = useState(initialTab||"overview");
  const [notifyModal,setNotify]= useState(false);
  const [commModal,setComm]    = useState(false);
  const [clockModal,setClock]  = useState(false);
  // Shared state lifted so all tabs stay in sync
  const [dailyNotes, setDailyNotes]     = useState(DAILY_NOTES_SEED);
  const [emailSchedule, setEmailSched]  = useState("weekly");
  const [clientPortal, setClientPortal] = useState(true);
  const [mediaFolders, setMediaFolders] = useState(["Day 1 — Initial Documentation","Moisture Mapping","Equipment Setup"]);
  const [mediaUploads, setMediaUploads] = useState([]);
  const [projDocs, setProjDocs]         = useState(DOCS_SEED);
  // ── Scope items lifted here so DryDox + ContentsDox can push to it ──
  const [scopeItems, setScopeItems]     = useState(SCOPE_SEED);
  // ── Work types: seeded from project data, managed locally + synced to localStorage ──
  const [worktypes, setWorktypes]       = useState(proj.worktypes || []);

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
      {commModal   && <CommModal    proj={proj} onClose={()=>setComm(false)}/>}
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
        {PROJ_TABS.map(t=>(
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
      {tab==="overview"       && <OverviewTab    proj={proj} attrDefs={attrDefs} dailyNotes={dailyNotes} setDailyNotes={setDailyNotes} emailSchedule={emailSchedule} setEmailSchedule={setEmailSched} clientPortal={clientPortal} setClientPortal={setClientPortal} globalStaff={globalStaff} worktypes={worktypes} setWorktypes={setWorktypes}/>}
      {tab==="drydox"         && <DryDoxTab      proj={proj} priceLists={priceLists} onPushToScope={handlePushToScope}/>}
      {tab==="contentsdox"    && <ContentsDoxTab proj={proj} onPushToScope={handlePushToScope}/>}
      {tab==="estimatedox"    && <EstimateDoxTab proj={proj}/>}
      {tab==="contacts"       && <ContactsTab/>}
      {tab==="media"          && <MediaTab       folders={mediaFolders} setFolders={setMediaFolders} uploads={mediaUploads} setUploads={setMediaUploads}/>}
      {tab==="documents"      && <DocumentsTab   docs={projDocs} setDocs={setProjDocs}/>}
      {tab==="tasks"          && <TasksTab initialTasks={proj.templateTasks||[]}/>}
      {tab==="budget"         && <BudgetTab proj={proj} laborCost={laborCost}/>}
      {tab==="shifts"         && <ShiftsTab projId={proj.id} externalShifts={myShifts} canViewRates={canViewRates}/>}
      {tab==="scope"          && <ScopeTab scopeItems={scopeItems} setScopeItems={setScopeItems}/>}
      {tab==="messages"       && <MessagesTab/>}
      {tab==="project-report" && <ProjectReportTab proj={proj} dailyNotes={dailyNotes} mediaFolders={mediaFolders} mediaUploads={mediaUploads} docs={projDocs}/>}
    </>
  );
}






function AdvToolsPanel({ onClose, priceLists, setPriceLists }) {
  const [showPLManager, setShowPLManager] = useState(false);
  const TOOLS = [
    { icon:Ic.mindflow, label:"CortexAI",           desc:"AI-powered workflow generation", link:"mindflow.html" },
    { icon:Ic.pricetag, label:"Price Lists",         desc:`${priceLists.length} lists · Manage equipment & material pricing`, action:()=>setShowPLManager(true) },
    { icon:Ic.attr,     label:"Attribute Templates", desc:"Configure custom project fields" },
    { icon:Ic.report,   label:"Reporting",           desc:"Advanced analytics & exports" },
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
  const [sec, setSec]         = useState("worktypes");
  const [workTypes, setWT]    = useState(loadCWT);
  const [statuses,  setST]    = useState(loadCST);
  const [projTypes, setPT]    = useState(loadCPT);
  const [editId,    setEditId]= useState(null);
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

  const SECTIONS = [
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

function SettingsPage({ globalStaff, setGlobalStaff }) {
  const [tab,    setTab]    = useState("staff");
  const [editId, setEditId] = useState(null);   // null = adding new
  const [showForm, setShowForm] = useState(false);
  const blank = { firstName:"", lastName:"", email:"", phone:"", systemRole:"Project Manager", title:"", photoUrl:"" };
  const [form,   setForm]   = useState(blank);
  const fileRef = useRef();

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photoUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = s => {
    setForm({ firstName:s.firstName, lastName:s.lastName, email:s.email,
              phone:s.phone, systemRole:s.systemRole, title:s.title, photoUrl:s.photoUrl||"" });
    setEditId(s.id);
    setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditId(null); };

  const saveStaff = () => {
    if (!form.firstName.trim() || !form.email.trim()) return;
    let next;
    if (editId) {
      next = globalStaff.map(s => s.id === editId ? { ...s, ...form } : s);
    } else {
      next = [...globalStaff, { ...form, id: uid(), color: ROLE_COLORS[form.systemRole] || "#5ba3f5" }];
    }
    setGlobalStaff(next);
    syncStaffToLS(next);
    setShowForm(false);
    setEditId(null);
  };

  const removeStaff = id => {
    const next = globalStaff.filter(s => s.id !== id);
    setGlobalStaff(next);
    syncStaffToLS(next);
  };

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

  const TABS = [["staff","Staff"],["cortex","CortexAI"],["general","General"],["roadmap","Roadmap"]];

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
                  Staff added here sync automatically to CortexAI for workflow task assignment by System Role.
                </div>
              </div>
              {!showForm && (
                <button className="btn btn-primary" onClick={openAdd}>{Ic.plus} Add Staff Member</button>
              )}
            </div>

            {/* Add / Edit form */}
            {showForm && (
              <div style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:10,padding:20,marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:16,color:"var(--t1)"}}>
                  {editId ? "Edit Staff Member" : "Add Staff Member"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  {fld("First Name","firstName",{required:true,placeholder:"First name"})}
                  {fld("Last Name","lastName",{placeholder:"Last name"})}
                  {fld("Email Address","email",{required:true,type:"email",placeholder:"name@company.com"})}
                  {fld("Phone Number","phone",{placeholder:"(405) 555-0000"})}
                  {fld("System Role","systemRole",{options:SYSTEM_ROLES})}
                  {fld("Public Title","title",{placeholder:"e.g. Senior Technician, Field Lead"})}
                </div>

                {/* Role assignment note */}
                <div style={{background:"var(--s3)",borderRadius:7,padding:"8px 13px",marginBottom:14,
                  display:"flex",alignItems:"center",gap:8,fontSize:11,color:"var(--t2)"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:ROLE_COLORS[form.systemRole]||"#5ba3f5",flexShrink:0}}/>
                  <span>System Role: <strong style={{color:ROLE_COLORS[form.systemRole]||"#5ba3f5"}}>{form.systemRole}</strong>
                  <span style={{color:"var(--t3)",marginLeft:6}}>— CortexAI will auto-assign tasks with this role to this person.</span></span>
                </div>

                {/* Photo */}
                <div style={{marginBottom:16}}>
                  <label className="lbl">Profile Photo</label>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",
                      background:"var(--s3)",border:`2px solid ${ROLE_COLORS[form.systemRole]||"#5ba3f5"}`,
                      flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {form.photoUrl
                        ? <img src={form.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : <span style={{fontWeight:700,fontSize:16,color:ROLE_COLORS[form.systemRole]||"#5ba3f5"}}>
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

                <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                  <button className="btn btn-ghost" onClick={cancelForm}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveStaff}>
                    {editId ? "Save Changes" : "Add Member"}
                  </button>
                </div>
              </div>
            )}

            {/* Staff roster */}
            {globalStaff.length === 0 ? (
              <div style={{textAlign:"center",padding:"52px 0",color:"var(--t3)",background:"var(--s1)",borderRadius:10,border:"1px solid var(--br)"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No staff members yet</div>
                <div style={{fontSize:11}}>Add your first team member to get started.</div>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div style={{display:"grid",gridTemplateColumns:"48px 1fr 190px 200px 160px 140px 72px",
                  gap:10,padding:"3px 14px",marginBottom:6}}>
                  {["","Name","System Role","Email","Phone","Title",""].map((h,i) => (
                    <div key={i} className="mono" style={{fontSize:9,color:"var(--t3)"}}>{h}</div>
                  ))}
                </div>
                {globalStaff.map(s => {
                  const rc = ROLE_COLORS[s.systemRole] || "#5ba3f5";
                  return (
                    <div key={s.id} style={{display:"grid",
                      gridTemplateColumns:"48px 1fr 190px 200px 160px 140px 72px",
                      gap:10,alignItems:"center",padding:"10px 14px",
                      background:"var(--s2)",border:"1px solid var(--br)",
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
                        <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{s.firstName} {s.lastName}</div>
                        {s.title && <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{s.title}</div>}
                      </div>
                      {/* System role */}
                      <div>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,
                          borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,
                          background:`${rc}18`,color:rc,border:`1px solid ${rc}35`}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:rc,flexShrink:0}}/>
                          {s.systemRole}
                        </span>
                      </div>
                      {/* Email */}
                      <div style={{fontSize:11,color:"var(--blue)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.email}</div>
                      {/* Phone */}
                      <div style={{fontSize:11,color:"var(--t2)"}}>{s.phone||"—"}</div>
                      {/* Title */}
                      <div style={{fontSize:11,color:"var(--t3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title||"—"}</div>
                      {/* Actions */}
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn btn-ghost btn-xs" title="Edit" onClick={()=>openEdit(s)}>{Ic.doc}</button>
                        <button className="btn btn-danger btn-xs" title="Remove" onClick={()=>removeStaff(s.id)}>{Ic.trash}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CortexAI sync notice */}
            <div style={{marginTop:20,background:"rgba(91,163,245,0.07)",border:"1px solid rgba(91,163,245,0.18)",
              borderRadius:9,padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{color:"var(--blue)",flexShrink:0,marginTop:1}}>{Ic.mindflow}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--blue)",marginBottom:4}}>CortexAI Staff Sync</div>
                <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.7}}>
                  Staff saved here are written to <code style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--t1)"}}>localStorage</code> and
                  picked up automatically by CortexAI (mindflow.html) within 2 seconds.
                  Open both files in the same browser — no manual sync required.
                  Tasks are matched to staff by <strong style={{color:"var(--t1)"}}>System Role</strong>.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CORTEXAI TAB ── */}
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

        {tab==="general" && (
          <GeneralSettingsTab/>
        )}
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
  const [isLight,       setIsLight]      = useState(false);
  const [showTools,     setShowTools]    = useState(false);
  const [clockInState,  setClockInState] = useState(null);
  const [projectShifts, setProjectShifts]= useState({});
  const [permission,    setPermission]   = useState("admin");
  const [globalStaff,      setGlobalStaff]     = useState([]);
  const [companyId,        setCompanyId]       = useState(null);
  const [priceLists,       setPriceLists]      = useState(INITIAL_PRICE_LISTS);
  const [customWorkTypes,  setCustomWorkTypes] = useState(loadCWT);
  const [customStatuses,   setCustomStatuses]  = useState(loadCST);
  const [customProjectTypes,setCustomProjectTypes] = useState(loadCPT);
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

  const permCycle  = ["admin","manager","staff"];
  const cyclePerms = () => setPermission(p => permCycle[(permCycle.indexOf(p)+1) % permCycle.length]);
  const canViewRates  = PERM_CONFIG[permission]?.canViewRates ?? false;
  const currentUser   = CURRENT_USER;

  // ── Resolve companyId from Memberstack, then stream projects from Firestore ──
  useEffect(() => {
    let unsub = null;
    function getMember() {
      if (!window.$memberstackDom) { setTimeout(getMember, 250); return; }
      window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
        if (!member) return;
        const cid = member.id;
        setCompanyId(cid);
        const q = query(
          collection(db, "companies", cid, "projects"),
          orderBy("createdAt", "desc")
        );
        unsub = onSnapshot(q, snap => {
          setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      });
    }
    getMember();
    return () => { if (unsub) unsub(); };
  }, []);

  // ── Add project — saves to Firestore, listener updates state automatically ──
  const handleAddProject = async (p) => {
    if (!companyId) return;
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
        id: uid(), tech: "Tyler Mitchell", task: clockInState.label, mode: "auto",
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
    const obs = new MutationObserver(()=>setIsLight(document.body.classList.contains("jd-light-mode")));
    obs.observe(document.body,{attributes:true,attributeFilter:["class"]});
    return ()=>{ obs.disconnect(); document.body.classList.remove("jd-new-theme"); try{document.head.removeChild(document.getElementById("jdp2css"));}catch(_){} };
  },[]);

  const toggleTheme = () => {
    if (window.JDTheme?.toggleColorMode) window.JDTheme.toggleColorMode();
    else document.body.classList.toggle("jd-light-mode");
  };

  const navTo = (pg) => { setPage(pg); setSelected(null); setShowTools(false); };

  return (
    <div className={`jdp${isLight?" lt":""}`}>
      {showTools && <AdvToolsPanel onClose={()=>setShowTools(false)} priceLists={priceLists} setPriceLists={setPriceLists}/>}
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
        <button className="rail-btn" data-tip={`Permission: ${PERM_CONFIG[permission].label} — click to switch`}
          onClick={cyclePerms} style={{position:"relative"}}>
          {Ic.account}
          <span style={{position:"absolute",bottom:5,right:5,fontSize:7,fontFamily:"var(--mono)",fontWeight:700,
            background:permission==="admin"?"var(--acc)":permission==="manager"?"var(--blue)":"var(--t3)",
            color:"#fff",borderRadius:3,padding:"1px 3px",lineHeight:1.2,letterSpacing:".02em"}}>
            {permission==="admin"?"ADM":permission==="manager"?"MGR":"STF"}
          </span>
        </button>
        <button className="rail-btn" data-tip={isLight?"Dark mode":"Light mode"} onClick={toggleTheme} style={{color:isLight?"var(--t2)":"#f5c518"}}>
          {isLight ? Ic.sun : Ic.moon}
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
            <SettingsPage globalStaff={globalStaff} setGlobalStaff={setGlobalStaff}/>
          </>
        ) : page==="myday" ? (
          <MyDayPage onNavigate={handleNavigate}/>
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
            globalStaff={globalStaff}
            priceLists={priceLists}
            setPriceLists={setPriceLists}
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
            globalStaff={globalStaff}
            customWorkTypes={customWorkTypes}
            customStatuses={customStatuses}
            customProjectTypes={customProjectTypes}
          />
        )}
      </div>
    </div>
  );
}
