import { adminRepository } from "../repositories/adminRepository";
import { adminTokenStorage } from "../storage/adminTokenStorage";

/** The admin area: signing in keeps the administrator's token for this tab; everything else is the repository. */
export const adminService = {
  ...adminRepository,

  async login(email: string, password: string, code: string): Promise<void> {
    const { token } = await adminRepository.login(email, password, code);
    adminTokenStorage.set(token);
  },

  hasToken: () => adminTokenStorage.get() !== null,
  logout: () => adminTokenStorage.clear(),
};
