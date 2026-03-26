/**
 * 安全日誌服務
 * 負責記錄 AI 相關的安全事件，如 Injection 嘗試、Rate Limit 觸發等
 */

export type SecurityEvent = {
  type:
    | "INJECTION_ATTEMPT"
    | "RATE_LIMIT_HIT"
    | "SUSPICIOUS_ACTIVITY"
    | "SENSITIVE_CONTENT_BLOCKED"
    | "PROMPT_LEAK_DETECTED";
  userId?: string;
  ip?: string;
  timestamp: string;
  details: Record<string, unknown>;
};
import { config } from "../config/unifiedConfig.js";

const LOG_LEVEL = config.ai.securityLogLevel;

/**
 * 記錄安全事件
 * 目前輸出到 console，生產環境可整合至外部監控系統 (Sentry, Datadog 等)
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const logMessage = `[AI Security Event] [${event.type}] User:${
    event.userId || "anon"
  } IP:${event.ip || "unknown"} - ${JSON.stringify(event.details)}`;

  if (LOG_LEVEL === "error") {
    console.error(logMessage);
  } else {
    // default warn
    console.warn(logMessage);
  }

  // TODO: 如果有設定 Sentry 或資料庫記錄，可以在此加入
}
