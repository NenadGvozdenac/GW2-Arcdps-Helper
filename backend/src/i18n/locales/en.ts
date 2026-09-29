// Texts of the emails we send; source of truth for the keys. `{account}` is the GW2 account (or the email).
export const en = {
  greeting: "Hi {account},",
  linkHint: "Button not working? Paste this link into your browser:",
  tagline: "Every boss. Every attempt. One place.",
  disclaimer: "A fan-made project, not affiliated with ArenaNet, ArcDPS or dps.report.",
  verification: {
    subject: "Confirm your email — GW2 ArcDPS Helper",
    preheader: "One click and your account is ready.",
    eyebrow: "Welcome aboard",
    heading: "Confirm your email",
    body: "Thanks for creating a GW2 ArcDPS Helper account! Click the button below to confirm your email address — you'll be signed in right away and can start collecting your logs.",
    button: "Confirm email",
    footer: "The link is valid for 24 hours. If you didn't create an account, you can safely ignore this email.",
  },
  passwordReset: {
    subject: "Reset your password — GW2 ArcDPS Helper",
    preheader: "Choose a new password for your account.",
    eyebrow: "Account security",
    heading: "Reset your password",
    body: "Someone (hopefully you) asked to reset the password of your account. Click the button below to choose a new one — you'll be signed in with it right away.",
    button: "Choose a new password",
    footer:
      "The link is valid for 1 hour and works once. If you didn't ask for it, ignore this email — your password stays the same.",
  },
};

export type EmailMessages = typeof en;
