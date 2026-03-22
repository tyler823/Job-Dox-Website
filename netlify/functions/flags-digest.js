/**
 * flags-digest.js
 * Netlify Scheduled Function — Daily Flags Digest (7:00 AM CT / 13:00 UTC)
 *
 * For each company:
 *   1. Find staff with permission >= 9 (owners / admins)
 *   2. Compute labor-mismatch and overdue-task flags across all projects
 *   3. Send a summary email (SMTP / nodemailer) and optional SMS (Twilio)
 *
 * Env vars (already configured for other functions):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 *   FIREBASE_SERVICE_ACCOUNT
 */

const nodemailer = require("nodemailer");
const twilio     = require("twilio");
const { getDb }  = require("./_firebase");

/* ── Netlify scheduled-function config ────────────────────────────────────── */
exports.config = { schedule: "0 13 * * *" }; // 13:00 UTC = 7:00 AM CT

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function toE164(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const HOUR_UNITS = new Set(["HR","hr","Hour","Hours","hour","hours"]);

/* ── Build HTML email ─────────────────────────────────────────────────────── */
function buildEmailHtml(companyName, dateStr, flaggedProjects) {
  const laborCount   = flaggedProjects.filter(p => p.hasLaborMismatch).length;
  const overdueCount = flaggedProjects.filter(p => p.hasOverdueTasks).length;

  const projectRows = flaggedProjects.map(p => {
    let rows = "";
    if (p.hasLaborMismatch) {
      rows += `<tr><td style="padding:8px 12px;font-size:13px;color:#b45309;background:#fef3c7;">
        ⚠ Labor Mismatch — Billed: ${p.billedHrs.toFixed(1)}h · Logged: ${p.loggedHrs.toFixed(1)}h
      </td></tr>`;
    }
    if (p.hasOverdueTasks) {
      rows += `<tr><td style="padding:8px 12px;font-size:13px;color:#dc2626;background:#fee2e2;">
        ⚠ Overdue Tasks — ${p.overdueCount} task${p.overdueCount !== 1 ? "s" : ""} past due
      </td></tr>`;
    }
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #2a2b35;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 12px;font-size:14px;font-weight:700;color:#f1f1f4;background:#181922;">
          ${p.name}${p.projectNumber ? ` <span style="color:#888;font-weight:400;">#${p.projectNumber}</span>` : ""}
        </td></tr>
        ${rows}
      </table>`;
  }).join("");

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#0e0f18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="background:#06070d;padding:20px 24px;border-bottom:3px solid #e43531;">
    <span style="color:#fff;font-size:16px;font-weight:700;">Cortex by Job-Dox</span>
    <span style="color:#e43531;font-size:16px;font-weight:700;margin-left:8px;">· Daily Flags Report</span>
  </td></tr>
  <tr><td style="padding:20px 24px;background:#0e0f18;">
    <div style="font-family:monospace;font-size:12px;color:#888;margin-bottom:16px;">${dateStr}</div>
    <div style="margin-bottom:20px;">
      ${laborCount > 0 ? `<span style="display:inline-block;padding:4px 12px;border-radius:4px;background:#92400e;color:#fef3c7;font-size:12px;font-weight:700;margin-right:8px;">${laborCount} Labor Mismatch${laborCount !== 1 ? "es" : ""}</span>` : ""}
      ${overdueCount > 0 ? `<span style="display:inline-block;padding:4px 12px;border-radius:4px;background:#991b1b;color:#fee2e2;font-size:12px;font-weight:700;">${overdueCount} Overdue Task${overdueCount !== 1 ? "s" : ""}</span>` : ""}
    </div>
    ${projectRows}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #2a2b35;font-size:12px;color:#888;">
      Log in to Cortex to review flags → <a href="https://job-dox.ai" style="color:#e43531;">job-dox.ai</a>
    </div>
  </td></tr>
</table>
</body></html>`;
}

/* ── Main handler ─────────────────────────────────────────────────────────── */
exports.handler = async () => {
  const db    = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const dateStr = fmtDate(today);

  /* ── SMTP transporter ── */
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("flags-digest: SMTP credentials not configured — skipping.");
    return { statusCode: 200 };
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: parseInt(SMTP_PORT || "587", 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  /* ── Twilio client (optional) ── */
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const twilioClient = (sid && token) ? twilio(sid, token) : null;

  /* ── Iterate companies ── */
  const companiesSnap = await db.collection("companies").get();
  let processed = 0, skipped = 0, errors = 0;

  for (const companyDoc of companiesSnap.docs) {
    const companyId   = companyDoc.id;
    const companyName = companyDoc.data().name || companyDoc.data().companyName || companyId;

    try {
      /* A) Find recipients: staff with permission >= 9 */
      const staffSnap = await db.collection(`companies/${companyId}/staff`)
        .where("permission", ">=", 9).get();
      const recipients = staffSnap.docs.map(d => d.data()).filter(s => s.email || s.phone);
      if (recipients.length === 0) { skipped++; continue; }

      /* B) Load projects and compute flags */
      const projSnap = await db.collection(`companies/${companyId}/projects`).get();
      const flaggedProjects = [];

      for (const projDoc of projSnap.docs) {
        const proj   = projDoc.data();
        const projId = projDoc.id;
        const name   = proj.name || "Untitled";
        const projectNumber = proj.projectNumber || "";

        /* Labor mismatch: scope hours vs shift hours */
        const scopeItems = (() => {
          try { return Array.isArray(proj.fsScope) ? proj.fsScope : []; } catch { return []; }
        })();
        const billedHrs = scopeItems
          .filter(i => i.unit && HOUR_UNITS.has(i.unit))
          .reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);

        let loggedHrs = 0;
        try {
          const shiftsSnap = await db.collection(`companies/${companyId}/projects/${projId}/shifts`).get();
          loggedHrs = shiftsSnap.docs.reduce((s, d) => s + (d.data().hours || 0), 0);
        } catch { /* no shifts subcollection */ }

        const hasLaborMismatch = (billedHrs > 0 || loggedHrs > 0) && Math.abs(billedHrs - loggedHrs) > 0.5;

        /* Overdue tasks */
        const tasks = Array.isArray(proj.fsTasks) ? proj.fsTasks : [];
        const overdueTasks = tasks.filter(t => t.status !== "done" && t.due && t.due < today);
        const hasOverdueTasks = overdueTasks.length > 0;

        if (hasLaborMismatch || hasOverdueTasks) {
          flaggedProjects.push({
            name, projectNumber, billedHrs, loggedHrs,
            overdueCount: overdueTasks.length,
            hasLaborMismatch, hasOverdueTasks,
          });
        }
      }

      if (flaggedProjects.length === 0) { skipped++; continue; }

      /* C) Build email content */
      const subject = `⚑ Daily Flags Report — ${companyName} — ${dateStr}`;
      const html    = buildEmailHtml(companyName, dateStr, flaggedProjects);
      const text    = `⚑ Daily Flags Report — ${companyName} — ${dateStr}\n\n` +
        flaggedProjects.map(p => {
          let line = `• ${p.name}${p.projectNumber ? ` #${p.projectNumber}` : ""}`;
          if (p.hasLaborMismatch) line += ` | Labor Mismatch: Billed ${p.billedHrs.toFixed(1)}h / Logged ${p.loggedHrs.toFixed(1)}h`;
          if (p.hasOverdueTasks) line += ` | ${p.overdueCount} overdue task(s)`;
          return line;
        }).join("\n") +
        "\n\nLog in to review: job-dox.ai";

      /* D) Read company Twilio number for SMS */
      let twilioFrom = null;
      if (twilioClient) {
        try {
          const phoneDoc = await db.doc(`companies/${companyId}/settings/phone`).get();
          if (phoneDoc.exists()) {
            twilioFrom = toE164(phoneDoc.data().twilioNumber);
          }
        } catch { /* no phone settings */ }
      }

      /* E) Send to each recipient */
      for (const recipient of recipients) {
        /* Email */
        if (recipient.email) {
          try {
            await transporter.sendMail({
              from: SMTP_FROM || SMTP_USER,
              to: recipient.email,
              subject,
              html,
              text,
            });
          } catch (emailErr) {
            console.error(`flags-digest: email failed for ${recipient.email} (${companyId}):`, emailErr.message);
          }
        }

        /* SMS */
        if (recipient.phone && twilioClient && twilioFrom) {
          const smsTo = toE164(recipient.phone);
          if (smsTo) {
            try {
              await twilioClient.messages.create({
                from: twilioFrom,
                to: smsTo,
                body: `⚑ Cortex Daily Flags — ${flaggedProjects.length} project${flaggedProjects.length !== 1 ? "s" : ""} need attention at ${companyName}. Log in to review: job-dox.ai`,
              });
            } catch (smsErr) {
              console.error(`flags-digest: SMS failed for ${recipient.phone} (${companyId}):`, smsErr.message);
            }
          }
        }
      }

      processed++;
    } catch (companyErr) {
      console.error(`flags-digest: error processing company ${companyId}:`, companyErr.message);
      errors++;
    }
  }

  console.log(`flags-digest complete: ${processed} sent, ${skipped} skipped, ${errors} errors`);
  return { statusCode: 200 };
};
