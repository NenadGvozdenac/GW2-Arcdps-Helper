import { appLoginRepository } from "../repositories/appLoginRepository";

/**
 * "Sign in with the browser": the desktop uploader / Nexus addon opens /app-login/<id> and waits; the signed-in user
 * approves it here (after checking the code matches the app's) and the app signs in as them.
 */
export const appLoginService = {
  get: (id: string) => appLoginRepository.get(id),
  approve: (id: string) => appLoginRepository.approve(id),
  deny: (id: string) => appLoginRepository.deny(id),
  /** Where an app's "Forgot password?" / "Sign in with the browser" leads to, for request `id`. */
  pagePath: (id: string) => `/app-login/${encodeURIComponent(id)}`,
};
