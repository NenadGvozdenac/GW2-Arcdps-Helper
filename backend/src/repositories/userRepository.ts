import { getPool } from "../db/pool";
import type { NewUser, ProfileUpdate, User, UserRow } from "../types/user.types";

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  displayName: r.display_name,
  gw2Account: r.gw2_account,
  createdAt: r.created_at,
});

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const { rows } = await getPool().query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ? toUser(rows[0]) : null;
  },

  /** Returns the raw row (incl. password hash) — only for credential checks. */
  async findRowByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await getPool().query<UserRow>("SELECT * FROM users WHERE lower(email) = lower($1)", [email]);
    return rows[0] ?? null;
  },

  /** Returns null if the email is already taken. */
  async create(user: NewUser): Promise<User | null> {
    const { rows } = await getPool().query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name, gw2_account)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [user.email, user.passwordHash, user.displayName, user.gw2Account],
    );
    return rows[0] ? toUser(rows[0]) : null;
  },

  async update(id: string, patch: ProfileUpdate): Promise<User | null> {
    const { rows } = await getPool().query<UserRow>(
      `UPDATE users
         SET display_name = COALESCE($2, display_name),
             gw2_account  = COALESCE($3, gw2_account)
       WHERE id = $1
       RETURNING *`,
      [id, patch.displayName ?? null, patch.gw2Account ?? null],
    );
    return rows[0] ? toUser(rows[0]) : null;
  },
};
