/**
 * V1 User Controller
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { profileService } from "../services/profileService.js";
import { z } from "zod";

const updateTourSchema = z.object({
  isCompleted: z.boolean().optional(),
  currentStep: z.string().max(20).optional(),
});

export class V1UserController extends BaseController {
  /** PATCH /api/v1/users/me/tour */
  async updateTour(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateTourSchema.parse(req.body);
      const userId = req.user!.userId;

      const dataToUpdate: Record<string, any> = {};
      if (parsed.isCompleted !== undefined) {
        dataToUpdate.tourCompleted = parsed.isCompleted;
      }
      if (parsed.currentStep !== undefined) {
        dataToUpdate.tourCurrentStep = parsed.currentStep;
      }

      await profileService.updateProfile(userId, dataToUpdate);

      this.handleSuccess(res, { message: "Tour state updated successfully" });
    } catch (error) {
      this.handleError(error, res, "V1UserController.updateTour");
    }
  }
}
