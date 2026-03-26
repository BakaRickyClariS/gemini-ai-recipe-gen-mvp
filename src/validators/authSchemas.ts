/**
 * Auth Validators
 */

import { z } from "zod";

export const lineInitSchema = z.object({
  ref: z.string().optional(),
  invite: z.string().optional(),
});

export const lineCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const registerSchema = z.object({
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(8, "密碼長度至少需 8 個字元"),
  name: z.string().min(1, "請輸入使用者名稱"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
