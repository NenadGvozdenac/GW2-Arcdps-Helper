import { authRepository } from "../repositories/authRepository";
import { ValidationError } from "../domain/types/validation.types";
import type { RegisterInput, User } from "../domain/types/user.types";

const GW2_ACCOUNT_RE = /^.{3,32}\.\d{4}$/;

export const authService = {
  restoreSession: (): Promise<User | null> => authRepository.me(),

  isValidGw2Account: (value: string) => GW2_ACCOUNT_RE.test(value.trim()),

  validateRegistration(input: RegisterInput): void {
    if (!authService.isValidGw2Account(input.gw2Account)) throw new ValidationError("validation.invalidGw2Account");
    if (input.password.length < 6) throw new ValidationError("validation.passwordTooShort");
    if (input.password !== input.confirmPassword) throw new ValidationError("validation.passwordsDontMatch");
  },

  async register(input: RegisterInput): Promise<User> {
    authService.validateRegistration(input);
    return authRepository.register({
      email: input.email.trim(),
      password: input.password,
      gw2Account: input.gw2Account.trim(),
    });
  },

  login: (email: string, password: string): Promise<User> => authRepository.login(email.trim(), password),

  logout: () => authRepository.logout(),
};
