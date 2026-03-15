# FEATURE ROADMAP

Internal planning document for the Cortex platform.
Prioritized build order based on a full codebase audit against university.html training documentation.

---

## TIER 1 — Core AI Intelligence Layer

> Build these first. They are the primary value proposition of Cortex.

---

### 1. Budget Overrun Alerts with Configurable Thresholds and Notification Delivery

A partial foundation exists: `JobDoxFinance.jsx` already calculates financial health pressure via `computeHealth()` (line ~370) and renders a `FinancialHealthBadge` with four severity levels (Healthy, Watch, At Risk, Critical). However, this is display-only — it paints a colored pill on portfolio cards but never sends a notification. The full feature requires a configurable threshold system (university.html specifies 80% as the warning trigger), a Settings UI where users can adjust alert thresholds per project or globally, and a notification delivery pipeline that fires SMS, email, and/or in-app alerts the moment an expense pushes a project past its threshold. The backend should evaluate thresholds on every expense write and dispatch alerts through the existing Twilio (SMS) and Nodemailer (email) infrastructure already used by other features.

**Files to create or modify:**

- `app/src/JobDoxFinance.jsx` — Add threshold configuration UI to the financial settings panel; wire threshold values into `computeHealth()` so it uses user-defined percentages instead of hardcoded 0.85/1.0 values.
- `app/src/JobDoxPortal.jsx` — Add a "Budget Alerts" section under Settings > Notifications; store threshold preferences in the company Firestore document; add in-app notification rendering when alerts fire.
- `netlify/functions/budget-alert.js` *(new)* — Serverless function triggered on expense creation that evaluates the project budget against thresholds and dispatches notifications via Twilio SMS and Nodemailer email.
- `shared/constants.js` — Add default threshold constants (e.g., `BUDGET_WARN_THRESHOLD = 0.80`, `BUDGET_CRITICAL_THRESHOLD = 1.0`).

---

### 2. Project Health Scoring with 4 Sub-Metrics and AI Recommendations

This feature does not exist in the codebase. University.html describes a composite health score built from four sub-metrics — Budget, Schedule, Tasks, and Documentation — displayed as a score badge on each job card, with a notification trigger when the score drops below 60. The build requires: a scoring engine that computes each sub-metric (budget adherence from `JobDoxFinance.jsx` data, schedule adherence from project phase dates, task completion rate from the tasks subcollection, and documentation completeness from the documents subcollection), a composite scoring algorithm that weights and combines them, a health score badge component for job cards, and an AI recommendation layer that calls the Anthropic API (following the pattern in `finance-analyze.js`) to suggest corrective actions when a score is low.

**Files to create or modify:**

- `app/src/JobDoxPortal.jsx` — Add `ProjectHealthBadge` component to the job card rendering (near lines 3582 and 3653 where `FinancialHealthBadge` is already attached); implement the four sub-metric calculation functions; add health score detail panel accessible from the badge.
- `netlify/functions/health-score-analyze.js` *(new)* — Serverless function that accepts the four sub-metric values and calls the Anthropic API to generate AI recommendations, following the same pattern as `finance-analyze.js` (system prompt, Cortex Coins deduction via `cortex-coins.js`).
- `app/src/JobDoxFinance.jsx` — Export budget health data so the health scoring engine can consume it without duplicating calculations.
- `shared/constants.js` — Add health score thresholds, sub-metric weight constants, and severity level definitions.

---

### 3. AI Auto-Tasks Rule Builder

Only a stub exists: `JobDoxPortal.jsx` has work-type toggles that sync to localStorage for mindflow.html, but there is no rule builder, no trigger engine, and no automatic task creation. The full feature requires a Settings > Cortex AI > Auto-Tasks page with a visual rule builder where users define trigger-action pairs (e.g., "When project status changes to Active, create task: Schedule initial inspection"). The trigger engine should listen to Firestore document changes (project status, document uploads, task completions) and create tasks automatically when conditions match. Each auto-created task should deduct 1 Cortex Coin using the existing `cortex-coins.js` system. A "Test Rule" button should simulate the trigger without deducting coins or creating real tasks.

