/**
 * Profile Controller
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { profileService } from "../services/profileService.js";

export class ProfileController extends BaseController {
  /** GET /api/v2/profile */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const user = await profileService.getProfile(req.user!.userId);
      this.handleSuccess(res, user);
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
      this.handleSuccess(res, updated);
    } catch (error) {
      this.handleError(error, res, "ProfileController.update");
    }
  }
}
