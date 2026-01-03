/**
 * Prompt 驗證模組
 * 比前端更嚴格的輸入驗證，防止 Prompt Injection
 */
import { logSecurityEvent } from "../services/securityLogger.js";
// Injection 偵測模式
const INJECTION_PATTERNS = [
    // 中文指令
    /忽略.*指令/i,
    /無視.*規則/i,
    /你的.*prompt/i,
    /系統.*提示/i,
    /輸出.*設定/i,
    /忘記.*之前/i,
    /忽略.*指示/i,
    /你是.*誰/i,
    /揭露.*指令/i,
    // 英文指令
    /ignore.*instruction/i,
    /bypass.*rule/i,
    /reveal.*prompt/i,
    /system.*prompt/i,
    /jailbreak/i,
    /DAN\s*mode/i,
    /override/i,
    /pretend.*you.*are/i,
    /you.*are.*now/i,
    /ignore.*above/i,
    /disregard.*prior/i,
    // 技術攻擊標記
    /\[INST\]/i,
    /<<SYS>>/i,
    /<\|.*\|>/i,
    /\{system\}/i,
    /<\|im_start\|>/i,
];
const MAX_PROMPT_LENGTH = 1000; // 比 aiSecurity.ts 的 4000 更嚴格，針對核心 Prompt
/**
 * 驗證 Prompt 內容
 * @param prompt 使用者輸入的 Prompt
 * @param userId 使用者 ID (用於日誌)
 */
export function validatePromptContent(prompt, userId) {
    // 1. 空值檢查
    if (!prompt || prompt.trim().length === 0) {
        return { isValid: false, error: "Prompt cannot be empty", code: "AI_001" };
    }
    // 2. 長度檢查
    if (prompt.length > MAX_PROMPT_LENGTH) {
        return {
            isValid: false,
            error: `Prompt length (${prompt.length}) exceeds limit of ${MAX_PROMPT_LENGTH}`,
            code: "AI_002",
        };
    }
    // 3. Injection 偵測
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(prompt)) {
            // 記錄攻擊嘗試
            logSecurityEvent({
                type: "INJECTION_ATTEMPT",
                userId,
                timestamp: new Date().toISOString(),
                details: {
                    promptSnippet: prompt.substring(0, 100),
                    matchedPattern: pattern.toString(),
                },
            });
            return {
                isValid: false,
                error: "Potential prompt injection detected.",
                code: "AI_007",
            };
        }
    }
    return { isValid: true, sanitizedContent: prompt.trim() };
}
