/**
 * V1CronController
 * Cron Job：過期食材檢查
 */

import type { Request, Response, NextFunction } from "express";
import { BaseController } from "./BaseController.js";
import { config } from "../config/unifiedConfig.js";
import { query } from "../db/index.js";
import { notificationService } from "../services/notificationService.js";

export class V1CronController extends BaseController {
  /** Middleware: 驗證 CRON_SECRET */
  validateCronSecret(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const cronSecret = config.admin.cronSecret;

    if (!cronSecret) {
      console.warn("[Cron] CRON_SECRET not set, allowing request");
      next();
      return;
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    next();
  }

  /** POST /check-expiry — 檢查即將過期食材 */
  async checkExpiry(_req: Request, res: Response): Promise<void> {
    try {
      console.log("[Cron] Starting expiry check...");

      const expiringItemsSql = `
        SELECT
          i.id,
          i.name,
          i.expiry_date,
          i.user_id,
          i.refrigerator_id
        FROM inventory i
        WHERE i.expiry_date IS NOT NULL
          AND i.expiry_date <= NOW() + INTERVAL '3 days'
          AND i.expiry_date > NOW()
        ORDER BY i.expiry_date ASC
      `;

      const result = await query(expiringItemsSql);
      const expiringItems = result.rows;

      console.log(`[Cron] Found ${expiringItems.length} expiring items`);

      // 按 refrigerator_id 分組
      const itemsByRefrigerator: Record<string, typeof expiringItems> = {};
      for (const item of expiringItems) {
        const fridgeId = item.refrigerator_id;
        if (!fridgeId) continue;

        if (!itemsByRefrigerator[fridgeId]) {
          itemsByRefrigerator[fridgeId] = [];
        }
        itemsByRefrigerator[fridgeId].push(item);
      }

      // 發送通知
      let notificationsSent = 0;
      for (const [fridgeId, items] of Object.entries(itemsByRefrigerator)) {
        const itemNames = items
          .slice(0, 3)
          .map((i) => i.name)
          .join("、");
        const moreCount = items.length > 3 ? `等 ${items.length} 項` : "";

        await notificationService.sendToRefrigeratorMembers(
          fridgeId,
          "食材即將過期提醒",
          `${itemNames}${moreCount} 即將過期，請儘快使用！`,
          "inventory",
          { type: "inventory", payload: { refrigeratorId: fridgeId } },
          "stock",
          undefined,
          "stock",
          "System",
        );
        notificationsSent++;
      }

      console.log(`[Cron] Sent ${notificationsSent} expiry notifications`);

      res.json({
        success: true,
        data: {
          expiringItemsCount: expiringItems.length,
          usersNotified: notificationsSent,
        },
      });
    } catch (error) {
      this.handleError(error, res, "V1CronController.checkExpiry");
    }
  }
}
