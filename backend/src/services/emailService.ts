import { env } from "../config/env";
import type { EmailLanguage } from "../types/auth.types";
import { emailSendFailed } from "../utils/httpError";
import { sendMail } from "./clients/mailClient";

interface EmailCopy {
  subject: string;
  body: string;
  button: string;
  footer: string;
}

const GREETING: Record<EmailLanguage, (account: string) => string> = {
  en: (account) => `Hi ${account},`,
  sr: (account) => `Zdravo ${account},`,
};

const VERIFICATION: Record<EmailLanguage, EmailCopy> = {
  en: {
    subject: "Confirm your email — GW2 ArcDPS Helper",
    body: "Click the button below to confirm your email address and finish creating your account.",
    button: "Confirm email",
    footer: "The link is valid for 24 hours. If you didn't create an account, ignore this email.",
  },
  sr: {
    subject: "Potvrdi email — GW2 ArcDPS Helper",
    body: "Klikni na dugme ispod da potvrdiš email adresu i završiš pravljenje naloga.",
    button: "Potvrdi email",
    footer: "Link važi 24 sata. Ako nisi ti napravio nalog, ignoriši ovaj email.",
  },
};

const PASSWORD_RESET: Record<EmailLanguage, EmailCopy> = {
  en: {
    subject: "Reset your password — GW2 ArcDPS Helper",
    body: "Someone (hopefully you) asked to reset the password of your account. Click the button below to choose a new one.",
    button: "Reset password",
    footer: "The link is valid for 1 hour and works once. If you didn't ask for it, ignore this email — your password stays the same.",
  },
  sr: {
    subject: "Resetuj lozinku — GW2 ArcDPS Helper",
    body: "Neko (nadamo se ti) je zatražio reset lozinke za tvoj nalog. Klikni na dugme ispod da izabereš novu.",
    button: "Resetuj lozinku",
    footer: "Link važi 1 sat i može se iskoristiti jednom. Ako nisi ti tražio reset, ignoriši ovaj email — lozinka ostaje ista.",
  },
};

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** Sends a short email with one button linking to `path` on the website; throws EMAIL_SEND_FAILED on failure. */
async function sendLinkEmail(to: string, greeting: string, copy: EmailCopy, path: string): Promise<void> {
  const link = `${env.appUrl}${path}`;
  const text = [greeting, "", copy.body, "", link, "", copy.footer].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
  <p>${escapeHtml(greeting)}</p>
  <p>${escapeHtml(copy.body)}</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none">${escapeHtml(copy.button)}</a></p>
  <p style="font-size:13px;color:#555">${escapeHtml(copy.footer)}<br><a href="${escapeHtml(link)}" style="color:#555">${escapeHtml(link)}</a></p>
</div>`;
  try {
    await sendMail({ to, subject: copy.subject, text, html });
  } catch (err) {
    console.error(`Sending "${copy.subject}" failed`, err);
    throw emailSendFailed();
  }
}

export const emailService = {
  sendVerification: (to: string, account: string, token: string, language: EmailLanguage) =>
    sendLinkEmail(
      to,
      GREETING[language](account),
      VERIFICATION[language],
      `/verify-email?token=${encodeURIComponent(token)}`,
    ),

  sendPasswordReset: (to: string, account: string, token: string, language: EmailLanguage) =>
    sendLinkEmail(
      to,
      GREETING[language](account),
      PASSWORD_RESET[language],
      `/reset-password?token=${encodeURIComponent(token)}`,
    ),
};
