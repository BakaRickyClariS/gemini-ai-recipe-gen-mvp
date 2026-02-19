/**
 * Shopping List Routes v2
 */

import { Router } from "express";
import { ShoppingListController } from "../../controllers/ShoppingListController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { validate } from "../../middleware/validate.js";
import {
  createShoppingListSchema,
  updateShoppingListSchema,
  createShoppingListItemSchema,
  updateShoppingListItemSchema,
} from "../../validators/shoppingListSchemas.js";

const router = Router();
const controller = new ShoppingListController();

// List CRUD via group
router.get("/groups/:groupId/shopping-lists", jwtAuth, (req, res) =>
  controller.listByGroup(req, res),
);
router.post(
  "/groups/:groupId/shopping-lists",
  jwtAuth,
  validate(createShoppingListSchema),
  (req, res) => controller.create(req, res),
);

// List by ID
router.get("/shopping-lists/:id", jwtAuth, (req, res) =>
  controller.getById(req, res),
);
router.put(
  "/shopping-lists/:id",
  jwtAuth,
  validate(updateShoppingListSchema),
  (req, res) => controller.update(req, res),
);
router.delete("/shopping-lists/:id", jwtAuth, (req, res) =>
  controller.delete(req, res),
);

// Items in a list
router.get("/shopping-lists/:id/items", jwtAuth, (req, res) =>
  controller.getItems(req, res),
);
router.post(
  "/shopping-lists/:id/items",
  jwtAuth,
  validate(createShoppingListItemSchema),
  (req, res) => controller.createItem(req, res),
);

// Item by ID
router.put(
  "/shopping-list-items/:itemId",
  jwtAuth,
  validate(updateShoppingListItemSchema),
  (req, res) => controller.updateItem(req, res),
);
router.delete("/shopping-list-items/:itemId", jwtAuth, (req, res) =>
  controller.deleteItem(req, res),
);

export default router;
