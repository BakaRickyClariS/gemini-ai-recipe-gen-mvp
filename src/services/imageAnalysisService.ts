/**
 * 影像分析服務
 * 負責食材辨識與影像分析功能
 * 支援自動 fallback 機制，當主模型達到配額時自動切換
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recipe } from "../models/recipe.js";
import fs from "fs";
import { executeWithFallback, getModelWithFallback } from "./modelClient.js";
import type { IngredientRecognitionResult } from "../types/imageAnalysis.js";
import { validateImageInput } from "../middleware/aiSecurity.js";

// ===== 模型設定（舊版相容用）=====
const MODEL_LEGACY_RECIPE = "gemini-2.5-flash";

// ===== 舊版食譜生成（保留相容）=====

/**
 * @deprecated 請使用 aiRecipeService.ts 的 generateMultipleRecipes()
 */
export const generateRecipeFromText = async (input: string) => {
  const { model } = getModelWithFallback("text");

  const prompt = `
你是一位專業食譜助手。根據使用者輸入，輸出一段 JSON，符合以下 TypeScript 型別：
type Recipe = {
  recipeName: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  category?: string;
  ingredients: { name: string; quantity?: number | string; unit?: string; optional?: boolean; }[];
  instructions: { step: number; description: string; timeMinutes?: number; }[];
  tips?: string[];
  nutritionPerServing?: { calories?: number; protein?: string; fat?: string; carbohydrates?: string; };
}

規則：
- 僅輸出 JSON，不要加解說文字。
- 字段名稱使用 camelCase。
- 估算合理份量與時間。
- 語言使用繁體中文。

使用者輸入：${input}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  // Try to parse JSON inside code fences if present
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  const parsed: Recipe = parseJsonFromText(jsonText);
  return parsed;
};

// ===== 影像分析型別定義 =====

/** @deprecated 請使用 IngredientRecognitionResult */
type AnalyzeImageResult = IngredientRecognitionResult;

function parseJsonFromText(text: string) {
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const sliced =
    start !== -1 && end !== -1 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(sliced);
}

// ===== 主要影像分析 API =====

/**
 * 透過 URL 分析圖片中的食材
 * @param imageUrl 圖片 URL
 * @returns 食材辨識結果
 */
export const analyzeImageByUrl = async (
  imageUrl: string
): Promise<IngredientRecognitionResult> => {
  // 1. 安全驗證
  const validation = validateImageInput({ url: imageUrl });
  if (!validation.isValid) {
    throw new Error(`Security validation failed: ${validation.error}`);
  }

  // Fetch the image from the URL first
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Image = buffer.toString("base64");
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  const prompt = `
你是一位食材辨識助理。請分析圖片中的食材或食物，並輸出以下 JSON 結構（僅輸出 JSON，不要其他文字）：

所有欄位皆為【必填】，不可為空字串、null 或省略！

{
  "productName": string,           // 【必填】產品名稱（例如：「鮮奶」、「花椰菜」、「雞蛋」），若無法辨識請填「未知食材」
  "category": string,               // 【必填】分類，必須為以下其中之一：「乳製品飲料類」、「蔬果類」、「肉蛋類」、「海鮮類」、「調味料類」、「加工食品類」、「冷凍食品類」、「其他」
  "attributes": string[],           // 【必填】屬性陣列，至少填入一個屬性（例如：["鮮奶類"], ["新鮮類"], ["冷藏類"]），若無法判斷請填 ["一般"]
  "purchaseQuantity": number,       // 【必填】購買數量（根據圖片中的數量估計，若無法判斷請填 1）
  "unit": string,                   // 【必填】單位（例如：「瓶」、「顆」、「盒」、「包」、「公斤」、「份」），若無法判斷請填「份」
  "purchaseDate": string,           // 【必填】購買日期，使用今天的日期，格式：YYYY-MM-DD
  "expiryDate": string,             // 【必填】預計過期日期（格式：YYYY-MM-DD，絕對不能為空值）
                                     //   - 若圖片中有標示有效期限，請使用該日期
                                     //   - 若無法辨識，請根據食材類型推估：
                                     //     * 新鮮蔬果類：今日 + 5天
                                     //     * 乳製品類：今日 + 10天
                                     //     * 生鮮肉類/海鮮：今日 + 3天
                                     //     * 蛋類：今日 + 14天
                                     //     * 加工食品/罐頭：今日 + 60天
                                     //     * 冷凍食品：今日 + 90天
                                     //     * 其他：今日 + 7天
  "lowStockAlert": boolean,         // 【必填】是否開啟低庫存提醒，若無法判斷請填 true
  "lowStockThreshold": number,      // 【必填】低庫存數量通知門檻，若無法判斷請填 2
  "notes": string                   // 【必填】備註（例如：「新鮮度佳」、「請盡快食用」、「冷藏保存」），若無特別備註請填「無」
}

重要規則：
1. 所有欄位都是必填，絕對不能為空字串、null、undefined 或省略任何欄位
2. 若無法辨識某欄位，請使用上述的預設值
3. 請使用繁體中文
4. 今天的日期是 ${new Date().toISOString().split("T")[0]}
`;

  // 使用 fallback 機制執行 AI 請求
  const { result } = await executeWithFallback("vision", async (model) => {
    return await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ]);
  });

  const text = result.response.text().trim();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  return parseJsonFromText(jsonText);
};

/**
 * 分析本地圖片檔案中的食材
 * @param filePath 本地檔案路徑
 * @returns 食材辨識結果
 */
export const analyzeLocalImage = async (
  filePath: string
): Promise<IngredientRecognitionResult> => {
  // 1. 安全驗證 (簡單檢查檔案大小與類型)
  // 注意：這裡假設 filePath 是系統內部路徑，風險較低，但仍可做基本檢查
  const stats = fs.statSync(filePath);
  const validation = validateImageInput({ sizeBytes: stats.size });
  
  if (!validation.isValid) {
     throw new Error(`Security validation failed: ${validation.error}`);
  }

  const imageBytes = fs.readFileSync(filePath);

  const prompt = `
你是一位食材辨識助理。請分析圖片中的食材或食物，並輸出以下 JSON 結構（僅輸出 JSON，不要其他文字）：

所有欄位皆為【必填】，不可為空字串、null 或省略！

{
  "productName": string,           // 【必填】產品名稱（例如：「鮮奶」、「花椰菜」、「雞蛋」），若無法辨識請填「未知食材」
  "category": string,               // 【必填】分類，必須為以下其中之一：「乳製品飲料類」、「蔬果類」、「肉蛋類」、「海鮮類」、「調味料類」、「加工食品類」、「冷凍食品類」、「其他」
  "attributes": string[],           // 【必填】屬性陣列，至少填入一個屬性（例如：["鮮奶類"], ["新鮮類"], ["冷藏類"]），若無法判斷請填 ["一般"]
  "purchaseQuantity": number,       // 【必填】購買數量（根據圖片中的數量估計，若無法判斷請填 1）
  "unit": string,                   // 【必填】單位（例如：「瓶」、「顆」、「盒」、「包」、「公斤」、「份」），若無法判斷請填「份」
  "purchaseDate": string,           // 【必填】購買日期，使用今天的日期，格式：YYYY-MM-DD
  "expiryDate": string,             // 【必填】預計過期日期（格式：YYYY-MM-DD，絕對不能為空值）
                                     //   - 若圖片中有標示有效期限，請使用該日期
                                     //   - 若無法辨識，請根據食材類型推估：
                                     //     * 新鮮蔬果類：今日 + 5天
                                     //     * 乳製品類：今日 + 10天
                                     //     * 生鮮肉類/海鮮：今日 + 3天
                                     //     * 蛋類：今日 + 14天
                                     //     * 加工食品/罐頭：今日 + 60天
                                     //     * 冷凍食品：今日 + 90天
                                     //     * 其他：今日 + 7天
  "lowStockAlert": boolean,         // 【必填】是否開啟低庫存提醒，若無法判斷請填 true
  "lowStockThreshold": number,      // 【必填】低庫存數量通知門檻，若無法判斷請填 2
  "notes": string                   // 【必填】備註（例如：「新鮮度佳」、「請盡快食用」、「冷藏保存」），若無特別備註請填「無」
}

重要規則：
1. 所有欄位都是必填，絕對不能為空字串、null、undefined 或省略任何欄位
2. 若無法辨識某欄位，請使用上述的預設值
3. 請使用繁體中文
4. 今天的日期是 ${new Date().toISOString().split("T")[0]}
`;

  // 使用 fallback 機制執行 AI 請求
  const { result } = await executeWithFallback("vision", async (model) => {
    return await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBytes.toString("base64"),
        },
      },
    ]);
  });

  const text = result.response.text().trim();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  return parseJsonFromText(jsonText);
};
