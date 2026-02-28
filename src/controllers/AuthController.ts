/**
 * Auth Controller
 * 遵循 backend-dev-guidelines：extends BaseController，routes 只委派
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { authService } from "../services/authService.js";
import { config } from "../config/unifiedConfig.js";

const COOKIE_OPTIONS = {
  httpOnly: config.cookie.httpOnly,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: "/",
};

export class AuthController extends BaseController {
  /** POST /api/v2/auth/line/init */
  async lineInit(_req: Request, res: Response): Promise<void> {
    try {
      const authUrl = authService.getLineAuthUrl();
      this.handleSuccess(res, { authUrl });
    } catch (error) {
      this.handleError(error, res, "AuthController.lineInit");
    }
  }

  /** GET /api/v2/auth/csrf-token */
  async getCsrfToken(req: Request, res: Response): Promise<void> {
    try {
      this.handleSuccess(res, { csrfToken: req.csrfToken });
    } catch (error) {
      this.handleError(error, res, "AuthController.getCsrfToken");
    }
  }

  /** GET /api/v2/auth/line/callback */
  async lineCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "Missing authorization code" },
        });
        return;
      }

      const { user, accessToken, refreshToken } =
        await authService.handleLineCallback(code);

      // Set HttpOnly cookies
      res.cookie("access_token", accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 min
      });

      res.cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // 成功登入後跳轉回前端
      const isLocal =
        req.hostname === "localhost" || req.hostname === "127.0.0.1";
      const baseUrl =
        process.env.FRONTEND_URL ||
        (isLocal ? "http://localhost:5173" : config.cors.origins[0]);
      res.redirect(`${baseUrl}/inventory`);
    } catch (error) {
      this.handleError(error, res, "AuthController.lineCallback");
    }
  }

  /** POST /api/v2/auth/logout */
  async logout(_req: Request, res: Response): Promise<void> {
    try {
      res.clearCookie("access_token", COOKIE_OPTIONS);
      res.clearCookie("refresh_token", COOKIE_OPTIONS);
      this.handleSuccess(res, { message: "Logged out successfully" });
    } catch (error) {
      this.handleError(error, res, "AuthController.logout");
    }
  }

  /** POST /api/v2/auth/refresh */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const token = req.cookies?.refresh_token || req.body?.refreshToken;

      if (!token) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Missing refresh token" },
        });
        return;
      }

      const { accessToken, refreshToken } =
        await authService.refreshTokens(token);

      res.cookie("access_token", accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      this.handleSuccess(res, { accessToken });
    } catch (error) {
      this.handleError(error, res, "AuthController.refresh");
    }
  }

  /** GET /api/v2/auth/me */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        });
        return;
      }

      const user = await authService.getCurrentUser(userId);
      this.handleSuccess(res, user);
    } catch (error) {
      this.handleError(error, res, "AuthController.me");
    }
  }

  /** POST /api/v2/auth/register */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await authService.register(
        req.body,
      );

      res.cookie("access_token", accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: config.jwt.accessExpiresIn * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: config.jwt.refreshExpiresIn * 1000,
      });

      this.handleCreated(res, {
        user,
        accessToken,
      });
    } catch (error) {
      this.handleError(error, res, "AuthController.register");
    }
  }

  /** POST /api/v2/auth/login */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await authService.login(
        req.body,
      );

      res.cookie("access_token", accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: config.jwt.accessExpiresIn * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: config.jwt.refreshExpiresIn * 1000,
      });

      this.handleSuccess(res, {
        user,
        accessToken,
      });
    } catch (error) {
      this.handleError(error, res, "AuthController.login");
    }
  }
}
