/**
 * 輸出過濾服務
 * 檢查 AI 生成的內容是否包含不適當的關鍵字
 */

import type { RecipeListItem } from "../types/aiRecipe.js";
import { logSecurityEvent } from "./securityLogger.js";

const FORBIDDEN_KEYWORDS = [
  "毒",
  "poison",
  "自殘",
  "自殺",
  "suicide",
  "色情",
  "porn",
  "暴力",
  "violence",
  // 可以持續擴充
];

/**
 * 過濾食譜內容
 * @returns 經過過濾的食譜，若含有違規內容則回傳 null
 */
export function filterRecipe(
  recipe: RecipeListItem,
  userId?: string
): RecipeListItem | null {
  const contentToCheck = [
    recipe.name,
    recipe.category,
    ...(recipe.steps?.map((s) => s.description) || []),
    ...(recipe.ingredients?.map((i) => i.name) || []),
  ].join(" ");

  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (contentToCheck.includes(keyword)) {
      logSecurityEvent({
        type: "SENSITIVE_CONTENT_BLOCKED",
        userId,
        timestamp: new Date().toISOString(),
        details: { keyword, recipeId: recipe.id },
      });
      return null;
    }
  }

  return recipe;
}

/**
 * 過濾問候語
 * 主要防止 AI 洩漏 System Prompt 或產生不適當的回應
 */
export function filterGreeting(greeting: string): string {
  // 簡單過濾：移除可能包含 System Prompt 特徵的字串
  // 實務上多半在前端處理，後端做基本把關
  let filtered = greeting;

  const suspiciousPhrases = [
    "System Prompt",
    "無視上述",
    "我是由",
    "Ignore previous",
  ];

  for (const phrase of suspiciousPhrases) {
    if (filtered.includes(phrase)) {
      filtered = "您好！這是為您推薦的食譜："; // 替換為安全預設值
      break;
    }
  }

  return filtered;
}
