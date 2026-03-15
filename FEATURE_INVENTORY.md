================================================================
CORTEX BY JOB-DOX — COMPLETE FEATURE INVENTORY
Generated: 2026-03-15
================================================================

This document is a comprehensive, plain-English inventory of every
feature, tool, and backend function in the Cortex by Job-Dox platform.
It is intended as source material for writing onboarding and training
guides for new clients.

================================================================
STEP 1 — COMPLETE FILE MAP
================================================================

── UI COMPONENTS (User-Facing Features / Pages) ──────────────

1.  app/src/main.jsx                        — App entry point (renders JobDoxPortal)
2.  app/src/JobDoxPortal.jsx                — Main application shell (14,143 lines). Contains:
    - Left rail navigation
    - Portfolio page (project list)
    - My Day page (daily planner)
    - Project Detail view with all sub-tabs
    - Settings page (Staff, Offices, General, Phone, CortexAI, Coins, Billing)
    - Company Tasks page
    - MarketDox view (SEO yard signs)
    - Cortex Copilot panel (AI chat)
    - Advanced Tools panel
    - Vendor Manager
    - Activity Feed
    - Clock In/Out system
    - Message Center
    - All modals (Add Project, Notify, Comm, Review Request, Clock In, etc.)
3.  app/src/JobDoxDispatch.jsx              — Dispatch board (drag-and-drop scheduling)
4.  app/src/JobDoxDocuments.jsx             — Document management, templates, PDF signing
5.  app/src/JobDoxFinance.jsx               — Financial tab per project + Financial Dashboard
6.  app/src/JobDoxPayroll.jsx               — Payroll dashboard and reporting
7.  app/src/JobDoxReports.jsx               — Company-wide reports and analytics
8.  app/src/JobDoxTimeOff.jsx               — Time off / PTO request panel
9.  app/src/AdjusterResponseBot.jsx         — AI-powered adjuster/customer response generator
10. app/src/ContentsDox.jsx                 — Contents inventory and Schedule of Loss
11. app/src/DryDox.jsx                      — Drying documentation module (parent)
12. app/src/EstimateDox.jsx                 — Good/Better/Best estimate builder

── DRYDOX SUB-COMPONENTS ─────────────────────────────────────

13. app/src/drydox/DryDoxConstants.jsx      — Shared constants, CSS, icons, equipment types
14. app/src/drydox/DryDoxESX.jsx            — ESX sketch export for Xactimate
15. app/src/drydox/DryDoxEquipment.jsx      — Equipment inventory and placement tracking
16. app/src/drydox/DryDoxFloorPlan.jsx      — Interactive floor plan with moisture points
17. app/src/drydox/DryDoxMoisture.jsx       — Moisture and psychrometric readings
18. app/src/drydox/DryDoxReport.jsx         — PDF drying report generation
19. app/src/drydox/DryDoxS500.jsx           — ANSI/IICRC S500 compliance checker
20. app/src/drydox/DryDoxScope.jsx          — DryDox scope items for billing

── NETLIFY FUNCTIONS (Backend / API) ─────────────────────────

21. netlify/functions/_firebase.js          — Utility: Shared Firebase Admin initializer
22. netlify/functions/_api-helpers.js       — Utility: API key validation, rate limiting, CORS
23. netlify/functions/adjuster-response.js  — AI adjuster response generation (Anthropic API)
24. netlify/functions/api-keys.js           — API key management (generate, list, revoke)
25. netlify/functions/api-projects.js       — Standalone projects endpoint for external integrations
26. netlify/functions/api-v1.js             — Open API v1 (full REST API for external tools)
27. netlify/functions/api-webhooks-deliver.js — Webhook delivery worker
28. netlify/functions/call-complete.js      — Twilio call status callback
29. netlify/functions/call-recording-ready.js — Twilio recording ready callback
30. netlify/functions/call-transcribe.js    — AI call transcription + keyword detection
31. netlify/functions/clear-session.js      — Tab-close session cleanup
32. netlify/functions/cortex-coins.js       — Cortex Coins usage tracker
33. netlify/functions/cortex-generate.js    — CortexAI workflow generator (Anthropic API)
34. netlify/functions/create-checkout.js    — Stripe checkout session creator
35. netlify/functions/create-portal-session.js — Stripe billing portal session
36. netlify/functions/extract-price.js      — Product price extractor from URL
37. netlify/functions/finance-analyze.js    — AI financial analysis (Anthropic API)
38. netlify/functions/generate-webhook-token.js — MarketDox webhook token generator
39. netlify/functions/get-billing-history.js — Stripe invoice history fetcher
40. netlify/functions/get-portal-data.js    — Customer portal data provider
41. netlify/functions/handle-voice.js       — Twilio inbound voice handler (TwiML)
42. netlify/functions/inbound-call.js       — Twilio inbound call routing with ring groups
43. netlify/functions/initiate-call.js      — Outbound call initiator via Twilio
44. netlify/functions/marketing-webhook.js  — Zapier webhook receiver for marketing data
45. netlify/functions/receive-sms.js        — Twilio inbound SMS handler
46. netlify/functions/reports-analyze.js    — AI reports analysis (Anthropic API)
47. netlify/functions/save-phone-settings.js — Phone/call settings persistence
48. netlify/functions/send-feature-request.js — Feature request email sender (SMTP)
49. netlify/functions/send-review-request.js — Google review request via SMS
50. netlify/functions/send-signing-request.js — Document signing request via SMS
51. netlify/functions/send-sms.js           — General SMS/MMS sender via Twilio
52. netlify/functions/stripe-webhook.js     — Stripe subscription lifecycle handler
53. netlify/functions/yard-sign-sitemap.js  — XML sitemap for published yard signs
54. netlify/functions/yard-sign.js          — Server-rendered public yard sign pages

── STANDALONE TOOLS (HTML) ───────────────────────────────────

55. mindflow.html                           — CortexAI mind map and workflow generator
56. field/index.html                        — Field tech mobile PWA (clock in, photos, notes)
57. customer-portal.html                    — Customer-facing project portal

── PUBLIC / MARKETING PAGES ──────────────────────────────────

58. index.html                              — Marketing homepage
59. blog.html                               — Blog index page
60. blog-ai-eliminates-paperwork-water-damage-restoration.html — Blog post
61. blog-ai-job-documentation-insurance-claims-restoration.html — Blog post
62. blog-ai-project-management-software-restoration-contractors.html — Blog post
63. blog-best-restoration-management-software-2026.html — Blog post
64. blog-reduce-overhead-costs-restoration-business-ai.html — Blog post
65. faqs.html                               — Frequently asked questions
66. partners.html                           — Partners page
67. privacy-policy.html                     — Privacy policy
68. support.html                            — Support / contact page
69. terms-conditions.html                   — Terms and conditions
70. university.html                         — Job-Dox University (training resources)

── CONFIGURATION FILES ───────────────────────────────────────

71. netlify.toml                            — Config: Netlify build and redirect rules
72. app/package.json                        — Config: App dependencies (React, Firebase, Vite, etc.)
73. app/vite.config.js                      — Config: Vite build configuration
74. app/capacitor.config.ts                 — Config: Capacitor mobile app settings (iOS/Android)
75. app/manifest.json                       — Config: PWA manifest for main app
76. app/index.html                          — Config: HTML shell for React SPA
77. field/manifest.json                     — Config: PWA manifest for field tech app
78. netlify/functions/package.json          — Config: Netlify functions dependencies

── UTILITY / SHARED FILES ────────────────────────────────────

79. shared/constants.js                     — Utility: Project types, statuses, roles, automation triggers, API scopes
80. shared/firebase.js                      — Utility: Shared Firebase config
81. app/src/firebase.js                     — Utility: Firebase initialization for app
82. app/src/plugins/jobdox-lidar-web.js     — Utility: LiDAR plugin (web fallback)
83. app/src/plugins/jobdox-lidar.js         — Utility: LiDAR plugin (native iOS/Android)


================================================================
STEP 2 — UI COMPONENTS AND STANDALONE TOOLS
================================================================

────────────────────────────────────────────────────────────────
PORTAL CORE — NAVIGATION AND APP SHELL
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — LEFT RAIL NAVIGATION
SECTION: App Shell
  FEATURE: Left Rail Navigation
  WHAT IT DOES: The left rail is the primary navigation bar that runs vertically along the left side of the screen. It contains icon buttons for every major area of the platform: Projects, My Day, Dispatch, All Tasks, Messages, Reports, Payroll, Financial Dashboard, Cortex Copilot, and Advanced Tools. It also shows the user's clock-in status, permission level badge, theme toggle (dark/light mode), help menu, and sign-out button.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Always visible on the left edge of the screen (desktop). On mobile, replaced by a bottom tab bar.
  NOTABLE DETAILS: The rail shows a green pulsing dot when a user is clocked into a project. The user's permission level is displayed as a small badge on their account icon (e.g., "ADM" for Admin, "PM" for Project Manager). Tooltip labels appear on hover.

FILE: app/src/JobDoxPortal.jsx — MOBILE BOTTOM NAV
SECTION: App Shell
  FEATURE: Mobile Bottom Navigation Bar
  WHAT IT DOES: On screens narrower than 700 pixels, the left rail is hidden and replaced with a bottom tab bar. It provides quick access to Projects, My Day, Tools, Clock, and Cortex Copilot.
  WHO USES IT: All Staff (mobile users)
  WHERE TO FIND IT: Bottom of screen on mobile devices only
  NOTABLE DETAILS: Automatically appears on small screens. The "Clocked In" tab turns green when the user is actively clocked in.

────────────────────────────────────────────────────────────────
PORTFOLIO PAGE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — PortfolioPage
SECTION: Portfolio
  FEATURE: Project Portfolio (Main Dashboard)
  WHAT IT DOES: The landing page of the app. Shows all active projects as cards in either a grid or list view. Each card displays the project name, client, address, status badge, work type pills, task count, and budget (if the user has permission). Users can filter projects by status, search by name or address, sort by different criteria, and toggle between grid and list layouts. An "Add Project" button lets authorized users create new projects.
  WHO USES IT: All Staff (what each person sees depends on their permission level)
  WHERE TO FIND IT: Left rail → Projects (first icon), or the default page after login
  NOTABLE DETAILS: Permission level 0-2 users see only projects they are personally assigned to. Level 3-4 see projects from their own office only. Level 5 and above see all projects across all offices. The budget column is hidden for users below level 5. The "Add Project" button only appears for users at level 5 or higher. Projects can be archived — archived projects are hidden by default but can be shown with a toggle.

