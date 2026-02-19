/**
 * Group Controller
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { groupService } from "../services/groupService.js";

export class GroupController extends BaseController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const groups = await groupService.listByUser(req.user!.userId);
      this.handleSuccess(res, groups);
    } catch (error) {
      this.handleError(error, res, "GroupController.list");
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const group = await groupService.getById(req.params.id, req.user!.userId);
      this.handleSuccess(res, group);
    } catch (error) {
      this.handleError(error, res, "GroupController.getById");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const group = await groupService.create(req.body.name, req.user!.userId);
      this.handleCreated(res, group);
    } catch (error) {
      this.handleError(error, res, "GroupController.create");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const group = await groupService.update(
        req.params.id,
        req.user!.userId,
        req.body,
      );
      this.handleSuccess(res, group);
    } catch (error) {
      this.handleError(error, res, "GroupController.update");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await groupService.delete(req.params.id, req.user!.userId);
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "GroupController.delete");
    }
  }

  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const invitation = await groupService.createInvitation(
        req.params.id,
        req.user!.userId,
      );
      this.handleCreated(res, invitation);
    } catch (error) {
      this.handleError(error, res, "GroupController.createInvitation");
    }
  }

  async getInvitation(req: Request, res: Response): Promise<void> {
    try {
      const result = await groupService.getInvitation(req.params.token);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, "GroupController.getInvitation");
    }
  }

  async join(req: Request, res: Response): Promise<void> {
    try {
      const group = await groupService.joinGroup(
        req.body.invitationToken,
        req.user!.userId,
      );
      this.handleSuccess(res, group);
    } catch (error) {
      this.handleError(error, res, "GroupController.join");
    }
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      await groupService.removeMember(
        req.params.id,
        req.user!.userId,
        req.params.memberId,
      );
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "GroupController.removeMember");
    }
  }

  async leave(req: Request, res: Response): Promise<void> {
    try {
      await groupService.leaveGroup(req.params.id, req.user!.userId);
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "GroupController.leave");
    }
  }
}
