/**
 * Profile Controller
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { profileService } from "../services/profileService.js";
import type { users } from "../db/schema/index.js";

// Gender string → number enum mapping (per API contract)
const GENDER_MAP: Record<string, number> = {
  NotSpecified: 0,
  Female: 1,
  Male: 2,
  Other: 3,
};

/**
 * DB model → frontend-facing DTO
 * - Maps `displayName` to `name` (frontend expects `name`)
 * - Maps gender string enum to number (0~4)
 */
function toProfileDto(user: Record<string, unknown>) {
  return {
    ...user,
    name: user.displayName ?? null,
    gender:
      typeof user.gender === "string"
        ? (GENDER_MAP[user.gender] ?? 4)
        : (user.gender ?? 0),
  };
}

export class ProfileController extends BaseController {
  /** GET /api/v2/profile */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const user = await profileService.getProfile(req.user!.userId);
      this.handleSuccess(res, toProfileDto(user as Record<string, unknown>));
    } catch (error) {
      this.handleError(error, res, "ProfileController.get");
    }
  }

  /** PUT /api/v2/profile */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const updated = await profileService.updateProfile(
        req.user!.userId,
        req.body,
      );
      this.handleSuccess(res, toProfileDto(updated as Record<string, unknown>));
    } catch (error) {
      this.handleError(error, res, "ProfileController.update");
    }
  }
}
