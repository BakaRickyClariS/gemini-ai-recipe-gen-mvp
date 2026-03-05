/**
 * Group Routes v2
 */
import { Router } from "express";
import { V2GroupController } from "../../controllers/V2GroupController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { validate } from "../../middleware/validate.js";
import { createGroupSchema, updateGroupSchema, joinGroupSchema, } from "../../validators/groupSchemas.js";
import { verifyGroupMembership } from "../../middleware/groupMembership.js";
const router = Router();
const controller = new V2GroupController();
// Group CRUD
router.get("/", jwtAuth, (req, res) => controller.list(req, res));
router.post("/", jwtAuth, validate(createGroupSchema), (req, res) => controller.create(req, res));
router.get("/:id", jwtAuth, verifyGroupMembership("id"), (req, res) => controller.getById(req, res));
router.put("/:id", jwtAuth, verifyGroupMembership("id"), validate(updateGroupSchema), (req, res) => controller.update(req, res));
router.delete("/:id", jwtAuth, verifyGroupMembership("id"), (req, res) => controller.delete(req, res));
// Invitations
router.post("/:id/invitations", jwtAuth, verifyGroupMembership("id"), (req, res) => controller.createInvitation(req, res));
router.post("/join", jwtAuth, validate(joinGroupSchema), (req, res) => controller.join(req, res));
// Members
router.delete("/:id/members/:memberId", jwtAuth, verifyGroupMembership("id"), (req, res) => controller.removeMember(req, res));
router.delete("/:id/leave", jwtAuth, verifyGroupMembership("id"), (req, res) => controller.leave(req, res));
export default router;
