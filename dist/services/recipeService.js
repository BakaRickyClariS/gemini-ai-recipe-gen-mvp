import { GoogleGenerativeAI } from "@google/generative-ai";
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
export async function generateRecipeFromText(input) {
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
    const parsed = parseJsonFromText(jsonText);
    return parsed;
}
function parseJsonFromText(text) {
    const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
    const raw = fence ? fence[1] : text;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const sliced = start !== -1 && end !== -1 && end > start ? raw.slice(start, end + 1) : raw;
    return JSON.parse(sliced);
}
export async function analyzeImageByUrl(imageUrl) {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL_VISION });
    // Fetch the image from the URL
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

{
  "productName": string,           // 產品名稱（例如：「鮮奶」、「花椰菜」、「雞蛋」）
  "category": string,               // 分類（例如：「乳製品飲料類」、「蔬果類」、「肉蛋類」）
  "attributes": string,             // 屬性（例如：「鮮奶類」、「新鮮類」）
  "purchaseQuantity": number,       // 建議購買數量（根據圖片中的數量估計，預設為 1）
  "unit": string,                   // 單位（例如：「瓶」、「顆」、「盒」、「包」、「公斤」）
  "purchaseDate": string,           // 購買日期（使用今天的日期，格式：YYYY-MM-DD）
  "expiryDate": string,             // 預計過期日期（根據食材類型合理推估，格式：YYYY-MM-DD）
  "lowStockAlert": boolean,         // 是否開啟低庫存提醒（預設 true）
  "lowStockThreshold": number,      // 低庫存數量通知門檻（預設 2）
  "notes": string                   // 備註（例如：「新鮮度佳」、「請盡快食用」、「冷藏保存」）
}

請使用繁體中文。今天的日期是 ${new Date().toISOString().split('T')[0]}。
`;
    const result = await model.generateContent([
        { text: prompt },
        {
            inlineData: {
                mimeType: mimeType,
                data: base64Image,
            },
        },
    ]);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return parseJsonFromText(jsonText);
}
// 📸 本地檔案分析
export async function analyzeLocalImage(filePath) {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL_VISION });
    const imageBytes = fs.readFileSync(filePath);
    const prompt = `
你是一位食材辨識助理。請分析圖片中的食材或食物，並輸出以下 JSON 結構（僅輸出 JSON，不要其他文字）：

{
  "productName": string,           // 產品名稱（例如：「鮮奶」、「花椰菜」、「雞蛋」）
  "category": string,               // 分類（例如：「乳製品飲料類」、「蔬果類」、「肉蛋類」）
  "attributes": string,             // 屬性（例如：「鮮奶類」、「新鮮類」）
  "purchaseQuantity": number,       // 建議購買數量（根據圖片中的數量估計，預設為 1）
  "unit": string,                   // 單位（例如：「瓶」、「顆」、「盒」、「包」、「公斤」）
  "purchaseDate": string,           // 購買日期（使用今天的日期，格式：YYYY-MM-DD）
  "expiryDate": string,             // 預計過期日期（根據食材類型合理推估，格式：YYYY-MM-DD）
  "lowStockAlert": boolean,         // 是否開啟低庫存提醒（預設 true）
  "lowStockThreshold": number,      // 低庫存數量通知門檻（預設 2）
  "notes": string                   // 備註（例如：「新鮮度佳」、「請盡快食用」、「冷藏保存」）
}

請使用繁體中文。今天的日期是 ${new Date().toISOString().split('T')[0]}。
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
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return parseJsonFromText(jsonText);
}
