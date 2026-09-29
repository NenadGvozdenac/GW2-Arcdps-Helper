// HTML layout of our emails. Email clients (Gmail, Outlook, Apple Mail) ignore most CSS in <head> and don't support
// flexbox or grid, so the layout is nested tables with inline styles; the <style> block only adds extras for the
// clients that honour it (mobile padding, dark mode).
import type { EmailMessages } from "../i18n/messages";

type EmailCopy = EmailMessages["verification"];

export interface EmailTemplateInput {
  lang: string;
  appUrl: string;
  greeting: string;
  copy: EmailCopy;
  common: Pick<EmailMessages, "linkHint" | "tagline" | "disclaimer">;
  link: string;
}

const C = {
  page: "#f4eff5",
  card: "#ffffff",
  border: "#ebe2ee",
  text: "#1d1422",
  muted: "#6b5f70",
  brand: "#8a1a74",
  brandDark: "#5e0a4f",
  brandLight: "#c2338f",
  noteBg: "#faf5fb",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export function renderEmail({ lang, appUrl, greeting, copy, common, link }: EmailTemplateInput): string {
  const e = escapeHtml;
  const href = e(link);
  return `<!doctype html>
<html lang="${e(lang)}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${e(copy.subject)}</title>
<style>
  body { margin:0; padding:0; }
  a { color:${C.brand}; }
  @media (max-width:600px) {
    .container { width:100% !important; }
    .card-pad { padding:32px 24px !important; }
    .heading { font-size:24px !important; }
    .button a { display:block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Preview text shown next to the subject in the inbox. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${e(copy.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;">

          <!-- Brand -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <a href="${e(appUrl)}" style="text-decoration:none;">
                <img src="${e(appUrl)}/logo.png" width="48" height="48" alt="" style="display:block;margin:0 auto 10px;border:0;width:48px;height:48px;">
                <span style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.2px;color:${C.text};">GW2 ArcDPS Helper</span>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${C.card};border:1px solid ${C.border};border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(94,10,79,0.10);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td height="6" style="height:6px;line-height:6px;font-size:0;background:${C.brand};background-image:linear-gradient(90deg,${C.brandDark},${C.brand} 45%,${C.brandLight});border-radius:18px 18px 0 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="card-pad" style="padding:40px 44px 36px;font-family:${FONT};">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${C.brand};">${e(copy.eyebrow)}</p>
                    <h1 class="heading" style="margin:0 0 22px;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:${C.text};">${e(copy.heading)}</h1>
                    <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${C.text};">${e(greeting)}</p>
                    <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${C.muted};">${e(copy.body)}</p>

                    <!-- Button: the td background covers clients that drop the gradient. -->
                    <table role="presentation" class="button" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${C.brand}" style="border-radius:12px;background:${C.brand};background-image:linear-gradient(135deg,${C.brand},${C.brandLight});">
                          <a href="${href}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${e(copy.button)} &rarr;</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Note -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="padding:14px 16px;background:${C.noteBg};border-left:3px solid ${C.brandLight};border-radius:8px;font-size:14px;line-height:1.55;color:${C.muted};">${e(copy.footer)}</td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="margin:28px 0 6px;padding-top:22px;border-top:1px solid ${C.border};font-size:13px;line-height:1.5;color:${C.muted};">${e(common.linkHint)}</p>
                    <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" target="_blank" style="color:${C.brand};text-decoration:underline;">${href}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 24px 0;font-family:${FONT};">
              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${C.text};">${e(common.tagline)}</p>
              <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${C.muted};">${e(common.disclaimer)}</p>
              <a href="${e(appUrl)}" style="font-size:12px;color:${C.brand};text-decoration:none;">${e(appUrl.replace(/^https?:\/\//, ""))}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
