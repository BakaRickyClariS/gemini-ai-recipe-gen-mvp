import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recipe } from "../models/recipe.js";
import fs from "fs";

const MODEL_TEXT = "gemini-2.5-flash"; // speed/price friendly
const MODEL_VISION = "gemini-2.5-flash"; // supports image input

function getClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY in environment.");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateRecipeFromText(input: string) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_TEXT });

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
}

type AnalyzeImageResult = {
  imageDescription: string;
  detectedIngredients: Array<{
    name: string;
    confidence?: number;
    quantity?: string;
    freshness?: string;
    notes?: string;
  }>;
  suggestedCuisines?: string[];
  suggestedDishes?: Array<{
    dishName: string;
    requiredAdditionalIngredients?: string[];
  }>;
  healthScore?: number;
  preparationDifficulty?: "easy" | "medium" | "hard";
  estimatedCookTime?: number;
};

function parseJsonFromText(text: string) {
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const sliced =
    start !== -1 && end !== -1 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(sliced);
}

export async function analyzeImageByUrl(
  imageUrl: string
): Promise<AnalyzeImageResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_VISION });

  const prompt = `
你是一位食材辨識助理。分析圖片，輸出以下 JSON 結構（僅 JSON）：
{
  "imageDescription": string,
  "detectedIngredients": [
    { "name": string, "confidence": number, "quantity": string, "freshness": string, "notes": string }
  ],
  "suggestedCuisines": string[],
  "suggestedDishes": [
    { "dishName": string, "requiredAdditionalIngredients": string[] }
  ],
  "healthScore": number,
  "preparationDifficulty": "easy" | "medium" | "hard",
  "estimatedCookTime": number
}
語言使用繁體中文。
`;

  const result = await model.generateContent([
    { text: prompt },
    { image_url: imageUrl },
  ] as any);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  return parseJsonFromText(jsonText);
}

// 📸 本地檔案分析
export async function analyzeLocalImage(
  filePath: string
): Promise<AnalyzeImageResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_VISION });

  const imageBytes = fs.readFileSync(filePath);

  const prompt = `
你是一位食材辨識助理。分析圖片，輸出以下 JSON 結構（僅 JSON）：
{
  "imageDescription": string,
  "detectedIngredients": [
    { "name": string, "confidence": number, "quantity": string, "freshness": string, "notes": string }
  ],
  "suggestedCuisines": string[],
  "suggestedDishes": [
    { "dishName": string, "requiredAdditionalIngredients": string[] }
  ],
  "healthScore": number,
  "preparationDifficulty": "easy" | "medium" | "hard",
  "estimatedCookTime": number
}
語言使用繁體中文。
`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBytes.toString("base64"),
      },
    },
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/```json\\s*([\\s\\S]*?)\\s*```/i);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  return parseJsonFromText(jsonText);
}
