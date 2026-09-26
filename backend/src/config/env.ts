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
  /** Comma-separated list of allowed web origins; empty = allow any. */
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
