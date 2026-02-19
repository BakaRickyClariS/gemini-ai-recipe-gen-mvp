/**
 * 共用型別定義
 * Envelope Pattern 回應格式
 */
import type { Request } from "express";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
};

export type JwtPayload = {
  userId: string;
  role?: string;
};

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};
