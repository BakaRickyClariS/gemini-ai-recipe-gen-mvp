/**
 * AI 食譜生成服務
 * 對應 docs/ai_recipe_api_spec.md 規格
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import { AIRecipeError } from "../middleware/errorHandler.js";
import { generateRecipeImages } from "./imageGenerationService.js";
// ===== 常數定義 =====
const MODEL_NAME = "gemini-2.5-flash";
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 3;
const AI_REQUEST_TIMEOUT = Number(process.env.AI_REQUEST_TIMEOUT) || 30000;
// 簡易的每日查詢次數追蹤（生產環境應使用 Redis 或資料庫）
const userQueryCount = new Map();
// ===== 輔助函式 =====
function getClient() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new AIRecipeError("AI_005", { reason: "Missing API key" });
    }
    return new GoogleGenerativeAI(apiKey);
}
function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}
function checkAndUpdateQueryLimit(userId) {
    const today = getTodayDate();
    const userRecord = userQueryCount.get(userId);
    if (!userRecord || userRecord.date !== today) {
        // 新的一天，重置計數
        userQueryCount.set(userId, { count: 1, date: today });
        return AI_DAILY_LIMIT - 1;
    }
    if (userRecord.count >= AI_DAILY_LIMIT) {
        throw new AIRecipeError("AI_003", {
            dailyLimit: AI_DAILY_LIMIT,
            used: userRecord.count,
            resetAt: `${today}T24:00:00+08:00`,
        });
    }
    // 增加計數
    userRecord.count += 1;
    userQueryCount.set(userId, userRecord);
    return AI_DAILY_LIMIT - userRecord.count;
}
function generateRecipeId() {
    return `ai-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
}
// ===== System Prompt 建構 =====
function buildSystemPrompt(request) {
    const recipeCount = request.recipeCount || 2;
    const servings = request.servings || 2;
    let prompt = `你是 FuFood.AI，一個專業的食譜生成助手。請根據使用者的需求生成完整的食譜推薦。

回應格式要求：
1. 先用友善的語氣回應使用者的問題（放在 greeting 欄位）
2. 根據使用者需求推薦 ${recipeCount} 道食譜
3. 每道食譜需包含完整資訊：
   - id：使用 "ai-001" 格式
   - name：食譜名稱
   - category：料理類型（如：中式、日式、西式、台式、泰式等）
   - servings：${servings} 人份
   - cookTime：烹飪時間（分鐘）
   - difficulty：難易度（簡單、中等、困難）
   - imageUrl：留空字串，系統會自動生成
   - isFavorite：false
   - ingredients：準備材料陣列，每項包含 name（名稱）、amount（數量，如 "3-4"）、unit（單位，如 "條"）
   - seasonings：調味料陣列，格式同 ingredients
   - steps：烹煮步驟陣列，每項包含 step（步驟編號）、description（詳細說明）

輸出需符合以下 JSON 結構（僅輸出 JSON，不要加其他文字）：
{
  "greeting": "回應訊息",
  "recipes": [
    {
      "id": "ai-001",
      "name": "食譜名稱",
      "category": "料理類型",
      "servings": ${servings},
      "cookTime": 30,
      "difficulty": "簡單",
      "imageUrl": "",
      "isFavorite": false,
      "ingredients": [
        { "name": "食材名稱", "amount": "數量", "unit": "單位" }
      ],
      "seasonings": [
        { "name": "調味料名稱", "amount": "數量", "unit": "單位" }
      ],
      "steps": [
        { "step": 1, "description": "步驟說明" }
      ]
    }
  ]
}`;
    // 加入難易度偏好
    if (request.difficulty) {
        prompt += `\n\n使用者偏好難易度：${request.difficulty}`;
    }
    // 加入類型偏好
    if (request.category) {
        prompt += `\n使用者偏好料理類型：${request.category}`;
    }
    // 加入選擇的食材
    if (request.selectedIngredients && request.selectedIngredients.length > 0) {
        prompt += `\n使用者希望使用以下食材：${request.selectedIngredients.join("、")}`;
    }
    // 加入排除的食材
    if (request.excludeIngredients && request.excludeIngredients.length > 0) {
        prompt += `\n請避免使用以下食材：${request.excludeIngredients.join("、")}`;
    }
    prompt += "\n\n請使用繁體中文回應。步驟說明要詳細具體，包含時間和技巧提示。";
    return prompt;
}
// ===== JSON 解析輔助 =====
function parseJsonFromText(text) {
    console.log("[AI Recipe] Raw response length:", text.length);
    console.log("[AI Recipe] Raw response preview:", text.substring(0, 500));
    // 移除 code fence
    const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
    const raw = fence ? fence[1] : text;
    // 找出 JSON 物件
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const sliced = start !== -1 && end !== -1 && end > start ? raw.slice(start, end + 1) : raw;
    try {
        const parsed = JSON.parse(sliced);
        console.log("[AI Recipe] Parsed successfully, recipes count:", parsed.recipes?.length || 0);
        return parsed;
    }
    catch (err) {
        // 解析失敗，輸出詳細錯誤
        console.error("[AI Recipe] JSON parse error:", err.message);
        console.error("[AI Recipe] Failed to parse:", sliced.substring(0, 300));
        return {
            greeting: "抱歉，食譜生成時發生錯誤，請稍後再試。",
            recipes: [],
        };
    }
}
// ===== 主要 API 函式 =====
/**
 * 產生多個食譜推薦
 */
