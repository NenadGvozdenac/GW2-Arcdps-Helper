import { authRepository } from "../repositories/authRepository";
import { ValidationError } from "../domain/types/validation.types";
import type { RegisterInput, User } from "../domain/types/user.types";
import type { Language } from "../i18n/i18n.types";

const GW2_ACCOUNT_RE = /^.{3,32}\.\d{4}$/;

export const authService = {
  /** True when a sign-in was saved on this device, i.e. restoreSession() has something to check. */
  hasSavedSession: (): boolean => authRepository.hasToken(),

  restoreSession: (): Promise<User | null> => authRepository.me(),

  isValidGw2Account: (value: string) => GW2_ACCOUNT_RE.test(value.trim()),

  validateRegistration(input: RegisterInput): void {
    if (!authService.isValidGw2Account(input.gw2Account)) throw new ValidationError("validation.invalidGw2Account");
    authService.validatePassword(input.password, input.confirmPassword);
  },

  validatePassword(password: string, confirmPassword: string): void {
    if (password.length < 6) throw new ValidationError("validation.passwordTooShort");
    if (password !== confirmPassword) throw new ValidationError("validation.passwordsDontMatch");
  },

  /** Returns the email the confirmation link was sent to. */
  async register(input: RegisterInput, language: Language): Promise<string> {
    authService.validateRegistration(input);
    return authRepository.register({
      email: input.email.trim(),
      password: input.password,
      gw2Account: input.gw2Account.trim(),
      language,
    });
  },

  verifyEmail: (token: string): Promise<User> => authRepository.verifyEmail(token),

  resendVerification: (email: string, language: Language): Promise<void> =>
    authRepository.resendVerification(email.trim(), language),

  forgotPassword: (email: string, language: Language): Promise<void> =>
    authRepository.forgotPassword(email.trim(), language),

  resetPassword(token: string, password: string, confirmPassword: string): Promise<User> {
    authService.validatePassword(password, confirmPassword);
    return authRepository.resetPassword(token, password);
  },

  login: (email: string, password: string): Promise<User> => authRepository.login(email.trim(), password),

  logout: () => authRepository.logout(),
};
