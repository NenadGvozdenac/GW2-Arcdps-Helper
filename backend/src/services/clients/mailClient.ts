import nodemailer, { type Transporter } from "nodemailer";
import { EMAIL_SENDER_NAME, SMTP_TIMEOUT_MS } from "../../config/constants";
import { env } from "../../config/env";
import type { OutgoingEmail } from "../../types/email.types";

let transporter: Transporter | null = null;

/** Sends one email over SMTP; without SMTP settings (development only) it is printed to the console instead. */
export async function sendMail(mail: OutgoingEmail): Promise<void> {
  const smtp = env.smtp;
  if (!smtp) {
    console.info(`[email] SMTP_HOST not set, not sending. To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
    return;
  }
  transporter ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  // Sent from the SMTP account itself (Gmail rewrites any other sender address anyway).
  await transporter.sendMail({ from: { name: EMAIL_SENDER_NAME, address: smtp.user }, ...mail });
}
