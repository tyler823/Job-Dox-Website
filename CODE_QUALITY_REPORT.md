# Code Quality Report — Static Analysis

**Date:** 2026-03-15
**Scope:** All files in the Job-Dox-Website repository (static analysis only — no live testing)

---

## Check 1: Dead Code

### 1a. Browser-Side `process.env` Usage
**Status:** CLEAN (false positive only)

- `app/src/JobDoxFinance.jsx:3329` — Contains `process.env.ANTHROPIC_API_KEY` but this is inside a documentation comment block (lines 3288–3341) showing example Netlify function code. **Not actual executable browser code.**

### 1b. Functions Defined but Never Called

| File | Line | Function | Issue |
|------|------|----------|-------|
| `app/src/JobDoxReports.jsx` | 1168 | `hoursToBillingDays()` | Defined but never called anywhere in the codebase. Appears to be a remnant of abandoned billing logic. |
| `app/src/JobDoxPortal.jsx` | 728 | `saveWorkflowTemplate()` | Defined but never called. Part of an incomplete workflow template feature. |
| `app/src/JobDoxPortal.jsx` | 737 | `deleteWorkflowTemplate()` | Defined but never called. Same incomplete workflow template feature. |

**Recommended Fix:** Remove all three functions or wire them into the UI if the feature is still planned.

### 1c. Variables Assigned but Never Read
**Status:** CLEAN — No instances found.

### 1d. Abandoned Commented-Out Code Blocks
**Status:** CLEAN — All large comment blocks are documentation/integration guides, not abandoned feature code.

---

## Check 2: Environment Variable Consistency

### 2a. Complete Environment Variable Inventory (Netlify Functions)

| Variable | Used In | Count |
|----------|---------|-------|
| `SITE_URL` | 25+ functions (CORS origin, callback URLs) | 25+ |
| `URL` | reports-analyze, call-transcribe, cortex-generate, finance-analyze, adjuster-response, call-recording-ready | 6 |
| `ANTHROPIC_API_KEY` | adjuster-response, call-transcribe, cortex-generate, finance-analyze, reports-analyze | 5 |
| `TWILIO_ACCOUNT_SID` | call-transcribe, initiate-call, send-review-request, send-signing-request, send-sms | 5 |
| `TWILIO_AUTH_TOKEN` | call-transcribe, initiate-call, send-review-request, send-signing-request, send-sms | 5 |
| `FIREBASE_SERVICE_ACCOUNT` | `_firebase.js` | 1 |
| `SMTP_HOST` | send-feature-request | 1 |
| `SMTP_PORT` | send-feature-request | 1 |
| `SMTP_USER` | send-feature-request | 1 |
| `SMTP_PASS` | send-feature-request | 1 |
| `SMTP_FROM` | send-feature-request | 1 |

### 2b. Spelling / Naming Inconsistency

| Issue | Details |
|-------|---------|
| `URL` vs `SITE_URL` | 6 functions use `process.env.URL \|\| process.env.SITE_URL` as a fallback chain. The remaining 19+ use only `SITE_URL`. Netlify automatically provides `URL` but `SITE_URL` is a custom variable. Using both creates confusion. |

**Files with dual `URL` / `SITE_URL` fallback:**
- `netlify/functions/reports-analyze.js:12`
- `netlify/functions/call-transcribe.js:41`
- `netlify/functions/cortex-generate.js:21`
- `netlify/functions/finance-analyze.js:13`
- `netlify/functions/adjuster-response.js:23`
- `netlify/functions/call-recording-ready.js:59`

**Recommended Fix:** Standardize on one variable name across all functions. If using Netlify's built-in `URL`, use it everywhere; otherwise, use `SITE_URL` exclusively.

### 2c. Browser-Side Environment Variable Usage
**Status:** CLEAN — No `process.env` references in actual executable browser code (the one in JobDoxFinance.jsx is inside a documentation comment).

---

## Check 3: localStorage Key Mismatches

### 3a. Keys Written but Never Read

| Key | File | Line | Issue |
|-----|------|------|-------|
| `jd_cortex_workflow` | `mindflow.html` | 1243 | Written via `setItem` but **never read** (`getItem`) anywhere in the codebase. This is dead storage. |

**Recommended Fix:** Remove the `setItem` call or implement the corresponding `getItem` read if it's needed.

