import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { users } from "../db/schema";
import type { NewUser, User, UserPatch, UserRow } from "../types/user.types";

const toUser = ({
  passwordHash: _,
  verificationEmailSentAt: __,
  passwordResetSentAt: ___,
  termsAcceptedAt: ____,
  ...user
}: UserRow): User => user;

// Matches the case-insensitive unique index users_email_lower_idx.
const emailEquals = (email: string) => eq(sql`lower(${users.email})`, email.toLowerCase());

export const userRepository = {
  /** Returns the raw row (incl. password hash) — only for credential checks. */
  async findRowById(id: string): Promise<UserRow | null> {
    const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  },

  async exists(id: string): Promise<boolean> {
    const [row] = await getDb().select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    return !!row;
  },

  async findById(id: string): Promise<User | null> {
    const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  },

  /** Returns the raw row (incl. password hash) — only for credential checks. */
  async findRowByEmail(email: string): Promise<UserRow | null> {
    const [row] = await getDb().select().from(users).where(emailEquals(email)).limit(1);
    return row ?? null;
  },

  /** Returns null if the email is already taken. */
  async create(user: NewUser): Promise<User | null> {
    const [row] = await getDb().insert(users).values(user).onConflictDoNothing().returning();
    return row ? toUser(row) : null;
  },

  /** Deletes the user; their sessions, logs, Discord webhooks and session Discord messages go with them (ON DELETE CASCADE). */
  async delete(id: string): Promise<boolean> {
    const rows = await getDb().delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return rows.length > 0;
  },

  async update(id: string, patch: UserPatch): Promise<User | null> {
    const [row] = await getDb().update(users).set(patch).where(eq(users.id, id)).returning();
    return row ? toUser(row) : null;
  },
};
