import type { ProfileUpdate, User } from "../domain/types/user.types";
import { http } from "./httpClient";

export const userRepository = {
  async updateProfile(patch: ProfileUpdate): Promise<User> {
    return (await http.patch<{ user: User }>("/profile", patch)).user;
  },
};
