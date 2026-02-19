/**
 * Shopping List Controller
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { shoppingListService } from "../services/shoppingListService.js";

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

  async create(req: Request, res: Response): Promise<void> {
    try {
      const list = await shoppingListService.create(
        req.params.groupId,
        req.user!.userId,
        req.body,
      );
      this.handleCreated(res, list);
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

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const item = await shoppingListService.createItem(
        req.params.id,
        req.user!.userId,
        req.body,
      );
      this.handleCreated(res, item);
    } catch (error) {
      this.handleError(error, res, "ShoppingListController.createItem");
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const item = await shoppingListService.updateItem(
        req.params.itemId,
        req.user!.userId,
        req.body,
      );
      this.handleSuccess(res, item);
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