FILE: app/src/JobDoxPortal.jsx — AddProjModal
SECTION: Portfolio
  FEATURE: New Project Creator
  WHAT IT DOES: A modal form for creating a new project. Fields include project name, client name, client phone, client email, address, project type (dropdown from configured types), status, and work types. The address field is geocoded using Google Maps to automatically assign the project to the nearest office. If workflow templates have been built in CortexAI, the user can toggle on auto-loading of tasks from templates.
  WHO USES IT: Project Leads and above (permission level 5+)
  WHERE TO FIND IT: Portfolio page → "+ New Project" button (top right)
  NOTABLE DETAILS: The project number is auto-generated in the format "JD-YYYY-NNN". If CortexAI workflow templates exist for the selected work types, a banner shows how many templates are ready. When toggled on, tasks from those templates will be automatically loaded into the new project's task list on creation. Address geocoding requires the Google Maps API key to be configured.

────────────────────────────────────────────────────────────────
MY DAY PAGE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — MyDayPage
SECTION: My Day
  FEATURE: Daily Planner and Calendar
  WHAT IT DOES: A personal daily planning page with a calendar on the left and a time-slotted schedule on the right. Users can create appointments and time blocks, view tasks assigned to them across all projects, and manage a personal checklist. The calendar highlights days that have tasks or appointments. A "now line" indicator shows the current time on the schedule. Managers at level 5 and above can view the schedules of other staff members.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Left rail → My Day (calendar icon)
  NOTABLE DETAILS: Staff at permission level 5 or higher can use a dropdown to view another team member's day. Lower-permission users only see their own schedule. Appointments can be created with a title, time, duration, and linked project. The checklist items are personal and not shared with the team.

────────────────────────────────────────────────────────────────
DISPATCH
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxDispatch.jsx
SECTION: Dispatch
  FEATURE: Dispatch Board (Drag-and-Drop Scheduling)
  WHAT IT DOES: A visual scheduling board for dispatching crews and equipment to job sites. Shows a timeline view where resources (staff members, vehicles, equipment) are listed on the left and time slots run across the top. Appointments can be dragged and dropped to reschedule. Includes a map view powered by Google Maps that shows project locations as pins and can display driving routes. Resources can be created and color-coded. The board integrates with office geocoding for proximity-based dispatch suggestions.
  WHO USES IT: Project Managers and above (permission level 5+)
  WHERE TO FIND IT: Left rail → Dispatch (grid icon)
  NOTABLE DETAILS: Dispatch data is persisted to Firestore and syncs across devices in real time. The map view geocodes project addresses and caches coordinates for performance. Resources can be any dispatchable unit — a person, vehicle, or piece of equipment. All appointments persist across sessions and are linked to projects.

────────────────────────────────────────────────────────────────
ALL TASKS PAGE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — CompanyTasksPage
SECTION: Tasks
  FEATURE: Company-Wide Task View
  WHAT IT DOES: A unified view of all tasks across every project in the company. Tasks can be filtered by project, assigned staff member, status (open/completed), and priority. This gives managers a bird's-eye view of everything that needs to be done without having to click into each project individually.
  WHO USES IT: Project Managers and above (permission level 5+)
  WHERE TO FIND IT: Left rail → All Tasks (checkmark icon)
  NOTABLE DETAILS: Clicking a task navigates directly to that project's Tasks tab. Lower-permission users can still access this page but will only see tasks from projects they are assigned to.

────────────────────────────────────────────────────────────────
SETTINGS PAGE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — SettingsPage
SECTION: Settings
  FEATURE: Settings Hub
  WHAT IT DOES: The central configuration area for the entire workspace. Contains multiple sub-tabs: Staff, Offices, General Settings, Phone and Calls, CortexAI, Cortex Coins, Billing, and Feature Requests. Each sub-tab is described separately below.
  WHO USES IT: Admins primarily; some tabs have lower permission thresholds
  WHERE TO FIND IT: Left rail → Settings (gear icon)
  NOTABLE DETAILS: The Settings page itself is accessible to all staff, but individual tabs within it are gated by permission level. General Settings and Phone and Calls require level 8+. Permission management requires level 10 (Admin).

FILE: app/src/JobDoxPortal.jsx — SettingsPage (Staff Tab)
SECTION: Settings
  FEATURE: Staff Manager
  WHAT IT DOES: Manage the company's team roster. Add new staff members, edit existing profiles (name, email, phone, system role, title, photo, office assignment), set permission levels (0-10), and remove team members. Staff can be invited via email — the system generates an invite link that, when clicked, automatically joins the new member to the company with the assigned permission level. Pending invites are shown with their status.
  WHO USES IT: Directors and Admins (permission level 9+ to manage staff, 10 to change permissions)
  WHERE TO FIND IT: Settings → Staff tab (default tab)
  NOTABLE DETAILS: The account owner always has permission level 10 and cannot be demoted or removed. Each staff member has a "System Role" field (e.g., Project Manager, Field Technician, Estimator) that CortexAI uses for automatic task assignment. Permission levels range from 0 (Vendor/Subcontractor) to 10 (Admin) with 11 distinct tiers. Staff records sync to CortexAI automatically via localStorage.

FILE: app/src/JobDoxPortal.jsx — SettingsPage (Offices Tab)
SECTION: Settings
  FEATURE: Office Manager
  WHAT IT DOES: Define company office locations. Each office has a name, full address, color tag, and Google Business review URL. Addresses can be geocoded (converted to latitude/longitude) so the system can automatically assign new projects to the nearest office. Staff members are assigned to offices, and project visibility can be filtered by office for mid-level permissions.
  WHO USES IT: Directors and Admins (permission level 8+)
  WHERE TO FIND IT: Settings → Offices tab
  NOTABLE DETAILS: The geocoding feature requires clicking a "Geocode Address" button after entering the address. CortexAI uses the System Role combined with Office to route task assignments. The Google Business URL is used by the Review Request feature to send clients a direct link.

FILE: app/src/JobDoxPortal.jsx — GeneralSettingsTab
SECTION: Settings
  FEATURE: General Settings (Work Types, Statuses, Project Types, Billing, Budget Categories, Company Info)
  WHAT IT DOES: This is a multi-section configuration panel with six sub-sections:

  1. COMPANY INFO — Set the company name, phone, email, website, address, industry, and logo. This information is used in documents, reports, AI-generated content, and email templates. The industry field specifically tailors AI Response Bot outputs to the company's trade.

  2. BILLING — Configure tax rates (name and percentage), invoice defaults (overhead/profit percentage, default tax rate, default terms and conditions), and pinned line items per work type. Pinned items are pre-configured scope items that appear as quick-add suggestions when building project scopes.

  3. BUDGET CATEGORIES — Define reusable budget tracking categories (e.g., Labor, Materials, Equipment, Subcontractors). Each category can be color-coded, associated with specific work types, and toggled active/inactive. Categories can be reordered. These templates are applied to projects in the Finance tab.

  4. WORK TYPES — Define the service lines the company performs (e.g., Water Mitigation, Fire and Smoke, Mold Remediation). Each work type has a name, color, and a flag indicating whether a CortexAI workflow has been built for it. Types marked "No Workflow" are flagged in CortexAI so the user knows to build one. Work types sync to CortexAI automatically.

  5. STATUSES — Define project lifecycle stages (e.g., New Lead, Active, Mitigation, Reconstruction, Completed, Closed). Each status has a name, color, and an optional auto-trigger keyword. When a task containing the trigger keyword is marked complete in any project, the project automatically advances to that status.

  6. PROJECT TYPES — Define the loss/job types that appear in the New Project dropdown and portfolio filters (e.g., Water Damage, Fire and Smoke, Mold Remediation, Storm Damage).

  WHO USES IT: Directors and Admins (permission level 8+)
  WHERE TO FIND IT: Settings → General tab
  NOTABLE DETAILS: All general settings sync to Firestore and are shared across all users in the company. Work types, statuses, and project types are foundational — many other features depend on them being configured first.

FILE: app/src/JobDoxPortal.jsx — PhoneSettingsTab
SECTION: Settings
  FEATURE: Phone and Calls Settings
  WHAT IT DOES: Configure the company's phone system integration with Twilio. Settings include:
  1. TWILIO PHONE NUMBER — The company's dedicated phone number for inbound and outbound calls.
  2. CALL RECORDING DISCLOSURE — A message read aloud to callers before connecting, for legal compliance.
  3. CALL GROUPS — Define groups of staff members who will ring simultaneously when a call comes in. Multiple groups can be created (e.g., "Business Hours Team", "After Hours Team"), and one is set as the active group.
  4. CALL TRANSCRIBER — AI-powered call transcription with keyword detection. When enabled, completed calls are automatically transcribed, customer details are extracted (name, phone, address, insurance info), and keywords are flagged. An "Auto-Create Projects" option can automatically create new projects from inbound calls when a new customer is detected.
  WHO USES IT: Admins only (permission level 8+)
  WHERE TO FIND IT: Settings → Phone & Calls tab
  NOTABLE DETAILS: Each call transcription uses 1 Cortex Coin. The auto-create feature checks existing projects by customer name, phone, and address to avoid duplicates. Staff members must have a phone number on their profile to be included in call groups.

FILE: app/src/JobDoxPortal.jsx — CortexAI Settings Tab
SECTION: Settings
  FEATURE: CortexAI Integration Settings
  WHAT IT DOES: Shows connection details for the CortexAI mind-map tool (mindflow.html). Provides a direct "Open CortexAI" button and explains the integration workflow: staff are synced via localStorage, workflows are generated by AI based on work types, and generated task lists can be pushed back to Job-Dox as templates.
  WHO USES IT: Admins and Managers
  WHERE TO FIND IT: Settings → CortexAI tab
  NOTABLE DETAILS: The integration works through localStorage — both tools must be opened in the same browser for data to sync. No API key is needed for the connection between the portal and CortexAI.

FILE: app/src/JobDoxPortal.jsx — CortexCoinsTab
SECTION: Settings
  FEATURE: Cortex Coins Usage Dashboard
  WHAT IT DOES: Displays the company's AI credit balance and usage. Shows a circular ring chart of usage percentage, remaining coins, plan allowance, rollover bonus, and cycle dates. Warns users when usage reaches 80% and again when coins are exhausted. Provides an upgrade prompt for the Premium plan (1,000 coins per cycle at $199/month vs. Standard's 300 free coins).
  WHO USES IT: All Staff (viewable), Admins (can upgrade)
  WHERE TO FIND IT: Settings → Cortex Coins tab
  NOTABLE DETAILS: Standard plan includes 300 coins per 28-day cycle. Unused coins roll over to the next cycle. Each AI action costs 3-5 coins (Copilot responses, report analysis, adjuster responses) or 1 coin (call transcription). When coins are exhausted, all AI features are paused until the next cycle.

FILE: app/src/JobDoxPortal.jsx — BillingTab
SECTION: Settings
  FEATURE: Billing and Subscription Management
  WHAT IT DOES: Shows the company's current subscription plan, Cortex Coins usage stats, payment history from Stripe, and a "Manage Subscription" button that opens the Stripe customer portal for updating payment methods or canceling. Displays a warning banner if the last payment failed.
  WHO USES IT: Admins
  WHERE TO FIND IT: Settings → Billing tab
  NOTABLE DETAILS: Billing is powered by Stripe. The Standard plan is included with the base Job-Dox subscription. The Premium Cortex Coins add-on is $199/month for 1,000 coins.

