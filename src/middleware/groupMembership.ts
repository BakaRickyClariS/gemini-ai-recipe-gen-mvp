import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError.js";
import { query } from "../db/index.js";
import * as Sentry from "@sentry/node";

export type GroupRole = "admin" | "member";

declare global {
  namespace Express {
    interface Request {
      groupRole?: GroupRole;
    }
  }
}

/**
 * Middleware to verify if the authenticated user is a member of the requested group.
 * Must be used AFTER jwtAuth middleware.
 * Expects the route parameter to contain the group ID (e.g. :groupId or :id).
 */
export function verifyGroupMembership(idParam: string = "groupId") {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      const groupId = req.params[idParam];
      if (!groupId) {
        throw ApiError.badRequest("Group ID missing in route parameters");
      }

      // Check membership in user_refrigerators
      const result = await query(
        `SELECT role FROM user_refrigerators WHERE user_id = $1 AND refrigerator_id = $2`,
        [userId, groupId],
      );

      if (result.rows.length === 0) {
        throw ApiError.forbidden(
          "Access denied: You are not a member of this group",
        );
      }

      // Attach role to request for downstream usage
      req.groupRole = result.rows[0].role as GroupRole;

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
        return;
      }
      Sentry.captureException(error);
      next(ApiError.internal("Failed to verify group membership"));
    }
  };
}
