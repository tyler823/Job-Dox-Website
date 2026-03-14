// ════════════════════════════════════════════════════════════════
//  Job-Dox · shared/constants.js
//  Single source of truth for all project types, statuses,
//  automation triggers, and roles used across every tool.
//  Any tool can import from here — never define these twice.
// ════════════════════════════════════════════════════════════════

// ── Project Types ─────────────────────────────────────────────
export const PROJECT_TYPES = [
  "Water Damage",
  "Fire & Smoke",
  "Mold Remediation",
  "Storm Damage",
  "Reconstruction",
  "Contents",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Demo",
  "Other",
];

// ── Project Statuses ──────────────────────────────────────────
export const PROJECT_STATUSES = [
  { key: "new_lead",          label: "New Lead",           color: "#5ba3f5" },
  { key: "active",            label: "Active",             color: "#1ad98a" },
  { key: "mitigation",        label: "Mitigation",         color: "#e89c18" },
  { key: "reconstruction",    label: "Reconstruction",     color: "#a78bfa" },
  { key: "pending_approval",  label: "Pending Approval",   color: "#f97316" },
  { key: "completed",         label: "Completed",          color: "#404866" },
  { key: "closed",            label: "Closed",             color: "#404866" },
  { key: "on_hold",           label: "On Hold",            color: "#e43531" },
];

// ── User Roles ────────────────────────────────────────────────
export const ROLES = {
  admin:   { label: "Admin",          canViewRates: true,  canManageUsers: true  },
  manager: { label: "Project Manager",canViewRates: true,  canManageUsers: false },
  staff:   { label: "Field Staff",    canViewRates: false, canManageUsers: false },
};

// ── Automation Triggers ───────────────────────────────────────
//  These are the events that can kick off an automation.
//  The automations builder uses this list to populate its UI.
export const AUTOMATION_TRIGGERS = [
  { key: "project.created",       label: "Project Created",            group: "Project"  },
  { key: "project.status_changed",label: "Project Status Changed",     group: "Project"  },
  { key: "project.assigned",      label: "Staff Assigned to Project",  group: "Project"  },
  { key: "note.added",            label: "Daily Note Added",           group: "Notes"    },
  { key: "drydox.reading_logged", label: "Moisture Reading Logged",    group: "DryDox"   },
  { key: "drydox.dry_standard",   label: "Drying Standard Reached",    group: "DryDox"   },
  { key: "estimate.created",      label: "Estimate Created",           group: "Estimate" },
  { key: "estimate.accepted",     label: "Estimate Accepted",          group: "Estimate" },
  { key: "shift.clocked_in",      label: "Staff Clocked In",           group: "Shifts"   },
  { key: "shift.clocked_out",     label: "Staff Clocked Out",          group: "Shifts"   },
  { key: "task.completed",        label: "Task Completed",             group: "Tasks"    },
  { key: "document.uploaded",     label: "Document Uploaded",          group: "Docs"     },
  { key: "day.end",               label: "End of Day",                 group: "Schedule" },
  { key: "day.X",                 label: "X Days After Project Start", group: "Schedule" },
  { key: "review.requested",      label: "Review Request Sent",        group: "Reputation" },
  { key: "review.received",       label: "Review Received",            group: "Reputation" },
];

// ── Automation Action Types ───────────────────────────────────
export const AUTOMATION_ACTIONS = [
  { key: "send_sms",       label: "Send SMS to Client"         },
  { key: "send_email",     label: "Send Email"                 },
  { key: "create_task",    label: "Create Task"                },
  { key: "update_status",  label: "Update Project Status"      },
  { key: "notify_staff",   label: "Notify Staff Member"        },
  { key: "send_report",    label: "Send Project Report"        },
  { key: "send_notes",     label: "Email Daily Notes to Client"},
  { key: "webhook",        label: "Send Webhook (Zapier, etc.)"},
  { key: "send_review",    label: "Send Review Request to Client" },
];

// ── Event Types (cross-tool event bus) ────────────────────────
//  These match the AUTOMATION_TRIGGERS keys — they're the same
//  vocabulary used everywhere so tools understand each other.
export const EVENT_TYPES = AUTOMATION_TRIGGERS.map(t => t.key);

// ── Open API Scopes ─────────────────────────────────────────────
//  Scopes control what an API key can access.
//  Assigned when a key is generated; checked on every request.
export const API_SCOPES = [
  { key: "projects:read",   label: "Read Projects",       description: "View projects, notes, tasks, documents" },
  { key: "projects:write",  label: "Write Projects",      description: "Create and update projects and tasks"     },
  { key: "contacts:read",   label: "Read Contacts",       description: "View project contacts"                    },
  { key: "contacts:write",  label: "Write Contacts",      description: "Create project contacts"                  },
  { key: "staff:read",      label: "Read Staff",          description: "View staff directory (no pay rates)"      },
  { key: "events:read",     label: "Read Events",         description: "View the event stream"                    },
  { key: "events:write",    label: "Write Events",        description: "Emit custom events into the event bus"    },
  { key: "webhooks:manage", label: "Manage Webhooks",     description: "Register, list, and delete webhooks"      },
];

// ── Webhook Event Types ─────────────────────────────────────────
//  Events that can trigger outbound webhooks.
//  Superset of AUTOMATION_TRIGGERS + API-specific events.
export const WEBHOOK_EVENTS = [
  ...EVENT_TYPES,
  "webhook.test",
];
