/**
 * V1AuthController
 * 處理 v1 Session Sync 認證（與 AI Backend 同步 Cookie）
 */

import type { Response } from "express";
import * as Sentry from "@sentry/node";
import { BaseController } from "./BaseController.js";
import { config } from "../config/unifiedConfig.js";
import type { AuthenticatedRequest } from "../middleware/cookieAuth.js";
import { query } from "../db/index.js";

export class V1AuthController extends BaseController {
  /**
   * POST /api/v1/auth/sync
   * 同步前端 Session 到 AI 後端 Cookie
   */
  async syncSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token, userId, displayName } = req.body;

      if (!token || !userId) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: token and userId",
        });
        return;
      }

      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      const cookieOptions = {
        httpOnly: config.cookie.httpOnly,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: "/",
        maxAge,
      };

      res.cookie("ai_token", token, cookieOptions);
      res.cookie("ai_user_id", userId, {
        ...cookieOptions,
        httpOnly: false, // 前端需要讀取
      });

      // 更新使用者顯示名稱
      if (displayName) {
        try {
          await query(
            `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2`,
            [displayName, userId],
          );
        } catch (dbErr) {
          console.warn("[V1Auth] Failed to update displayName:", dbErr);
        }
      }

      console.log(`[V1Auth] Session synced for user: ${userId}`);

      res.json({
        success: true,
        message: "Session synced successfully",
        userId,
      });
    } catch (error) {
      this.handleError(error, res, "V1AuthController.syncSession");
    }
  }

  /**
   * POST /api/v1/auth/logout
   * 清除 Cookie
   */
  async logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const cookieOptions = {
        httpOnly: config.cookie.httpOnly,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: "/",
      };

      res.clearCookie("ai_token", cookieOptions);
      res.clearCookie("ai_user_id", { ...cookieOptions, httpOnly: false });

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      this.handleError(error, res, "V1AuthController.logout");
    }
  }
}