### 3b. Keys Read but Never Written

| Key | File | Lines | Issue |
|-----|------|-------|-------|
| `jd_current_user` | `mindflow.html` | 774, 1915 | Read via `getItem` and deleted in `field/index.html:161,1123`, but **never written** (`setItem`) anywhere in the codebase. Likely set by an external auth system (Memberstack). |

**Recommended Fix:** Add a code comment explaining the key is set externally by Memberstack. Add null-checks before reading to prevent runtime errors.

### 3c. Naming Inconsistency

| Key | Issue |
|-----|-------|
| `jd-theme` | Uses a hyphen while all other keys use underscores (`jd_staff`, `jd_company_config`, etc.). Minor stylistic inconsistency. |

**Recommended Fix:** Rename to `jd_theme` for consistency, updating both the write (`mindflow.html:1393`) and read (`mindflow.html:1932`).

### 3d. Redundant Writes

- `jd_workflow_templates` — 3 `setItem` calls but only 1 `getItem` call (all in `mindflow.html`).
- `jd_staff` — 2 `setItem` calls but only 1 `getItem` call (both in `mindflow.html`).

---

## Check 4: Function Call Mismatches

### 4a. Netlify Function Calls vs. Files
**Status:** CLEAN — All 13 Netlify functions called from the frontend have matching files in `netlify/functions/`.

| Called Function | Calling File | Target File Exists |
|----------------|--------------|-------------------|
| `send-sms` | JobDoxPortal.jsx:95 | YES |
| `send-review-request` | JobDoxPortal.jsx:96 | YES |
| `initiate-call` | JobDoxPortal.jsx:97 | YES |
| `save-phone-settings` | JobDoxPortal.jsx:98 | YES |
| `send-signing-request` | JobDoxPortal.jsx:6111 | YES |
| `finance-analyze` | JobDoxFinance.jsx:2487 | YES |
| `reports-analyze` | JobDoxReports.jsx:1050 | YES |
| `api-keys` | JobDoxPortal.jsx:8908 | YES |
| `cortex-coins` | JobDoxPortal.jsx:9324 | YES |
| `cortex-generate` | ContentsDox.jsx:228 | YES |
| `extract-price` | ContentsDox.jsx:411 | YES |
| `adjuster-response` | AdjusterResponseBot.jsx:68 | YES |
| `send-feature-request` | JobDoxPortal.jsx:11393 | YES |

### 4b. Component Imports in JobDoxPortal.jsx
**Status:** CLEAN — All 10 child component imports resolve to existing files.

### 4c. All Import Statements Across All Files
**Status:** CLEAN — Every `import`/`require` statement across `app/src/` and `netlify/functions/` points to files that exist, including:
- All DryDox sub-module imports (8 files)
- `shared/firebase.js` import from `app/src/firebase.js`
- All `_firebase.js` and `_api-helpers.js` requires in Netlify functions

---

## Check 5: CORS and Domain Inconsistency

### 5a. Functions Hardcoded to `job-dox.com`

| Function | Line | Origin Value | Type |
|----------|------|-------------|------|
| `send-signing-request.js` | 26 | `https://job-dox.com` | HARDCODED |
| `send-feature-request.js` | 15 | `https://job-dox.com` | HARDCODED |
| `send-review-request.js` | 18 | `https://job-dox.com` | HARDCODED |
| `save-phone-settings.js` | 16 | `https://job-dox.com` | HARDCODED |
| `initiate-call.js` | 17 | `https://job-dox.com` | HARDCODED |
| `send-sms.js` | 17 | `https://job-dox.com` | HARDCODED |
| `inbound-call.js` | 17 | `https://job-dox.com` | HARDCODED (callback URLs) |
| `handle-voice.js` | 18 | `https://job-dox.com` | HARDCODED (callback URLs) |

### 5b. Functions Hardcoded to `job-dox.ai`

| Function | Line | Origin Value | Type |
|----------|------|-------------|------|
| `finance-analyze.js` | 100 | `https://job-dox.ai` | HARDCODED |
| `yard-sign.js` | 15 | `https://job-dox.ai` | HARDCODED |
| `generate-webhook-token.js` | 17 | `https://job-dox.ai` | HARDCODED |
| `yard-sign-sitemap.js` | 12 | `https://job-dox.ai` | HARDCODED |

