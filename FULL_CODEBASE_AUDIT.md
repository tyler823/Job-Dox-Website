# Job-Dox / Cortex — Full Codebase Audit

Generated: 2026-03-15
Covers: Every file in the repository

---

## 1. FULL FILE TREE

```
.
├── .gitignore
├── netlify.toml
├── index.html                          # Marketing homepage
├── blog.html                           # Blog index
├── blog-ai-eliminates-paperwork-water-damage-restoration.html
├── blog-ai-job-documentation-insurance-claims-restoration.html
├── blog-ai-project-management-software-restoration-contractors.html
├── blog-best-restoration-management-software-2026.html
├── blog-reduce-overhead-costs-restoration-business-ai.html
├── faqs.html                           # FAQ page
├── partners.html                       # Partners page
├── privacy-policy.html                 # Privacy policy
├── support.html                        # Support / contact
├── terms-conditions.html               # Terms & conditions
├── university.html                     # Knowledge base / help center
├── mindflow.html                       # CortexAI Workflow Builder (standalone)
│
├── field/
│   ├── index.html                      # Cortex Field app (standalone HTML+React)
│   └── manifest.json                   # PWA manifest for Field app
│
├── shared/
│   ├── constants.js                    # Shared constants (project types, statuses, roles, triggers, scopes)
│   ├── firebase.js                     # Shared Firebase SDK client (auth, Firestore, storage, event bus)
│   ├── apple-touch-icon.png
│   ├── favicon-32x32.png
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── icon.svg
│
├── app/
│   ├── index.html                      # Vite entry point (loads Memberstack + React)
│   ├── manifest.json                   # PWA manifest for Portal app
│   ├── package.json                    # Dependencies: React 18, Firebase, Capacitor, html2canvas
│   ├── package-lock.json               # Lock file
│   ├── vite.config.js                  # Vite config (base: /app/dist/)
│   ├── capacitor.config.ts             # Capacitor native app config (iOS)
│   ├── IOS_SETUP.md                    # iOS build setup documentation
│   │
│   ├── src/
│   │   ├── main.jsx                    # React entry — renders JobDoxPortal
│   │   ├── firebase.js                 # Re-exports everything from ../../shared/firebase.js
│   │   ├── JobDoxPortal.jsx            # Main portal app (~13,000+ lines)
│   │   ├── JobDoxDispatch.jsx          # Dispatch / scheduling module
│   │   ├── JobDoxDocuments.jsx         # Document builder / signing module
│   │   ├── JobDoxFinance.jsx           # Finance / invoicing / budgets module
│   │   ├── JobDoxPayroll.jsx           # Payroll / time tracking module
│   │   ├── JobDoxReports.jsx           # Reports & analytics module
│   │   ├── JobDoxTimeOff.jsx           # Time-off / PTO management module
│   │   ├── ContentsDox.jsx             # Contents inventory / pack-out module
│   │   ├── EstimateDox.jsx             # Estimate builder module
│   │   ├── AdjusterResponseBot.jsx     # AI adjuster response composer
│   │   ├── DryDox.jsx                  # DryDox main entry (wrapper for sub-modules)
│   │   │
│   │   ├── drydox/
│   │   │   ├── DryDoxConstants.jsx     # DryDox constants (equipment types, measurement thresholds)
│   │   │   ├── DryDoxESX.jsx           # ESX export / Xactimate integration
│   │   │   ├── DryDoxEquipment.jsx     # Equipment tracking sub-module
│   │   │   ├── DryDoxFloorPlan.jsx     # Floor plan / room layout (with LiDAR support)
│   │   │   ├── DryDoxMoisture.jsx      # Moisture readings / monitoring sub-module
│   │   │   ├── DryDoxReport.jsx        # DryDox PDF report generator
│   │   │   ├── DryDoxS500.jsx          # S500 compliance checker
│   │   │   └── DryDoxScope.jsx         # Scope of work sub-module
│   │   │
│   │   └── plugins/
│   │       ├── jobdox-lidar.js         # LiDAR plugin JS bridge (Capacitor)
│   │       └── jobdox-lidar-web.js     # Web fallback (LiDAR not available)
│   │
│   └── ios-plugins/
│       └── JobDoxLiDAR/
│           ├── Package.swift           # Swift Package Manager manifest
│           └── Sources/
│               ├── JobDoxLiDARPlugin.m  # ObjC bridge for Capacitor
│               └── JobDoxLiDARPlugin.swift  # Native RoomPlan LiDAR scanner
│
└── netlify/
    └── functions/
        ├── package.json                # Deps: firebase-admin, nodemailer, twilio
        ├── _firebase.js                # Shared Firebase Admin SDK initializer
        ├── _api-helpers.js             # Shared API key auth, rate limiting, CORS
        ├── adjuster-response.js        # AI adjuster response generator
        ├── api-keys.js                 # API key management (generate/list/revoke)
        ├── api-projects.js             # Standalone projects API endpoint
        ├── api-v1.js                   # Full REST API v1 (projects, staff, events, webhooks, company)
        ├── api-webhooks-deliver.js     # Webhook delivery worker
        ├── call-complete.js            # Twilio call status callback
        ├── call-recording-ready.js     # Twilio recording ready callback
        ├── call-transcribe.js          # AI call transcription + project creation
        ├── clear-session.js            # Clear Memberstack active session
        ├── cortex-coins.js             # AI usage tracking (28-day billing cycles)
        ├── cortex-generate.js          # CortexAI workflow + comparable lookup
        ├── extract-price.js            # Web scraper for product prices (ContentsDox)
        ├── finance-analyze.js          # AI financial analysis
        ├── generate-webhook-token.js   # Marketing webhook token generator
        ├── handle-voice.js             # Twilio inbound voice handler (v2, with forwarding)
        ├── inbound-call.js             # Twilio inbound call handler (v1, ring groups)
        ├── initiate-call.js            # Outbound call via Twilio
        ├── marketing-webhook.js        # Zapier webhook for Google Ads/Analytics data
        ├── receive-sms.js              # Twilio inbound SMS webhook
        ├── reports-analyze.js          # AI reports analysis
        ├── save-phone-settings.js      # Save Twilio/phone config to Firestore
        ├── send-feature-request.js     # Feature request email via SMTP
        ├── send-review-request.js      # Google Business review request via SMS
        ├── send-signing-request.js     # Document signing request via SMS
        ├── send-sms.js                 # Outbound SMS/MMS via Twilio
        ├── yard-sign.js                # Public yard sign SEO pages (SSR HTML)
        └── yard-sign-sitemap.js        # XML sitemap for yard signs
```