**Files to create or modify:**

- `app/src/JobDoxPortal.jsx` — Add the Auto-Tasks rule builder UI under the Cortex AI settings section (near line 12935 where CortexAI integration is referenced); build the rule configuration form with trigger type selector, condition fields, and action template; implement the Test Rule simulation button; add a rules list view showing active rules with enable/disable toggles.
- `netlify/functions/auto-task-trigger.js` *(new)* — Serverless function that receives Firestore event payloads (via webhook or Cloud Function bridge), evaluates them against stored rules, creates tasks in the project's tasks subcollection, and deducts Cortex Coins via `cortex-coins.js`.
- `netlify/functions/cortex-coins.js` — Add `auto-task` as a recognized feature type in the coin deduction logic (currently only handles `finance-analyze`, `reports-analyze`, and call transcription).
- `shared/constants.js` — Add auto-task trigger types, default rule templates, and coin cost constants.

---

## TIER 2 — Operational Visibility Layer

> High customer value. Build after Tier 1 is complete.

---

### 1. Recurring Tasks

This feature is completely absent from the codebase. University.html describes tasks that repeat on a configurable frequency (Daily, Weekly, Bi-weekly, Monthly), where each occurrence is an independent task that can be completed without affecting future instances. The implementation needs a recurrence configuration UI on the task creation form, a scheduling engine that generates the next task instance when the current one is completed or when the scheduled date arrives, and a pause mechanism that halts recurrence when a project is placed On Hold. The task creation logic in `JobDoxPortal.jsx` already writes to the `projects/{id}/tasks` Firestore subcollection, so the recurring logic should extend this pattern.

**Files to create or modify:**

- `app/src/JobDoxPortal.jsx` — Extend the task creation modal (near the task management section around lines 10600-10700) to include a recurrence selector (frequency dropdown, end-date or occurrence-count option); add recurrence metadata fields (`recurrenceRule`, `nextDueDate`, `parentTaskId`) to the task Firestore document; add logic to generate the next task instance on completion.
- `netlify/functions/recurring-task-generator.js` *(new)* — Scheduled function (Netlify Scheduled Function or triggered by a cron-like mechanism) that queries all tasks with active recurrence rules whose `nextDueDate` has arrived and creates the next instance.

---

### 2. Calendar View for Tasks

A mini calendar exists in the "My Day" sidebar of `JobDoxPortal.jsx` (lines 3160-3309) with month navigation and per-day task counts, but it only shows tasks for a single selected day. The full Calendar View described in university.html is a dedicated view showing all tasks and deadlines across all jobs in a full month/week grid with drag-and-drop rescheduling. This requires building a full calendar grid component (month and week views), populating it with tasks aggregated from all active projects, implementing drag-and-drop to reassign task dates, and adding quick-create functionality when clicking an empty date cell.

**Files to create or modify:**

- `app/src/JobDoxPortal.jsx` — Build a `CalendarView` component as a new top-level view (alongside the existing My Day, Dispatch, and Reports views); implement month and week grid rendering; wire drag-and-drop date reassignment to Firestore task updates; add cross-project task aggregation query; add a view toggle in the main navigation.

---

### 3. Crew Utilization Dashboard

This feature does not exist in the codebase. University.html describes a dashboard that visualizes each crew member's workload across all active jobs, detects overload conditions (at an 85% capacity threshold based on quiz content), and provides AI-powered rebalancing recommendations. The implementation requires aggregating task assignments and hours per staff member, calculating utilization percentages against configurable capacity limits, rendering a visual dashboard (bar charts or heat map per crew member), and integrating an AI recommendation endpoint to suggest task redistribution.

**Files to create or modify:**

- `app/src/JobDoxReports.jsx` — Add a "Crew Utilization" tab to the `REPORT_TABS` array (currently 8 tabs, line 226); build the utilization dashboard component with per-crew-member workload bars, capacity thresholds, and overload indicators.
- `app/src/JobDoxPortal.jsx` — Add crew utilization data aggregation queries that pull task assignments and hours across all projects for each staff member.
- `netlify/functions/crew-analyze.js` *(new)* — Serverless function that accepts utilization data and calls the Anthropic API to generate rebalancing recommendations, following the `finance-analyze.js` pattern.

