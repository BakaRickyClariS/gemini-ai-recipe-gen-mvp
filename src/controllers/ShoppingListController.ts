/**
 * Shopping List Controller
 * #4 建立購物清單通知, #5/#6/#8 新增項目通知, #7 編輯項目通知
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { shoppingListService } from "../services/shoppingListService.js";
import { notificationService } from "../services/notificationService.js";

export class ShoppingListController extends BaseController {
  async listByGroup(req: Request, res: Response): Promise<void> {
    try {
      const lists = await shoppingListService.listByGroup(
        req.params.groupId,
        req.user!.userId,
      );
      this.handleSuccess(res, lists);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.listByGroup");
    }
  }

  /** #4 建立購物清單 → 通知群組成員 */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { groupId } = req.params;

      const list = await shoppingListService.create(groupId, userId, req.body);
      this.handleCreated(res, list);

      // Fire-and-forget: 建立清單通知
      const listTitle = list.title || "購物清單";
      notificationService
        .sendToRefrigeratorMembers(
          groupId,
          `新採購清單「${listTitle}」出爐！`,
          `採買小隊報告！新清單已建立，快來看看需要買什麼！`,
          "shopping",
          {
            type: "shopping-list",
            payload: { refrigeratorId: groupId, listId: list.id },
          },
          "official",
          userId,
          "list",
        )
        .catch((e) => console.error("[Notification] createList error:", e));
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.create");
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const list = await shoppingListService.getById(
        req.params.id,
        req.user!.userId,
      );
      this.handleSuccess(res, list);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.getById");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const list = await shoppingListService.update(
        req.params.id,
        req.user!.userId,
        req.body,
      );
      this.handleSuccess(res, list);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.update");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await shoppingListService.delete(req.params.id, req.user!.userId);
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.delete");
    }
  }

  // Items
  async getItems(req: Request, res: Response): Promise<void> {
    try {
      const items = await shoppingListService.getItems(
        req.params.id,
        req.user!.userId,
      );
      this.handleSuccess(res, items);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.getItems");
    }
  }

  /** #5/#6/#8 新增清單項目 → 通知群組成員 */
  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const listId = req.params.id;

      const item = await shoppingListService.createItem(
        listId,
        userId,
        req.body,
      );
      this.handleCreated(res, item);

      // Fire-and-forget: 新增項目通知
      // 需要查詢 list 取得 groupId
      shoppingListService
        .getById(listId, userId)
        .then((list) => {
          const itemName = item.name || "商品";
          return notificationService.sendToRefrigeratorMembers(
            list.groupId,
            `${itemName} 加入採買行列！`,
            `採買小隊報告！${itemName} 已加入購物清單，收到請回報！`,
            "shopping",
            { type: "shopping-list", payload: { listId } },
            "official",
            userId,
            "list",
          );
        })
        .catch((e) => console.error("[Notification] createItem error:", e));
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.createItem");
    }
  }

  /** #7 編輯清單項目 → 通知群組成員 */
  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { itemId } = req.params;

      const item = await shoppingListService.updateItem(
        itemId,
        userId,
        req.body,
      );
      this.handleSuccess(res, item);

      // Fire-and-forget: 編輯項目通知
      // item 含 shoppingListId，取得 list 的 groupId 和 title
      if (item?.shoppingListId) {
        shoppingListService
          .getById(item.shoppingListId, userId)
          .then((list) => {
            const listName = list.title || "購物清單";
            return notificationService.sendToRefrigeratorMembers(
              list.groupId,
              `「${listName}」清單內容變更！`,
              `採買小隊報告！「${listName}」已有異動，請各位確認！`,
              "shopping",
              { type: "shopping-list", payload: { listId: list.id } },
              "official",
              userId,
              "list",
            );
          })
          .catch((e) => console.error("[Notification] updateItem error:", e));
      }
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.updateItem");
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      await shoppingListService.deleteItem(req.params.itemId, req.user!.userId);
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.deleteItem");
    }
  }
}
