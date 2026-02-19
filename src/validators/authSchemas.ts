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