---

### 4. Crew Performance Reports

This feature is documented in university.html but has no implementation. The existing `REPORT_TABS` in `JobDoxReports.jsx` (line 226) includes Revenue, WIP, Referral, Pipeline, Whiteboard, AI Insights, Equipment Mismatch, and Reputation — but no Crew Performance tab. The feature should display per-crew-member metrics: task completion rates, hours logged, jobs assigned, and utilization percentages, with the ability to drill down into a specific crew member's job list for reassignment.

**Files to create or modify:**

- `app/src/JobDoxReports.jsx` — Add a "Crew Performance" tab to `REPORT_TABS` (line 226); build the report component with a staff list table showing completion rates, hours, and job counts; implement drill-down to per-member detail view; add date range filtering.
- `app/src/JobDoxPortal.jsx` — Ensure staff/task data aggregation functions are accessible to the reports module.

---

### 5. Job Summary Reports with 4 Named Report Types

University.html describes Job Summary Reports as single-page project snapshots that include status, timeline, budget, notes, photos, documents, and tasks, exportable as PDF or sent directly via email. This is one of four named report types documented (Job Summary, Crew Performance, Financial Reports, Profit & Margin). Currently none of these four are present in the `REPORT_TABS` array. The Job Summary Report should aggregate all data for a single project into a print-ready format suitable for sending to adjusters or clients.

**Files to create or modify:**

- `app/src/JobDoxReports.jsx` — Add a "Job Summary" tab to `REPORT_TABS` (line 226); build the report component with project selector, data aggregation from all subcollections (tasks, notes, photos, documents, expenses), and a formatted single-page layout; implement PDF export using the existing `html2canvas` dependency (already in package.json); add email delivery option using the existing Nodemailer backend.
- `netlify/functions/send-report.js` *(new)* — Serverless function that receives a rendered report payload and sends it as a PDF email attachment via Nodemailer.

---

## TIER 3 — Polish and Completions

> Existing features that need to be finished.

---

### 1. Document Type Tags

**What's missing:** The document system in `JobDoxDocuments.jsx` handles uploads, templates, and signatures but has no document categorization system. University.html specifies five document types (Invoice, Contract, Authorization, Report, Other) as the base set, but four additional types need to be added: Insurance Form, Permit, Lien Waiver, and Completion Certificate. A type tag selector should appear on the document upload/edit UI and documents should be filterable by type.

**File to edit:** `app/src/JobDoxDocuments.jsx` — Add a `DOCUMENT_TYPES` constant array with all nine types; add a type selector dropdown to the document upload and document detail views; add type-based filtering to the document list; store the `docType` field on each document's Firestore record.

---

### 2. E-Signatures: Sequential Signing and 7-Day Expiry

**What's missing:** The backend in `send-signing-request.js` already implements sequential signing order (via `order` and `signerIdx` fields, lines 10-92) and 7-day expiry (line 96 sets `expiresAt`). However, two pieces are incomplete: (1) the frontend trigger is stubbed — `JobDoxDocuments.jsx` line 930 has a TODO where the signing request should call the backend function but doesn't; (2) email delivery is not wired up — lines 136-156 of `send-signing-request.js` show a commented-out SendGrid integration. The signing UI needs to actually call the backend, and the backend needs email delivery alongside the existing SMS delivery.

**Files to edit:**
- `app/src/JobDoxDocuments.jsx` (line ~930) — Replace the TODO stub with an actual call to the `send-signing-request` Netlify function, passing the document ID, signer list with order, and delivery method.
- `netlify/functions/send-signing-request.js` (lines 136-156) — Implement email delivery using Nodemailer (already a project dependency) instead of the commented-out SendGrid path.

---

### 3. Document Template Merge Fields

**What's missing:** `JobDoxDocuments.jsx` (lines 103-116) defines 12 merge field tokens (project name, date, address, client name/phone, work type, claim number, insurance company, and company name/phone/email/address). The token system works — fields with `autoFill` are populated at render time (line 638). What's missing are commonly needed fields: project start and end dates, project status, budget total, assigned project manager name, and vendor/subcontractor fields. The university.html documentation also describes `{{merge_field}}` style placeholders in notification templates that should share this same token system.

