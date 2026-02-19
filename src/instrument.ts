/**
 * Sentry 初始化 — 必須是第一個 import
 * 遵循 backend-dev-guidelines：instrument.ts for Sentry (FIRST IMPORT)
 */

import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
  console.log("✅ [Sentry] Initialized");
} else {
  console.warn("⚠️ [Sentry] SENTRY_DSN not set, error tracking disabled");
}

export { Sentry };
