/**
 * Group Routes v2
 */

import { Router } from "express";
import { GroupController } from "../../controllers/GroupController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { validate } from "../../middleware/validate.js";
import {
  createGroupSchema,
  updateGroupSchema,
  joinGroupSchema,
} from "../../validators/groupSchemas.js";

const router = Router();
const controller = new GroupController();

// Group CRUD
router.get("/", jwtAuth, (req, res) => controller.list(req, res));
router.post("/", jwtAuth, validate(createGroupSchema), (req, res) =>
  controller.create(req, res),
);
router.get("/:id", jwtAuth, (req, res) => controller.getById(req, res));
router.put("/:id", jwtAuth, validate(updateGroupSchema), (req, res) =>
  controller.update(req, res),
);
router.delete("/:id", jwtAuth, (req, res) => controller.delete(req, res));

// Invitations
router.post("/:id/invitations", jwtAuth, (req, res) =>
  controller.createInvitation(req, res),
);
router.post("/join", jwtAuth, validate(joinGroupSchema), (req, res) =>
  controller.join(req, res),
);

// Members
router.delete("/:id/members/:memberId", jwtAuth, (req, res) =>
  controller.removeMember(req, res),
);
router.delete("/:id/leave", jwtAuth, (req, res) => controller.leave(req, res));

export default router;
