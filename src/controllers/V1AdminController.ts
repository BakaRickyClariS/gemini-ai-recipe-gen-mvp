/**
 * V1AdminController
 * 管理員操作：公告、部署
 */

import type { Request, Response, NextFunction } from "express";
import { BaseController } from "./BaseController.js";
import { config } from "../config/unifiedConfig.js";
import { notificationService } from "../services/notificationService.js";

export class V1AdminController extends BaseController {
  /** Middleware: 驗證 Deploy Secret */
  requireDeploySecret(req: Request, res: Response, next: NextFunction): void {
    const secret = req.headers["x-deploy-secret"];
    const expectedSecret = config.admin.deploySecret;

    if (!expectedSecret) {
      next();
      return;
    }

    if (secret !== expectedSecret) {
      res
        .status(403)
        .json({ success: false, error: "Forbidden: Invalid deploy secret" });
      return;
    }

    next();
  }

  /** Middleware: 驗證 Admin Token */
  requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const adminToken = config.admin.token;
    if (!adminToken) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${adminToken}`) {
      res
        .status(403)
        .json({ success: false, error: "Forbidden: Invalid admin token" });
      return;
    }

    next();
  }

  /** POST /announcements — 發佈官方公告 */
  async sendAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { title, body, targetUserIds } = req.body;

      if (!title || !body) {
        res.status(400).json({
          success: false,
          error: "title and body are required",
        });
        return;
      }

      if (targetUserIds && Array.isArray(targetUserIds)) {
        const results = await notificationService.sendToMultiple(
          targetUserIds,
          title,
          body,
          "system",
          undefined,
          "announcement",
        );

        res.json({
          success: true,
          data: {
            sent: results.success.length,
            failed: results.failed.length,
          },
        });
        return;
      }

      // 全體廣播
      res.json({
        success: true,
        message: "Broadcast not yet implemented — use targetUserIds",
      });
    } catch (error) {
      this.handleError(error, res, "V1AdminController.sendAnnouncement");
    }
  }

  /** POST /release — 發佈新版通知 */
  async sendRelease(req: Request, res: Response): Promise<void> {
    try {
      const { version, changes } = req.body;

      if (!version || !changes) {
        res.status(400).json({
          success: false,
          error: "version and changes are required",
        });
        return;
      }

      // 組裝標題
      const title = `🎉 FuFood v${version} 更新上線！`;

      // 呼叫底層通知服務進行全站廣播
      const result = await notificationService.sendAnnouncement(
        title,
        changes,
        "release",
        true, // shouldPush
        { version, changes }, // payload data
      );

      res.json({
        success: true,
        data: {
          message: `Release v${version} notification sent successfully`,
          details: result,
        },
      });
    } catch (error) {
      this.handleError(error, res, "V1AdminController.sendRelease");
    }
  }
}
