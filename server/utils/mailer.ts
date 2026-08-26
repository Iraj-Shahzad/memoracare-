/**
 * Email helper (opt-in, provider-agnostic).
 *
 * Uses Nodemailer over plain SMTP, configured entirely via env vars so it works
 * with ANY provider (Gmail app password, Brevo, SendGrid SMTP, Mailtrap, ...).
 * If SMTP isn't configured, sendMail() safely no-ops (logs and returns) so the
 * app runs fine without email set up — emails "turn on" the moment creds exist.
 *
 * Env vars:
 *   EMAIL_HOST      e.g. smtp.gmail.com / smtp-relay.brevo.com
 *   EMAIL_PORT      587 (STARTTLS) or 465 (SSL)
 *   EMAIL_USER      SMTP username
 *   EMAIL_PASS      SMTP password / app password / API key
 *   EMAIL_FROM      (optional) "MemoryCare <no-reply@yourdomain>"
 *   EMAIL_SECURE    (optional) "true" to force SSL
 */

import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;
  const port = Number(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: process.env.EMAIL_SECURE === 'true' || port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
}

// Consistent branded wrapper around each email's body.
export function emailLayout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f0fdf4;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#1a3c34,#0d9488);padding:20px 24px">
        <h1 style="margin:0;color:#fff;font-size:20px">MemoryCare</h1>
      </div>
      <div style="padding:24px;color:#1f2937;line-height:1.6">
        <h2 style="margin:0 0 12px;color:#1a3c34;font-size:18px">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
        MemoryCare — a memory-care assistant. This is an automated message.
      </div>
    </div>
  </div>`;
}

/** Send an email. Never throws — returns a small status object. */
export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] Email not configured — skipped "${opts.subject}" to ${opts.to}`);
    return { skipped: true as const };
  }
  const from = process.env.EMAIL_FROM || `MemoryCare <${process.env.EMAIL_USER}>`;
  try {
    await t.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
    return { sent: true as const };
  } catch (err: any) {
    console.error('[mailer] Send failed:', err?.message || err);
    return { error: (err?.message as string) || 'send failed' };
  }
}
