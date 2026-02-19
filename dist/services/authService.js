/**
 * Auth Service
 * LINE OAuth 2.0 + JWT 簽發
 * 遵循 api-integration-specialist：OAuth 流程 + token 管理
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as Sentry from "@sentry/node";
import { config } from "../config/unifiedConfig.js";
import { userRepository } from "../repositories/userRepository.js";
import { ApiError } from "../errors/ApiError.js";
const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
export const authService = {
    /**
     * 產生 LINE OAuth 授權 URL
     */
    getLineAuthUrl(state) {
        if (!config.line.channelId || !config.line.redirectUri) {
            throw ApiError.internal("LINE OAuth not configured");
        }
        const params = new URLSearchParams({
            response_type: "code",
            client_id: config.line.channelId,
            redirect_uri: config.line.redirectUri,
            state: state || crypto.randomUUID(),
            scope: "profile openid",
        });
        return `${LINE_AUTH_URL}?${params.toString()}`;
    },
    /**
     * LINE OAuth callback：用 code 換 token → 取 profile → upsert user → 簽 JWT
     */
    async handleLineCallback(code) {
        // 1. Exchange code for token
        const tokenResponse = await fetch(LINE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: config.line.redirectUri,
                client_id: config.line.channelId,
                client_secret: config.line.channelSecret,
            }),
        });
        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            Sentry.captureMessage(`LINE token exchange failed: ${error}`);
            throw ApiError.unauthorized("LINE authentication failed");
        }
        const tokenData = await tokenResponse.json();
        // 2. Get LINE profile
        const profileResponse = await fetch(LINE_PROFILE_URL, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!profileResponse.ok) {
            throw ApiError.unauthorized("Failed to get LINE profile");
        }
        const profile = await profileResponse.json();
        // 3. Upsert user
        const user = await userRepository.upsert(profile.userId, {
            displayName: profile.displayName,
            lineUserId: profile.userId,
            profilePictureUrl: profile.pictureUrl,
        });
        // 4. Sign JWT tokens
        const accessToken = this.signAccessToken({ userId: user.id });
        const refreshToken = this.signRefreshToken({ userId: user.id });
        return { user, accessToken, refreshToken };
    },
    /**
     * 簽發 Access Token（短效 15 分鐘）
     */
    signAccessToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.accessExpiresIn,
        });
    },
    /**
     * 簽發 Refresh Token（長效 30 天）
     */
    signRefreshToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.refreshExpiresIn,
        });
    },
    /**
     * 刷新 Token
     */
    async refreshTokens(refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, config.jwt.secret);
            const user = await userRepository.findById(payload.userId);
            if (!user) {
                throw ApiError.unauthorized("User not found");
            }
            const newAccessToken = this.signAccessToken({ userId: user.id });
            const newRefreshToken = this.signRefreshToken({ userId: user.id });
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user,
            };
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            throw ApiError.unauthorized("Invalid refresh token");
        }
    },
    /**
     * 取得當前使用者
     */
    async getCurrentUser(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw ApiError.notFound("User not found");
        }
        return user;
    },
    /**
     * 一般註冊 (Email + Password)
     */
    async register(input) {
        // 1. Check if email exists
        const existing = await userRepository.findByEmail(input.email);
        if (existing) {
            throw ApiError.conflict("Email already in use");
        }
        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(input.password, salt);
        // 3. Create user
        const user = await userRepository.create({
            id: uuidv4(),
            email: input.email,
            passwordHash,
            displayName: input.displayName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.displayName)}&background=random`,
        });
        // 4. Sign tokens
        const accessToken = this.signAccessToken({ userId: user.id });
        const refreshToken = this.signRefreshToken({ userId: user.id });
        return { user, accessToken, refreshToken };
    },
    /**
     * 一般登入 (Email + Password)
     */
    async login(input) {
        // 1. Find user
        const user = await userRepository.findByEmail(input.email);
        if (!user || user.passwordHash === null) {
            // Don't reveal if user exists or if they use OAuth only
            throw ApiError.unauthorized("Invalid email or password");
        }
        // 2. Verify password
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
            throw ApiError.unauthorized("Invalid email or password");
        }
        // 3. Sign tokens
        const accessToken = this.signAccessToken({ userId: user.id });
        const refreshToken = this.signRefreshToken({ userId: user.id });
        return { user, accessToken, refreshToken };
    },
};
