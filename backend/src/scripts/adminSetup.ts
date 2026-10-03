// Makes the administrator's credentials: `make admin-dev` / `make admin-prod` (npm run admin:setup -- dev|prod).
// Makes a new TOTP secret and shows the key / link for the authenticator app.
//   dev:  no questions - always admin@gmail.com / Admin123 (dev-only, like .env.development's JWT_SECRET). Sets
//         ADMIN_EMAIL, ADMIN_PASSWORD_HASH and ADMIN_TOTP_SECRET in .env.development. The app entry is called
//         "GW2 ArcDPS Helper (dev)".
//   prod: asks for the email and a strong password and only prints the three lines, for .env.production / the
//         hosting dashboard. The app entry is "GW2 ArcDPS Helper".
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { adminAuthService } from "../services/adminAuthService";
import { totp } from "../services/misc/totp";

const DEFAULT_EMAIL = "gw2arcdpshelper@gmail.com";
/** The local administrator: fixed and public on purpose - it only opens the admin area of your own dev server. */
const DEV_EMAIL = "admin@gmail.com";
const DEV_PASSWORD = "Admin123";
const MIN_PASSWORD = 12;
const DEV_ENV_FILE = ".env.development";
const ISSUER = { dev: "GW2 ArcDPS Helper (dev)", prod: "GW2 ArcDPS Helper" } as const;

/** Sets the variables in an env file where they are (missing ones are added at the end); other lines stay as they are. */
function writeEnv(path: string, values: Record<string, string>) {
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text ? text.split(/\r?\n/) : [];
  const missing = new Set(Object.keys(values));
  const updated = lines.map((line) => {
    const key = line.split("=")[0];
    if (!(key in values)) return line;
    missing.delete(key);
    return `${key}=${values[key]}`;
  });
  if (missing.size) {
    while (updated.length && updated[updated.length - 1] === "") updated.pop();
    updated.push("", ...[...missing].map((key) => `${key}=${values[key]}`), "");
  }
  writeFileSync(path, updated.join(eol));
}

/** Production: the email (default DEFAULT_EMAIL) and a password of at least MIN_PASSWORD characters. */
async function askCredentials(): Promise<{ email: string; password: string }> {
  // Lines are read through the iterator (not rl.question), so piped input works too, not only a terminal.
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question: string) => {
    process.stdout.write(question);
    const next = await lines.next();
    return next.done ? "" : next.value;
  };
  const email = (await ask(`Admin email [${DEFAULT_EMAIL}]: `)).trim().toLowerCase() || DEFAULT_EMAIL;
  const password = await ask(`Admin password (at least ${MIN_PASSWORD} characters): `);
  rl.close();
  if (password.length < MIN_PASSWORD) throw new Error(`The password must have at least ${MIN_PASSWORD} characters.`);
  return { email, password };
}

async function main() {
  const target = process.argv[2];
  if (target !== "dev" && target !== "prod") throw new Error("Usage: npm run admin:setup -- dev|prod");

  const { email, password } = target === "dev" ? { email: DEV_EMAIL, password: DEV_PASSWORD } : await askCredentials();

  const secret = totp.generateSecret();
  const values = {
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD_HASH: await adminAuthService.hashPassword(password),
    ADMIN_TOTP_SECRET: secret,
  };

  if (target === "dev") {
    writeEnv(DEV_ENV_FILE, values);
    console.log(`Saved to backend/${DEV_ENV_FILE}: sign in with ${DEV_EMAIL} / ${DEV_PASSWORD}.`);
    console.log("Restart the backend (npm run dev, or make restart for Docker).");
  } else {
    console.log("\nPut these in backend/.env.production and in Vercel (Project Settings > Environment Variables):\n");
    for (const [key, value] of Object.entries(values)) console.log(`${key}=${value}`);
  }

  console.log(`\nIn your authenticator app, add the account "${ISSUER[target]}" with this key (or open the link on the phone):`);
  console.log(`  key:  ${secret.match(/.{1,4}/g)!.join(" ")}`);
  console.log(`  link: ${totp.uri(secret, email, ISSUER[target])}`);
  console.log("\nRunning this again makes a new key: the old entry in the app stops working. Clear the terminal afterwards.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
