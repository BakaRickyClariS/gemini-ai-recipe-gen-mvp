/**
 * Group Controller
 * #9 邀請成員通知, #10 移除成員通知, #13 加入群組通知
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { groupService } from "../services/groupService.js";
import { notificationService } from "../services/notificationService.js";
import { groupRepository } from "../repositories/groupRepository.js";

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

  /** #9 邀請成員 → 通知群組內所有現有成員 */
  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const groupId = req.params.id;

      const invitation = await groupService.createInvitation(groupId, userId);
      this.handleCreated(res, invitation);

      // Fire-and-forget: 邀請通知（通知群組現有成員有新邀請）
      notificationService
        .sendToRefrigeratorMembers(
          groupId,
          `新成員加入`,
          `已產生群組邀請連結`,
          "group",
          { type: "detail", payload: { refrigeratorId: groupId } },
          "official",
          userId,
          "member",
        )
        .catch((e) =>
          console.error("[Notification] createInvitation error:", e),
        );
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

  /** #13 加入群組 → 通知其他成員 */
  async join(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const group = await groupService.joinGroup(
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
      this.handleError(error, res, "GroupController.join");
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

      await groupService.removeMember(groupId, userId, memberId);
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
