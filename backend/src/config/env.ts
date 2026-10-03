function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 3000),
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get jwtSecret() {
    const secret = isProduction ? required("JWT_SECRET") : (process.env.JWT_SECRET ?? "dev-only-secret");
    if (isProduction && secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
    return secret;
  },
  /** Frontend base URL used in links inside emails (e.g. https://gw2-arcdps-helper.vercel.app). */
  get appUrl() {
    const url = isProduction ? required("APP_URL") : (process.env.APP_URL ?? "http://localhost:5173");
    return url.replace(/\/+$/, "");
  },
  /**
   * SMTP server for outgoing email (Gmail with an app password, Resend, Brevo…). Without SMTP_HOST in development
   * emails are printed to the console instead of sent.
   */
  get smtp() {
    const host = isProduction ? required("SMTP_HOST") : process.env.SMTP_HOST;
    if (!host) return null;
    const port = Number(process.env.SMTP_PORT ?? 587);
    return {
      host,
      port,
      secure: port === 465,
      /** Also the sender address of our emails. */
      user: required("SMTP_USER"),
      pass: process.env.SMTP_PASS ?? "",
    };
  },
  /**
   * The administrator - not a row in `users`: their email, scrypt hash of the password and the base32 TOTP secret of
   * their authenticator app, all made by `npm run admin:setup`. Without all three the admin area is switched off.
   */
  get admin(): { email: string; passwordHash: string; totpSecret: string } | null {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
    const totpSecret = process.env.ADMIN_TOTP_SECRET?.trim();
    return email && passwordHash && totpSecret ? { email, passwordHash, totpSecret } : null;
  },
  /** Comma-separated list of allowed web origins; empty = allow any. */
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
