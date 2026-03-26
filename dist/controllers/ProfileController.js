/**
 * Profile Controller
 */
import { z } from "zod";
import { BaseController } from "./BaseController.js";
import { profileService } from "../services/profileService.js";
// Gender string → number enum mapping (per API contract)
const GENDER_MAP = {
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
function toProfileDto(user) {
    return {
        ...user,
        name: user.displayName ?? null,
        gender: typeof user.gender === "string"
            ? (GENDER_MAP[user.gender] ?? 4)
            : (user.gender ?? 0),
    };
}
export class ProfileController extends BaseController {
    /** GET /api/v2/profile */
    async get(req, res) {
        try {
            const user = await profileService.getProfile(req.user.userId);
            this.handleSuccess(res, toProfileDto(user));
        }
        catch (error) {
            this.handleError(error, res, "ProfileController.get");
        }
    }
    /** PUT /api/v2/profile */
    async update(req, res) {
        try {
            const updated = await profileService.updateProfile(req.user.userId, req.body);
            this.handleSuccess(res, toProfileDto(updated));
        }
        catch (error) {
            this.handleError(error, res, "ProfileController.update");
        }
    }
    /** PATCH /api/v2/profile/tour */
    async updateTour(req, res) {
        try {
            // Validate input
            const schema = z.object({
                isCompleted: z.boolean().optional(),
                currentStep: z.string().max(20).optional(),
            });
            const parsed = schema.parse(req.body);
            const dataToUpdate = {
                tourUpdatedAt: new Date(),
            };
            if (parsed.isCompleted !== undefined) {
                dataToUpdate.tourCompleted = parsed.isCompleted;
            }
            if (parsed.currentStep !== undefined) {
                dataToUpdate.tourCurrentStep = parsed.currentStep;
            }
            const updated = await profileService.updateProfile(req.user.userId, dataToUpdate);
            this.handleSuccess(res, toProfileDto(updated));
        }
        catch (error) {
            this.handleError(error, res, "ProfileController.updateTour");
        }
    }
}
