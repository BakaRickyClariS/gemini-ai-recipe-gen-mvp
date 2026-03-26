/**
 * V2 Group Controller
 * Dedicated controller for v2 API featuring:
 * - BaseController inheritance
 * - Sentry integration via handleError
 * - Structured logging setup
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { v2GroupService } from "../services/v2GroupService.js";
import { notificationService } from "../services/notificationService.js";
import { groupRepository } from "../repositories/groupRepository.js";

export class V2GroupController extends BaseController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const groups = await v2GroupService.listByUser(req.user!.userId);
      this.handleSuccess(res, groups);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.list");
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const group = await v2GroupService.getById(
        req.params.id,
        req.user!.userId,
      );
      this.handleSuccess(res, group);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.getById");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const group = await v2GroupService.create(
        req.body.name,
        req.user!.userId,
      );
      this.handleCreated(res, group);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.create");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const group = await v2GroupService.update(
        req.params.id,
        req.user!.userId,
        req.body,
      );
      this.handleSuccess(res, group);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.update");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await v2GroupService.delete(req.params.id, req.user!.userId);
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.delete");
    }
  }

  /** #9 邀請成員 → 通知群組內所有現有成員 */
  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const groupId = req.params.id;

      const invitation = await v2GroupService.createInvitation(groupId, userId);
      this.handleCreated(res, invitation);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.createInvitation");
    }
  }

  async getInvitation(req: Request, res: Response): Promise<void> {
    try {
      const result = await v2GroupService.getInvitation(req.params.token);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.getInvitation");
    }
  }

  /** #13 加入群組 → 通知其他成員 */
  async join(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const group = await v2GroupService.joinGroup(
        req.body.invitationToken,
        userId,
      );
      this.handleSuccess(res, group);

      // Fire-and-forget: 加入通知
      if (group) {
        notificationService
          .sendToRefrigeratorMembers(
            group.id,
            `群組成員變動`,
            `新成員已加入群組`,
            "group",
            { type: "detail", payload: { refrigeratorId: group.id } },
            "official",
            userId,
            "member",
          )
          .catch((e) => console.error("[Notification] join error:", e));
      }
    } catch (error) {
      this.handleError(error, res, "V2GroupController.join");
    }
  }

  /** #10 移除成員 → 通知剩餘成員 */
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const groupId = req.params.id;
      const memberId = req.params.memberId;

      // 先取得被移除者資訊（在移除前查詢）
      let memberName = "成員";
      try {
        const members = await groupRepository.getMembers(groupId);
        const member = members.find((m) => m.userId === memberId);
        if (member) memberName = member.userId;
      } catch {
        /* ignore */
      }

      await v2GroupService.removeMember(groupId, userId, memberId);
      this.handleNoContent(res);

      // Fire-and-forget: 移除通知（通知剩餘成員）
      notificationService
        .sendToRefrigeratorMembers(
          groupId,
          `群組成員變動`,
          `${memberName} 已離開群組`,
          "group",
          { type: "detail", payload: { refrigeratorId: groupId } },
          "official",
          userId,
          "member",
        )
        .catch((e) => console.error("[Notification] removeMember error:", e));
    } catch (error) {
      this.handleError(error, res, "V2GroupController.removeMember");
    }
  }

  async leave(req: Request, res: Response): Promise<void> {
    try {
      await v2GroupService.leaveGroup(req.params.id, req.user!.userId);
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "V2GroupController.leave");
    }
  }
}
