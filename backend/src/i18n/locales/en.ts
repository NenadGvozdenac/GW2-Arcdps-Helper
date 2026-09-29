// Texts of the emails we send; source of truth for the keys. `{account}` is the GW2 account (or the email).
export const en = {
  greeting: "Hi {account},",
  verification: {
    subject: "Confirm your email — GW2 ArcDPS Helper",
    body: "Click the button below to confirm your email address and finish creating your account.",
    button: "Confirm email",
    footer: "The link is valid for 24 hours. If you didn't create an account, ignore this email.",
  },
  passwordReset: {
    subject: "Reset your password — GW2 ArcDPS Helper",
    body: "Someone (hopefully you) asked to reset the password of your account. Click the button below to choose a new one.",
    button: "Reset password",
    footer:
      "The link is valid for 1 hour and works once. If you didn't ask for it, ignore this email — your password stays the same.",
  },
};

export type EmailMessages = typeof en;
