import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { users } from "../db/schema";
import type { NewUser, User, UserPatch, UserRow } from "../types/user.types";

const toUser = ({ passwordHash: _, verificationEmailSentAt: __, passwordResetSentAt: ___, ...user }: UserRow): User =>
  user;

// Matches the case-insensitive unique index users_email_lower_idx.
const emailEquals = (email: string) => eq(sql`lower(${users.email})`, email.toLowerCase());

export const userRepository = {
  /** Returns the raw row (incl. password hash) — only for credential checks. */
  async findRowById(id: string): Promise<UserRow | null> {
    const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
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

  async update(id: string, patch: UserPatch): Promise<User | null> {
    const [row] = await getDb().update(users).set(patch).where(eq(users.id, id)).returning();
    return row ? toUser(row) : null;
  },
};
