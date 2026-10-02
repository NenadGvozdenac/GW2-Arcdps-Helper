import { env } from "../config/env";
import type { Language } from "../i18n/languages";
import { emailMessages, type EmailMessages } from "../i18n/messages";
import { emailSendFailed } from "../utils/httpError";
import { sendMail } from "./clients/mailClient";
import { FEEDBACK_EMAIL } from "../config/constants";
import type { FeedbackInput } from "../types/feedback.types";
import type { User } from "../types/user.types";
import { escapeHtml, renderEmail } from "./misc/emailTemplate";

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

const FEEDBACK_CATEGORY_LABEL: Record<FeedbackInput["category"], string> = {
  addon: "Nexus addon",
  uploader: "Desktop app",
  website: "Website",
  other: "Other",
};

export const emailService = {
  /**
   * Emails feedback to the developer (English, plain layout). Replying answers the user, or a guest who left an email.
   */
  async sendFeedback(from: User | null, { category, title, description, contactEmail }: FeedbackInput): Promise<void> {
    const label = FEEDBACK_CATEGORY_LABEL[category];
    const replyTo = from?.email ?? contactEmail ?? undefined;
    const sender = from
      ? from.gw2Account
        ? `${from.gw2Account} <${from.email}>`
        : from.email
      : `Guest${contactEmail ? ` <${contactEmail}>` : " (no email left)"}`;
    const subject = `[Feedback · ${label}] ${title}`;
    const text = [`Category: ${label}`, `From: ${sender}`, `Title: ${title}`, "", description].join("\n");
    const e = escapeHtml;
    const html = `<!doctype html><html><body style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1422">
<p style="margin:0 0 4px"><b>Category:</b> ${e(label)}</p>
<p style="margin:0 0 4px"><b>From:</b> ${e(sender)}</p>
<h2 style="margin:16px 0 8px;font-size:18px">${e(title)}</h2>
<div style="white-space:pre-wrap;line-height:1.5">${e(description)}</div>
</body></html>`;
    try {
      await sendMail({ to: FEEDBACK_EMAIL, replyTo, subject, text, html });
    } catch (err) {
      console.error("Sending feedback failed", err);
      throw emailSendFailed();
    }
  },


  sendVerification: (to: string, account: string, token: string, language: Language) =>
    sendLinkEmail(to, account, language, "verification", `/verify-email?token=${encodeURIComponent(token)}`),

  sendPasswordReset: (to: string, account: string, token: string, language: Language) =>
    sendLinkEmail(to, account, language, "passwordReset", `/reset-password?token=${encodeURIComponent(token)}`),
};