### 5c. Functions Using `SITE_URL` (Dynamic — Correct Pattern)

| Function | Line | Fallback | Type |
|----------|------|----------|------|
| `cortex-generate.js` | 15 | `https://job-dox.ai` | DYNAMIC (with fallback) |
| `cortex-coins.js` | 30 | `https://job-dox.ai` | DYNAMIC (with fallback) |
| `call-transcribe.js` | 22 | `https://job-dox.ai` | DYNAMIC (with fallback) |
| `adjuster-response.js` | 14 | `https://job-dox.ai` | DYNAMIC (with fallback) |
| `extract-price.js` | 7 | `https://job-dox.ai` | DYNAMIC (with fallback) |
| `marketing-webhook.js` | 18 | `https://job-dox.ai` | DYNAMIC (with fallback) |

### 5d. Functions Using Wildcard (`*`) CORS

| Function | Notes |
|----------|-------|
| `reports-analyze.js` | Accepts all origins — potential security risk |
| `api-v1.js` | Via `_api-helpers.js` CORS_HEADERS — intended for public API |
| `api-projects.js` | Via `_api-helpers.js` — intended for public API |
| `api-keys.js` | Via `_api-helpers.js` — intended for public API |
| `api-webhooks-deliver.js` | Wildcard — intended for webhook delivery |
| `clear-session.js` | Wildcard |

### 5e. Functions with No CORS Headers
- `call-complete.js` — Twilio callback (no browser access needed)
- `call-recording-ready.js` — Twilio callback (no browser access needed)

**Recommended Fix:** Replace all hardcoded origins with `process.env.SITE_URL` and standardize the fallback domain. The split between `.com` and `.ai` will cause CORS failures if the active domain doesn't match the hardcoded one.

---

## Check 6: Anthropic Model Version Inconsistency

### Unique Model Strings Found

| Model String | Files |
|-------------|-------|
| `claude-sonnet-4-20250514` | `reports-analyze.js:81`, `finance-analyze.js:76`, `JobDoxFinance.jsx:3331` (docs) |
| `claude-sonnet-4-5` | `adjuster-response.js:246`, `call-transcribe.js:154`, `cortex-generate.js:106,242` |

**Issue:** Two different Claude Sonnet 4 model identifiers are in use:
- The dated release (`claude-sonnet-4-20250514`) in financial/reporting functions
- The general alias (`claude-sonnet-4-5`) in communication/workflow functions

**Recommended Fix:** Standardize on one model string across all functions. Consider extracting it to a shared constant or environment variable for centralized management.

---

## Check 7: Firebase Config Duplication

### Inline Firebase Configs Found

| File | Lines | Status | Project |
|------|-------|--------|---------|
| `app/src/JobDoxPortal.jsx` | 18–25 | ACTIVE (real values) | `cortex-717c6` |
| `field/index.html` | 121–127 | ACTIVE (real values) | `cortex-717c6` |
| `mindflow.html` | 169–175 | ACTIVE (real values) | `cortex-717c6` |
| `shared/firebase.js` | 24–31 | PLACEHOLDER values | N/A |

**Cross-Reference:** All three active configs are **identical** — same `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`. No divergence.

**Issues Found:**

1. **`shared/firebase.js` has placeholder values** — This file is meant to be "THE single Firebase file for the entire platform" (per its comments) but contains `REPLACE_WITH_YOUR_*` placeholders. It is never actually used; `JobDoxPortal.jsx` defines its own inline config instead of importing from `shared/firebase.js`.

2. **Violation of DRY** — The same Firebase config is copy-pasted in 3 active files. If credentials ever need to rotate, all 3 must be updated independently.

**Recommended Fix:** Populate `shared/firebase.js` with real values, import it from `JobDoxPortal.jsx`, and find a strategy for the HTML files (either build-time injection or a shared script tag).

---

## Check 8: Twilio Reference Audit

### Server-Side References (SAFE)

All Twilio SDK imports and credential access are properly confined to Netlify functions:

