import { env } from "../config/env";
import type { Language } from "../i18n/languages";
import { emailMessages, type EmailMessages } from "../i18n/messages";
import { emailSendFailed } from "../utils/httpError";
import { sendMail } from "./clients/mailClient";

type EmailCopy = EmailMessages["verification"];

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/**
 * Sends a short email with one button linking to `path` on the website. Any failure — including missing email
 * settings (APP_URL, SMTP_*) — is logged and becomes EMAIL_SEND_FAILED.
 */
async function sendLinkEmail(to: string, greeting: string, copy: EmailCopy, path: string): Promise<void> {
  try {
    const link = `${env.appUrl}${path}`;
    const text = [greeting, "", copy.body, "", link, "", copy.footer].join("\n");
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
  <p>${escapeHtml(greeting)}</p>
  <p>${escapeHtml(copy.body)}</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none">${escapeHtml(copy.button)}</a></p>
  <p style="font-size:13px;color:#555">${escapeHtml(copy.footer)}<br><a href="${escapeHtml(link)}" style="color:#555">${escapeHtml(link)}</a></p>
</div>`;
    await sendMail({ to, subject: copy.subject, text, html });
  } catch (err) {
    console.error(`Sending "${copy.subject}" failed`, err);
    throw emailSendFailed();
  }
}

const greetingFor = (m: EmailMessages, account: string) => m.greeting.replace("{account}", account);

export const emailService = {
  sendVerification(to: string, account: string, token: string, language: Language) {
    const m = emailMessages(language);
    return sendLinkEmail(to, greetingFor(m, account), m.verification, `/verify-email?token=${encodeURIComponent(token)}`);
  },

  sendPasswordReset(to: string, account: string, token: string, language: Language) {
    const m = emailMessages(language);
    return sendLinkEmail(
      to,
      greetingFor(m, account),
      m.passwordReset,
      `/reset-password?token=${encodeURIComponent(token)}`,
    );
  },
};
