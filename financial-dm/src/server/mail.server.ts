import { appendFile } from "node:fs/promises";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email, plain SMTP so it works with Proton's SMTP submission,
 * Resend's SMTP endpoint, or any other provider. Everything comes from
 * Vercel environment variables; with none set, sending is simply off and
 * every caller carries on as if nothing happened. Nothing here ever throws
 * into a lead or recruit submission.
 *
 *   SMTP_HOST, SMTP_PORT (587 default), SMTP_USER, SMTP_PASS
 *   MAIL_FROM      the sender address (must be one the provider allows)
 *   NOTIFY_TO      where John's notifications go (default below)
 *   MAIL_LOG_FILE  local testing only: write messages to a file instead of sending
 */

export const DEFAULT_NOTIFY_TO = "thefinancialdm@proton.me";

export interface MailStatus {
  configured: boolean;
  host: string;
  from: string;
  notifyTo: string;
  /** Which variables are missing, so Settings can say exactly what to add. */
  missing: string[];
}

export function mailStatus(): MailStatus {
  const env = process.env;
  const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"].filter((k) => !env[k]);
  const logOnly = Boolean(env.MAIL_LOG_FILE);
  return {
    configured: logOnly || missing.length === 0,
    host: env.SMTP_HOST ?? (logOnly ? "local log file" : ""),
    from: env.MAIL_FROM ?? (logOnly ? "test@localhost" : ""),
    notifyTo: env.NOTIFY_TO || DEFAULT_NOTIFY_TO,
    missing: logOnly ? [] : missing,
  };
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** The template that produced it, for logs and the local test file. */
  template: string;
}

let transport: Transporter | null = null;
function getTransport(): Transporter | null {
  const env = process.env;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transport) {
    const port = Number(env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({ host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
  }
  return transport;
}

/** Sends one message. Never throws; a failure is logged and reported back. */
export async function sendMail(msg: MailMessage): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = msg.to.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, skipped: true, error: "No valid address." };
  try {
    if (process.env.MAIL_LOG_FILE) {
      await appendFile(process.env.MAIL_LOG_FILE, JSON.stringify({ at: new Date().toISOString(), ...msg }) + "\n");
      return { ok: true };
    }
    const t = getTransport();
    const from = process.env.MAIL_FROM;
    if (!t || !from) return { ok: false, skipped: true, error: "Email is not set up yet." };
    await t.sendMail({ from, to, subject: msg.subject, text: msg.text, html: msg.html });
    return { ok: true };
  } catch (e) {
    console.error(`[mail] ${msg.template} to ${to} failed:`, e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** John's copy of a notification. Quietly does nothing when mail is off. */
export function notifyJohn(msg: Omit<MailMessage, "to">): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  return sendMail({ ...msg, to: mailStatus().notifyTo });
}
