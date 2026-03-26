/**
 * Prompt 驗證模組
 * 比前端更嚴格的輸入驗證，防止 Prompt Injection
 */
import { logSecurityEvent } from "../services/securityLogger.js";
// Injection 偵測模式
const INJECTION_PATTERNS = [
    // === 中文指令類 === //
    /忽略.*指令/i,
    /無視.*規則/i,
    /你的.*prompt/i,
    /系統.*提示/i,
    /輸出.*設定/i,
    /忘記.*之前/i,
    /忽略.*指示/i,
    /你是.*誰/i,
    /揭露.*指令/i,
    /改變.*身份/i,
    /扮演.*角色/i,
    /切換.*模式/i,
    /不受.*限制/i,
    /解除.*限制/i,
    /無視.*安全/i,
    // === 英文指令類 === //
    /ignore.{0,20}instruction/i,
    /bypass.{0,20}rule/i,
    /reveal.{0,20}prompt/i,
    /system.{0,10}prompt/i,
    /jailbreak/i,
    /DAN\s*mode/i,
    /god\s*mode/i,
    /dev\s*mode/i,
    /pretend.{0,20}(you\s*are|to\s*be)/i,
    /you\s*are\s*now/i,
    /act\s*as\s*(if|though|a)/i, // "act as a..."
    /ignore.{0,20}above/i,
    /disregard.{0,20}prior/i,
    /forget.{0,20}(previous|above|all)/i,
    /new\s*persona/i,
    /roleplay\s*as/i,
    /play\s*the\s*role/i,
    /from\s*now\s*on.*you\s*(are|will)/i,
    /without\s*(any\s*)?(restriction|filter|limit|rule)/i,
    /no\s*(restriction|filter|limit|safeguard)/i,
    /unlock.{0,20}(mode|feature|capability)/i,
    /do\s*anything\s*now/i, // DAN 變體
    /enable\s*(developer|debug|test)\s*mode/i,
    /as\s*(my\s*)?(grandmother|grandma|grandpa)/i, // 奶奶漏洞類
    // === 模型特定 Token 注入 === //
    /\[INST\]/i,
    /\[\/?SYS\]/i,
    /<<SYS>>/i,
    /<\|im_(start|end)\|>/i,
    /<\|system\|>/i,
    /<\|.*?\|>/, // LLaMA style special tokens
    /\{\{\{.*?\}\}\}/, // Handlebars-style injection
    /###\s*(System|Human|Assistant)/i, // ChatML 變體
    /<system>/i,
    /\[system\]/i,
    // === Prompt 泄露類 === //
    /print.{0,20}(your\s*)?(instruction|prompt|rule)/i,
    /what.{0,20}(your\s*)?(instruction|system|rule)/i,
    /show.{0,20}(your\s*)?(instruction|prompt|rule)/i,
    /repeat.{0,20}(everything|above|instruction)/i,
    /output.{0,20}(your\s*)?(instruction|system\s*prompt)/i,
    /tell\s*me.{0,20}(your\s*)?(instruction|prompt|system)/i,
];
const MAX_PROMPT_LENGTH = 1000; // 比 aiSecurity.ts 的 2000 更嚴格，針對核心 Prompt
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
