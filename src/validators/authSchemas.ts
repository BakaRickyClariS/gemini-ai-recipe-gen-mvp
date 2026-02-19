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
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