FILE: app/src/JobDoxPortal.jsx — FeatureRequestForm
SECTION: Settings
  FEATURE: Feature Request Submission
  WHAT IT DOES: A simple form where users can type a feature request and submit it. The request is emailed to the Job-Dox team via SMTP. Shows a confirmation after submission.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Settings → Roadmap tab
  NOTABLE DETAILS: Includes the submitting user's name and company name in the email automatically.

────────────────────────────────────────────────────────────────
CORTEX COPILOT
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — CortexCopilotPanel
SECTION: Cortex AI
  FEATURE: Cortex Copilot (AI Chat Assistant)
  WHAT IT DOES: A slide-out chat panel where users can ask questions about their company data in natural language. Cortex reads all project data (names, statuses, budgets, addresses, work types, task counts) and responds with insights, suggestions, and analysis. The AI is specifically trained as a restoration industry project management assistant. Users type questions like "Which projects are overdue?" or "What's our total revenue this month?" and receive conversational answers.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Left rail → Cortex Copilot (sparkle icon), or mobile bottom nav → "Cortex"
  NOTABLE DETAILS: Each response costs 3-5 Cortex Coins. The panel shows the current coin balance. When coins are exhausted, the AI responds with a notice that features are paused until the next billing cycle. Conversation history is maintained within the session but not persisted across page reloads. The AI has access to all project data the current user can see.

