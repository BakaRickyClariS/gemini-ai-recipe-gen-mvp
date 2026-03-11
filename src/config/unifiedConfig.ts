/**
 * 集中環境變數管理
 * 遵循 backend-dev-guidelines：不直接使用 process.env
 */
import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    if (process.env.NODE_ENV === "test" && key !== "DATABASE_URL") {
      return fallback || "test-dummy-value";
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

export const config = {
  env: optionalEnv("NODE_ENV", "development"),
  port: parseInt(optionalEnv("PORT", "3001"), 10),

  database: {
    url: requireEnv("DATABASE_URL"),
  },

  jwt: {
    secret: requireEnv("JWT_SECRET", "dev-secret-change-in-production"),
    accessExpiresIn: parseInt(optionalEnv("JWT_ACCESS_EXPIRES_IN", "900"), 10), // 15 min (seconds)
    refreshExpiresIn: parseInt(
      optionalEnv("JWT_REFRESH_EXPIRES_IN", "2592000"),
      10,
    ), // 30 days
  },

  line: {
    channelId: optionalEnv("LINE_CHANNEL_ID"),
    channelSecret: optionalEnv("LINE_CHANNEL_SECRET"),
    redirectUri: optionalEnv("LINE_REDIRECT_URI"),
  },

  sentry: {
    dsn: optionalEnv("SENTRY_DSN"),
  },

  cors: {
    origins: optionalEnv(
      "CORS_ORIGINS",
      "https://fufood.vercel.app,http://localhost:5173,http://localhost:3000",
    ).split(","),
  },

  rateLimit: {
    api: { windowMs: 15 * 60 * 1000, max: 100 },
    auth: { windowMs: 60 * 1000, max: 10 },
  },

  cookie: {
    secure: optionalEnv("NODE_ENV") === "production",
    sameSite:
      optionalEnv("NODE_ENV") === "production"
        ? ("none" as const)
        : ("lax" as const),
    httpOnly: true,
  },

  admin: {
    token: optionalEnv("ADMIN_TOKEN"),
    deploySecret: optionalEnv("DEPLOY_SECRET"),
    cronSecret: optionalEnv("CRON_SECRET"),
  },

  ai: {
    dailyLimit: parseInt(optionalEnv("AI_DAILY_LIMIT", "3"), 10),
    requestTimeout: parseInt(optionalEnv("AI_REQUEST_TIMEOUT", "30000"), 10),
    rateLimitPerMinute: parseInt(
      optionalEnv("AI_RATE_LIMIT_PER_MINUTE", "5"),
      10,
    ),
    rateLimitPerHour: parseInt(optionalEnv("AI_RATE_LIMIT_PER_HOUR", "20"), 10),
    securityLogLevel: optionalEnv("AI_SECURITY_LOG_LEVEL", "warn"),
  },

  gemini: {
    apiKey: optionalEnv("GEMINI_API_KEY") || optionalEnv("GOOGLE_API_KEY"),
    // Multi-key support: read GEMINI_API_KEY_1 ~ _10 at runtime via getGeminiKeys()
  },

  cloudinary: {
    cloudName: optionalEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: optionalEnv("CLOUDINARY_API_KEY"),
    apiSecret: optionalEnv("CLOUDINARY_API_SECRET"),
    uploadPreset: optionalEnv("CLOUDINARY_UPLOAD_PRESET"),
  },

  unsplash: {
    accessKey: optionalEnv("UNSPLASH_ACCESS_KEY"),
  },

  firebase: {
    serviceAccountKey:
      optionalEnv("FIREBASE_SERVICE_ACCOUNT") ||
      optionalEnv("FIREBASE_SERVICE_ACCOUNT_KEY"),
  },
} as const;

/**
 * 取得 Gemini 多組 API Key（GEMINI_API_KEY_1 ~ _10）
 */
export function getGeminiKeys(): string[] {
  const keys: string[] = [];
  const primary = config.gemini.apiKey;
  if (primary) keys.push(primary);
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

export type Config = typeof config;
