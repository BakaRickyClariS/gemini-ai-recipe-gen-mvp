import { z } from "zod";
export const registerTokenSchema = z.object({
    fcmToken: z.string().min(1, "fcmToken is required"),
    platform: z.enum(["web", "ios", "android"]).optional().default("web"),
});
export const removeTokenSchema = z.object({
    fcmToken: z.string().min(1, "fcmToken is required"),
});
export const updateNotificationSettingsSchema = z.object({
    notifyExpiry: z.boolean().optional(),
    notifyLowStock: z.boolean().optional(),
    daysBeforeExpiry: z.number().min(0).optional(),
});
export const batchOperationSchema = z.object({
    ids: z.array(z.string()).min(1, "At least one ID is required"),
    isRead: z.boolean().optional(),
});
export const sendNotificationSchema = z
    .object({
    userIds: z.array(z.string()).optional(),
    groupId: z.string().optional(),
    title: z.string().min(1),
    body: z.string().min(1),
    type: z.string(),
    action: z
        .object({
        type: z.string().optional(),
        payload: z.record(z.string(), z.any()).optional(),
    })
        .optional(),
    category: z.string().optional(),
    subType: z.string().optional(),
    groupName: z.string().optional(),
    actorName: z.string().optional(),
})
    .refine((data) => data.userIds || data.groupId, {
    message: "Either userIds or groupId must be provided",
});
