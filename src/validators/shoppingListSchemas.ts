/**
 * Shopping List Validators
 */

import { z } from "zod";

export const createShoppingListSchema = z.object({
  title: z.string().max(255).nullable().optional(),
  coverPhotoPath: z.string().nullable().optional(),
  startsAt: z.string().datetime(),
  enableNotifications: z.boolean().default(false),
});

export const updateShoppingListSchema = z.object({
  title: z.string().max(255).nullable().optional(),
  coverPhotoPath: z.string().nullable().optional(),
  startsAt: z.string().datetime().optional(),
  enableNotifications: z.boolean().optional(),
});

export const createShoppingListItemSchema = z.object({
  name: z.string().min(1, "項目名稱不可為空").max(255),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().max(20).optional(),
  photoPath: z.string().nullable().optional(),
});

export const updateShoppingListItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  quantity: z.coerce.number().min(0).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  photoPath: z.string().nullable().optional(),
  photo_path: z.string().nullable().optional(), // 兼容前端傳來的 snake_case
  isChecked: z.coerce.boolean().optional(),
});
