import { userRepository } from "../repositories/userRepository";
import { ValidationError } from "../domain/types/validation.types";
import type { ProfileUpdate, User } from "../domain/types/user.types";
import { authService } from "./authService";

export const profileService = {
  async save(data: ProfileUpdate): Promise<User> {
    const displayName = data.displayName.trim();
    const gw2Account = data.gw2Account.trim();
    if (!displayName) throw new ValidationError("validation.displayNameRequired");
    if (gw2Account && !authService.isValidGw2Account(gw2Account)) {
      throw new ValidationError("validation.invalidGw2Account");
    }
    return userRepository.updateProfile({ displayName, gw2Account });
  },

  isOwnAccount: (user: User | null, account: string) =>
    !!user?.gw2Account && user.gw2Account.toLowerCase() === account.toLowerCase(),
};
