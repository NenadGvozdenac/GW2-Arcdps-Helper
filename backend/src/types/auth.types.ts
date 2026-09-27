import type { User } from "./user.types";

export interface TokenPayload {
  sub: string; // user id
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  gw2Account: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** `res.locals` of requests that passed the requireAuth middleware. */
export interface AuthLocals {
  userId: string;
}
