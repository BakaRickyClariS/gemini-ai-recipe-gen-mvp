import type { Response } from "express";
import { BaseController } from "./BaseController.js";
import type { AuthenticatedRequest } from "../types/common.js";
import * as inventoryService from "../services/inventoryService.js";
import { notificationService } from "../services/notificationService.js";
import type {
  CreateInventoryInput,
  UpdateInventoryInput,
  ConsumeInventoryInput,
  InventoryPaginationParams,
  UpdateInventorySettingsInput,
} from "../types/inventory.js";

export class InventoryController extends BaseController {
  /** GET / — 庫存列表 */
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId } = req.params;

      if (!userId) {
        return this.handleError(
          new Error("Unauthorized"),
          res,
          "Inventory.list",
        );
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
        groupId,
        params,
      );

      this.handleSuccess(res, {
        items: result.items,
        total: result.total,
        meta: {
          total: result.total,
          page: params.page || 1,
          limit: params.limit || 50,
        },
        ...(result.stats && { stats: result.stats }),
        ...(result.summary && { summary: result.summary }),
      });
    } catch (error) {
      this.handleError(error, res, "Inventory.list");
    }
  }

  /** GET /categories — 分類列表 */
  async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId } = req.params;

      if (!userId) return;

      const categories = await inventoryService.getInventoryCategories(
        userId,
        groupId,
      );
      this.handleSuccess(res, { categories });
    } catch (error) {
      this.handleError(error, res, "Inventory.getCategories");
    }
  }

  /** GET /summary — 庫存摘要 */
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId } = req.params;

      if (!userId) return;

      const summary = await inventoryService.getInventorySummary(
        userId,
        groupId,
      );
      this.handleSuccess(res, { summary });
    } catch (error) {
      this.handleError(error, res, "Inventory.getSummary");
    }
  }

  /** GET /settings — 庫存設定 */
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId } = req.params;

      if (!userId) return;

      const settings = await inventoryService.getInventorySettings(
        userId,
        groupId,
      );
      this.handleSuccess(res, { settings });
    } catch (error) {
      this.handleError(error, res, "Inventory.getSettings");
    }
  }

  /** PUT /settings — 更新庫存設定 */
  async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId } = req.params;

      if (!userId) return;

      const input = req.body as UpdateInventorySettingsInput;
      const settings = await inventoryService.updateInventorySettings(
        userId,
        groupId,
        input,
      );

      this.handleSuccess(res, { settings }, 200);
    } catch (error) {
      this.handleError(error, res, "Inventory.updateSettings");
    }
  }

  /** GET /:id — 取得單筆食材 */
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, id } = req.params;
      const item = await inventoryService.getInventoryById(id, groupId);

      if (!item) {
        return this.handleError(
          new Error("Item not found"),
          res,
          "Inventory.getById",
        );
      }

      this.handleSuccess(res, { item });
    } catch (error) {
      this.handleError(error, res, "Inventory.getById");
    }
  }

  /** POST / — 新增食材 (#1 入庫通知) */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId } = req.params;

      if (!userId) return;

      const input = req.body as CreateInventoryInput;
      const item = await inventoryService.createInventoryItem(
        userId,
        groupId,
        input,
      );

      this.handleCreated(res, { id: item.id });

      // Fire-and-forget: 入庫通知
      notificationService
        .sendToRefrigeratorMembers(
          groupId,
          `${item.name} 新成員報到，入位成功！`,
          `冰箱小隊報告！${item.name} 已安全進入庫房，隨時待命！`,
          "inventory",
          {
            type: "inventory",
            payload: { refrigeratorId: groupId, itemId: item.id },
          },
          "stock",
          userId,
          "stockIn",
        )
        .catch((e) => console.error("[Notification] stockIn error:", e));
    } catch (error) {
      this.handleError(error, res, "Inventory.create");
    }
  }

  /** PUT /:id — 更新食材 */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, id } = req.params;
      const input = req.body as UpdateInventoryInput;

      const item = await inventoryService.updateInventoryItem(
        id,
        groupId,
        input,
      );

      if (!item) {
        return this.handleError(
          new Error("Item not found"),
          res,
          "Inventory.update",
        );
      }

      this.handleSuccess(res, { id: item.id });
    } catch (error) {
      this.handleError(error, res, "Inventory.update");
    }
  }

  /** DELETE /:id — 刪除食材 */
  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, id } = req.params;

      const deleted = await inventoryService.deleteInventoryItem(id, groupId);

      if (!deleted) {
        return this.handleError(
          new Error("Item not found"),
          res,
          "Inventory.remove",
        );
      }

      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "Inventory.remove");
    }
  }

  /** POST /:id/consume — 消耗食材 (#3 消耗通知) */
  async consume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { groupId, id } = req.params;
      const input = req.body as ConsumeInventoryInput;

      const result = await inventoryService.consumeInventoryItem(
        id,
        groupId,
        input,
      );

      if (!result) {
        return this.handleError(
          new Error("Item not found"),
          res,
          "Inventory.consume",
        );
      }

      this.handleSuccess(res, result);

      // Fire-and-forget: 消耗通知
      if (userId) {
        notificationService
          .sendToRefrigeratorMembers(
            groupId,
            `${result.name} 完成任務，光榮退役！`,
            `冰箱小隊報告！${result.name} 已順利上桌，美味任務達成！`,
            "inventory",
            { type: "inventory", payload: { refrigeratorId: groupId } },
            "stock",
            userId,
            "consume",
          )
          .catch((e) => console.error("[Notification] consume error:", e));
      }
    } catch (error) {
      this.handleError(error, res, "Inventory.consume");
    }
  }
}