**File to edit:** `app/src/JobDoxDocuments.jsx` (lines 103-116) — Expand the `TOKENS` object to include additional merge fields: `project.startDate`, `project.endDate`, `project.status`, `project.budget`, `project.manager`, `project.vendor`. Ensure corresponding data is passed into the token resolution function at line 638.

---

### 4. Invoice Auto-Populate from Expenses Button

**What's missing:** Invoices are currently created manually from scope line items in the `ScopeTab` component of `JobDoxPortal.jsx` (lines 5054-5166). There is no way to pull recorded expenses into an invoice automatically. University.html describes a button that auto-populates invoice line items from a project's expense records, saving users from manually re-entering costs they've already tracked.

**File to edit:** `app/src/JobDoxPortal.jsx` (near lines 5054-5166 in the ScopeTab/Invoice section) — Add an "Auto-populate from Expenses" button that queries the project's expenses from the financial data (managed by `JobDoxFinance.jsx`), converts each expense into an invoice line item (mapping category, vendor, amount), and populates the invoice form.

---

### 5. Profit and Margin Report with PDF Export

**What's missing:** Margin calculations exist — `JobDoxReports.jsx` computes gross margin at lines 106-145 and displays it in KPI cards (lines 324-342). However, there is no dedicated Profit & Margin report view with per-project breakdown and historical trending. More critically, there is no PDF export for reports. Individual invoices can be printed (via `window.print()` in `JobDoxFinance.jsx` line 753), but the reports module has no export functionality. The `html2canvas` library is already in `package.json` and can be used to render report views to downloadable PDFs.

**File to edit:** `app/src/JobDoxReports.jsx` — Add a "Profit & Margin" tab to `REPORT_TABS`; build a report view with per-project margin breakdown table, portfolio margin summary, and date range filter; add a "Download PDF" button that uses `html2canvas` to capture the report view and convert it to a downloadable PDF.

---

### 6. AI Financial Analyst with KPI Cards in Financial Reports

**What's missing:** The AI Financial Analyst backend is fully implemented (`finance-analyze.js` calls the Anthropic API with Cortex Coins gating) and KPI cards exist throughout `JobDoxReports.jsx`. What's missing is surfacing dedicated AI-generated KPI summary cards on the Financial Reports view — cards that show AI-computed insights like "Projected monthly burn rate," "Cash runway estimate," or "Top margin-eroding project." Currently the AI analysis is available in `JobDoxFinance.jsx` as a text briefing, but it doesn't generate structured KPI card data for the reports dashboard.

**File to edit:** `app/src/JobDoxReports.jsx` — In the Financial Reports section, add a KPI card row that calls `finance-analyze.js` with a prompt requesting structured JSON output (key metrics with labels, values, and trend indicators); parse the response and render it as styled KPI cards using the existing `.rpt-kpi` CSS classes (lines 186-190).

---

### 7. Automated Notifications Send Test Button

**What's missing:** The automation system in `JobDoxPortal.jsx` references Zapier integration for notifications (lines 9479, 9529) and CortexAI automation toggles (lines 2436, 3830), but there is no "Send Test" button that lets users verify their notification setup works before going live. University.html describes a test button that sends a sample notification to the logged-in user so they can confirm delivery without triggering real workflows.

**File to edit:** `app/src/JobDoxPortal.jsx` (near lines 9479-9529 in the automation/notification settings section) — Add a "Send Test Notification" button that calls the existing `send-sms.js` Netlify function with the current user's phone number and a sample message, and/or triggers an in-app notification with test content. Display a success/failure toast after delivery.

---

## NOTES FOR DEVELOPERS

### Where the Relevant Code Lives

