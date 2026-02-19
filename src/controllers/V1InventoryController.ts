/**
 * V1InventoryController
 * 庫存管理：CRUD、分類、摘要、設定、消耗
 *
 * 注意：v1 回應格式使用 { status: true/false } 而非 { success: true/false }
 * 這是為了保持前端向下相容
 */

import type { Response } from "express";
import * as Sentry from "@sentry/node";
import { BaseController } from "./BaseController.js";
import type { AuthenticatedRequest } from "../middleware/cookieAuth.js";
import * as inventoryService from "../services/inventoryService.js";
import type {
  CreateInventoryInput,
  UpdateInventoryInput,
  ConsumeInventoryInput,
  InventoryPaginationParams,
  UpdateInventorySettingsInput,
} from "../types/inventory.js";

export class V1InventoryController extends BaseController {
  // Helper: v1 格式使用 `status` 而非 `success`
  private v1Error(
    res: Response,
    status: number,
    error: string,
    code?: string,
  ): void {
    res.status(status).json({ status: false, ...(code && { code }), error });
  }

  /** GET / — 庫存列表 */
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const refrigeratorId = req.params.refrigeratorId;

      if (!userId) {
        this.v1Error(res, 400, "缺少使用者身份");
        return;
      }

      const params: InventoryPaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        category: req.query.category as string | undefined,
        status: req.query.status as InventoryPaginationParams["status"],
        include: req.query.include as string | undefined,
      };

      const result = await inventoryService.getInventoryItems(
        userId,
        refrigeratorId,
        params,
      );

      res.json({
        status: true,
        data: {
          items: result.items,
          total: result.total,
          ...(result.stats && { stats: result.stats }),
          ...(result.summary && { summary: result.summary }),
        },
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 取得列表失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** GET /categories — 分類列表 */
  async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const refrigeratorId = req.params.refrigeratorId;

      if (!userId) {
        this.v1Error(res, 400, "缺少使用者身份");
        return;
      }

      const categories = await inventoryService.getInventoryCategories(
        userId,
        refrigeratorId,
      );
      res.json({ status: true, data: { categories } });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 取得分類失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** GET /summary — 庫存摘要 */
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const refrigeratorId = req.params.refrigeratorId;

      if (!userId) {
        this.v1Error(res, 400, "缺少使用者身份");
        return;
      }

      const summary = await inventoryService.getInventorySummary(
        userId,
        refrigeratorId,
      );
      res.json({ status: true, data: { summary } });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 取得摘要失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** GET /settings — 庫存設定 */
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const refrigeratorId = req.params.refrigeratorId;

      if (!userId) {
        this.v1Error(res, 400, "缺少使用者身份");
        return;
      }

      const settings = await inventoryService.getInventorySettings(
        userId,
        refrigeratorId,
      );
      res.json({ status: true, data: { settings } });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 取得設定失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** PUT|PATCH /settings — 更新庫存設定 */
  async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.userId;
      const refrigeratorId = req.params.refrigeratorId;

      if (!userId) {
        this.v1Error(res, 400, "缺少使用者身份");
        return;
      }

      const input = req.body as UpdateInventorySettingsInput;
      const settings = await inventoryService.updateInventorySettings(
        userId,
        refrigeratorId,
        input,
      );

      res.json({ status: true, message: "設定已更新", data: { settings } });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 更新設定失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** GET /:id — 取得單筆食材 */
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const refrigeratorId = req.params.refrigeratorId;
      const { id } = req.params;

      const item = await inventoryService.getInventoryById(id, refrigeratorId);

      if (!item) {
        this.v1Error(res, 404, "找不到該食材");
        return;
      }

      res.json({ status: true, data: { item } });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 取得單筆失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** POST / — 新增食材 */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const refrigeratorId = req.params.refrigeratorId;

      if (!userId) {
        this.v1Error(res, 400, "缺少使用者身份");
        return;
      }

      const input = req.body as CreateInventoryInput;

      if (!input.name) {
        this.v1Error(res, 400, "缺少食材名稱");
        return;
      }

      const item = await inventoryService.createInventoryItem(
        userId,
        refrigeratorId,
        input,
      );

      res.status(201).json({
        status: true,
        message: "Created successfully",
        data: { id: item.id },
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 新增失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** PUT /:id — 更新食材 */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const refrigeratorId = req.params.refrigeratorId;
      const { id } = req.params;
      const input = req.body as UpdateInventoryInput;

      const item = await inventoryService.updateInventoryItem(
        id,
        refrigeratorId,
        input,
      );

      if (!item) {
        this.v1Error(res, 404, "找不到該食材");
        return;
      }

      res.json({
        status: true,
        message: "Updated successfully",
        data: { id: item.id },
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 更新失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** DELETE /:id — 刪除食材 */
  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const refrigeratorId = req.params.refrigeratorId;
      const { id } = req.params;

      const deleted = await inventoryService.deleteInventoryItem(
        id,
        refrigeratorId,
      );

      if (!deleted) {
        this.v1Error(res, 404, "找不到該食材");
        return;
      }

      res.json({ status: true, message: "Deleted successfully" });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Inventory] 刪除失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }

  /** POST /:id/consume — 消耗食材 */
  async consume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const refrigeratorId = req.params.refrigeratorId;
      const { id } = req.params;
      const input = req.body as ConsumeInventoryInput;

      if (!input.quantity || input.quantity <= 0) {
        this.v1Error(res, 400, "缺少或無效的 quantity 欄位", "INV_001");
        return;
      }

      if (!input.reasons || input.reasons.length === 0) {
        this.v1Error(res, 400, "缺少 reasons 欄位");
        return;
      }

      const result = await inventoryService.consumeInventoryItem(
        id,
        refrigeratorId,
        input,
      );

      if (!result) {
        this.v1Error(res, 404, "找不到該食材", "INV_004");
        return;
      }

      res.json({
        status: true,
        message: "Consumed successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "消耗數量超過庫存") {
        this.v1Error(res, 400, error.message, "INV_002");
        return;
      }
      Sentry.captureException(error);
      console.error("[Inventory] 消耗失敗:", error);
      this.v1Error(res, 500, "伺服器錯誤");
    }
  }
}
