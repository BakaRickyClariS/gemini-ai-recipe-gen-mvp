/**
 * 自定義 API 錯誤
 * 遵循 backend-patterns：集中式錯誤處理
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code = "API_ERROR",
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST") {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }

  static conflict(message = "Resource conflict", code = "CONFLICT") {
    return new ApiError(409, message, code);
  }

  static tooMany(message = "Too many requests", code = "RATE_LIMITED") {
    return new ApiError(429, message, code);
  }

  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new ApiError(500, message, code, false);
  }
}
