/**
 * Shopping List Controller
 */
import { BaseController } from "./BaseController.js";
import { shoppingListService } from "../services/shoppingListService.js";
export class ShoppingListController extends BaseController {
    async listByGroup(req, res) {
        try {
            const lists = await shoppingListService.listByGroup(req.params.groupId, req.user.userId);
            this.handleSuccess(res, lists);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.listByGroup");
        }
    }
    async create(req, res) {
        try {
            const list = await shoppingListService.create(req.params.groupId, req.user.userId, req.body);
            this.handleCreated(res, list);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.create");
        }
    }
    async getById(req, res) {
        try {
            const list = await shoppingListService.getById(req.params.id, req.user.userId);
            this.handleSuccess(res, list);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.getById");
        }
    }
    async update(req, res) {
        try {
            const list = await shoppingListService.update(req.params.id, req.user.userId, req.body);
            this.handleSuccess(res, list);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.update");
        }
    }
    async delete(req, res) {
        try {
            await shoppingListService.delete(req.params.id, req.user.userId);
            this.handleNoContent(res);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.delete");
        }
    }
    // Items
    async getItems(req, res) {
        try {
            const items = await shoppingListService.getItems(req.params.id, req.user.userId);
            this.handleSuccess(res, items);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.getItems");
        }
    }
    async createItem(req, res) {
        try {
            const item = await shoppingListService.createItem(req.params.id, req.user.userId, req.body);
            this.handleCreated(res, item);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.createItem");
        }
    }
    async updateItem(req, res) {
        try {
            const item = await shoppingListService.updateItem(req.params.itemId, req.user.userId, req.body);
            this.handleSuccess(res, item);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.updateItem");
        }
    }
    async deleteItem(req, res) {
        try {
            await shoppingListService.deleteItem(req.params.itemId, req.user.userId);
            this.handleNoContent(res);
        }
        catch (error) {
            this.handleError(error, res, "ShoppingListController.deleteItem");
        }
    }
}
