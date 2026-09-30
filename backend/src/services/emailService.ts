import { env } from "../config/env";
import type { Language } from "../i18n/languages";
import { emailMessages, type EmailMessages } from "../i18n/messages";
import { emailSendFailed } from "../utils/httpError";
import { sendMail } from "./clients/mailClient";
import { renderEmail } from "./misc/emailTemplate";

type EmailKind = "verification" | "passwordReset";

/**
 * Sends a styled email with one button linking to `path` on the website (plus a plain-text version). Any failure —
 * including missing email settings (APP_URL, SMTP_*) — is logged and becomes EMAIL_SEND_FAILED.
 */
async function sendLinkEmail(
  to: string,
  account: string,
  language: Language,
  kind: EmailKind,
  path: string,
): Promise<void> {
  const m: EmailMessages = emailMessages(language);
  const copy = m[kind];
  try {
    const appUrl = env.appUrl;
    const link = `${appUrl}${path}`;
    const greeting = m.greeting.replace("{account}", account);
    const text = [greeting, "", copy.body, "", link, "", copy.footer, "", "—", "GW2 ArcDPS Helper · " + appUrl].join("\n");
    const html = renderEmail({ lang: language, appUrl, greeting, copy, common: m, link });
    await sendMail({ to, subject: copy.subject, text, html });
  } catch (err) {
    console.error(`Sending "${copy.subject}" failed`, err);
    throw emailSendFailed();
  }
}

export const emailService = {
  sendVerification: (to: string, account: string, token: string, language: Language) =>
    sendLinkEmail(to, account, language, "verification", `/verify-email?token=${encodeURIComponent(token)}`),

  sendPasswordReset: (to: string, account: string, token: string, language: Language) =>
    sendLinkEmail(to, account, language, "passwordReset", `/reset-password?token=${encodeURIComponent(token)}`),
};
