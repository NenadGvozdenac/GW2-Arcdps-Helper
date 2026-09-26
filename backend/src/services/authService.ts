import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../config/constants";
import { userRepository } from "../repositories/userRepository";
import type { AuthResponse, RegisterInput } from "../types/auth.types";
import { emailTaken, invalidCredentials } from "../utils/httpError";
import { tokenService } from "./tokenService";

// Compared against when the email doesn't exist, so response time doesn't reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      gw2Account: input.gw2Account,
    });
    if (!user) throw emailTaken();
    return { token: tokenService.sign(user.id), user };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const row = await userRepository.findRowByEmail(email);
    const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !ok) throw invalidCredentials();
    const user = (await userRepository.findById(row.id))!;
    return { token: tokenService.sign(user.id), user };
  },
};
