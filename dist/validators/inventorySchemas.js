import { z } from "zod";
export const createInventorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    quantity: z.number().min(0).optional(),
    unit: z.string().optional(),
    category: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    storageType: z.enum(["fridge", "freezer", "pantry"]).optional(),
    notes: z.string().optional(),
});
export const updateInventorySchema = z.object({
    name: z.string().min(1).optional(),
    quantity: z.number().min(0).optional(),
    unit: z.string().optional(),
    category: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    storageType: z.enum(["fridge", "freezer", "pantry"]).optional(),
    notes: z.string().optional(),
    isOpened: z.boolean().optional(),
});
export const consumeInventorySchema = z.object({
    quantity: z.number().positive("Quantity must be positive"),
    reasons: z.array(z.string()).min(1, "At least one reason is required"),
});
export const updateInventorySettingsSchema = z.object({
    layoutType: z.enum(["layout-a", "layout-b", "layout-c"]).optional(),
    categoryOrder: z.array(z.string()).optional(),
    categories: z
        .array(z.object({
        id: z.string(),
        title: z.string(),
        isVisible: z.boolean(),
        subCategories: z.array(z.string()).optional(),
    }))
        .optional(),
    lowStockThreshold: z.number().min(0).optional(),
    expiringSoonDays: z.number().min(0).optional(),
    notifyOnExpiry: z.boolean().optional(),
    notifyOnLowStock: z.boolean().optional(),
});
