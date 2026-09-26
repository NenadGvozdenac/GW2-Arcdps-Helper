import { userRepository } from "../repositories/userRepository";
import type { ProfileUpdate, User } from "../types/user.types";
import { userNotFound } from "../utils/httpError";

export const userService = {
  async get(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw userNotFound();
    return user;
  },

  async updateProfile(id: string, patch: ProfileUpdate): Promise<User> {
    const user = await userRepository.update(id, patch);
    if (!user) throw userNotFound();
    return user;
  },
};
