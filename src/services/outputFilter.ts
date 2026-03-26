/**
 * 輸出過濾服務
 * 檢查 AI 生成的內容是否包含不適當的關鍵字
 * 分層過濾：致命危害 > 成人/暴力 > Prompt 洩漏 > 政治敏感
 */

import type { RecipeListItem } from "../types/aiRecipe.js";
import { logSecurityEvent } from "./securityLogger.js";

// ===== 禁詞分類 =====

/** 致命危害（食譜脈絡下最高風險）—— 直接丟棄整份食譜 */
const FATAL_KEYWORDS = [
  // 毒物
  "毒", "poison", "toxic", "毒藥", "下毒", "氰化", "cyanide",
  "砒霜", "arsenic", "汞", "mercury",
  // 自傷
  "自殘", "自殺", "suicide", "self-harm", "割腕",
];

/** 成人與暴力內容 */
const ADULT_VIOLENCE_KEYWORDS = [
  "色情", "porn", "pornography", "裸體", "nude",
  "性愛", "sex act",
  "暴力", "violence", "血腥", "gore", "mutilat",
  "謀殺", "murder", "殺人",
];

/** Prompt 洩漏跡象（AI 被誤導輸出系統設定） */
const PROMPT_LEAK_PHRASES = [
  "System Prompt",
  "system prompt",
  "你的指令是",
  "我的指令是",
  "我的系統提示",
  "以下是我的設定",
  "Ignore previous",
  "無視上述",
  "我是由 Google",    // AI 身份洩漏
  "我是 Gemini",
  "我是語言模型",
  "I am an AI",
  "As an AI language",
];

/** 政治 / 宗教 / 仇恨（食譜 AI 不應涉及） */
const SENSITIVE_TOPIC_KEYWORDS = [
  "六四", "天安門", "台獨", "統一", "共產黨",
  "恐怖主義", "terrorism", "jihad", "聖戰",
  "種族歧視", "racist", "nazi", "納粹",
  "炸彈", "bomb", "explosive", "炸藥",
  "槍械", "firearms", "weapon manufacture",
];

// ===== 核心函式 =====

/**
 * 正規化文字：轉小寫、移除零寬字元、合併空白
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // 零寬字元
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 批量關鍵字比對（支援 string 和 RegExp）
 */
function containsAny(text: string, keywords: (string | RegExp)[]): string | null {
  const normalized = normalize(text);
  for (const kw of keywords) {
    if (typeof kw === "string") {
      if (normalized.includes(kw.toLowerCase())) return kw;
    } else {
      if (kw.test(normalized)) return kw.toString();
    }
  }
  return null;
}

/**
 * 過濾食譜內容
 * @returns 經過過濾的食譜；含違規內容回傳 null
 */
export function filterRecipe(
  recipe: RecipeListItem,
  userId?: string
): RecipeListItem | null {
  // 聚合所有需要檢查的文字
  const contentParts = [
    recipe.name,
    recipe.category,
    ...(recipe.steps?.map((s) => s.description) ?? []),
    ...(recipe.ingredients?.map((i) => i.name) ?? []),
    ...(recipe.seasonings?.map((s) => s.name) ?? []),
  ];
  const fullText = contentParts.join(" ");

  // Layer 1：致命危害 → 最高優先，直接丟棄
  const fatalMatch = containsAny(fullText, FATAL_KEYWORDS);
  if (fatalMatch) {
    logSecurityEvent({
      type: "SENSITIVE_CONTENT_BLOCKED",
      userId,
      timestamp: new Date().toISOString(),
      details: { level: "FATAL", keyword: fatalMatch, recipeId: recipe.id },
    });
    return null;
  }

  // Layer 2：成人 / 暴力
  const adultMatch = containsAny(fullText, ADULT_VIOLENCE_KEYWORDS);
  if (adultMatch) {
    logSecurityEvent({
      type: "SENSITIVE_CONTENT_BLOCKED",
      userId,
      timestamp: new Date().toISOString(),
      details: { level: "ADULT_VIOLENCE", keyword: adultMatch, recipeId: recipe.id },
    });
    return null;
  }

  // Layer 3：政治 / 敏感話題
  const sensitiveMatch = containsAny(fullText, SENSITIVE_TOPIC_KEYWORDS);
  if (sensitiveMatch) {
    logSecurityEvent({
      type: "SENSITIVE_CONTENT_BLOCKED",
      userId,
      timestamp: new Date().toISOString(),
      details: { level: "SENSITIVE_TOPIC", keyword: sensitiveMatch, recipeId: recipe.id },
    });
    return null;
  }

  return recipe;
}

/**
 * 過濾問候語
 * 防止 AI 洩漏 System Prompt 或產生不適當問候
 */
export function filterGreeting(greeting: string): string {
  if (!greeting) return "您好！這是為您推薦的食譜：";

  // Prompt 洩漏跡象 → 替換為安全預設值
  const leakMatch = containsAny(greeting, PROMPT_LEAK_PHRASES);
  if (leakMatch) {
    logSecurityEvent({
      type: "PROMPT_LEAK_DETECTED",
      timestamp: new Date().toISOString(),
      details: { phrase: leakMatch, greetingSnippet: greeting.substring(0, 100) },
    });
    return "您好！這是為您推薦的食譜：";
  }

  // 成人 / 危害內容 → 替換
  const harmMatch = containsAny(greeting, [...FATAL_KEYWORDS, ...ADULT_VIOLENCE_KEYWORDS]);
  if (harmMatch) {
    return "您好！這是為您推薦的食譜：";
  }

  // 長度保護：問候語不應超過 500 字
  const trimmed = greeting.trim().substring(0, 500);

  return trimmed;
}