export async function generateMultipleRecipes(request, userId = "anonymous") {
    // 檢查查詢限制
    const remainingQueries = checkAndUpdateQueryLimit(userId);
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const systemPrompt = buildSystemPrompt(request);
    const userPrompt = request.prompt;
    // 設置逾時
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);
    try {
        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt + "\n\n使用者輸入：" + userPrompt }],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            },
        });
        clearTimeout(timeoutId);
        const text = result.response.text().trim();
        const parsed = parseJsonFromText(text);
        // 確保每個 recipe 都有 id
        let recipes = parsed.recipes.map((recipe) => ({
            ...recipe,
            id: recipe.id || generateRecipeId(),
            imageUrl: recipe.imageUrl || "",
            isFavorite: recipe.isFavorite ?? false,
        }));
        // 生成食譜圖片（非同步，不阻塞回應）
        try {
            recipes = await generateRecipeImages(recipes);
        }
        catch (imgErr) {
            console.warn("[AI Recipe] Image generation failed, using empty imageUrl");
        }
        return {
            status: true,
            message: "ok",
            data: {
                greeting: parsed.greeting,
                recipes,
                aiMetadata: {
                    generatedAt: new Date().toISOString(),
                    model: MODEL_NAME,
                },
                remainingQueries,
            },
        };
    }
    catch (err) {
        clearTimeout(timeoutId);
        console.error("[AI Recipe] Error occurred:", err.message);
        console.error("[AI Recipe] Error stack:", err.stack);
        if (err.name === "AbortError") {
            throw new AIRecipeError("AI_006");
        }
        // 如果已經是 AIRecipeError，直接重新拋出
        if (err instanceof AIRecipeError) {
            throw err;
        }
        throw new AIRecipeError("AI_005", { originalError: err.message });
    }
}
/**
 * SSE Streaming 生成食譜
 */
export async function* streamRecipe(request, userId = "anonymous") {
    const sessionId = uuidv4();
    const remainingQueries = checkAndUpdateQueryLimit(userId);
    // 發送開始事件
    yield {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: "start",
        data: {
            sessionId,
            model: MODEL_NAME,
        },
    };
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const systemPrompt = buildSystemPrompt(request);
    const userPrompt = request.prompt;
    try {
        const result = await model.generateContentStream({
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt + "\n\n使用者輸入：" + userPrompt }],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            },
        });
        let fullText = "";
        let chunkCount = 0;
        for await (const chunk of result.stream) {
            const text = chunk.text();
            fullText += text;
            chunkCount++;
            // 發送 chunk 事件
            yield {
                id: `evt-${Date.now()}-${chunkCount}`,
                timestamp: new Date().toISOString(),
                event: "chunk",
                data: {
                    text,
                    section: "greeting", // 簡化：可以根據內容判斷 section
                },
            };
            // 定期發送進度事件
            if (chunkCount % 5 === 0) {
                yield {
                    id: `evt-${Date.now()}-progress`,
                    timestamp: new Date().toISOString(),
                    event: "progress",
                    data: {
                        percent: Math.min(90, chunkCount * 10),
                        stage: "生成食譜中...",
                    },
                };
            }
        }
        // 解析完成的結果
        const parsed = parseJsonFromText(fullText);
        const recipes = parsed.recipes.map((recipe) => ({
            ...recipe,
            id: recipe.id || generateRecipeId(),
            imageUrl: recipe.imageUrl || "",
            isFavorite: recipe.isFavorite ?? false,
        }));
        // 發送完成事件
        yield {
            id: `evt-${Date.now()}-done`,
            timestamp: new Date().toISOString(),
            event: "done",
            data: {
                recipes,
                aiMetadata: {
                    generatedAt: new Date().toISOString(),
                    model: MODEL_NAME,
                },
                remainingQueries,
            },
        };
    }
    catch (err) {
        yield {
            id: `evt-${Date.now()}-error`,
            timestamp: new Date().toISOString(),
            event: "error",
            data: {
                code: "AI_005",
                message: err.message || "AI 服務暫時無法使用",
            },
        };
    }
}
// ===== 預設 Prompt 建議 =====
export const AI_SUGGESTION_PROMPTS = [
    "台灣感性的食物",
    "晚餐想吃日式",
    "聖誕節大餐",
    "想念泰國料理",
];
