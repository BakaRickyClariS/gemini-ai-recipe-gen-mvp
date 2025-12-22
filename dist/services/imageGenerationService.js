/**
 * AI 圖片生成服務
 * 使用 Gemini 2.0 Flash Image 模型生成食譜圖片
 * Pollinations.ai 作為備用方案
 */
import { GoogleGenAI } from "@google/genai";
const IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
// ===== 輔助函式 =====
const getImageClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY");
    }
    return new GoogleGenAI({ apiKey });
};
// 根據料理類型決定容器風格
const getContainerStyle = (category) => {
    const styles = {
        中式: "in a Chinese ceramic bowl",
        台式: "in a Chinese ceramic bowl",
        日式: "in a Japanese ceramic plate",
        西式: "on a white porcelain plate",
        義式: "on a brown ceramic plate",
        泰式: "on a wooden tray",
        韓式: "in a Korean stone pot or black ceramic bowl",
    };
    return styles[category] || "on an elegant ceramic plate";
};
// ===== Pollinations.ai 備用方案 =====
/**
 * 將中文料理類型轉換為英文
 */
const getCategoryInEnglish = (category) => {
    const categoryMap = {
        中式: "Chinese",
        台式: "Taiwanese",
        日式: "Japanese",
        西式: "Western",
        義式: "Italian",
        泰式: "Thai",
        韓式: "Korean",
    };
    return categoryMap[category] || "Asian";
};
/**
 * 使用 Pollinations.ai 生成圖片 URL（免費，無需 API Key）
 */
const generateImageWithPollinations = (recipeName, category) => {
    const containerStyle = getContainerStyle(category);
    const categoryEn = getCategoryInEnglish(category);
    // 構建更精確的英文描述 prompt
    // 使用中文名稱 + 料理類型來引導 AI 理解
    const prompt = `Professional food photography of ${categoryEn} cuisine dish "${recipeName}", ${containerStyle}, beautifully plated, dark wooden table background, natural soft lighting from window, fresh garnish, top-down overhead shot, high quality, appetizing, food magazine style, 4k, photorealistic`;
    const encodedPrompt = encodeURIComponent(prompt);
    // Pollinations.ai 圖片 URL（直接可用，無需 API Key）
    // 添加 seed 參數確保每次都是新圖片
    const seed = Date.now();
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
};
// ===== Gemini 圖片生成 =====
/**
 * 使用 Gemini 生成食譜圖片
 * @returns Base64 圖片資料或 null
 */
const generateImageWithGemini = async (recipeName, category) => {
    const ai = getImageClient();
    const containerStyleCN = {
        中式: "放在中式陶碗中",
        台式: "放在中式陶碗中",
        日式: "放在日式陶盤中",
        西式: "放在白色瓷盤中",
        義式: "放在棕色陶盤中",
        泰式: "放在木質餐盤中",
        韓式: "放在韓式石鍋或黑色陶碗中",
    };
    const containerStyle = containerStyleCN[category] || "放在精緻的陶瓷盤中";
    const prompt = `a.核心-->${recipeName}主體、${containerStyle}、盤子周圍放1-2個相關材料擺設或餐具
b.風格-->食物攝影形象照、${category}風格、深色木紋背景、自然陽光、清新、俯視特寫`;
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: prompt,
        config: {
            responseModalities: ["image", "text"],
        },
    });
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        console.warn("[ImageGen] No candidates in response");
        return null;
    }
    const parts = candidates[0].content?.parts;
    if (!parts) {
        console.warn("[ImageGen] No parts in response");
        return null;
    }
    for (const part of parts) {
        if (part.inlineData) {
            return {
                base64: part.inlineData.data,
                mimeType: part.inlineData.mimeType || "image/png",
            };
        }
    }
    console.warn("[ImageGen] No image data in response");
    return null;
};
// ===== 主要圖片生成函式（含備用方案）=====
/**
 * 生成食譜圖片（優先 Gemini，失敗時使用 Pollinations.ai）
 * @param recipeName 食譜名稱
 * @param category 料理類型
 * @returns 圖片 URL 或 Base64 Data URL
 */
export const generateRecipeImage = async (recipeName, category) => {
    try {
        // 嘗試使用 Gemini
        const geminiResult = await generateImageWithGemini(recipeName, category);
        if (geminiResult) {
            console.log(`[ImageGen] Gemini success for: ${recipeName}`);
            return geminiResult;
        }
    }
    catch (err) {
        console.warn(`[ImageGen] Gemini failed: ${err.message}`);
    }
    // Gemini 失敗，使用 Pollinations.ai 備用方案
    try {
        const pollinationsUrl = generateImageWithPollinations(recipeName, category);
        console.log(`[ImageGen] Using Pollinations fallback for: ${recipeName}`);
        return { url: pollinationsUrl };
    }
    catch (err) {
        console.error("[ImageGen] Pollinations also failed:", err.message);
        return null;
    }
};
/**
 * 批量生成多個食譜的圖片
 * @param recipes 食譜列表（需包含 name 和 category）
 * @returns 包含 imageUrl 的食譜列表
 */
export const generateRecipeImages = async (recipes) => {
    const results = await Promise.allSettled(recipes.map(async (recipe) => {
        const imageData = await generateRecipeImage(recipe.name, recipe.category);
        if (imageData) {
            // 判斷是 base64 格式還是 URL 格式
            if ("url" in imageData) {
                // Pollinations.ai 回傳的 URL
                return {
                    ...recipe,
                    imageUrl: imageData.url,
                };
            }
            else {
                // Gemini 回傳的 base64
                return {
                    ...recipe,
                    imageUrl: `data:${imageData.mimeType};base64,${imageData.base64}`,
                };
            }
        }
        return recipe;
    }));
    return results.map((result, index) => {
        if (result.status === "fulfilled") {
            return result.value;
        }
        console.warn(`[ImageGen] Failed for recipe ${recipes[index].name}`);
        return recipes[index];
    });
};
