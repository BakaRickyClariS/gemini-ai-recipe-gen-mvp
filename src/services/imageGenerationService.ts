/**
 * AI 圖片生成服務
 * 使用 Gemini 2.0 Flash Image 模型生成食譜圖片
 * Pollinations.ai 作為備用方案
 */

import { GoogleGenAI } from "@google/genai";
import { uploadToCloudinary } from "./mediaService.js";
import { config } from "../config/unifiedConfig.js";

const IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";

// ===== 輔助函式 =====

const getImageClient = () => {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

// 根據料理類型決定容器風格
const getContainerStyle = (category: string): string => {
  const styles: Record<string, string> = {
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
const getCategoryInEnglish = (category: string): string => {
  const categoryMap: Record<string, string> = {
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
const generateImageWithPollinations = (
  recipeName: string,
  category: string,
): string => {
  const containerStyle = getContainerStyle(category);
  const categoryEn = getCategoryInEnglish(category);

  // 構建更精確的英文描述 prompt
  // 使用中文名稱 + 料理類型來引導 AI 理解
  const prompt = `Professional food photography of ${categoryEn} cuisine dish "${recipeName}", ${containerStyle}, beautifully plated, dark wooden table background, natural soft lighting from window, fresh garnish, top-down overhead shot, high quality, appetizing, food magazine style, 4k, photorealistic`;

  const encodedPrompt = encodeURIComponent(prompt);

  // Pollinations.ai 圖片 URL（直接可用，無需 API Key）
  // 添加 seed 與 random 參數確保每次都是新圖片
  const seed = Math.floor(Math.random() * 1000000) + Date.now();
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
};

// ===== Gemini 圖片生成 =====

/**
 * 使用 Gemini 生成食譜圖片
 * @returns Base64 圖片資料或 null
 */
const generateImageWithGemini = async (
  recipeName: string,
  category: string,
): Promise<{ base64: string; mimeType: string } | null> => {
  const ai = getImageClient();

  const containerStyleCN: Record<string, string> = {
    中式: "放在中式陶碗中",
    台式: "放在中式陶碗中",
    日式: "放在日式陶盤中",
    西式: "放在白色瓷盤中",
    義式: "放在棕色陶盤中",
    泰式: "放在木質餐盤中",
    韓式: "放在韓式石鍋或黑色陶碗中",
  };
  const containerStyle = containerStyleCN[category] || "放在精緻的陶瓷盤中";

  // 加入隨機特徵以避免快取重複
  const randomFeatures = [
    "柔和光線",
    "自然光",
    "溫暖氛圍",
    "明亮風格",
    "高對比度",
  ][Math.floor(Math.random() * 5)];

  const prompt = `a.核心-->${recipeName}主體、${containerStyle}、盤子周圍放1-2個相關材料擺設或餐具
b.風格-->食物攝影形象照、${category}風格、深色木紋背景、${randomFeatures}、清新、俯視特寫、(unique_id_${Date.now()})`;

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
        base64: part.inlineData.data as string,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  console.warn("[ImageGen] No image data in response");
  return null;
};

// ===== Unsplash 最終備用方案 (搜尋真實照片) =====

/**
 * 從 Unsplash 搜尋高品質食物照片
 * 即使生成 API 都掛掉，也能保證有精美的圖片顯示
 */
const getUnsplashImage = async (
  recipeName: string,
  category: string,
): Promise<string | null> => {
  try {
    const accessKey = config.unsplash.accessKey;
    const categoryEn = getCategoryInEnglish(category);

    // 組合更具體的搜尋詞：料理類型 (英文) + 食譜名稱
    // 雖然食譜名稱是中文，但 Unsplash 的標籤系統有時能識別中文關鍵字
    const searchQuery = `${categoryEn} food ${recipeName}`;

    if (accessKey) {
      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
          searchQuery,
        )}&orientation=squarish&client_id=${accessKey}`,
      );
      if (response.ok) {
        const data = (await response.json()) as { urls?: { regular: string } };
        return data.urls?.regular || null;
      }
    }

    // 如果沒有 Key 或 API 失敗，使用 Source Redirect 作為最後手段
    const randomSig = Math.floor(Math.random() * 1000000);
    // 這裡我們將中文名稱也傳進去，增加精準度
    const searchTerm = `${categoryEn},food,${recipeName}`;
    return `https://source.unsplash.com/featured/800x800?${encodeURIComponent(searchTerm)}&sig=${randomSig}`;
  } catch (err) {
    console.warn("[ImageGen] Unsplash lookup failed");
    return null;
  }
};

// ===== 主要圖片生成函式（含備用方案）=====

/**
 * 生成食譜圖片（優先 Gemini，失敗時使用 Pollinations.ai）
 * @param recipeName 食譜名稱
 * @param category 料理類型
 * @returns 圖片 URL 或 Base64 Data URL 或 null
 */
export const generateRecipeImage = async (
  recipeName: string,
  category: string,
): Promise<{ base64: string; mimeType: string } | { url: string } | null> => {
  try {
    // 嘗試使用 Gemini
    const geminiResult = await generateImageWithGemini(recipeName, category);
    if (geminiResult) {
      console.log(`[ImageGen] Gemini success for: ${recipeName}`);
      return geminiResult;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ImageGen] Gemini failed: ${message}`);
  }

  // Gemini 失敗，使用 Pollinations.ai 備用方案
  try {
    const pollinationsUrl = generateImageWithPollinations(recipeName, category);
    console.log(`[ImageGen] Using Pollinations fallback for: ${recipeName}`);

    // 將 Pollinations 圖片上傳到 Cloudinary 以獲得永久網址
    const uploadResult = await uploadToCloudinary(pollinationsUrl);

    // 檢查是否又是那個 "Rate Limit" 的圖片 (Pollinations 額度滿了會回傳特定圖片)
    // 雖然難以從 URL 判斷，但如果真的遇到了，我們可以靠 Unsplash 救場
    console.log(
      `[ImageGen] Uploaded Pollinations image to Cloudinary: ${uploadResult.secure_url}`,
    );
    return { url: uploadResult.secure_url };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[ImageGen] Pollinations or Cloudinary upload failed: ${message}`,
    );
  }

  // 第三備用方案：Unsplash (搜尋真實照片)
  try {
    console.log(`[ImageGen] Using Unsplash fallback for: ${recipeName}`);
    const unsplashUrl = await getUnsplashImage(recipeName, category);
    if (unsplashUrl) {
      // 同樣上傳到 Cloudinary 確保網址一致性
      const uploadResult = await uploadToCloudinary(unsplashUrl);
      return { url: uploadResult.secure_url };
    }
  } catch (unsplashErr: unknown) {
    const message =
      unsplashErr instanceof Error ? unsplashErr.message : String(unsplashErr);
    console.error("[ImageGen] All fallbacks failed:", message);
  }

  return null;
};

/**
 * 批量生成多個食譜的圖片
 * @param recipes 食譜列表（需包含 name 和 category）
 * @returns 包含 imageUrl 的食譜列表
 */
export const generateRecipeImages = async <
  T extends { name: string; category: string; imageUrl?: string | null },
>(
  recipes: T[],
): Promise<T[]> => {
  const results = await Promise.allSettled(
    recipes.map(async (recipe) => {
      const imageData = await generateRecipeImage(recipe.name, recipe.category);
      if (imageData) {
        try {
          // 判斷是 base64 格式還是 URL 格式
          if ("url" in imageData) {
            // 已經是 URL (在 generateRecipeImage 中已處理過 Cloudinary 上傳)
            return {
              ...recipe,
              imageUrl: imageData.url,
            };
          } else {
            // Gemini 回傳的 base64，轉 Buffer 上傳至 Cloudinary
            const buffer = Buffer.from(imageData.base64, "base64");
            const uploadResult = await uploadToCloudinary(buffer);
            console.log(
              `[ImageGen] Uploaded Gemini image to Cloudinary: ${uploadResult.secure_url}`,
            );

            return {
              ...recipe,
              imageUrl: uploadResult.secure_url,
            };
          }
        } catch (uploadErr: unknown) {
          const message =
            uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          console.error(`[ImageGen] Cloudinary upload failed: ${message}`);
          // 如果上傳失敗，嘗試回傳原始 Base64 作為備用（雖然這在大流量下不理想）
          if ("base64" in imageData) {
            return {
              ...recipe,
              imageUrl: `data:${imageData.mimeType};base64,${imageData.base64}`,
            };
          }
        }
      }
      return recipe;
    }),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.warn(`[ImageGen] Failed for recipe ${recipes[index].name}`);
    return recipes[index];
  });
};