---

## 2. PER-FILE SUMMARY

### Root Config Files

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `.gitignore` | Config | Ignores node_modules, dist, *.log, .env, .DS_Store | — |
| `netlify.toml` | Config | Build command (`cd app && npm install && npm run build`), publish root `.`, functions dir `netlify/functions`. Redirects: `/field/*` → field SPA, `/app/*` and `/portal/*` → app SPA, `/pros/*` → yard-sign function, `/sitemap-yards.xml` → yard-sign-sitemap, `/api/marketing-data/*` → marketing-webhook, `/api/generate-webhook-token` → function. Security headers (X-Frame-Options DENY, nosniff, strict referrer). CORS headers for cortex-generate and finance-analyze. Plugin: `@netlify/plugin-functions-install-core` | Netlify |

### Root HTML Files (Marketing Site)

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `index.html` | Marketing page | Homepage with pricing, features, CTAs. Loads Memberstack for signup/login modals. Handles `?invite=` param for team invites. Has Calendly integration (data attribute), chat widget stub. | Memberstack (app_cmmm8x9fr00dg0utoabyje7x9) |
| `blog.html` | Marketing page | Blog index listing all posts | — |
| `blog-ai-eliminates-paperwork-*.html` | Blog post | SEO content about AI + water damage documentation | — |
| `blog-ai-job-documentation-*.html` | Blog post | SEO content about AI + insurance claims | — |
| `blog-ai-project-management-*.html` | Blog post | SEO content about AI project management for restoration | — |
| `blog-best-restoration-management-*.html` | Blog post | SEO content about best restoration software 2026 | — |
| `blog-reduce-overhead-costs-*.html` | Blog post | SEO content about reducing costs with AI | — |
| `faqs.html` | Marketing page | FAQ accordion page | — |
| `partners.html` | Marketing page | Partner program info | — |
| `privacy-policy.html` | Legal page | Privacy policy | — |
| `terms-conditions.html` | Legal page | Terms and conditions | — |
| `support.html` | Marketing page | Support contact page with email, knowledge base links | — |
| `university.html` | Help center | Knowledge base with sidebar navigation, article views. Has placeholder sections for Document Templates and Workflow Templates (marked "Coming Soon"). | — |
| `mindflow.html` | Standalone tool | CortexAI Workflow Builder. Full SOP workflow editor with mindmap visualization, phase/task management, AI workflow generation, template system. Has built-in S500 Water Damage SOP template. | Firebase (hardcoded config), Anthropic API (via cortex-generate function), localStorage (multiple keys), Memberstack (permission checks) |

### Shared Directory

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `shared/constants.js` | Constants module | Single source of truth for PROJECT_TYPES, PROJECT_STATUSES, ROLES, AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS, EVENT_TYPES, API_SCOPES, WEBHOOK_EVENTS | Imported by portal and tools |
| `shared/firebase.js` | Firebase client SDK | Complete Firebase client: auth (email/password), Firestore CRUD for all collections, Storage for photos, event bus (emitEvent, listenProjectEvents, listenEventsByType), Cortex Coins frontend helpers, API key management helpers, webhook listeners, review request CRUD | Firebase project |
| `shared/*.png, shared/icon.svg` | Assets | App icons and favicons for PWA manifests | — |

### App Directory (Vite React Portal)

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `app/index.html` | HTML entry | Vite entry point. Loads Memberstack SDK, links to shared icons/manifest. noindex/nofollow. | Memberstack |
| `app/manifest.json` | PWA manifest | "Cortex App" PWA config, standalone, portrait | — |
| `app/package.json` | NPM config | Deps: React 18, Firebase 10, Capacitor 8, html2canvas. Scripts: dev, build via Vite | — |
| `app/vite.config.js` | Vite config | React plugin, base `/app/dist/`, output to `dist/` | — |
| `app/capacitor.config.ts` | Capacitor config | App ID `ai.jobdox.field`, name "Job-Dox Field", webDir `dist`, iOS/Android HTTPS schemes | Capacitor/iOS |
| `app/IOS_SETUP.md` | Documentation | iOS build setup instructions for the Capacitor native app | — |

### App Source Files (app/src/)

