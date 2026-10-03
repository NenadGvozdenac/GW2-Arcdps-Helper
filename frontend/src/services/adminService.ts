import { adminRepository } from "../repositories/adminRepository";
import { adminTokenStorage } from "../storage/adminTokenStorage";

/** The admin area: signing in keeps the administrator's token for this tab; everything else is the repository. */
export const adminService = {
  ...adminRepository,

  /** Step 1 of the sign-in; the challenge is kept in memory only, for step 2. */
  login: async (email: string, password: string): Promise<string> => (await adminRepository.login(email, password)).challenge,

  async verify(challenge: string, code: string): Promise<void> {
    const { token } = await adminRepository.verify(challenge, code);
    adminTokenStorage.set(token);
  },

  hasToken: () => adminTokenStorage.get() !== null,
  logout: () => adminTokenStorage.clear(),
};