────────────────────────────────────────────────────────────────
ADVANCED TOOLS PANEL
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — AdvToolsPanel
SECTION: Advanced Tools
  FEATURE: Advanced Tools Side Panel
  WHAT IT DOES: A slide-out panel from the left side that provides quick access to specialized tools and sections. Contains links to:
  - CortexAI (opens mindflow.html in a new tab)
  - Reports
  - Financial Dashboard
  - Payroll (if permission allows)
  - MarketDox (SEO yard signs)
  - Vendor Manager
  - Price List Manager
  - Document Template Center
  - API and Integrations
  WHO USES IT: All Staff (what's visible depends on permission level)
  WHERE TO FIND IT: Left rail → Advanced Tools (wrench icon)
  NOTABLE DETAILS: The panel also contains the Price List Manager inline. Payroll is only shown to users with permission level 8+.

FILE: app/src/JobDoxPortal.jsx — VendorManager
SECTION: Advanced Tools
  FEATURE: Vendor and Subcontractor Manager
  WHAT IT DOES: A full vendor/subcontractor management system with a master-detail layout. The left side lists all vendors with status badges, W-9 and COI (Certificate of Insurance) compliance indicators, and financial summaries. The right panel shows a detailed vendor profile with four sub-tabs:
  1. PROFILE — Contact information, trade/specialty, portal access details, and notes.
  2. DOCUMENTS — Upload and manage W-9 forms and Certificates of Insurance. Tracks COI expiration dates and shows warnings for expired or expiring-soon certificates.
  3. PROJECTS — Lists all projects the vendor is assigned to with revenue, payments, and margin percentages.
  4. INVOICES/AP — Accounts payable view showing all bills from this vendor, outstanding amounts, and payment tracking.
  Vendors can be given portal access at permission level 0 (Vendor/Subcontractor), which limits them to seeing only their assigned projects and tasks.
  WHO USES IT: Project Managers and above
  WHERE TO FIND IT: Left rail → Advanced Tools → Vendor Manager
  NOTABLE DETAILS: Vendors with portal access log in through Memberstack and see a restricted view. COI status is tracked as "On File", "Missing", "Expiring Soon", or "Expired". Vendor financial data aggregates across all their assigned projects.

FILE: app/src/JobDoxPortal.jsx — PriceListManagerModal
SECTION: Advanced Tools
  FEATURE: Price List Manager
  WHAT IT DOES: Manage reusable price lists that feed into the Scope/Invoice tab and DryDox. Price lists contain line items with descriptions, units (SF, LF, EA, HR, etc.), and prices. Multiple price lists can be maintained (e.g., one for each insurance carrier or region). Price lists can be imported by uploading an Xactimate price list file or created manually.
  WHO USES IT: Estimators and above
  WHERE TO FIND IT: Left rail → Advanced Tools → Price Lists
  NOTABLE DETAILS: Price lists are used by the Scope tab when building invoices, by DryDox when generating equipment billing, and by EstimateDox when creating estimates.

FILE: app/src/JobDoxPortal.jsx — APIIntegrationsPanel
SECTION: Advanced Tools
  FEATURE: API and Integrations Panel
  WHAT IT DOES: Two-tab panel for managing external integrations:
  1. API KEY tab — Generate, view, and revoke API keys for the Job-Dox Open API. Each key has configurable scopes (projects:read, projects:write, contacts:read, etc.) and a name. The key value is shown once on creation and cannot be retrieved later. Provides documentation for the REST API endpoints.
  2. APPS tab — Browse and connect third-party integrations. Currently shows available webhook and Zapier connections.
  WHO USES IT: Admins (permission level 8+)
  WHERE TO FIND IT: Left rail → Advanced Tools → API & Integrations
  NOTABLE DETAILS: API keys are rate-limited to 60 requests per minute. Each key is scoped — a key with only "projects:read" cannot write data. Keys are hashed in Firestore; only the prefix is stored in plaintext for identification.

────────────────────────────────────────────────────────────────
MARKETDOX
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — MarketDoxView
SECTION: MarketDox
  FEATURE: MarketDox (SEO Yard Sign Pages)
  WHAT IT DOES: An automated local SEO tool that generates public "digital yard sign" web pages for completed projects. When a project's status changes to "Completed" or "Closed", the system automatically publishes a public page at a URL like job-dox.ai/pros/company-name/water-mitigation-tulsa-ok. These pages contain Schema.org structured data for Google indexing, showing the company name, work type, and service area. A dashboard shows all published yard signs with their locations and allows managing (publishing/unpublishing) individual signs. Includes a setup modal for connecting Google Ads and Analytics data via Zapier webhooks.
  WHO USES IT: Admins and Owners
  WHERE TO FIND IT: Left rail → Advanced Tools → MarketDox
  NOTABLE DETAILS: Yard signs are created automatically — no manual action needed beyond completing a project. If a project is re-opened (status changed back from Completed), its yard signs are automatically unpublished. The system generates an XML sitemap at /sitemap-yards.xml for search engines. Marketing data from Google Ads and Google Analytics can be piped in via Zapier webhooks for ROI tracking.

FILE: app/src/JobDoxPortal.jsx — MarketDoxSetupModal
SECTION: MarketDox
  FEATURE: MarketDox Setup Wizard
  WHAT IT DOES: A guided setup modal for connecting marketing data sources. Generates a unique webhook URL for the company and provides instructions for connecting Google Ads and Google Analytics data via Zapier. The webhook accepts campaign performance data (clicks, impressions, cost, conversions) and organic traffic data (sessions, users, bounce rate).
  WHO USES IT: Admins
  WHERE TO FIND IT: MarketDox dashboard → "Connect Marketing Data" button
  NOTABLE DETAILS: Requires a Zapier account to connect data sources. The webhook token is cryptographically generated and unique per company.

────────────────────────────────────────────────────────────────
MESSAGE CENTER
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — MessageCenter
SECTION: Messages
  FEATURE: Message Center (Company-Wide SMS Hub)
  WHAT IT DOES: A centralized view of all SMS conversations across the company. Shows inbound and outbound text messages organized by conversation thread. Integrates with Twilio so messages appear in real time. Users can send new messages directly from this panel.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Left rail → Messages (chat bubble icon)
  NOTABLE DETAILS: Messages are logged to Firestore and linked to projects when possible. Inbound SMS from unknown numbers creates a new conversation thread.

────────────────────────────────────────────────────────────────
ACTIVITY FEED
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — Activity Feed (FeedActionPopup)
SECTION: Activity Feed
  FEATURE: Activity Feed
  WHAT IT DOES: A chronological feed of all significant actions across the company: documents uploaded, tasks completed, task comments posted, scope items added, messages sent, media uploaded, budget changes, and vendor-related actions. Each feed item is clickable and opens a context menu with quick-action options like "Open Project", "View Document", "Open Tasks tab", etc. The feed provides a real-time stream of what is happening across all projects.
  WHO USES IT: All Staff (filtered by permission-based project visibility)
  WHERE TO FIND IT: Portfolio page — right side panel (or inline depending on layout)
  NOTABLE DETAILS: Feed items are color-coded by action type (blue for documents, green for tasks, purple for comments, amber for scope, etc.). The feed persists to Firestore and syncs across sessions.

────────────────────────────────────────────────────────────────
PROJECT DETAIL VIEW — ALL TABS
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPortal.jsx — ProjectDetail
SECTION: Project Detail
  FEATURE: Project Detail View (Tab Container)
  WHAT IT DOES: When a user clicks a project from the Portfolio, this view opens and shows all project-level tools organized as tabs across the top. Available tabs include: Overview, DryDox, ContentsDox, EstimateDox, Contacts, Media, Documents, Tasks, Finance, Shifts, Scope/Invoice, Messages, Calls, and Project Report. Which tabs appear depends on the user's permission level — Finance, Scope, Shifts, DryDox, ContentsDox, and EstimateDox require permission level 5 or higher.
  WHO USES IT: All Staff (tab visibility varies by permission)
  WHERE TO FIND IT: Portfolio → Click any project
  NOTABLE DETAILS: The tab strip is horizontally scrollable on mobile. Each tab is a separate component. The project detail view also shows the project name, status, and address in a header bar with a back button.

FILE: app/src/JobDoxPortal.jsx — OverviewTab
SECTION: Project Detail
  FEATURE: Project Overview Tab
  WHAT IT DOES: The default tab when opening a project. Displays a comprehensive overview including:
  - Project details (name, client, address, type, status, project number)
  - Active work types with toggle switches (drives CortexAI automations)
  - Daily notes log — a chronological journal where staff record what happened each day. Notes include timestamp, author name, and text. New notes can be added with a text area.
  - Assigned staff list with permission levels and roles
  - Client email schedule settings (daily, weekly, or off)
  - Client portal toggle (enables/disables the customer-facing portal for this project)
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → Overview tab (default)
  NOTABLE DETAILS: Work type toggles sync to CortexAI and drive workflow automations. The "CORTEXAI SYNC ACTIVE" banner appears when work types are toggled on. Staff assignment shows each person's permission level and system role. The client portal toggle controls whether the homeowner can view project updates through the customer-facing portal page.

FILE: app/src/JobDoxPortal.jsx — ContactsTab
SECTION: Project Detail
  FEATURE: Contacts Tab
  WHAT IT DOES: Manage contacts associated with this project — homeowners, adjusters, insurance agents, contractors, etc. Each contact has fields for name, email, phone, and role (e.g., "Adjuster", "Insured", "Contractor"). Contacts are used throughout the system for sending SMS, emails, review requests, and document signing requests.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → Contacts tab
  NOTABLE DETAILS: Contacts are stored per-project. The role field is free-text and helps identify what relationship the contact has to the project.

FILE: app/src/JobDoxPortal.jsx — MediaTab
SECTION: Project Detail
  FEATURE: Media Tab (Photos and Files)
  WHAT IT DOES: Upload, organize, and view photos and files for a project. Photos can be organized into folders (e.g., "Before", "After", "Moisture Readings"). Supports drag-and-drop upload, camera capture on mobile, and bulk upload. Each upload records the timestamp, uploader name, and folder assignment.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → Media tab
  NOTABLE DETAILS: Photos stored in React state with base64 encoding (Firebase Storage integration is the planned v2 path). The media tab feeds into the Project Report tab for comprehensive documentation.

FILE: app/src/JobDoxPortal.jsx — TasksTab
SECTION: Project Detail
  FEATURE: Tasks Tab
  WHAT IT DOES: A full task management system for the project. Tasks can be created, assigned to staff members, given due dates, and marked complete. Each task supports a threaded comment system where staff can discuss the task, and comments can trigger SMS notifications to assigned team members. Tasks can be created manually or auto-populated from CortexAI workflow templates. When a task containing a status trigger keyword is completed, the project status automatically advances.
  WHO USES IT: All Staff (vendors see only their assigned tasks)
  WHERE TO FIND IT: Project Detail → Tasks tab
  NOTABLE DETAILS: Task comments include the commenter's name and timestamp. SMS notifications for comments use Twilio. The vendor permission level (0) restricts users to only see tasks specifically assigned to them. Tasks integrate with the status auto-trigger system defined in Settings → Statuses.

FILE: app/src/JobDoxPortal.jsx — TaskCommentModal
SECTION: Project Detail
  FEATURE: Task Comment Thread
  WHAT IT DOES: A modal that shows the full comment thread for a specific task. Users can add new comments, and optionally send an SMS notification to the assigned staff member about the new comment. Shows all previous comments with author names and timestamps.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Tasks tab → Click the comment icon on any task
  NOTABLE DETAILS: SMS notifications for task comments use the company's Twilio number and cost nothing extra beyond the Twilio per-message fee. The notification includes the task title and comment text.

FILE: app/src/JobDoxPortal.jsx — BudgetTab
SECTION: Project Detail
  FEATURE: Budget Tracking Tab
  WHAT IT DOES: Track project costs against budget categories. Shows a budget vs. actual breakdown by category (from templates defined in Settings), with visual progress bars. Categories can include Labor, Materials, Equipment Rental, Subcontractors, and custom categories. Displays totals for budgeted amount, actual spend, remaining budget, and percentage used.
  WHO USES IT: Project Managers and above (permission level 5+)
  WHERE TO FIND IT: Project Detail → Finance tab
  NOTABLE DETAILS: Budget categories come from the templates defined in Settings → Budget Categories. Categories that have been imported from an Xactimate PDF show their source.

FILE: app/src/JobDoxPortal.jsx — ShiftsTab
SECTION: Project Detail
  FEATURE: Shifts / Time Tracking Tab
  WHAT IT DOES: View all time entries (shifts) logged against this project. Each shift shows the staff member name, clock-in time, clock-out time, total hours, rate, and labor cost. Users with rate-viewing permission can see billing rates and pay rates. Supports manual shift entry and automatic shifts from the clock-in/out system. Shows per-shift details including pay type (Regular, Overtime), billable status, and notes.
  WHO USES IT: Project Managers and above (permission level 5+ to see tab, 7+ to see rates, 8+ to see pay rates)
  WHERE TO FIND IT: Project Detail → Shifts tab
  NOTABLE DETAILS: Shifts feed into both project budget calculations and the Payroll module. The rate columns are hidden for users below the required permission level.

FILE: app/src/JobDoxPortal.jsx — ScopeTab
SECTION: Project Detail
  FEATURE: Scope / Invoice Builder
  WHAT IT DOES: Build line-item scopes of work and generate invoices. Features include:
  - Add line items manually or from pinned items (pre-configured in Settings)
  - Each line item has a description, quantity, unit (SF, LF, EA, HR, etc.), and unit price
  - Automatic subtotal, overhead/profit percentage, tax calculation, and grand total
  - Invoice preview with company logo, project details, and line items
  - PDF generation and download
  - Email invoices directly to contacts
  - Apply tax rates configured in Settings
  - Import scope items from DryDox equipment billing
  WHO USES IT: Estimators and above (permission level 7+ for billing scope)
  WHERE TO FIND IT: Project Detail → Scope tab
  NOTABLE DETAILS: Pinned line items from Settings appear as quick-add suggestions matching the project's work types. Tax rates and overhead/profit defaults come from Settings → Billing. The Scope tab can receive pushed items from DryDox when equipment billing is generated.

FILE: app/src/JobDoxPortal.jsx — MessagesTab
SECTION: Project Detail
  FEATURE: Project Messages Tab
  WHAT IT DOES: A project-specific messaging hub. Shows all SMS conversations related to this project. Users can send text messages to project contacts directly from this tab. Integrates with the AI Response Bot — when viewing a message from an adjuster or customer, users can click a button to have AI generate a professional response. Also shows daily notes that can be emailed to the client on a schedule.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → Messages tab
  NOTABLE DETAILS: Messages are sent via Twilio using the company's configured phone number. The AI Response Bot button appears on received messages and opens the AdjusterResponseBot modal.

FILE: app/src/JobDoxPortal.jsx — CallLogTab
SECTION: Project Detail
  FEATURE: Call Log Tab
  WHAT IT DOES: Shows all phone calls linked to this project — both inbound and outbound. Each call entry displays the caller/recipient name, phone number, direction (inbound/outbound), status (completed, no-answer, busy, failed), duration, and timestamp. Completed calls with recordings show a Play button for audio playback. Calls that have been transcribed show a "Transcript" button that expands to reveal the full transcription, extracted customer details (name, phone, address, insurance info), detected keywords, and an AI-generated summary. A "Call Client" button initiates an outbound call.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → Calls tab
  NOTABLE DETAILS: Outbound calls work by having Twilio call the staff member's phone first, then bridging to the client when they answer. All calls are recorded (with the disclosure message played first). Calls marked "AUTO-PROJECT" were automatically created from inbound calls by the Call Transcriber. Calls marked "LINKED" were matched to an existing project.

FILE: app/src/JobDoxPortal.jsx — ProjectReportTab
SECTION: Project Detail
  FEATURE: Project Report Tab
  WHAT IT DOES: Generates a comprehensive project report combining all project data into a single printable/downloadable document. Includes project details, daily notes, photos from the media tab, documents list, and key metrics. The report is formatted for print with proper page breaks and headers.
  WHO USES IT: Project Managers and above
  WHERE TO FIND IT: Project Detail → Project Report tab
  NOTABLE DETAILS: The report pulls data from all other tabs to create a unified view. Useful for insurance documentation, client updates, and internal reviews.

FILE: app/src/JobDoxPortal.jsx — ClockInModal
SECTION: Project Detail
  FEATURE: Clock In / Clock Out
  WHAT IT DOES: A modal for recording time against a project. Staff select their task/activity, confirm their billing rate (if they have permission to see rates), and click Clock In. While clocked in, a timer runs and the rail shows a green indicator. When clocking out, the shift is automatically recorded with the duration, rate, and labor cost calculated. Supports rate override for users with rate-viewing permission.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Any project → "Clock In" button, or via the clock icon in the rail/bottom nav
  NOTABLE DETAILS: Only one project can be clocked into at a time. If a user clocks into a different project while already clocked in, the previous shift is automatically closed with a note "Auto clocked out — switched to another project." Shift data feeds into the Shifts tab and Payroll module.

FILE: app/src/JobDoxPortal.jsx — NotifyModal
SECTION: Project Detail
  FEATURE: Staff Notification Modal
  WHAT IT DOES: Send a quick notification to team members about this project. Select one or more staff members and type a message. The notification is sent as an SMS via Twilio.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project overview or header area → Notify button
  NOTABLE DETAILS: Uses the company's Twilio number for sending. Only staff members with phone numbers on their profile can receive notifications.

FILE: app/src/JobDoxPortal.jsx — CommModal
SECTION: Project Detail
  FEATURE: Communication Modal (SMS/Email to Contacts)
  WHAT IT DOES: Send SMS or email messages to project contacts (homeowners, adjusters, etc.). Select a contact from the project's contact list, compose a message, and send. Supports both SMS via Twilio and email.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → various communication buttons throughout tabs
  NOTABLE DETAILS: Messages sent from here are logged in the project's Messages tab and the company Message Center.

FILE: app/src/JobDoxPortal.jsx — ReviewRequestModal
SECTION: Project Detail
  FEATURE: Google Review Request Sender
  WHAT IT DOES: Send an SMS to the project client asking them to leave a Google Business review. The message includes a personalized greeting and a direct link to the office's Google Business review page. Users can customize the message text before sending. The system logs the review request to Firestore for reputation tracking.
  WHO USES IT: Project Managers and above
  WHERE TO FIND IT: Project Detail → Review Request button (or via Advanced Tools)
  NOTABLE DETAILS: Requires the office's Google Business URL to be configured in Settings → Offices. The review request is tracked in the Reputation Report (in the Reports module) showing sent count, response rate, etc.

FILE: app/src/JobDoxPortal.jsx — DocEmailModal
SECTION: Project Detail
  FEATURE: Document Email Sender
  WHAT IT DOES: Email one or more project documents to contacts or staff. Select recipients from the project's contact list or assigned staff, select which documents to attach, and send. Supports sending to multiple recipients at once.
  WHO USES IT: All Staff
  WHERE TO FIND IT: Project Detail → Documents tab → Email button
  NOTABLE DETAILS: Emails include the project name and company branding. Documents are attached as links or inline depending on type.

FILE: app/src/JobDoxPortal.jsx — InvoicePreviewPortalModal
SECTION: Project Detail
  FEATURE: Invoice Preview Modal
  WHAT IT DOES: Displays a formatted preview of an invoice with the company logo, project address, line items, subtotals, tax, and grand total. Provides options to download as PDF or email to the client.
  WHO USES IT: Estimators and above (permission level 7+)
  WHERE TO FIND IT: Scope tab → Preview Invoice button
  NOTABLE DETAILS: The invoice format matches industry standards for restoration contractor billing.

────────────────────────────────────────────────────────────────
DRYDOX MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/DryDox.jsx
SECTION: DryDox (Drying Documentation)
  FEATURE: DryDox Module (Parent Component)
  WHAT IT DOES: A complete drying documentation system for water damage restoration projects. This is the parent component that houses six sub-modules: Floor Plan, Moisture Readings, Equipment Tracking, Scope/Billing, Drying Report, and ESX Export. DryDox tracks every aspect of the drying process — from initial moisture readings through daily monitoring to final dry standards — producing professional documentation for insurance claims. The module supports multi-floor, multi-suite, and multi-room layouts.
  WHO USES IT: Field Technicians, Project Managers, and above (permission level 5+ to see the tab)
  WHERE TO FIND IT: Project Detail → DryDox tab
  NOTABLE DETAILS: All DryDox data is persisted to both localStorage and Firestore with debounced saves. The module is mobile-optimized for PWA use in the field. LiDAR scanning integration is available on compatible iOS/Android devices for automatic room measurement. DryDox data feeds into the Scope tab for billing and the Documents tab for report storage.

FILE: app/src/drydox/DryDoxFloorPlan.jsx
SECTION: DryDox
  FEATURE: Interactive Floor Plan Editor
  WHAT IT DOES: A visual floor plan builder where users create room layouts and mark moisture reading points. Users can add rooms (with dimensions from manual entry or LiDAR scan), position them on a canvas, and place moisture reading points within each room. The floor plan supports multiple floors and suites. Rooms can be resized, moved, and labeled. Moisture points are numbered and color-coded based on reading values (green for dry, yellow for elevated, red for wet).
  WHO USES IT: Field Technicians
  WHERE TO FIND IT: DryDox tab → Floor Plan sub-tab
  NOTABLE DETAILS: The LiDAR integration works on iOS devices with LiDAR sensors (iPad Pro, iPhone 12 Pro and later) via a Capacitor plugin. On other devices, room dimensions are entered manually. The floor plan is rendered as an interactive SVG canvas.

FILE: app/src/drydox/DryDoxMoisture.jsx
SECTION: DryDox
  FEATURE: Moisture and Psychrometric Readings
  WHAT IT DOES: Log daily moisture readings at each marked point and psychrometric atmospheric readings (temperature, relative humidity, grains per pound, dew point) at chamber and room level. Each reading is timestamped and associated with a specific moisture point on the floor plan. The interface shows reading history as a table with color-coded values — green when dry standard is reached, red when readings are elevated. Tracks progress toward IICRC dry standards.
  WHO USES IT: Field Technicians
  WHERE TO FIND IT: DryDox tab → Moisture sub-tab
  NOTABLE DETAILS: Psychrometric data includes temperature, relative humidity (RH%), grains per pound (GPP), and dew point calculations. The color coding uses industry-standard thresholds. Readings feed into the S500 compliance checker and the drying report.

FILE: app/src/drydox/DryDoxEquipment.jsx
SECTION: DryDox
  FEATURE: Equipment Inventory and Placement Tracker
  WHAT IT DOES: Track drying equipment deployed on a project. Supports standard equipment types: air movers, dehumidifiers, air scrubbers, heaters, and more. Each piece of equipment has a type, make/model, serial number, room assignment, start date, and end date. Equipment can be dragged from an inventory list and placed in rooms on the floor plan. Tracks deployment duration and calculates billing based on daily rates from the price list.
  WHO USES IT: Field Technicians, Project Managers
  WHERE TO FIND IT: DryDox tab → Equipment sub-tab
  NOTABLE DETAILS: Equipment billing uses rates from the Price List Manager. Daily rates are multiplied by deployment days to calculate total equipment costs. These costs can be pushed to the Scope tab as line items for invoicing.

FILE: app/src/drydox/DryDoxScope.jsx
SECTION: DryDox
  FEATURE: DryDox Scope Items
  WHAT IT DOES: Generates billable scope items from the DryDox data — equipment rental charges, monitoring fees, and other drying-related line items. Items are calculated from equipment deployment duration and price list rates. Users can review and adjust the generated items before pushing them to the main project Scope/Invoice tab.
  WHO USES IT: Project Managers and Estimators
  WHERE TO FIND IT: DryDox tab → Scope sub-tab
  NOTABLE DETAILS: The "Push to Scope" action transfers all DryDox billing items to the project's main Scope tab, where they appear alongside other line items and can be invoiced.

FILE: app/src/drydox/DryDoxReport.jsx
SECTION: DryDox
  FEATURE: Drying Report PDF Generator
  WHAT IT DOES: Generates a comprehensive PDF drying report containing all DryDox data: floor plan layouts, moisture reading tables with trends, psychrometric data, equipment placement maps, S500 compliance status, and a narrative summary. The report is formatted for insurance submission with professional headers, the company logo, and project details. Generated reports are automatically saved to the project's Documents tab.
  WHO USES IT: Project Managers
  WHERE TO FIND IT: DryDox tab → Report sub-tab → "Generate Report" button
  NOTABLE DETAILS: The generated PDF includes visual representations of the floor plan with color-coded moisture points, reading trend charts, and equipment placement. Reports are timestamped and versioned — generating a new report does not overwrite previous ones.

FILE: app/src/drydox/DryDoxESX.jsx
SECTION: DryDox
  FEATURE: ESX Sketch Export (Xactimate)
  WHAT IT DOES: Exports the DryDox floor plan and room data in ESX format, which is the native sketch format used by Xactimate (the insurance industry's standard estimating software). This allows drying documentation to be imported directly into Xactimate estimates without re-drawing rooms.
  WHO USES IT: Estimators, Project Managers
  WHERE TO FIND IT: DryDox tab → ESX Export sub-tab
  NOTABLE DETAILS: ESX is a proprietary format used by Verisk/Xactware. This export bridges the gap between field documentation and insurance estimating workflows.

FILE: app/src/drydox/DryDoxS500.jsx
SECTION: DryDox
  FEATURE: S500 Compliance Checker
  WHAT IT DOES: Evaluates the project's drying data against ANSI/IICRC S500 standards (the industry standard for professional water damage restoration). Checks psychrometric conditions, equipment-to-area ratios, monitoring frequency, and dry-standard achievement. Displays a compliance dashboard showing which requirements are met and which need attention.
  WHO USES IT: Project Managers, Quality Control
  WHERE TO FIND IT: DryDox tab → S500 sub-tab
  NOTABLE DETAILS: S500 compliance documentation strengthens insurance claims and demonstrates professional standards were followed. The checker uses actual project data from moisture readings and equipment tracking.

FILE: app/src/drydox/DryDoxConstants.jsx
SECTION: DryDox
  FEATURE: DryDox Shared Constants and Utilities
  WHAT IT DOES: Contains all shared constants used across DryDox sub-modules: CSS styles, icon definitions, equipment type definitions (air mover, dehumidifier, air scrubber, heater, etc.), utility functions for formatting currency, color-coding relative humidity values, and labeling RH thresholds. Also includes the S500 comparison utility.
  WHO USES IT: Internal (used by other DryDox components)
  WHERE TO FIND IT: Not directly user-facing
  NOTABLE DETAILS: Equipment types defined here drive the equipment inventory dropdown and billing calculations.

────────────────────────────────────────────────────────────────
CONTENTSDOX MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/ContentsDox.jsx
SECTION: ContentsDox (Contents Inventory)
  FEATURE: Contents Inventory and Schedule of Loss
  WHAT IT DOES: A complete contents documentation system for recording personal property affected by a loss. Used primarily for fire, smoke, and water damage claims where household items need to be inventoried. Each item record includes: room location, item description, quantity, condition, age, replacement cost, actual cash value (ACV), and photos. Items can be searched for comparable replacement prices using AI. The module generates a professional Schedule of Loss document that can be exported as a PDF for insurance submission.
  WHO USES IT: Contents Specialists, Project Managers (permission level 5+)
  WHERE TO FIND IT: Project Detail → ContentsDox tab
  NOTABLE DETAILS: The AI comparable search calls the cortex-generate Netlify function to find current replacement prices online. Each search uses Cortex Coins. Photos can be uploaded directly from the device camera. Items are stored in Firestore at the per-project level. The Schedule of Loss PDF includes all items with their values and totals.

────────────────────────────────────────────────────────────────
ESTIMATEDOX MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/EstimateDox.jsx
SECTION: EstimateDox (Estimate Builder)
  FEATURE: Good / Better / Best Estimate Builder
  WHAT IT DOES: Create tiered estimates for clients with three pricing levels: Good (basic/economy), Better (standard), and Best (premium). Each tier has its own set of line items with descriptions and prices. The estimate is presented in a side-by-side comparison format that clients can review. Estimates are saved per-project and can be revised. The accepted estimate feeds into the project's financial tracking.
  WHO USES IT: Estimators, Project Managers (permission level 5+)
  WHERE TO FIND IT: Project Detail → EstimateDox tab
  NOTABLE DETAILS: Estimates persist to both localStorage and Firestore. The accepted tier is tracked and feeds into the Financial Tab for budget comparison. Multiple estimate revisions can be saved.

────────────────────────────────────────────────────────────────
ADJUSTER RESPONSE BOT
────────────────────────────────────────────────────────────────

FILE: app/src/AdjusterResponseBot.jsx
SECTION: AI Tools
  FEATURE: AI Adjuster Response Bot
  WHAT IT DOES: An AI-powered tool that generates professional responses to adjuster emails and customer communications. The user selects a received message, and the AI reads the message content along with the project's daily notes, company industry, and relevant context to craft a detailed rebuttal or response grounded in IICRC standards and industry best practices. The generated response can be edited, copied to clipboard, or inserted directly into an email draft. Users can provide custom instructions to guide the AI's tone or focus, and select the sender's role (adjuster, homeowner, insurance agent, etc.).
  WHO USES IT: Project Managers, Owners
  WHERE TO FIND IT: Project Detail → Messages tab → Click the AI icon on any received message
  NOTABLE DETAILS: Each response generation costs 3-5 Cortex Coins. The AI uses the Anthropic Claude API (via the adjuster-response Netlify function). The response is tailored to the company's industry (set in Settings → Company Info). Users can regenerate with different instructions if the first response is not suitable. Includes a "Regenerate" button and inline editing.

────────────────────────────────────────────────────────────────
REPORTS MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxReports.jsx
SECTION: Reports
  FEATURE: Reports Dashboard
  WHAT IT DOES: A company-wide analytics and reporting module with multiple report types. Includes:
  - PROJECT STATUS REPORT — Breakdown of all projects by status with counts and visual charts.
  - REVENUE REPORT — Financial performance across projects with revenue, costs, and margins.
  - WORK TYPE ANALYSIS — Which service lines generate the most work and revenue.
  - STAFF PERFORMANCE — Task completion rates and time tracking by team member.
  - REPUTATION REPORT — Tracks Google review requests sent, response rates, and review scores by office. Shows which offices have review links configured and which need setup.
  - AI ANALYSIS — An "Ask AI" button that sends the current report data to the Anthropic API for intelligent analysis. The AI identifies trends, flags concerns, and suggests actions based on the numbers.
  WHO USES IT: Project Managers and above
  WHERE TO FIND IT: Left rail → Reports (chart icon)
  NOTABLE DETAILS: AI analysis costs 3-5 Cortex Coins per request. The reputation report integrates with the review request tracking system. Reports can be filtered by date range, office, project type, and work type. Data is pulled in real time from Firestore.

────────────────────────────────────────────────────────────────
PAYROLL MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxPayroll.jsx
SECTION: Payroll
  FEATURE: Payroll Dashboard
  WHAT IT DOES: A payroll management module that aggregates time tracking data across all projects into a payroll-ready view. Shows each staff member's total hours, regular vs. overtime breakdown, pay rates, and gross pay for a selected pay period. Supports configurable pay rates per employee, overtime rules, and pay period selection (weekly, bi-weekly). Includes QuickBooks Online (QBO) integration fields for syncing time activities. Can export payroll data for import into external payroll systems.
  WHO USES IT: Admins and Directors (permission level 8+ to view, 9+ to edit rates)
  WHERE TO FIND IT: Left rail → Payroll (if permission level allows), or Advanced Tools → Payroll
  NOTABLE DETAILS: Pay rates are configured per employee and stored in Firestore. The module reads shift data from all projects to calculate totals. QBO integration fields allow marking which time entries have been synced. Permission level 8+ can view payroll reports; level 9+ can edit pay rates.

────────────────────────────────────────────────────────────────
DOCUMENTS MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxDocuments.jsx
SECTION: Documents
  FEATURE: Document Management System
  WHAT IT DOES: A comprehensive document management system with three main capabilities:
  1. DOCUMENT STORAGE — Upload, organize, and manage project documents. Each document has a name, type, upload timestamp, and uploader. Documents can be downloaded, previewed, and emailed to contacts.
  2. DOCUMENT TEMPLATES — Create reusable document templates with merge fields. Templates support placeholder tokens like company name, project address, client name, and date that are automatically filled when the template is applied to a project. Templates can be for contracts, authorization forms, work orders, etc.
  3. PDF SIGNING — Digital signature workflow. Upload a PDF, define signature fields, and send signing requests to contacts via SMS. Supports sequential signing (one signer at a time in a specified order). Each signer receives a unique link with a signing token. The signing status (pending, signed, completed) is tracked in real time.
  WHO USES IT: All Staff (can upload and view), Project Managers (can manage templates and signing)
  WHERE TO FIND IT: Project Detail → Documents tab, and Settings → Advanced Tools → Document Templates
  NOTABLE DETAILS: Document templates are stored company-wide and can be applied to any project. The PDF signing feature sends SMS notifications via Twilio and tracks signer status in Firestore. The logo upload feature in Company Info is also handled by this module.

FILE: app/src/JobDoxDocuments.jsx — PdfQuickSignModal
SECTION: Documents
  FEATURE: PDF Quick Sign Modal
  WHAT IT DOES: A modal interface for sending documents out for digital signature. Users select signers from the project's contacts, assign signing roles, and set the signing order. Each signer receives an SMS with a unique link to view and sign the document. The system tracks which signers have completed their signatures.
  WHO USES IT: Project Managers and above
  WHERE TO FIND IT: Project Detail → Documents tab → "Send for Signing" on any PDF
  NOTABLE DETAILS: Sequential signing ensures each person signs in order. The signing link is time-limited and secured with a unique token stored in Firestore.

FILE: app/src/JobDoxDocuments.jsx — DocumentTemplateCenter
SECTION: Documents
  FEATURE: Document Template Center
  WHAT IT DOES: A management interface for creating and editing document templates. Each template has a name, category, and body content with merge field placeholders. Provides a list of available merge tokens and a preview of how the template will look when applied to a project.
  WHO USES IT: Admins
  WHERE TO FIND IT: Advanced Tools → Document Templates
  NOTABLE DETAILS: Templates support tokens for company info, project details, client info, and dates.

────────────────────────────────────────────────────────────────
TIME OFF MODULE
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxTimeOff.jsx
SECTION: Time Off
  FEATURE: Time Off / PTO Request Panel
  WHAT IT DOES: A panel for managing paid time off requests. Staff members can submit time off requests specifying the dates and reason. Managers can view pending requests and approve or deny them. Shows a calendar view of upcoming time off across the team. Tracks balances and accruals.
  WHO USES IT: All Staff (can submit), Managers and above (can approve/deny)
  WHERE TO FIND IT: Accessed via the app (specific navigation path depends on layout configuration)
  NOTABLE DETAILS: Time off requests integrate with the My Day calendar and Dispatch board so managers can see who is unavailable when scheduling work.

────────────────────────────────────────────────────────────────
FINANCIAL DASHBOARD
────────────────────────────────────────────────────────────────

FILE: app/src/JobDoxFinance.jsx — FinancialDashboard
SECTION: Finance
  FEATURE: Company-Wide Financial Dashboard
  WHAT IT DOES: A high-level financial overview of the entire company. Shows aggregate metrics across all projects: total revenue, total costs, gross margin, accounts receivable, and accounts payable. Includes charts for revenue trends over time, project profitability comparisons, and cash flow analysis. Can drill down into individual project financials.
  WHO USES IT: Owners and Admins (permission level 7+)
  WHERE TO FIND IT: Left rail → Financial Dashboard (dollar icon)
  NOTABLE DETAILS: Financial data is aggregated from project-level invoices, vendor bills, shift costs, and budget entries.

FILE: app/src/JobDoxFinance.jsx — FinancialTab
SECTION: Finance
  FEATURE: Project Financial Tab
  WHAT IT DOES: Per-project financial tracking with:
  - Budget vs. actual comparison by category
  - Invoice tracking (sent, paid, overdue)
  - Labor cost summary from shifts
  - Vendor/subcontractor costs
  - Profit margin calculations
  - AI Financial Analysis — an "Analyze" button that sends project financials to the AI for insights, identifying cost overruns, budget risks, and optimization opportunities
  WHO USES IT: Project Managers and above (permission level 5+)
  WHERE TO FIND IT: Project Detail → Finance tab
  NOTABLE DETAILS: AI analysis costs 3-5 Cortex Coins. Budget categories are applied from templates defined in Settings. Xactimate PDFs can be imported to auto-populate budget categories and amounts.

FILE: app/src/JobDoxFinance.jsx — FinancialHealthBadge
SECTION: Finance
  FEATURE: Financial Health Badge
  WHAT IT DOES: A small badge indicator that appears on project cards in the portfolio view, showing the project's financial health at a glance (green = healthy margins, yellow = watch, red = over budget).
  WHO USES IT: Project Managers and above (permission level 5+ to see)
  WHERE TO FIND IT: Portfolio page — on each project card
  NOTABLE DETAILS: Only visible to users with budget-viewing permission.

────────────────────────────────────────────────────────────────
STANDALONE TOOLS
────────────────────────────────────────────────────────────────

FILE: mindflow.html
SECTION: CortexAI
  FEATURE: CortexAI Mind Map and Workflow Generator
  WHAT IT DOES: A standalone AI-powered tool for building restoration workflows as mind maps. Users select a work type (e.g., Water Mitigation), and the AI generates a complete phased workflow with tasks, assignments, and dependencies organized as a visual mind map. Each node represents a task and can be assigned to a staff role. The generated workflow can be saved as a template and pushed to Job-Dox, where it auto-populates the task list for new projects of that work type. The mind map interface supports drag-and-drop editing, node expansion/collapse, and custom task additions.
  WHO USES IT: Owners, Managers, Operations Directors
  WHERE TO FIND IT: Left rail → Advanced Tools → CortexAI, or Settings → CortexAI → "Open CortexAI" button. Opens in a new browser tab at /mindflow.html
  NOTABLE DETAILS: CortexAI reads staff data and work types from localStorage, so it must be opened in the same browser session as the main portal. Each workflow generation costs 3-5 Cortex Coins. Generated workflows include task titles, phase groupings, role assignments, and suggested durations. Saved templates are stored in Firestore and sync back to the portal.

FILE: field/index.html
SECTION: Field App
  FEATURE: Field Tech Mobile PWA
  WHAT IT DOES: A lightweight progressive web app designed for field technicians working on job sites. Provides quick access to clock in/out, photo capture, daily note entry, and task viewing without the full complexity of the main portal. Optimized for mobile screens and can be installed as a home screen app on iOS and Android. Works offline with data syncing when connectivity returns.
  WHO USES IT: Field Technicians (all permission levels)
  WHERE TO FIND IT: Navigate to job-dox.ai/field on a mobile device, or install as a PWA
  NOTABLE DETAILS: The field app has its own PWA manifest and is designed for single-hand operation on a phone. It connects to the same Firebase backend as the main portal.

FILE: customer-portal.html
SECTION: Customer Portal
  FEATURE: Customer-Facing Project Portal
  WHAT IT DOES: A public-facing portal where homeowners and clients can view the status of their restoration project. Authenticated by email verification against the project's contact list. Shows project status, client-visible daily notes (only notes marked as visible to client), project photos, and document signing status. Does not show internal notes, financial data, or staff-only information.
  WHO USES IT: Homeowners / Clients (external users)
  WHERE TO FIND IT: Clients receive a link to their specific project portal page
  NOTABLE DETAILS: Access is controlled by matching the viewer's email to a project contact email. The portal only shows notes where the "visible to client" flag is enabled. This must be enabled per-project via the Client Portal toggle in the project Overview tab. Data is served by the get-portal-data Netlify function.

FILE: university.html
SECTION: Support / Training
  FEATURE: Job-Dox University
  WHAT IT DOES: A training and resource hub for new and existing users. Contains tutorial content, guides, and video walkthroughs for using the platform features.
  WHO USES IT: All users
  WHERE TO FIND IT: Help menu (bottom of left rail) → "Job-Dox University", or job-dox.ai/university
  NOTABLE DETAILS: Linked from the in-app help menu for easy access during onboarding.

FILE: index.html
SECTION: Marketing
  FEATURE: Marketing Homepage
  WHAT IT DOES: The public-facing marketing website for Cortex by Job-Dox. Describes the platform's features, pricing, and value proposition for restoration contractors. Includes call-to-action buttons for starting a free trial.
  WHO USES IT: Prospective customers
  WHERE TO FIND IT: job-dox.ai (root URL)
  NOTABLE DETAILS: Marketing page — not part of the authenticated application.

FILE: blog.html
SECTION: Marketing
  FEATURE: Blog Index Page
  WHAT IT DOES: Lists all published blog posts with titles, excerpts, and links to full articles. Content focuses on AI in restoration, project management best practices, and industry trends.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/blog
  NOTABLE DETAILS: Five blog posts currently published covering AI in restoration, documentation, project management, software comparison, and cost reduction.

FILE: blog-ai-eliminates-paperwork-water-damage-restoration.html
SECTION: Marketing
  FEATURE: Blog Post — AI Eliminates Paperwork in Water Damage Restoration
  WHAT IT DOES: An SEO-optimized blog article about how AI tools reduce paperwork in water damage restoration businesses.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/blog-ai-eliminates-paperwork-water-damage-restoration
  NOTABLE DETAILS: Marketing content.

FILE: blog-ai-job-documentation-insurance-claims-restoration.html
SECTION: Marketing
  FEATURE: Blog Post — AI Job Documentation for Insurance Claims
  WHAT IT DOES: Blog article about using AI for job documentation that improves insurance claim outcomes.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/blog-ai-job-documentation-insurance-claims-restoration
  NOTABLE DETAILS: Marketing content.

FILE: blog-ai-project-management-software-restoration-contractors.html
SECTION: Marketing
  FEATURE: Blog Post — AI Project Management Software for Restoration
  WHAT IT DOES: Blog article about AI-powered project management tools designed for restoration contractors.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/blog-ai-project-management-software-restoration-contractors
  NOTABLE DETAILS: Marketing content.

FILE: blog-best-restoration-management-software-2026.html
SECTION: Marketing
  FEATURE: Blog Post — Best Restoration Management Software 2026
  WHAT IT DOES: Blog article comparing restoration management software options for 2026.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/blog-best-restoration-management-software-2026
  NOTABLE DETAILS: Marketing content.

FILE: blog-reduce-overhead-costs-restoration-business-ai.html
SECTION: Marketing
  FEATURE: Blog Post — Reduce Overhead Costs with AI
  WHAT IT DOES: Blog article about reducing overhead costs in restoration businesses using AI technology.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/blog-reduce-overhead-costs-restoration-business-ai
  NOTABLE DETAILS: Marketing content.

FILE: faqs.html
SECTION: Marketing
  FEATURE: FAQ Page
  WHAT IT DOES: Frequently asked questions about the platform, pricing, features, and support.
  WHO USES IT: Public visitors
  WHERE TO FIND IT: job-dox.ai/faqs
  NOTABLE DETAILS: Marketing content.

FILE: partners.html
SECTION: Marketing
  FEATURE: Partners Page
  WHAT IT DOES: Information about partnership opportunities with Job-Dox.
  WHO USES IT: Prospective partners
  WHERE TO FIND IT: job-dox.ai/partners
  NOTABLE DETAILS: Marketing content.

FILE: support.html
SECTION: Marketing
  FEATURE: Support Page
  WHAT IT DOES: Contact information and support resources for existing customers.
  WHO USES IT: All users
  WHERE TO FIND IT: job-dox.ai/support
  NOTABLE DETAILS: Marketing/support content.

FILE: privacy-policy.html
SECTION: Legal
  FEATURE: Privacy Policy
  WHAT IT DOES: The company's privacy policy describing data collection, usage, and protection practices.
  WHO USES IT: All users
  WHERE TO FIND IT: job-dox.ai/privacy-policy
  NOTABLE DETAILS: Legal document.

FILE: terms-conditions.html
SECTION: Legal
  FEATURE: Terms and Conditions
  WHAT IT DOES: The platform's terms of service agreement.
  WHO USES IT: All users
  WHERE TO FIND IT: job-dox.ai/terms-conditions
  NOTABLE DETAILS: Legal document.


================================================================
STEP 3 — NETLIFY FUNCTIONS (SERVER-SIDE BACKEND)
================================================================

Each Netlify Function runs as a serverless endpoint. The portal
and external services call these functions to perform operations
that require secret keys, server-side processing, or direct
database writes.

── Internal Helpers (not callable endpoints) ─────────────────

FILE: _firebase.js
  WHAT IT POWERS: All backend functions that access the database
  WHAT IT DOES: Initializes and shares a single Firebase Admin connection so every other function can read and write Firestore without duplicating setup code.

FILE: _api-helpers.js
  WHAT IT POWERS: Open API (api-v1, api-projects, api-keys, api-webhooks-deliver)
  WHAT IT DOES: Provides shared utilities for the public API — API key validation, per-key rate limiting (60 requests per minute), CORS headers, and standardized JSON response formatting.

── AI / Cortex Functions ─────────────────────────────────────

FILE: cortex-generate.js
  WHAT IT POWERS: MindFlow AI workflow generator, ContentsDox AI comparable search, and other AI generation features
  WHAT IT DOES: Sends a prompt and company context to the Anthropic Claude API and returns structured AI-generated content (workflow phases, comparable items, etc.) while deducting one Cortex Coin per use.

FILE: adjuster-response.js
  WHAT IT POWERS: Adjuster Response Bot (in the Messages tab)
  WHAT IT DOES: Takes an adjuster or customer message plus project context, sends it to the Anthropic Claude API, and returns a professional rebuttal grounded in industry best practices — costs one Cortex Coin per use.

FILE: finance-analyze.js
  WHAT IT POWERS: Finance tab AI analysis
  WHAT IT DOES: Sends a project's financial data (invoices, payments, expenses) to the Anthropic Claude API and returns a plain-English profitability analysis with actionable insights — costs one Cortex Coin per use.

FILE: reports-analyze.js
  WHAT IT POWERS: Reports page AI analysis
  WHAT IT DOES: Sends aggregated company report data to the Anthropic Claude API and returns trend analysis, performance summaries, and recommendations — costs one Cortex Coin per use.

FILE: call-transcribe.js
  WHAT IT POWERS: Call Transcriber with automatic project creation
  WHAT IT DOES: Downloads a Twilio call recording, sends the audio to the Anthropic Claude API for transcription and keyword extraction (customer name, phone, address, damage type), checks for duplicate projects, and auto-creates a new project if the caller is new — costs one Cortex Coin per use.

FILE: cortex-coins.js
  WHAT IT POWERS: Cortex Coins balance display and all AI features' usage gating
  WHAT IT DOES: Manages per-company AI usage credits on a 28-day billing cycle — tracks balance (300 standard / 1000 premium), rolls over unused coins, deducts one coin per AI call, and sends alerts at 80% usage.

FILE: extract-price.js
  WHAT IT POWERS: ContentsDox price lookup for inventory items
  WHAT IT DOES: Fetches a product URL provided by the user, scans the page HTML for price patterns (meta tags, JSON-LD, common selectors), and returns the extracted price so staff don't have to manually copy it.

── Telephony / Twilio Functions ──────────────────────────────

FILE: initiate-call.js
  WHAT IT POWERS: Click-to-call button in the portal (Calls tab, Message Center)
  WHAT IT DOES: Initiates an outbound call via Twilio — calls the staff member's phone first, then bridges them to the client when they answer, records the conversation, and creates a real-time call log entry in Firestore.

FILE: inbound-call.js
  WHAT IT POWERS: Inbound call routing for company Twilio numbers
  WHAT IT DOES: When a call comes in to the company's Twilio number, looks up the company, plays a recording disclosure message, then simultaneously rings everyone in the active call group until someone answers.

FILE: handle-voice.js
  WHAT IT POWERS: Inbound voice call webhook (alternative/legacy handler)
  WHAT IT DOES: Looks up the company by their Twilio number, loads phone settings from Firestore, and returns TwiML instructions to either play a greeting or forward the call to a configured number or ring group.

FILE: call-complete.js
  WHAT IT POWERS: Call log status updates (automatic)
  WHAT IT DOES: Receives a callback from Twilio when a call ends (completed, no-answer, busy, or failed) and updates the Firestore call log document with the final status and call duration.

FILE: call-recording-ready.js
  WHAT IT POWERS: Call recording playback and transcription trigger
  WHAT IT DOES: Receives a callback from Twilio when a call recording is ready (1-2 minutes after the call ends), saves the recording URL to Firestore so users can play it back, and triggers transcription if the company has Call Transcriber enabled.

FILE: send-sms.js
  WHAT IT POWERS: SMS and MMS messaging (Message Center, task comment notifications)
  WHAT IT DOES: Sends an SMS or MMS message via Twilio to a client or staff member and logs the outbound message to Firestore so it appears in the Message Center conversation thread.

FILE: receive-sms.js
  WHAT IT POWERS: Inbound SMS reception in the Message Center
  WHAT IT DOES: Receives inbound text messages via Twilio webhook, looks up the company by their Twilio number, logs the message to Firestore, and returns a valid TwiML response so Twilio knows it was received.

FILE: save-phone-settings.js
  WHAT IT POWERS: Settings → Phone & Calls configuration
  WHAT IT DOES: Saves the company's Twilio number, recording disclosure message, call groups, and active group to Firestore, and writes a reverse-lookup document so inbound calls can be routed to the correct company.

── Billing / Stripe Functions ────────────────────────────────

FILE: create-checkout.js
  WHAT IT POWERS: "Upgrade to Premium" button in Billing settings
  WHAT IT DOES: Creates a Stripe Checkout Session for the Premium plan ($199/month) and returns the hosted checkout URL so the user's browser can redirect to Stripe's payment page.

FILE: create-portal-session.js
  WHAT IT POWERS: "Manage Subscription" button in Billing settings
  WHAT IT DOES: Creates a Stripe Billing Portal session so users can update their payment method, view invoices, or cancel their subscription through Stripe's hosted management page.

FILE: get-billing-history.js
  WHAT IT POWERS: Billing History table in Billing settings
  WHAT IT DOES: Fetches the company's invoice history from Stripe and returns it so the portal can display past charges, payment dates, and amounts.

FILE: stripe-webhook.js
  WHAT IT POWERS: Automatic subscription lifecycle management
  WHAT IT DOES: Receives webhook events from Stripe — upgrades companies to Premium (1000 coins) on successful checkout, downgrades to Standard (300 coins) on subscription cancellation, and flags payment failures on the company record.

── Communication Functions ───────────────────────────────────

FILE: send-review-request.js
  WHAT IT POWERS: Reputation management — "Send Review Request" button
  WHAT IT DOES: Sends an SMS to the project client with a personalized message containing the company's Google Business review URL, and logs the review request to Firestore for tracking.

FILE: send-signing-request.js
  WHAT IT POWERS: Document signing workflow
  WHAT IT DOES: Generates per-signer tokens, stores them in Firestore, and sends SMS notifications with signing links — supports sequential signing where each signer must complete before the next one gets access.

FILE: send-feature-request.js
  WHAT IT POWERS: "Request a Feature" form in Settings
  WHAT IT DOES: Sends a feature request email from the user to the Job-Dox team via SMTP (nodemailer), including the user's name, company, and description of the requested feature.

── Open API Functions ────────────────────────────────────────

FILE: api-v1.js
  WHAT IT POWERS: The Job-Dox Open API (all external integrations)
  WHAT IT DOES: Single entry point for all external API requests — provides RESTful endpoints for listing/creating/updating projects, contacts, notes, tasks, documents, staff, events, and webhooks, all authenticated via API key and scoped to the key's company.

FILE: api-projects.js
  WHAT IT POWERS: Standalone projects endpoint for simpler integrations
  WHAT IT DOES: A lightweight read-only endpoint that returns a company's project list when authenticated with an API key — simpler alternative to the full api-v1 for integrations that only need project data.

FILE: api-keys.js
  WHAT IT POWERS: Settings → Open API → API key management
  WHAT IT DOES: Allows admins (permission level 8+) to generate, list, and revoke API keys for their company — keys are hashed before storage and scoped to specific permissions (read projects, write contacts, etc.).

FILE: api-webhooks-deliver.js
  WHAT IT POWERS: Outbound webhook delivery for registered integrations
  WHAT IT DOES: When an event fires in the platform, looks up all active webhooks for the company that subscribe to that event type, sends the payload with an HMAC signature to each endpoint, records delivery status, and auto-disables webhooks after 10 consecutive failures.

FILE: generate-webhook-token.js
  WHAT IT POWERS: MarketDox setup and webhook URL generation
  WHAT IT DOES: Generates a cryptographically random token for a company's webhook URL and stores it in Firestore — if a token already exists, returns the existing one so the URL stays stable.

── MarketDox / SEO Functions ─────────────────────────────────

FILE: yard-sign.js
  WHAT IT POWERS: Public yard sign pages (MarketDox SEO feature)
  WHAT IT DOES: Serves fully server-rendered HTML pages for individual yard signs and company index pages at /pros/{companySlug}/{jobSlug} — includes JSON-LD Schema.org markup for instant Google indexing with no client-side JavaScript required.

FILE: yard-sign-sitemap.js
  WHAT IT POWERS: XML sitemap for all published yard signs
  WHAT IT DOES: Generates a valid XML sitemap listing every published yard sign across all companies, so search engines can discover and index all yard sign pages efficiently.

FILE: marketing-webhook.js
  WHAT IT POWERS: MarketDox Google Ads and Google Analytics data ingestion
  WHAT IT DOES: Receives incoming data from Zapier webhooks, auto-detects whether the payload is Google Ads or Google Analytics data, validates the company's secret token, and writes the marketing metrics to Firestore for the MarketDox dashboard.

── Session / Utility Functions ───────────────────────────────

FILE: clear-session.js
  WHAT IT POWERS: Single-session enforcement cleanup
  WHAT IT DOES: Called automatically via navigator.sendBeacon() when a user closes their browser tab — deletes the user's active session document from Firestore so they can log in again from another device.

FILE: get-portal-data.js
  WHAT IT POWERS: Customer-facing project portal (customer-portal.html)
  WHAT IT DOES: Returns project details, client-visible daily notes, photos, and signing requests for a specific project — only returns notes marked as visible to client, and verifies the requesting email matches a project contact.


================================================================
STEP 4 — FEATURE SUMMARIES
================================================================

── SUMMARY A: Cortex AI Features ─────────────────────────────

Every AI feature listed below is powered by the Anthropic Claude
API. Each use costs one Cortex Coin. Companies get 300 coins per
28-day cycle on Standard (free) and 1000 coins per cycle on
Premium ($199/month). Unused coins roll over to the next cycle.

1. MindFlow AI Workflow Generator
   INPUT: Work type (e.g. "Water Damage Mitigation"), company name, and optional project context
   OUTPUT: A structured, multi-phase workflow with categorized tasks ready to import into a project
   LOCATION: mindflow.html (standalone tool) → calls cortex-generate.js
   COST: 1 Cortex Coin per generation

2. Adjuster Response Bot
   INPUT: An adjuster or customer email/message, project details, daily notes, company info, and the full message thread
   OUTPUT: A professional rebuttal email grounded in IICRC S500/S520 standards and industry best practices
   LOCATION: AdjusterResponseBot.jsx (inside the Messages/Calls tab of a project) → calls adjuster-response.js
   COST: 1 Cortex Coin per response

3. ContentsDox AI Comparable Search
   INPUT: An item name, category, and optional description from a contents inventory
   OUTPUT: Comparable replacement items with estimated prices from online retailers
   LOCATION: ContentsDox.jsx (Contents tab of a project) → calls cortex-generate.js
   COST: 1 Cortex Coin per search

4. Finance AI Analysis
   INPUT: A project's financial data — invoices, payments, expenses, and profit margins
   OUTPUT: A plain-English profitability analysis with actionable recommendations
   LOCATION: Finance tab within project detail → calls finance-analyze.js
   COST: 1 Cortex Coin per analysis

5. Reports AI Analysis
   INPUT: Aggregated company report data (revenue trends, project counts, team performance)
   OUTPUT: Trend analysis, performance summaries, and strategic recommendations
   LOCATION: Reports page → calls reports-analyze.js
   COST: 1 Cortex Coin per analysis

6. Call Transcriber with Auto Project Creation
   INPUT: A Twilio call recording audio file
   OUTPUT: Full text transcription, extracted keywords (customer name, phone, address, damage type), and automatic new project creation if the caller is not an existing customer
   LOCATION: Triggered automatically after recorded calls when enabled in Settings → Phone & Calls → calls call-transcribe.js
   COST: 1 Cortex Coin per transcription

7. AI Daily Notes Summary
   INPUT: All daily notes for a project
   OUTPUT: A concise summary of the project's progress and key events
   LOCATION: Project Overview tab and Project Report → uses cortex-generate.js
   COST: 1 Cortex Coin per summary


── SUMMARY B: Permission-Gated Features ──────────────────────

The Job-Dox permission system has 11 levels (0 through 10).
Each user is assigned a level stored in Memberstack custom fields.
Below is every feature that is restricted by permission level.

LEVEL 0 — Vendor / Subcontractor
  CAN ACCESS: My Day (own tasks and schedule only)
  CANNOT ACCESS: Portfolio, project details, settings, or any other page
  FALLBACK: Sees only the My Day view with their assigned tasks

LEVEL 1 — Basic Staff
  CAN ACCESS: My Day, limited Portfolio view
  CANNOT ACCESS: Financial data, settings, dispatch, reports
  FALLBACK: Standard limited staff experience

LEVEL 2-4 — Field Staff / Technicians
  CAN ACCESS: My Day, Portfolio, project details (overview, notes, media, documents, tasks, contacts, messages, calls, project report tabs)
  CANNOT ACCESS: Finance tab, Scope tab, Shifts tab, DryDox tab, ContentsDox tab, EstimateDox tab, Settings, Reports, Dispatch, Payroll
  FALLBACK: These tabs are completely hidden from the navigation — users don't see them at all

LEVEL 5-7 — Senior Staff / Junior Managers
  CAN ACCESS: Everything levels 2-4 can access PLUS Finance, Scope, Shifts, DryDox, ContentsDox, and EstimateDox tabs
  CANNOT ACCESS: Settings page, team management, billing, phone settings
  FALLBACK: Settings gear icon is hidden

LEVEL 8-9 — Managers / Senior Managers
  CAN ACCESS: Everything above PLUS Settings (General, Billing, Team), Reports, Dispatch, All Tasks, Payroll
  CANNOT ACCESS: Some admin-only settings may be restricted
  FALLBACK: Full operational access

LEVEL 10 — Admin (Company Owner)
  CAN ACCESS: Everything — all pages, all tabs, all settings, API key management, phone settings, billing management, team management, vendor management
  NOTABLE: Only level 10 can manage API keys, configure phone settings, and access billing/subscription management

ADDITIONAL PERMISSION GATES:
  - "Manage Projects" capability: Required to create, edit, or delete projects (available at manager level and above)
  - "View Rates" capability: Required to see hourly pay rates in Payroll and Shifts (admin and manager only)
  - "Manage Users" capability: Required to add/remove team members and change permission levels (admin only)
  - Support Mode: A special admin-only toggle that grants the Job-Dox support team temporary access to a company's account for troubleshooting


── SUMMARY C: Features Requiring Setup / Configuration ───────

The following features will not work until the company completes
specific configuration steps. These are critical for onboarding.

1. Phone Calls (Inbound & Outbound)
   REQUIRES: Twilio account (Account SID and Auth Token entered in Settings → Phone & Calls), a purchased Twilio phone number configured in settings, and at least one call group with staff phone numbers
   SETUP LOCATION: Settings → Phone & Calls tab
   WITHOUT SETUP: The Calls tab and click-to-call buttons will appear but calls will fail

2. SMS / Text Messaging
   REQUIRES: Same Twilio setup as phone calls — the Twilio number is used for both voice and SMS
   SETUP LOCATION: Settings → Phone & Calls tab
   WITHOUT SETUP: Send SMS buttons will appear but messages will fail to send

3. Call Recording & Transcription
   REQUIRES: Twilio setup (above) PLUS "Record Calls" and "Call Transcriber" toggles enabled in phone settings
   SETUP LOCATION: Settings → Phone & Calls → enable recording and transcription toggles
   WITHOUT SETUP: Calls work but are not recorded; no transcriptions or auto-project creation

4. Premium Subscription
   REQUIRES: Upgrading via Stripe checkout ($199/month)
   SETUP LOCATION: Settings → Billing → "Upgrade to Premium" button
   WITHOUT SETUP: Company stays on Standard tier (300 Cortex Coins per cycle instead of 1000, limited to free-tier features)

5. MarketDox (Yard Signs & SEO Pages)
   REQUIRES: Company slug configured, Google Business review URL entered, at least one yard sign created and published
   SETUP LOCATION: Settings → MarketDox section, then individual yard signs from the MarketDox page
   WITHOUT SETUP: MarketDox page shows empty state; no public SEO pages are generated

6. Marketing Data (Google Ads & Analytics)
   REQUIRES: Webhook token generated, Zapier zaps configured to send Google Ads and/or Google Analytics data to the webhook URL
   SETUP LOCATION: MarketDox setup modal → "Connect via Zapier" flow
   WITHOUT SETUP: MarketDox dashboard shows no marketing metrics

7. Open API & Webhooks
   REQUIRES: At least one API key generated with appropriate scopes
   SETUP LOCATION: Settings → Open API tab (admin only, permission level 8+)
   WITHOUT SETUP: No external integrations can access company data

8. Document Signing
   REQUIRES: Twilio setup (for SMS delivery of signing links) and documents uploaded to the project
   SETUP LOCATION: Documents tab → upload document → "Request Signatures" button
   WITHOUT SETUP: Documents can be uploaded and viewed but signature requests cannot be sent

9. Customer Portal
   REQUIRES: At least one project contact with a valid email address, and daily notes marked as "visible to client"
   SETUP LOCATION: Contacts tab (add client email), Daily Notes (toggle visibility per note)
   WITHOUT SETUP: Portal link works but shows no data if contacts or visible notes are missing

10. Automations
    REQUIRES: At least one automation rule created with a trigger, conditions, and actions
    SETUP LOCATION: Settings → Automations tab → "Create Automation" button
    WITHOUT SETUP: No automated actions fire — all workflows are manual

11. Team / Staff Setup
    REQUIRES: Team members invited via Memberstack with correct company-id and permission level assigned
    SETUP LOCATION: Settings → Team tab (admin only)
    WITHOUT SETUP: Only the account creator can access the platform; no staff assignments, dispatch, or payroll tracking

12. Company Profile
    REQUIRES: Company name, address, logo, and contact info filled in
    SETUP LOCATION: Settings → General tab
    WITHOUT SETUP: Reports, customer portal, and review requests show incomplete or missing company information

================================================================
END OF FEATURE INVENTORY
================================================================
