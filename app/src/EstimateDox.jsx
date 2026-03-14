/**
 * EstimateDox.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Good / Better / Best estimate builder extracted from JobDoxPortal.
 *
 * EXPORTS:
 *   EstimateDoxTab    → main tab component, drop into ProjectDetail
 *   loadProjEstimates → read saved estimates for a project (used by FinancialTab)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";

/* ── localStorage persistence for project estimates ── */
const LS_ESTIMATES = "jd_estimates";
function loadProjEstimates(projId) {
  try { const all = JSON.parse(localStorage.getItem(LS_ESTIMATES)) || {}; return all[projId] || []; } catch { return []; }
}
function saveProjEstimates(projId, estimates) {
  try { const all = JSON.parse(localStorage.getItem(LS_ESTIMATES)) || {}; all[projId] = estimates; localStorage.setItem(LS_ESTIMATES, JSON.stringify(all)); } catch {}
}
export { loadProjEstimates };

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
  const [estimates, setEstimates] = useState(()=>loadProjEstimates(proj.id));
  // Persist estimates to localStorage whenever they change
  useEffect(()=>{ saveProjEstimates(proj.id, estimates); },[proj.id, estimates]);
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

export default EstimateDoxTab;
