/**
 * 模型客戶端工具
 * 提供自動 fallback 機制：
 * 1. 同一 API Key 內的模型輪換
 * 2. 多個 API Key 之間的輪換
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
/** 模型優先順序配置 */
export const MODEL_PRIORITY = {
    // 食譜生成：主力 (User Pref) → Stable
    recipe: [
        "gemini-2.5-flash",
        "gemini-3-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ],
    // 影像分析：主力 (User Pref) → Stable
    vision: [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ],
    // 文字生成：主力 (User Pref) → Stable
    text: [
        "gemini-2.5-flash",
        "gemini-3-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ],
};
import { getGeminiKeys } from "../config/unifiedConfig.js";
// ===== API Key 管理 =====
/**
 * 取得所有可用的 API Keys
 * 使用 unifiedConfig 集中管理
 */
const getApiKeys = () => {
    const keys = getGeminiKeys();
    if (keys.length === 0) {
        throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY");
    }
    console.log(`[ModelClient] Found ${keys.length} API key(s)`);
    return keys;
};
/**
 * 取得單一 API Key（向下相容）
 */
const getApiKey = () => {
    return getApiKeys()[0];
};
/**
 * 判斷是否為配額限制錯誤
 */
const isQuotaError = (error) => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (message.includes("429") ||
            message.includes("quota") ||
            message.includes("rate limit") ||
            message.includes("resource exhausted"));
    }
    return false;
};
// ===== 主要 API =====
/**
 * 取得帶有 fallback 機制的模型
 * @param purpose 模型用途
 * @returns 模型實例和使用的模型名稱
 */
export const getModelWithFallback = (purpose) => {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = MODEL_PRIORITY[purpose][0];
    return {
        model: genAI.getGenerativeModel({ model: modelName }),
        modelName,
    };
};
/**
 * 執行 AI 請求，帶有完整 fallback 機制
 * 支援：模型輪換 + 多 API Key 輪換
 * @param purpose 模型用途
 * @param executeRequest 執行請求的函式
 * @returns 請求結果和使用的模型名稱
 */
export const executeWithFallback = async (purpose, executeRequest) => {
    const apiKeys = getApiKeys();
    const models = MODEL_PRIORITY[purpose];
    let lastError = null;
    // 遍歷所有 API Keys
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
        const apiKey = apiKeys[keyIndex];
        const genAI = new GoogleGenerativeAI(apiKey);
        const keyLabel = apiKeys.length > 1 ? ` (Key #${keyIndex + 1})` : "";
        // 遍歷所有模型
        for (const modelName of models) {
            try {
                console.log(`[ModelClient] 🔄 嘗試: API Key #${keyIndex + 1}/${apiKeys.length} | 模型: ${modelName} | 用途: ${purpose}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await executeRequest(model);
                console.log(`[ModelClient] ✅ 成功: API Key #${keyIndex + 1} | 模型: ${modelName} | 用途: ${purpose}`);
                return { result, modelUsed: modelName, apiKeyIndex: keyIndex };
            }
            catch (error) {
                lastError = error;
                console.warn(`[ModelClient] ❌ 失敗: API Key #${keyIndex + 1} | 模型: ${modelName} | 錯誤: ${lastError.message}`);
                const isFatal = lastError.message.includes("400") &&
                    !lastError.message.includes("Bad Request") &&
                    !lastError.message.includes("Invalid Argument");
                console.log(`[ModelClient] ⚠️ 發生錯誤，嘗試下一個備用方案...`);
                continue;
            }
        }
        // 該 API Key 的所有模型都失敗，嘗試下一個 API Key
        if (keyIndex < apiKeys.length - 1) {
            console.log(`[ModelClient] 🔄 API Key #${keyIndex + 1} 所有模型已用盡，切換到 API Key #${keyIndex + 2}...`);
        }
    }
    // 所有 API Keys 和模型都失敗
    throw new Error(`All API keys and models exhausted. Last error: ${lastError?.message || "Unknown error"}`);
};
/**
 * 取得目前使用的主模型名稱
 */
export const getPrimaryModel = (purpose) => {
    return MODEL_PRIORITY[purpose][0];
};
/**
 * 取得可用的 API Key 數量
 */
export const getApiKeyCount = () => {
    return getApiKeys().length;
};
