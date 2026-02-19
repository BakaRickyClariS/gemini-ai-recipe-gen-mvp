/**
 * V1NotificationController
 * 通知管理：FCM Token、通知設定、通知列表、發送通知、批次操作
 */

import type { Response } from "express";
import { BaseController } from "./BaseController.js";
import type { AuthenticatedRequest } from "../middleware/cookieAuth.js";
import { notificationService } from "../services/notificationService.js";

export class V1NotificationController extends BaseController {
  /** POST /token — 註冊 FCM Token */
  async registerToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { fcmToken, platform = "web" } = req.body;

      if (!fcmToken) {
        res.status(400).json({ success: false, error: "fcmToken is required" });
        return;
      }

      await notificationService.registerToken(userId, fcmToken, platform);
      res.json({ success: true, message: "Token registered successfully" });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.registerToken");
    }
  }

  /** DELETE /token — 移除 FCM Token */
  async removeToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        res.status(400).json({ success: false, error: "fcmToken is required" });
        return;
      }

      await notificationService.removeToken(userId, fcmToken);
      res.json({ success: true, message: "Token removed successfully" });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.removeToken");
    }
  }

  /** GET /settings — 取得通知設定 */
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const settings = await notificationService.getSettings(userId);
      res.json({ success: true, data: settings });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.getSettings");
    }
  }

  /** PATCH /settings — 更新通知設定 */
  async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.userId!;
      await notificationService.updateSettings(userId, req.body);
      const newSettings = await notificationService.getSettings(userId);
      res.json({ success: true, data: newSettings });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.updateSettings");
    }
  }

  /** GET / — 取得通知列表 */
  async getNotifications(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;

      const result = await notificationService.getNotifications(
        userId,
        page,
        limit,
        category,
      );

      res.json({
        success: true,
        data: {
          items: result.notifications,
          total: result.total,
          unreadCount: result.unreadCount,
        },
        pagination: { page, limit, total: result.total },
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.getNotifications");
    }
  }

  /** POST /send — 發送通知 */
  async sendNotification(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const operatorId = req.userId!;
      const {
        userIds,
        groupId,
        title,
        body,
        type,
        action,
        category,
        subType,
        groupName,
        actorName,
      } = req.body;

      if (!title || !body || !type) {
        res.status(400).json({
          success: false,
          error: "title, body, and type are required",
        });
        return;
      }

      // GroupId 廣播模式
      if (groupId) {
        await notificationService.sendToRefrigeratorMembers(
          groupId,
          title,
          body,
          type,
          action,
          category,
          operatorId,
          subType,
          actorName,
          groupName,
        );

        res.json({
          success: true,
          message: `Broadcast to group ${groupId} initiated`,
        });
        return;
      }

      // UserIds 模式
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "Either groupId or userIds array is required",
        });
        return;
      }

      const results = await notificationService.sendToMultiple(
        userIds,
        title,
        body,
        type,
        action,
        subType,
        groupName,
        actorName,
        operatorId,
      );

      res.json({
        success: true,
        data: {
          sent: results.success.length,
          failed: results.failed.length,
          details: results,
        },
      });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.sendNotification");
    }
  }

  /** POST /batch-read — 批次標記已讀 */
  async batchRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { ids, isRead = true } = req.body;

      if (!ids || !Array.isArray(ids)) {
        res
          .status(400)
          .json({ success: false, error: "ids array is required" });
        return;
      }

      const result = await notificationService.batchMarkAsRead(
        userId,
        ids,
        isRead,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.batchRead");
    }
  }

  /** POST /batch-delete — 批次刪除 */
  async batchDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids)) {
        res
          .status(400)
          .json({ success: false, error: "ids array is required" });
        return;
      }

      const result = await notificationService.batchDelete(userId, ids);
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res, "V1NotificationController.batchDelete");
    }
  }
}
