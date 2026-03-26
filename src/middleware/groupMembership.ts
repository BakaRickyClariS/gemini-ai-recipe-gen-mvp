import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError.js";
import { db } from "../db/drizzle.js";
import { groupMemberships } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";
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
 * ✅ 修正：改查 group_memberships 表（Drizzle ORM），不再查舊的 user_refrigerators
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

      // ✅ 查詢新的 group_memberships 表
      const result = await db
        .select({ role: groupMemberships.role })
        .from(groupMemberships)
        .where(
          and(
            eq(groupMemberships.userId, userId),
            eq(groupMemberships.groupId, groupId),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        throw ApiError.forbidden(
          "Access denied: You are not a member of this group",
        );
      }

      // Attach role to request for downstream usage
      req.groupRole = result[0].role as GroupRole;

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
