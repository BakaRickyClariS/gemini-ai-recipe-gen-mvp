/**
 * AI 圖片生成服務
 * 使用 Gemini 2.5 Flash Image 模型生成食譜圖片
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
// ===== 圖片生成 =====
/**
 * 生成食譜圖片
 * @param recipeName 食譜名稱
 * @param category 料理類型
 * @returns Base64 圖片資料或 null
 */
export const generateRecipeImage = async (recipeName, category) => {
    try {
        const ai = getImageClient();
        // 根據料理類型決定容器風格
        const getContainerStyle = (cat) => {
            const styles = {
                "中式": "放在中式陶碗中",
                "台式": "放在中式陶碗中",
                "日式": "放在日式陶盤中",
                "西式": "放在白色瓷盤中",
                "義式": "放在棕色陶盤中",
                "泰式": "放在木質餐盤中",
                "韓式": "放在韓式石鍋或黑色陶碗中",
            };
            return styles[cat] || "放在精緻的陶瓷盤中";
        };
        const containerStyle = getContainerStyle(category);
        // 使用設計師提供的 prompt 格式
        const prompt = `a.核心-->${recipeName}主體、${containerStyle}、盤子周圍放1-2個相關材料擺設或餐具
b.風格-->食物攝影形象照、${category}風格、深色木紋背景、自然陽光、清新、俯視特寫`;
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
            config: {
                responseModalities: ["image", "text"],
            },
        });
        // 從回應中提取圖片
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
    }
    catch (err) {
        console.error("[ImageGen Error]", err.message);
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
            return {
                ...recipe,
                imageUrl: `data:${imageData.mimeType};base64,${imageData.base64}`,
            };
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
