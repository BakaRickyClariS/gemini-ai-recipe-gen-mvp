// 手動驗證腳本：模擬 API 失敗並確保 Fallback 機制運作正常
import { generateRecipeImage } from "../src/services/imageGenerationService.js";
import { config } from "../src/config/unifiedConfig.js";

async function run() {
  console.log("=== 開始手動驗證 Image Generation Fallback ===");

  // 故意給一個無效的 API Key 來測試 Gemini 失敗後的 Fallback
  process.env.GEMINI_API_KEY = "invalid_key_for_testing";
  console.log("1. 模擬 Gemini 失敗 (使用無效 Key)...");

  try {
    const result = await generateRecipeImage("三杯雞", "台式");
    console.log("生成結果:", JSON.stringify(result, null, 2));

    if (result && "url" in result && result.url.includes("cloudinary")) {
      console.log("✅ 驗證成功：成功取得 Cloudinary URL！");
    } else {
      console.log("❌ 驗證失敗：未取得預期的 Cloudinary URL");
    }
  } catch (err) {
    console.error("❌ 測試過程中發生未預期的錯誤:", err);
  }

  process.exit(0);
}

run();
