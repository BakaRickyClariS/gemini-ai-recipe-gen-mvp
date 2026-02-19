/**
 * Group Validators
 */
import { z } from "zod";
export const createGroupSchema = z.object({
    name: z.string().min(1, "群組名稱不可為空").max(100, "群組名稱最長 100 字"),
});
export const updateGroupSchema = z.object({
    name: z.string().min(1).max(100).optional(),
});
export const joinGroupSchema = z.object({
    invitationToken: z.string().min(1, "邀請 Token 不可為空"),
});