- **Portal shell and all project management UI:** `app/src/JobDoxPortal.jsx` (14,124 lines). This is the main SPA — job cards, task management, settings panels, and most feature UI lives here.
- **Financial intelligence module:** `app/src/JobDoxFinance.jsx` (~3,200 lines). Budget tracking, expense management, invoicing, financial health badges, and AI financial analysis are here.
- **Reports and analytics:** `app/src/JobDoxReports.jsx` (~2,000 lines). All report tabs, KPI cards, and data visualization. The `REPORT_TABS` array at line 226 controls which tabs appear — new report types should be added here.
- **Document management:** `app/src/JobDoxDocuments.jsx` (~1,567 lines). Templates, merge field tokens, signature field placement, and document upload UI.
- **Backend serverless functions:** `netlify/functions/` (34 functions). Each is a standalone Netlify Function. AI features call the Anthropic API. Communication goes through Twilio (SMS/calls) and Nodemailer (email).
- **Shared config:** `shared/constants.js` and `shared/firebase.js` provide constants and Firebase initialization used across the app.

### Patterns to Follow

- **AI feature pattern:** All AI features follow the same architecture — a Netlify function receives data, calls the Anthropic API (currently using `claude-sonnet-4-20250514`), deducts Cortex Coins via `cortex-coins.js`, and returns the result. See `finance-analyze.js` and `reports-analyze.js` as reference implementations.
- **Cortex Coins gating:** Any feature that uses AI must check coin balance before executing. The `cortex-coins.js` function handles balance checks, deductions, and cycle resets (300 coins per 28-day cycle with rollover). Import the pattern from existing callers.
- **Component styling:** There are no external CSS files. All components use inline `<style>` tags with CSS custom properties (design tokens like `--bg`, `--acc`, `--t1`, `--t2`, `--br`). Follow this pattern — do not introduce a CSS framework or separate stylesheet.
- **Data layer:** All data flows through Firebase Firestore with real-time listeners (`onSnapshot`). Project data lives under `companies/{companyId}/projects/{projectId}` with subcollections for tasks, notes, documents, etc. Follow the existing Firestore document structure.
- **Netlify function structure:** Each function exports a `handler` using the pattern in `_api-helpers.js` for CORS headers, rate limiting (60 req/min), and error handling. New functions should import from `_firebase.js` for database access and `_api-helpers.js` for response formatting.
- **Authentication:** Memberstack handles user sessions (primary), Firebase Auth provides tokens (secondary). API endpoints authenticate via Bearer token validated in `_api-helpers.js`.

### Dependencies Between Features

- **Health Scoring depends on Budget Alerts:** The budget sub-metric of the health score should reuse the threshold logic from the Budget Alert system. Build Budget Alerts first.
- **Crew Utilization and Crew Performance share data:** Both need per-staff task aggregation queries. Build the data layer once (in Tier 2, item 3) and share it with item 4.
- **Recurring Tasks feed into Calendar View:** The calendar needs to display recurring task instances. Build Recurring Tasks before or alongside Calendar View.
- **Job Summary Reports consume all subcollection data:** This report aggregates tasks, notes, photos, documents, and expenses. Ensure all these data paths are stable before building the report.
- **PDF export is needed by multiple features:** Both Job Summary Reports (Tier 2) and Profit & Margin Report (Tier 3) need PDF generation. Consider building a shared `exportToPdf()` utility using `html2canvas` that both can use.
- **Merge fields and notification templates overlap:** The `TOKENS` system in `JobDoxDocuments.jsx` and the `{{merge_field}}` placeholders in automated notifications should share the same token dictionary. Expand tokens once and reference from both systems.

### Potential Conflicts

- **JobDoxPortal.jsx is massive (14K+ lines).** Multiple developers working on different Tier 1 and Tier 2 features will hit merge conflicts in this file. Coordinate carefully — consider feature-branching and working on isolated sections.
- **REPORT_TABS modification:** Multiple Tier 2 and Tier 3 features add new tabs to the same `REPORT_TABS` array at line 226 of `JobDoxReports.jsx`. Batch these additions or be prepared for frequent rebasing.
- **Cortex Coins cost balancing:** As more AI features are added (Health Score analysis, Auto-Tasks, Crew Utilization recommendations), the 300-coin monthly budget may become insufficient. Monitor usage patterns and consider adjusting the allocation or coin costs.
