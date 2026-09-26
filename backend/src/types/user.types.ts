/** Public user shape returned by the API (never contains the password hash). */
export interface User {
  id: string;
  email: string;
  displayName: string;
  gw2Account: string;
  createdAt: Date;
}

/** Row shape of the `users` table. */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  gw2_account: string;
  created_at: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  displayName: string;
  gw2Account: string;
}

export interface ProfileUpdate {
  displayName?: string;
  gw2Account?: string;
}
