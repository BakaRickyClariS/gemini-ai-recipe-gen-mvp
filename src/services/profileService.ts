/**
 * Profile Service
 */

import {
  userRepository,
  type UpdateProfileDto,
} from "../repositories/userRepository.js";
import { ApiError } from "../errors/ApiError.js";

export const profileService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const updated = await userRepository.updateProfile(userId, data);
    if (!updated) throw ApiError.notFound("User not found");
    return updated;
  },
};