| File | Type | Purpose | Connects To | Gaps/Notes |
|------|------|---------|-------------|------------|
| `main.jsx` | Entry | Renders `<JobDoxPortal/>` inside StrictMode | JobDoxPortal.jsx | — |
| `firebase.js` | Re-export | Single line: `export * from "../../shared/firebase.js"` | shared/firebase.js | — |
| `JobDoxPortal.jsx` | Main component (~13k+ lines) | The entire portal app. Contains: project list, project detail, daily notes, tasks, contacts, shifts, messages (SMS/calls), dispatch embed, documents embed, finance embed, reports embed, payroll embed, DryDox embed, ContentsDox embed, EstimateDox embed, adjuster response bot, settings (company info, staff, offices, work types, statuses, automations, phone/calls, API keys, webhooks, marketing/MarketDox, cortex coins, billing), time-off embed, yard signs, notification center, message center, light/dark theme. | Firebase (inline config), Memberstack, Twilio (via send-sms function), all Netlify functions, localStorage (30+ keys), all child JSX modules | Has its own inline Firebase config (duplicated from shared). Extremely large single file. |
| `JobDoxDispatch.jsx` | Component | Dispatch board with calendar views (day/3-day/week/month), appointment scheduling, resource management, Google Maps geocoding cache, drag-and-drop, color-coded appointment types. | Firebase (via shared), localStorage (3 keys per company), Google Maps Geocoding API | Uses Google Maps API for geocoding — requires API key in code or environment |
| `JobDoxDocuments.jsx` | Component | Document builder with WYSIWYG-style template editor, merge fields, PDF export (html2canvas), e-signature system with GPS coordinates, sequential signing requests. | Firebase, localStorage (3 keys), send-signing-request function, html2canvas | — |
| `JobDoxFinance.jsx` | Component | Full financial module: invoice builder, vendor bills, project budgets, budget templates, AR/AP tracking, job costing, portfolio-level analytics, AI financial analysis. | Firebase, localStorage (6+ keys), finance-analyze function, Anthropic API | Line 3329 has dead code: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` — this is browser-side and would never work. The actual AI calls go through the Netlify function. |
| `JobDoxPayroll.jsx` | Component | Payroll processing: timecard calculation, overtime rules (daily/weekly/CA), payroll rates, QuickBooks Online export preparation, employee rate management. | Firebase, localStorage (3 keys: jd_payroll_rates, jd_employee_rates, jd_qbo_settings) | QBO integration is export-only (CSV format); no actual API connection to QuickBooks. |
| `JobDoxReports.jsx` | Component | Reports & analytics: project reports, financial summaries, equipment utilization, staff performance, AI-powered analysis. | Firebase, localStorage (reads invoices/budgets/vendor_bills), reports-analyze function | — |
| `JobDoxTimeOff.jsx` | Component | PTO / time-off management: request submission, approval workflow, calendar view, balance tracking. | Firebase | — |
| `ContentsDox.jsx` | Component | Contents inventory management: item cataloging with photos, condition assessment, AI comparable lookup for replacement values, pack-out tracking, activity log. | Firebase, localStorage (jd_company_info, jd_activities, per-project contents), cortex-generate function (comparable lookup), extract-price function | — |
| `EstimateDox.jsx` | Component | Estimate builder: line-item estimates, labor/materials/equipment, tax calculation, PDF export, estimate acceptance workflow. | Firebase, localStorage (jd_estimates per project) | — |
| `AdjusterResponseBot.jsx` | Component | AI-powered adjuster response composer: takes incoming adjuster email, project context, and generates professional rebuttal using IICRC/industry standards. | adjuster-response function (Anthropic API) | — |
| `DryDox.jsx` | Component (wrapper) | DryDox entry: orchestrates sub-modules (rooms, moisture, equipment, scope, S500, floor plan, ESX, report). Uses `usePersist` hook for dual localStorage + Firestore persistence. | Firebase, localStorage (dd_{projId}_* keys), all drydox/ sub-modules | — |

### DryDox Sub-Modules (app/src/drydox/)

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `DryDoxConstants.jsx` | Constants | Equipment types (dehumidifiers, air movers, air scrubbers), measurement thresholds, material types, drying classes/categories per IICRC S500 | — |
| `DryDoxESX.jsx` | Component | Xactimate ESX file export: converts DryDox data to Xactimate-compatible format for insurance billing | Parent DryDox state |
| `DryDoxEquipment.jsx` | Component | Equipment tracking: log placement, daily monitoring, equipment inventory with types from constants | Parent DryDox state |
| `DryDoxFloorPlan.jsx` | Component | Canvas-based floor plan editor: draw rooms, walls, doors, equipment placement. LiDAR integration for iOS devices. | LiDAR plugin, parent DryDox state |
| `DryDoxMoisture.jsx` | Component | Moisture readings: grid-based monitoring, readings log, psychrometric calculations, trend visualization | Parent DryDox state |
| `DryDoxReport.jsx` | Component | PDF report generator: compiles all DryDox data into a formatted report using html2canvas | Parent DryDox state, html2canvas |
| `DryDoxS500.jsx` | Component | IICRC S500 compliance checker: validates drying setup against S500 requirements, shows pass/fail per requirement | Parent DryDox state |
| `DryDoxScope.jsx` | Component | Scope of work builder: room-by-room scope documentation with affected areas and materials | Parent DryDox state |

### Plugins (app/src/plugins/)

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `jobdox-lidar.js` | Capacitor plugin bridge | Registers `JobDoxLiDAR` native plugin via Capacitor. Exports `checkSupport()` and `scanRoom()`. Falls back to web implementation. | Capacitor Core, native iOS plugin |
| `jobdox-lidar-web.js` | Web fallback | Returns `{ supported: false }` on web. Throws error on `scanRoom()` attempt. | — |

### iOS Native Plugins (app/ios-plugins/)

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `Package.swift` | Swift Package | Swift Package Manager manifest for JobDoxLiDAR, targets iOS 16+ | — |
| `JobDoxLiDARPlugin.m` | ObjC bridge | Objective-C bridge macro for Capacitor plugin registration | Capacitor |
| `JobDoxLiDARPlugin.swift` | Swift plugin | Native RoomPlan API integration for LiDAR room scanning. Returns room dimensions (width, depth, ceiling height, walls). | iOS RoomPlan framework |

### Field App (field/)

| File | Type | Purpose | Connects To |
|------|------|---------|-------------|
| `field/index.html` | Standalone app (~1100+ lines) | "Cortex Field" — mobile-first field technician app. Includes: auth (Memberstack + Firebase), project list, daily notes with photo upload, moisture readings, equipment logging, shift clock in/out with GPS, task management. Uses CDN React 18 + Babel (not Vite). | Memberstack (same app ID), Firebase (compat SDK via CDN), Firebase Storage, localStorage (jd_current_user) |
| `field/manifest.json` | PWA manifest | "Cortex Field" PWA config | — |

---

## 3. ALL localStorage KEYS

| Key | Written By | Read By | Data |
|-----|-----------|---------|------|
| `jd_company_config` | JobDoxPortal.jsx (line 708) | mindflow.html (lines 480, 869, 1220, 1348, 1915) | `{ workTypes, statuses, companyId, companyName }` |
| `jd_staff` | JobDoxPortal.jsx (line 977), mindflow.html (lines 553, 1906) | mindflow.html (line 544), JobDoxPortal.jsx (line 12592) | Array of staff objects `[{ id, name, role, phone, permission, ... }]` |
| `jd_current_user` | JobDoxPortal.jsx (lines 12537, 12570, 13317) | mindflow.html (line 774), field/index.html (line 161) | `{ permissionLevel, memberId }` |
| `jd-theme` | JobDoxPortal.jsx (line 13034), mindflow.html (line 1393) | JobDoxPortal.jsx (line 12311, 13018), mindflow.html (line 1932) | `"dark"` or `"light"` |
| `jd_workflow_templates` | mindflow.html (lines 1218, 1343) | mindflow.html (line 1158), JobDoxPortal.jsx (line 724) | `{ "Work Type Name": { phases: [...] }, ... }` |
| `jd_cortex_workflow` | mindflow.html (line 1243) | JobDoxPortal.jsx (reads for auto-apply) | Exported workflow JSON for auto-apply in portal |
| `jd_cortex_worktypes` | JobDoxPortal.jsx (line 9290) | JobDoxPortal.jsx (line 9288) | `{ "Work Type": true }` — flags active work types for CortexAI |
| `jd_company_info` | JobDoxPortal.jsx (LS_CO_KEY), ContentsDox.jsx (line 1108) | JobDoxPortal.jsx, ContentsDox.jsx (line 1100) | Company info: `{ name, address, phone, email, logo, ... }` |
| `jd_offices` | JobDoxPortal.jsx (LS_OFFICES_KEY) | JobDoxPortal.jsx | Array of office objects |
| `jd_billing` | JobDoxPortal.jsx (LS_BILLING) | JobDoxPortal.jsx | Billing config object |
| `jd_budget_templates` | JobDoxPortal.jsx (LS_BUDGET_TEMPLATES), JobDoxFinance.jsx | JobDoxPortal.jsx, JobDoxFinance.jsx | Budget category templates |
| `jd_invoices` | JobDoxPortal.jsx (LS_INVOICES), JobDoxFinance.jsx | JobDoxPortal.jsx, JobDoxFinance.jsx, JobDoxReports.jsx | Array of invoice objects |
| `jd_proj_docs` | JobDoxPortal.jsx (LS_PROJ_DOCS), DryDox.jsx | JobDoxPortal.jsx | `{ projectId: [doc objects] }` |
| `jd_proj_msgs` | JobDoxPortal.jsx (LS_PROJ_MSGS) | JobDoxPortal.jsx | `{ projectId: [message objects] }` |
| `jd_vendors` | JobDoxPortal.jsx (LS_VENDORS) | JobDoxPortal.jsx, JobDoxFinance.jsx | Array of vendor objects |
| `jd_vendor_bills` | JobDoxPortal.jsx (LS_VENDOR_BILLS), JobDoxFinance.jsx | JobDoxPortal.jsx, JobDoxFinance.jsx, JobDoxReports.jsx | Array of vendor bill objects |
| `jd_custom_work_types` | JobDoxPortal.jsx (LS_CWT_KEY) | JobDoxPortal.jsx | Array of custom work type strings |
| `jd_custom_statuses` | JobDoxPortal.jsx (LS_CST_KEY) | JobDoxPortal.jsx | Array of custom status objects |
| `jd_custom_project_types` | JobDoxPortal.jsx (LS_CPT_KEY) | JobDoxPortal.jsx | Array of custom project type strings |
| `jd_wf_templates` | JobDoxPortal.jsx (LS_WF_TEMPLATES_KEY) | JobDoxPortal.jsx | Workflow templates keyed by work type |
| `jd_activity` | JobDoxPortal.jsx (LS_ACTIVITY) | JobDoxPortal.jsx | Activity log array |
| `jd_project_budgets` | JobDoxPortal.jsx, JobDoxFinance.jsx | JobDoxPortal.jsx, JobDoxFinance.jsx, JobDoxReports.jsx | `{ projectId: budget object }` |
| `jd_payroll_rates` | JobDoxPayroll.jsx (LS_PAYROLL_RATES) | JobDoxPayroll.jsx | Payroll rate definitions |
| `jd_employee_rates` | JobDoxPayroll.jsx (LS_EMPLOYEE_RATES) | JobDoxPayroll.jsx | `{ staffId: rate }` |
| `jd_qbo_settings` | JobDoxPayroll.jsx (LS_QBO_SETTINGS) | JobDoxPayroll.jsx | QuickBooks export settings |
| `jd_doc_templates` | JobDoxDocuments.jsx (LS_TMPL) | JobDoxDocuments.jsx | Document template array |
| `jd_documents` | JobDoxDocuments.jsx (LS_DOCS) | JobDoxDocuments.jsx | All documents array |
| `jd_doc_company_info` | JobDoxDocuments.jsx (LS_CO) | JobDoxDocuments.jsx | Company info for doc headers |
| `jd_estimates` | EstimateDox.jsx (LS_ESTIMATES) | EstimateDox.jsx | `{ projectId: [estimate objects] }` |
| `jd_activities` | ContentsDox.jsx | ContentsDox.jsx | Activity log for contents (last 200) |
| `jd_dispatch_appointments_{companyId}` | JobDoxDispatch.jsx, JobDoxPortal.jsx | JobDoxDispatch.jsx, JobDoxPortal.jsx | Appointment array per company |
| `jd_dispatch_resources_{companyId}` | JobDoxDispatch.jsx | JobDoxDispatch.jsx | Resource array per company |
| `jd_dispatch_geocache` | JobDoxDispatch.jsx (LS_GEO_CACHE) | JobDoxDispatch.jsx | `{ "address": { lat, lng } }` |
| `jd_proj_{key}_{projId}` | JobDoxPortal.jsx (useProjState) | JobDoxPortal.jsx, JobDoxReports.jsx | Per-project state (notes, tasks, etc.) |
| `dd_{projId}_rooms` | DryDox.jsx | DryDox.jsx, JobDoxPortal.jsx (S500 badge) | DryDox room data |
| `dd_{projId}_equipment` | DryDox.jsx | DryDox.jsx, JobDoxPortal.jsx (S500 badge) | DryDox equipment data |
| `dd_{projId}_moisture` | DryDox.jsx | DryDox.jsx | Moisture reading data |
| `dd_{projId}_s500Overrides` | DryDox.jsx | DryDox.jsx, JobDoxPortal.jsx | S500 compliance overrides |
| `dd_{projId}_s500Comments` | DryDox.jsx | DryDox.jsx, JobDoxPortal.jsx | S500 compliance comments |
| `dd_{projId}_scope` | DryDox.jsx | DryDox.jsx | Scope of work data |
| `dd_{projId}_floorPlan` | DryDox.jsx | DryDox.jsx | Floor plan canvas data |

---

## 4. ALL FIREBASE FIRESTORE PATHS

### Top-level Collections

| Path | Data | Used By |
|------|------|---------|
| `users/{uid}` | `{ companyId, name, role, position, email }` | shared/firebase.js |
| `activeSessions/{memberId}` | Session tracking doc | clear-session.js |
| `apiKeys/{keyId}` | `{ companyId, name, keyHash, keyPrefix, scopes, status, createdBy, createdAt, lastUsedAt, requestCount, expiresAt }` | api-keys.js, _api-helpers.js, api-v1.js |
| `phoneNumbers/{e164_key}` | `{ companyId, twilioNumber }` — reverse lookup for inbound calls/SMS | save-phone-settings.js, inbound-call.js, handle-voice.js, receive-sms.js |
| `company_settings/{companyId}` | `{ webhookToken, tokenCreatedAt }` | generate-webhook-token.js, marketing-webhook.js |
| `marketing_data/{companyId}` | `{ googleAds: {...}, googleAnalytics: {...}, lastUpdated }` | marketing-webhook.js |
| `yard_signs/{signId}` | `{ companyId, companySlug, slug, published, ... }` | yard-sign.js, yard-sign-sitemap.js |

### Company Sub-Collections

| Path | Data | Used By |
|------|------|---------|
| `companies/{companyId}` | Company root doc | call-transcribe.js |
| `companies/{cid}/projects/{pid}` | Project data: name, type, status, address, client, phone, etc. | shared/firebase.js, api-v1.js, call-transcribe.js |
| `companies/{cid}/projects/{pid}/dailyNotes/{nid}` | Daily field notes with photos | shared/firebase.js, api-v1.js |
| `companies/{cid}/projects/{pid}/shifts/{sid}` | Clock in/out records | shared/firebase.js |
| `companies/{cid}/projects/{pid}/estimates/{eid}` | Line-item estimates | shared/firebase.js |
| `companies/{cid}/projects/{pid}/documents/{did}` | Documents with signatures | shared/firebase.js, api-v1.js |
| `companies/{cid}/projects/{pid}/tasks/{tid}` | Tasks with assignment | shared/firebase.js, api-v1.js |
| `companies/{cid}/projects/{pid}/contacts/{coid}` | Project contacts | shared/firebase.js, api-v1.js |
| `companies/{cid}/staff/{staffId}` | `{ name, role, phone, email, permission, position, payRate }` | shared/firebase.js, api-keys.js, inbound-call.js, handle-voice.js, api-v1.js |
| `companies/{cid}/settings/payrollRates` | `{ rates: [...] }` | shared/firebase.js |
| `companies/{cid}/settings/phone` | `{ twilioNumber, disclosureMessage, callGroups, activeCallGroupId, callTranscriberEnabled, transcriberAutoCreateProject, transcriberKeywords, transcriberWorkTypes, transcriberProjectTypes }` | save-phone-settings.js, inbound-call.js, handle-voice.js, call-recording-ready.js, call-transcribe.js |
| `companies/{cid}/billing/cortexCoins` | `{ cycleStart, cycleEnd, baseAllowance, rolloverCoins, usedThisCycle, totalAvailable, log, alertSentAt80 }` | cortex-coins.js |
| `companies/{cid}/calls/{callId}` | `{ type, clientPhone, clientName, status, duration, recordingUrl, transcript, transcriptExtracted, ... }` | inbound-call.js, handle-voice.js, initiate-call.js, call-complete.js, call-recording-ready.js, call-transcribe.js |
| `companies/{cid}/smsLogs/{logId}` | `{ direction, to/from, body, status, twilioSid, contactName, staffName, projectId, type, createdAt }` | send-sms.js, receive-sms.js, send-review-request.js, send-signing-request.js, JobDoxPortal.jsx (Message Center) |
| `companies/{cid}/events/{eventId}` | `{ type, source, projectId, payload, createdAt }` | shared/firebase.js (event bus), api-v1.js |
| `companies/{cid}/automations/{aid}` | Automation rules | shared/firebase.js |
| `companies/{cid}/automations/{aid}/runs/{runId}` | Automation execution logs | shared/firebase.js |
| `companies/{cid}/reviewRequests/{reqId}` | `{ projectId, clientName, clientPhone, googleBusinessUrl, smsStatus, reviewRating, ... }` | shared/firebase.js, send-review-request.js |
| `companies/{cid}/webhooks/{wid}` | `{ url, events, secret, status, failureCount, ... }` | shared/firebase.js, api-v1.js, api-webhooks-deliver.js |
| `companies/{cid}/webhooks/{wid}/deliveries/{did}` | Delivery log entries | api-webhooks-deliver.js |
| `companies/{cid}/signingRequests/{token}` | `{ companyId, docId, signerIdx, signerName, signerEmail, signerPhone, status, order, totalSigners, token, expiresAt }` | send-signing-request.js |
| `companies/{cid}/offices/{oid}` | Office info | api-v1.js (company endpoint) |
| `companies/{cid}/settings/{settingKey}` | Various settings (workTypes, statuses, projectTypes, billing, budgetTemplates, etc.) | JobDoxPortal.jsx (fsSaveCompanySettings) |
| `companies/{cid}/data/{dataKey}` | Persisted data: invoices, vendorBills, vendors, projDocs, projMsgs, activities, budgets, dispatch, payroll | JobDoxPortal.jsx (Firestore persistence layer) |

### Firebase Storage Paths

| Path | Data | Used By |
|------|------|---------|
| `companies/{cid}/projects/{pid}/items/{itemId}/{filename}` | Item photos (ContentsDox, DryDox) | shared/firebase.js (uploadItemPhoto) |

---

## 5. ALL MEMBERSTACK TOUCHPOINTS

| Location | File | Line(s) | Purpose |
|----------|------|---------|---------|
| Memberstack SDK script | `index.html` | 401-402 | Loads Memberstack v2 (`app_cmmm8x9fr00dg0utoabyje7x9`) on marketing site |
| Memberstack SDK script | `app/index.html` | 18-22 | Loads Memberstack v2 on portal app |
| Memberstack SDK script | `field/index.html` | 19-21 | Loads Memberstack v2 on field app (same app ID, same session) |
| `?invite=` param handling | `index.html` | ~930-950 | Preserves invite param across Memberstack auth redirect; auto-opens SIGNUP modal |
| `window.$memberstackDom.openModal('SIGNUP')` | `index.html` | ~947 | Opens signup modal with invite param |
| `waitForMemberstack()` | `index.html` | ~938 | Polls for `window.$memberstackDom` to be ready |
| Member ID usage | `JobDoxPortal.jsx` | multiple | Uses `member.id` as staff identifier, stored in `jd_current_user.memberId` |
| Permission level | `JobDoxPortal.jsx` | 12537, 12570 | Reads `staffDoc.permission` from Firestore, stores as `permissionLevel` |
| Permission in mindflow | `mindflow.html` | ~774 | Reads `jd_current_user.permissionLevel` for capability gating |
| `memberstackId` in API keys | `api-keys.js` | 41-50 | Uses memberstackId to verify admin permission (>= 8) via staff doc lookup |
| `memberId` in clear-session | `clear-session.js` | 22-28 | Deletes `activeSessions/{memberId}` doc on tab close |
| Member-based auth in field | `field/index.html` | ~161, ~1123 | Clears `jd_current_user` on logout |

**Permission Levels Used:**
- 0-4: Basic staff (limited view)
- 5-6: Field staff (can edit own projects)
- 7: Project Lead (can save templates in CortexAI)
- 8-9: Manager (can view rates, manage some settings)
- 10: Admin (full access, API key management)

---

## 6. ALL NETLIFY FUNCTIONS

| Function | Endpoint | Method | Purpose | Env Vars Required | Called By |
|----------|----------|--------|---------|-------------------|-----------|
| `_firebase.js` | — (helper) | — | Shared Firebase Admin SDK init, singleton pattern | `FIREBASE_SERVICE_ACCOUNT` | All other functions |
| `_api-helpers.js` | — (helper) | — | API key auth, rate limiting (60 req/min), CORS, response helpers | — | api-keys, api-projects, api-v1, api-webhooks-deliver |
| `adjuster-response` | `/.netlify/functions/adjuster-response` | POST | AI adjuster response generation with IICRC/industry knowledge | `ANTHROPIC_API_KEY`, `SITE_URL` | AdjusterResponseBot.jsx |
| `api-keys` | `/.netlify/functions/api-keys` | POST | API key CRUD (generate/list/revoke). Admin-only (permission >= 8) | `FIREBASE_SERVICE_ACCOUNT` | JobDoxPortal.jsx (Settings > API), shared/firebase.js |
| `api-projects` | `/.netlify/functions/api-projects` | GET | Standalone projects list for external integrations | `FIREBASE_SERVICE_ACCOUNT` | External API consumers |
| `api-v1` | `/.netlify/functions/api-v1/*` | GET/POST/PATCH/DELETE | Full REST API: projects, staff, events, webhooks, company | `FIREBASE_SERVICE_ACCOUNT` | External API consumers |
| `api-webhooks-deliver` | `/.netlify/functions/api-webhooks-deliver` | POST | Internal webhook delivery worker. Sends HMAC-signed payloads. Auto-disables after 10 failures. | `FIREBASE_SERVICE_ACCOUNT` | Internal (automation runner / event bus) |
| `call-complete` | `/.netlify/functions/call-complete` | POST | Twilio callback: updates call log with status/duration | `FIREBASE_SERVICE_ACCOUNT` | Twilio (callback) |
| `call-recording-ready` | `/.netlify/functions/call-recording-ready` | POST | Twilio callback: saves recording URL, triggers transcription if enabled | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | Twilio (callback) |
| `call-transcribe` | `/.netlify/functions/call-transcribe` | POST | Downloads Twilio recording, sends to Anthropic for transcription + keyword extraction, optionally auto-creates projects | `FIREBASE_SERVICE_ACCOUNT`, `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SITE_URL` | call-recording-ready.js |
| `clear-session` | `/.netlify/functions/clear-session` | POST | Deletes `activeSessions/{memberId}` doc on tab close | `FIREBASE_SERVICE_ACCOUNT` | JobDoxPortal.jsx (navigator.sendBeacon) |
| `cortex-coins` | `/.netlify/functions/cortex-coins` | POST | AI usage tracking: status/check/deduct actions on 28-day cycles (300 coins/cycle with rollover) | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | cortex-generate, adjuster-response, reports-analyze, finance-analyze, call-transcribe, shared/firebase.js (frontend) |
| `cortex-generate` | `/.netlify/functions/cortex-generate` | POST | Two modes: (1) Workflow SOP generation for CortexAI, (2) Comparable item lookup for ContentsDox | `ANTHROPIC_API_KEY`, `SITE_URL` | mindflow.html, ContentsDox.jsx |
| `extract-price` | `/.netlify/functions/extract-price` | POST | Scrapes product URLs for prices (JSON-LD, meta tags, HTML patterns) | `SITE_URL` | ContentsDox.jsx |
| `finance-analyze` | `/.netlify/functions/finance-analyze` | POST | AI financial analysis (job-level or portfolio-level) | `ANTHROPIC_API_KEY`, `SITE_URL` | JobDoxFinance.jsx |
| `generate-webhook-token` | `/api/generate-webhook-token` (redirect) | POST | Generates/retrieves webhook token for MarketDox Zapier integration | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | JobDoxPortal.jsx (MarketDox setup) |
| `handle-voice` | `/.netlify/functions/handle-voice` | POST | Twilio inbound call handler v2: greeting, forwarding number, ring groups, call logging, recording | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | Twilio (webhook) |
| `inbound-call` | `/.netlify/functions/inbound-call` | POST | Twilio inbound call handler v1: disclosure message, simultaneous ring to call group, recording | `FIREBASE_SERVICE_ACCOUNT`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SITE_URL` | Twilio (webhook) |
| `initiate-call` | `/.netlify/functions/initiate-call` | POST | Starts outbound Twilio call: rings staff first, bridges to client, records | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | JobDoxPortal.jsx (Call button) |
| `marketing-webhook` | `/api/marketing-data/{companyId}/{token}` (redirect) | POST | Receives Zapier webhook data from Google Ads and Google Analytics | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | Zapier |
| `receive-sms` | `/.netlify/functions/receive-sms` | POST | Twilio inbound SMS webhook: logs to Firestore, returns empty TwiML | `FIREBASE_SERVICE_ACCOUNT` | Twilio (webhook) |
| `reports-analyze` | `/.netlify/functions/reports-analyze` | POST | AI-powered reports analysis | `ANTHROPIC_API_KEY`, `SITE_URL` | JobDoxReports.jsx |
| `save-phone-settings` | `/.netlify/functions/save-phone-settings` | POST | Saves phone/Twilio config + phoneNumbers reverse-lookup doc | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | JobDoxPortal.jsx (Settings > Phone) |
| `send-feature-request` | `/.netlify/functions/send-feature-request` | POST | Sends feature request email to info@job-dox.com via SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SITE_URL` | JobDoxPortal.jsx (Settings) |
| `send-review-request` | `/.netlify/functions/send-review-request` | POST | Sends Google Business review request SMS, logs to Firestore | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | JobDoxPortal.jsx (Reputation tab) |
| `send-signing-request` | `/.netlify/functions/send-signing-request` | POST | Generates signing tokens, sends SMS notifications for e-signatures | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL`, `SENDGRID_API_KEY` (optional) | JobDoxDocuments.jsx |
| `send-sms` | `/.netlify/functions/send-sms` | POST | Sends SMS/MMS via Twilio, logs to Firestore smsLogs | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | JobDoxPortal.jsx (Messages) |
| `yard-sign` | `/pros/*` (redirect) | GET | Server-renders public yard sign SEO pages with JSON-LD Schema | `FIREBASE_SERVICE_ACCOUNT`, `SITE_URL` | Public web (Google indexing) |
| `yard-sign-sitemap` | `/sitemap-yards.xml` (redirect) | GET | Generates XML sitemap for all published yard signs | `FIREBASE_SERVICE_ACCOUNT` | Search engines |

---

## 7. TWILIO — FULL SWEEP

| File | Lines | Context | Status |
|------|-------|---------|--------|
| **netlify/functions/package.json** | 5 | `"twilio": "^4.0.0"` dependency | Active |
| **netlify/functions/send-sms.js** | 1-111 | Full outbound SMS/MMS function. Uses `twilio` SDK. Logs to `smsLogs`. | **Fully implemented** |
| **netlify/functions/receive-sms.js** | 1-99 | Inbound SMS webhook. Logs to `smsLogs`. Returns empty TwiML (no auto-reply). | **Fully implemented, no auto-reply** |
| **netlify/functions/inbound-call.js** | 1-130 | Inbound call webhook v1. Ring groups, disclosure, recording. | **Fully implemented** |
| **netlify/functions/handle-voice.js** | 1-139 | Inbound call webhook v2. Ring groups + forwarding number fallback. | **Fully implemented (duplicate of inbound-call with forwarding)** |
| **netlify/functions/initiate-call.js** | 1-127 | Outbound call. Staff-first bridge, recording. | **Fully implemented** |
| **netlify/functions/call-complete.js** | 1-47 | Call status callback. Updates Firestore with status/duration. | **Fully implemented** |
| **netlify/functions/call-recording-ready.js** | 1-74 | Recording ready callback. Saves URL, triggers transcription. | **Fully implemented** |
| **netlify/functions/call-transcribe.js** | 59-65 | Downloads recording with Twilio Basic auth. | **Fully implemented** |
| **netlify/functions/send-review-request.js** | 15, 38-92 | Sends review request SMS via Twilio. | **Fully implemented** |
| **netlify/functions/send-signing-request.js** | 22, 102-131 | Sends signing request SMS via Twilio. | **Fully implemented** |
| **netlify/functions/save-phone-settings.js** | 6, 41-78 | Saves `twilioNumber` to Firestore + phoneNumbers lookup. | **Fully implemented** |
| **app/src/JobDoxPortal.jsx** | 95 | `const sendSMS = data => callFn("send-sms", data);` | Frontend caller |
| **app/src/JobDoxPortal.jsx** | 1830-1846 | Quick reply SMS to client | Frontend caller |
| **app/src/JobDoxPortal.jsx** | 2017-2028 | Contact SMS send | Frontend caller |
| **app/src/JobDoxPortal.jsx** | 4350-4353 | Task notification SMS to assigned staff | Frontend caller |
| **app/src/JobDoxPortal.jsx** | 10098-10109 | Initiate outbound call | Frontend caller |
| **app/src/JobDoxPortal.jsx** | 10356-10465 | Phone settings UI (Twilio number input, call groups, disclosure message) | Frontend UI |

**To activate Twilio:** Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in Netlify env vars. Configure Twilio number webhooks:
- Voice: `https://job-dox.com/.netlify/functions/handle-voice` (or `inbound-call`)
- SMS: `https://job-dox.com/.netlify/functions/receive-sms`

---

## 8. ALL ENVIRONMENT VARIABLES

| Variable | Required By | Purpose |
|----------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | All Netlify functions using `_firebase.js` | Firebase Admin SDK service account JSON (minified to one line) |
| `ANTHROPIC_API_KEY` | adjuster-response, cortex-generate, call-transcribe, finance-analyze, reports-analyze | Anthropic Claude API key (sk-ant-...) |
| `TWILIO_ACCOUNT_SID` | send-sms, receive-sms, inbound-call, handle-voice, initiate-call, call-transcribe, send-review-request, send-signing-request | Twilio account SID (ACxxxxxxx) |
| `TWILIO_AUTH_TOKEN` | (same as above) | Twilio auth token |
| `SITE_URL` | Most functions (CORS origin, callback URLs) | Production URL (defaults to `https://job-dox.ai` or `https://job-dox.com` depending on function) |
| `URL` | cortex-generate, finance-analyze, reports-analyze, call-recording-ready, call-transcribe, adjuster-response | Netlify's built-in URL variable (fallback to SITE_URL) |
| `SMTP_HOST` | send-feature-request | SMTP server host (e.g. smtp.gmail.com) |
| `SMTP_PORT` | send-feature-request | SMTP port (default 587) |
| `SMTP_USER` | send-feature-request | SMTP username/email |
| `SMTP_PASS` | send-feature-request | SMTP password/app password |
| `SMTP_FROM` | send-feature-request | Sender address (default: SMTP_USER) |
| `SENDGRID_API_KEY` | send-signing-request (optional) | SendGrid API key for email signing requests (currently commented out / TODO) |
| `SECRETS_SCAN_SMART_DETECTION_ENABLED` | netlify.toml | Set to `"false"` to disable Netlify's secret scanning |

---

## 9. CROSS-FILE DEPENDENCIES

### Portal → Standalone Tools (via localStorage bridge)
- `JobDoxPortal.jsx` writes `jd_company_config`, `jd_staff`, `jd_current_user`, `jd_cortex_worktypes` → `mindflow.html` reads them
- `JobDoxPortal.jsx` writes `jd_workflow_templates` → `mindflow.html` reads; `mindflow.html` writes → portal reads
- `JobDoxPortal.jsx` writes `jd_cortex_workflow` → portal auto-applies workflows from mindflow
- `mindflow.html` writes `jd-theme` → `JobDoxPortal.jsx` reads (theme sync)

### Portal → Child Modules
- `JobDoxPortal.jsx` embeds and passes props to: JobDoxDispatch, JobDoxDocuments, JobDoxFinance, JobDoxPayroll, JobDoxReports, JobDoxTimeOff, ContentsDox, EstimateDox, AdjusterResponseBot, DryDox
- All child modules share localStorage keys with the portal (invoices, vendor bills, budgets, etc.)

### DryDox → Portal
- DryDox writes `dd_{projId}_rooms`, `dd_{projId}_equipment`, `dd_{projId}_s500Overrides`, `dd_{projId}_s500Comments` → Portal reads for S500 compliance badges on project cards

### Netlify Function Chain
- `call-recording-ready` → triggers `call-transcribe` (fire-and-forget fetch)
- `cortex-generate`, `adjuster-response`, `reports-analyze`, `finance-analyze`, `call-transcribe` → all call `cortex-coins` for coin deduction
- `api-v1` and `api-projects` → use `_api-helpers.js` for auth + `_firebase.js` for DB
- `api-webhooks-deliver` → called by event bus / automations to deliver outbound webhooks

### shared/firebase.js → Everything
- `app/src/firebase.js` re-exports everything from `shared/firebase.js`
- Field app (`field/index.html`) uses CDN Firebase compat instead of the shared module
- `mindflow.html` has its own inline Firebase config (hardcoded)

### Duplicate Handling: inbound-call.js vs handle-voice.js
- Both handle inbound Twilio calls with similar logic
- `handle-voice.js` adds `voiceForwardNumber` fallback logic
- Only one should be configured as the Twilio webhook at a time

---

## 10. KNOWN GAPS, TODOs, HARDCODED VALUES, AND INCOMPLETE FEATURES

### TODOs

| File | Line | Description |
|------|------|-------------|
| `send-signing-request.js` | 137-152 | **TODO: Integrate email provider (SendGrid, AWS SES, etc.)** — Email sending for signing requests is fully stubbed with commented-out SendGrid example. Currently only SMS works; email signers just get a URL stored in Firestore. |

### Hardcoded Values

| File | Line(s) | Value | Issue |
|------|---------|-------|-------|
| `mindflow.html` | ~170 | `apiKey:"AIzaSyAFwSEDPqKgAUbwbh_2KZNwLDdGCZEiq3E"` | **Firebase API key hardcoded inline** (public-facing, not a secret per se but should be in config) |
| `JobDoxPortal.jsx` | 18-26 | Full Firebase config object hardcoded inline | Same Firebase config duplicated from mindflow.html |
| `shared/firebase.js` | 24-31 | `"REPLACE_WITH_YOUR_API_KEY"` etc. | **Placeholder values** — this file has template placeholders and is NOT the live config. The actual live config is hardcoded in JobDoxPortal.jsx and mindflow.html |
| `cortex-generate.js` | 106 | `model: 'claude-sonnet-4-5'` | Anthropic model version hardcoded |
| `reports-analyze.js` | 81 | `model: "claude-sonnet-4-20250514"` | Different model version from other functions |
| `finance-analyze.js` | 76 | `model: "claude-sonnet-4-20250514"` | Same as reports-analyze |
| `adjuster-response.js` | 248 | `model: 'claude-sonnet-4-5'` | Different model string format |
| `call-transcribe.js` | 154 | `model: "claude-sonnet-4-5"` | Model hardcoded |
| `cortex-coins.js` | 32 | `BASE_ALLOWANCE = 300` | 300 coins per 28-day cycle — hardcoded, not configurable per company/plan |
| `_api-helpers.js` | 17-18 | Rate limit: 60 req/min, 1 min window | Hardcoded rate limits |
| `api-webhooks-deliver.js` | 26-27 | `MAX_FAILURES = 10`, `DELIVERY_TIMEOUT_MS = 10000` | Hardcoded |
| `send-feature-request.js` | 69 | `to: "info@job-dox.com"` | Feature request destination hardcoded |
| `yard-sign.js` | 17 | `const SITE_URL = "https://job-dox.ai"` | Hardcoded (does not read env var for this const) |
| `yard-sign-sitemap.js` | 12 | `const SITE_URL = "https://job-dox.ai"` | Same |
| Various CORS defaults | Multiple | Some functions default to `https://job-dox.com`, others to `https://job-dox.ai` | Inconsistent domain defaults between functions |

### Incomplete / Stubbed Features

| Area | Description |
|------|-------------|
| **Email for signing requests** | send-signing-request.js has a full commented-out SendGrid integration. Email delivery does not work. Only SMS sending is active. |
| **Inbound SMS auto-reply** | receive-sms.js returns empty TwiML `<Response></Response>` — no auto-reply logic. |
| **shared/firebase.js config** | Has `REPLACE_WITH_YOUR_*` placeholder values. Not used at runtime (portal/mindflow have their own hardcoded configs). |
| **Automation runner** | `shared/firebase.js` has `listenEventsByType`, `saveAutomation`, `logAutomationRun` etc. but there is no automation execution engine in the codebase. The AUTOMATION_TRIGGERS and AUTOMATION_ACTIONS in constants.js define the vocabulary, but no code actually processes/runs automations based on events. |
| **QuickBooks integration** | JobDoxPayroll.jsx has QBO export settings and CSV formatting but no actual API connection to QuickBooks Online. Export-only. |
| **university.html placeholders** | "Document Templates" and "Workflow Templates" sections show "Coming Soon" placeholders. Several nav items use `showComingSoon()` function. |
| **Duplicate inbound call handlers** | Both `inbound-call.js` and `handle-voice.js` serve the same purpose with minor differences. Only one should be the active Twilio webhook. |
| **JobDoxFinance.jsx dead code** | Line 3329: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` — this is client-side React code where `process.env` doesn't exist. Dead/unreachable code. |
| **Google Maps geocoding in Dispatch** | JobDoxDispatch.jsx uses Google Maps Geocoding API for address-to-coordinates. No API key management visible — likely needs a Google Maps API key configured somewhere. |
| **LiDAR plugin** | Swift plugin exists and appears complete, but requires a compiled iOS app via Capacitor to function. Web fallback returns `{ supported: false }`. |
| **Webhook event delivery trigger** | `api-webhooks-deliver.js` exists but there's no code that calls it when events are emitted. The event bus (`emitEvent` in shared/firebase.js) writes to Firestore but doesn't trigger webhook delivery. |

### Inconsistencies

| Issue | Details |
|-------|---------|
| **Domain inconsistency** | Some functions default ALLOWED_ORIGIN to `https://job-dox.com`, others to `https://job-dox.ai`. Functions: send-sms, inbound-call, initiate-call, save-phone-settings, send-review-request, send-signing-request, send-feature-request use `.com`. Functions: cortex-generate, cortex-coins, adjuster-response, extract-price, reports-analyze, yard-sign, marketing-webhook, generate-webhook-token use `.ai`. |
| **Model version strings** | Some functions use `claude-sonnet-4-5`, others use `claude-sonnet-4-20250514`. Should be consistent. |
| **Firebase config duplication** | Live Firebase config is hardcoded in both `mindflow.html` and `JobDoxPortal.jsx`. `shared/firebase.js` has placeholder values. The `field/index.html` loads Firebase compat SDK from CDN with its own inline config. |
| **Two inbound call handlers** | `inbound-call.js` and `handle-voice.js` duplicate most logic. `handle-voice.js` adds a `voiceForwardNumber` fallback. |

---

*End of audit. This document covers all 82 files in the repository.*
