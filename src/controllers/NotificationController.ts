import type { Response } from "express";
import { BaseController } from "./BaseController.js";
import type { AuthenticatedRequest } from "../types/common.js";
import { notificationService } from "../services/notificationService.js";

export class NotificationController extends BaseController {
  /** POST /token — 註冊 FCM Token */
  async registerToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      const { fcmToken, platform = "web" } = req.body;
      await notificationService.registerToken(userId, fcmToken, platform);
      this.handleSuccess(res, { message: "Token registered successfully" });
    } catch (error) {
      this.handleError(error, res, "Notification.registerToken");
    }
  }

  /** DELETE /token — 移除 FCM Token */
  async removeToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      const { fcmToken } = req.body;
      await notificationService.removeToken(userId, fcmToken);
      this.handleSuccess(res, { message: "Token removed successfully" });
    } catch (error) {
      this.handleError(error, res, "Notification.removeToken");
    }
  }

  /** GET /settings — 取得通知設定 */
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      const settings = await notificationService.getSettings(userId);
      this.handleSuccess(res, settings);
    } catch (error) {
      this.handleError(error, res, "Notification.getSettings");
    }
  }

  /** PATCH /settings — 更新通知設定 */
  async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      await notificationService.updateSettings(userId, req.body);
      const newSettings = await notificationService.getSettings(userId);
      this.handleSuccess(res, newSettings);
    } catch (error) {
      this.handleError(error, res, "Notification.updateSettings");
    }
  }

  /** GET / — 取得通知列表 */
  async getNotifications(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;

      const result = await notificationService.getNotifications(
        userId,
        page,
        limit,
        category,
      );

      this.handleSuccess(res, {
        items: result.notifications,
        total: result.total,
        unreadCount: result.unreadCount,
        meta: { page, limit, total: result.total },
      });
    } catch (error) {
      this.handleError(error, res, "Notification.getNotifications");
    }
  }

  /** POST /batch-read — 批次標記已讀 */
  async batchRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      const { ids, isRead = true } = req.body;
      const result = await notificationService.batchMarkAsRead(
        userId,
        ids,
        isRead,
      );
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, "Notification.batchRead");
    }
  }

  /** POST /batch-delete — 批次刪除 */
  async batchDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) return;

      const { ids } = req.body;
      const result = await notificationService.batchDelete(userId, ids);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, "Notification.batchDelete");
    }
  }

  /** POST /send — 發送通知 (內部/管理員用) */
  async send(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const operatorId = req.user?.userId;
      if (!operatorId) return;

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
        this.handleSuccess(res, {
          message: `Broadcast to group ${groupId} initiated`,
        });
        return;
      }

      if (userIds && Array.isArray(userIds)) {
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
        this.handleSuccess(res, {
          sent: results.success.length,
          failed: results.failed.length,
          details: results,
        });
        return;
      }

      this.handleError(
        new Error("Either userIds or groupId must be provided"),
        res,
        "Notification.send",
      );
    } catch (error) {
      this.handleError(error, res, "Notification.send");
    }
  }
}