| File | Usage | Credentials |
|------|-------|-------------|
| `send-sms.js` | `require("twilio")`, `process.env.TWILIO_*` | ENV only |
| `initiate-call.js` | `require("twilio")`, `process.env.TWILIO_*` | ENV only |
| `send-review-request.js` | `require("twilio")`, `process.env.TWILIO_*` | ENV only |
| `send-signing-request.js` | `require("twilio")`, `process.env.TWILIO_*` | ENV only |
| `call-transcribe.js` | `process.env.TWILIO_*` (Basic auth for recording download) | ENV only |
| `inbound-call.js` | Twilio webhook handler (no SDK import) | None needed |
| `handle-voice.js` | Twilio webhook handler (no SDK import) | None needed |
| `receive-sms.js` | Twilio webhook handler (no SDK import) | None needed |
| `call-complete.js` | Twilio callback handler | None needed |
| `call-recording-ready.js` | Twilio callback handler | None needed |
| `save-phone-settings.js` | Stores Twilio number in Firestore | None needed |

### Browser-Side References

| File | Line(s) | What | Risk |
|------|---------|------|------|
| `JobDoxPortal.jsx` | 95–98 | `callFn("send-sms", ...)`, `callFn("initiate-call", ...)` etc. | SAFE — These call Netlify functions via HTTP, no SDK or credentials |
| `JobDoxPortal.jsx` | 1838, 2020, 4353 | `phoneSettings?.twilioNumber` (the company's phone number, not a secret) | SAFE — This is a phone number, not a credential |
| `JobDoxPortal.jsx` | 1846, 2028 | Error messages mentioning "Twilio config" | SAFE — UI text only |

**Status:** CLEAN — No Twilio credentials or SDK usage in browser-side code.

---

## Check 9: Missing Error Handling

### 9a. Netlify Functions — External API Calls Without Adequate Error Handling

| File | Line | API Call | Issue |
|------|------|---------|-------|
| `call-transcribe.js` | 70 | `fetch()` to Twilio recording URL | `await fetch()` without its own try/catch — relies on outer catch but no specific error response for this step |
| `call-transcribe.js` | 146 | `await response.json()` after Anthropic API | JSON parse not wrapped in try/catch; malformed response would throw uncaught |
| `cortex-generate.js` | 98, 234 | `await response.json()` after Anthropic API | Same issue — JSON parse unprotected |
| `finance-analyze.js` | 68 | `await res.json()` after Anthropic API | JSON parse unprotected |
| `reports-analyze.js` | 73 | `await res.json()` after Anthropic API | JSON parse unprotected |
| `adjuster-response.js` | 238 | `await response.json()` after Anthropic API | JSON parse unprotected |
| `extract-price.js` | 45 | External URL fetch | Returns HTTP 200 with error in body instead of a proper error status code |
| `call-recording-ready.js` | 60 | Fire-and-forget `fetch()` to call-transcribe | Has `.catch()` but only logs; transcription failures are completely silent |

### 9b. Frontend — Fetch Calls Without Error Handling

| File | Line | Call | Issue |
|------|------|------|-------|
| `JobDoxPortal.jsx` | 8682 | `fetch("/.netlify/functions/generate-webhook-token")` | `.catch(() => setLoading(false))` silently swallows errors — user gets no failure feedback |
| `JobDoxPortal.jsx` | 12683 | `fetch("/.netlify/functions/cortex-coins")` | `.catch(() => {})` completely ignores errors |
| `JobDoxPortal.jsx` | 1409 | `fetch("https://photon.komoot.io/api/")` | Geocoding API — silently falls through on failure |
| `JobDoxPortal.jsx` | 1427 | `fetch("https://nominatim.openstreetmap.org/search")` | Fallback geocoder — empty catch block; if both geocoders fail, user gets no error message |
| `JobDoxFinance.jsx` | 2487 | `fetch("/.netlify/functions/finance-analyze")` | `.then()` chain without `.catch()` — unhandled promise rejection possible |
| `JobDoxFinance.jsx` | 3141 | `fetch("/.netlify/functions/finance-analyze")` | Same pattern — missing `.catch()` on promise chain |
| `ContentsDox.jsx` | 228 | `fetch("/.netlify/functions/cortex-generate")` | No try/catch wrapper — malformed responses crash without error message |
| `ContentsDox.jsx` | 411 | `fetch("/.netlify/functions/extract-price")` | Has try/catch but doesn't check `res.ok` — may process error responses as success |
| `JobDoxDispatch.jsx` | 85, 98 | External geocoding APIs (Photon, Nominatim) | Empty try/catch blocks — silent failures with no user feedback |

**Recommended Fix:**
- Wrap all `await response.json()` calls in try/catch to handle malformed responses
- Add user-facing error feedback for silent `.catch(() => {})` blocks
- Return proper HTTP error status codes from `extract-price.js` instead of 200

---

## Check 10: Duplicate Logic

### 10a. `inbound-call.js` vs `handle-voice.js`

**Exact duplicates:**
- `parseFormBody()` — identical in both
- `toE164()` — identical in both
- `xmlEscape()` — identical in both
- TwiML response headers — identical
- Phone number lookup logic — nearly identical
- Call group member collection — nearly identical
- Call log creation — nearly identical

**Key differences:**

| Aspect | `inbound-call.js` | `handle-voice.js` |
|--------|--------------------|--------------------|
| Greeting message | `settings.disclosureMessage` | `settings.voiceGreeting` |
| Dial logic | Ring all group members OR fallback to called number | Three-tier: ring members → forward number → called number |
| Forward number | Not supported | `settings.voiceForwardNumber` |
| Line count | ~131 lines | ~140 lines |

**Assessment:** ~80% of the code is duplicated. These could be merged into a single configurable function.

### 10b. Other Duplicate Functions Across Codebase

| Function | Duplicated In | Count |
|----------|--------------|-------|
| `toE164()` | handle-voice, inbound-call, initiate-call, receive-sms, save-phone-settings, send-review-request, send-signing-request, send-sms | **8 copies** |
| `parseFormBody()` | handle-voice, inbound-call, call-complete, call-recording-ready, receive-sms | **5 copies** |
| `xmlEscape()` | handle-voice, inbound-call | **2 copies** |
| CORS header blocks | 11+ functions with duplicated header objects | **11+** |
| HTTP OPTIONS/method check | 8+ functions with identical pattern | **8+** |
| JSON body parsing with error response | 8+ functions with identical try/catch pattern | **8+** |

**Recommended Fix:**
- Extract `toE164()`, `parseFormBody()`, `xmlEscape()` into `_api-helpers.js` or a new `_phone-utils.js`
- Use the existing `parseBody()` from `_api-helpers.js` (it already exists but isn't used by most functions)
- Create a shared method-validation helper

**Estimated duplicate lines that could be consolidated:** 250–300 lines

---

## Check 11: Prop and Data Flow Verification

### Component-by-Component Results

| Component | Props Passed by Portal | Props Expected | Status |
|-----------|----------------------|----------------|--------|
| `JobDoxDispatch` | projects, offices, globalStaff, companyId, currentUser, currentMemberId, onNavigate, customWorkTypes, customProjectTypes, customStatuses | Same set with defaults | MATCH |
| `JobDoxReports` | projects, companyId, onNavigate, globalStaff, customWorkTypes, customStatuses, customProjectTypes, priceLists, reviewRequests, offices | Same set with defaults | MATCH |
| `JobDoxPayroll` | projects, globalStaff, projectShifts, permissionLevel, companyId | Same set with defaults | MATCH |
| `JobDoxFinance` (dashboard) | projects, companyId, onNavigate | Same set | MATCH |
| `JobDoxFinance` (tab) | proj, companyId, laborCost, invoices, onInvoiceVoid | Same set with defaults | MATCH |
| `JobDoxTimeOff` | onClose, companyId, globalStaff, currentMemberId, permissionLevel | Same set with defaults | MATCH |
| `ContentsDox` | proj, companyId, db, onDocGenerated | Same set | MATCH |
| `EstimateDox` | proj, companyId | Same set with defaults | MATCH |
| `AdjusterResponseBot` | message, proj, dailyNotes, companyInfo, currentUser, threadMessages, companyId, onClose, onInsertDraft | Same set with defaults | MATCH |
| **`DryDox`** | proj, priceLists, onPushToScope, companyLogo, companyId | **Same + `inventory`** | **MISMATCH** |

### Issue Found

| Component | File | Missing Prop | Impact |
|-----------|------|-------------|--------|
| `DryDoxTab` | `app/src/DryDox.jsx` | `inventory` (aliased as `externalInventory`) | **Non-breaking** — The component defaults to an empty array and falls back to `localInventory` from state. However, external inventory data will never flow into DryDox from the portal. |

**Recommended Fix:** Either pass the `inventory` prop from the portal if external inventory data is needed, or remove the prop from the DryDox component signature if it's not used.

---

## Check 12: Security Check

### 12a. Hardcoded API Keys / Secrets
**Status:** CLEAN — No Anthropic API keys (`sk-ant-*`), Twilio credentials, AWS keys (`AKIA*`), Stripe keys, or any other secrets found hardcoded in the codebase.

All sensitive credentials are properly externalized to environment variables:
- `ANTHROPIC_API_KEY` — 5 Netlify functions
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — 5 Netlify functions
- `FIREBASE_SERVICE_ACCOUNT` — `_firebase.js`
- `SMTP_*` — `send-feature-request.js`

### 12b. Firebase Client-Side API Key
**Status:** SAFE — The Firebase client-side API key (`AIzaSyAFwSE...`) appears in 3 files (`JobDoxPortal.jsx`, `field/index.html`, `mindflow.html`). This is **expected and safe** — Firebase client API keys are public identifiers, and access is controlled by Firebase Security Rules.

**No Firebase Admin SDK service account JSON was found anywhere in the codebase.** The server-side admin credentials are loaded from the `FIREBASE_SERVICE_ACCOUNT` environment variable in `netlify/functions/_firebase.js`.

### 12c. Memberstack App ID
**Status:** SAFE — The Memberstack app ID (`app_cmmm8x9fr00dg0utoabyje7x9`) appears in several HTML files. This is a public client identifier, not a secret.

### 12d. `.gitignore` Review

Current `.gitignore` properly excludes:
- `node_modules/`
- `dist/`
- `*.log`
- `.env`
- `.DS_Store`

**Suggested additions:**
- `.env.local` and `.env.*.local`
- `*.pem`, `*.key`, `*.p8` (certificate files)

---

## Summary of All Issues

### Critical (0)
None.

### High Priority (4)

1. **CORS domain split** (Check 5) — 6 functions hardcode `job-dox.com`, 4 hardcode `job-dox.ai`, and 6 read from `SITE_URL` with `.ai` fallback. If the live domain is `.ai`, the `.com` hardcoded functions will fail CORS.
2. **Anthropic model version inconsistency** (Check 6) — Two different model strings in production (`claude-sonnet-4-20250514` vs `claude-sonnet-4-5`).
3. **`shared/firebase.js` placeholder values** (Check 7) — The canonical shared config file has never been populated; all 3 active clients duplicate the config inline.
4. **Unprotected `response.json()` calls** (Check 9) — 5 Netlify functions calling the Anthropic API don't protect the JSON parse, risking unhandled exceptions on malformed responses.

### Medium Priority (5)

5. **`URL` vs `SITE_URL` inconsistency** (Check 2) — 6 functions use a dual fallback while the rest use only `SITE_URL`.
6. **`jd_cortex_workflow` orphaned localStorage write** (Check 3) — Written but never read.
7. **`jd_current_user` read without write** (Check 3) — Read in 2 files but never written (external auth dependency with no null-check).
8. **DryDox missing `inventory` prop** (Check 11) — Portal doesn't pass `inventory` that the component signature expects.
9. **Silent error swallowing in frontend** (Check 9) — Multiple `.catch(() => {})` blocks give users no failure feedback.

### Low Priority (5)

10. **3 unused functions** (Check 1) — `hoursToBillingDays`, `saveWorkflowTemplate`, `deleteWorkflowTemplate`.
11. **`jd-theme` naming inconsistency** (Check 3) — Uses hyphen while all other localStorage keys use underscores.
12. **250–300 lines of duplicate utility code** (Check 10) — `toE164()` copied 8 times, `parseFormBody()` 5 times, etc.
13. **`reports-analyze.js` uses wildcard CORS** (Check 5) — Accepts requests from any origin.
14. **`.gitignore` could be enhanced** (Check 12) — Add `.env.local`, `*.pem`, `*.key`.

### Clean Checks

- **Check 4 (Function Call Mismatches):** All imports and function calls resolve correctly.
- **Check 8 (Twilio Audit):** All Twilio SDK and credential usage is properly server-side only.
- **Check 12 (Security):** No hardcoded secrets found. Firebase Admin SDK credentials properly externalized.
