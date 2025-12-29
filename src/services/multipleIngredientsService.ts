import type {
  MultipleIngredientsResult,
  IngredientRecognitionResult,
  MultipleIngredientItem,
} from "../types/imageAnalysis.js";
import { executeWithFallback } from "./modelClient.js";
import { cropImageByBoundingBox } from "../utils/imageCropper.js";
import { uploadToCloudinary } from "./mediaService.js";
import fs from "fs";

export type AnalyzeMultipleOptions = {
  cropImages?: boolean; // 預設 true
  maxIngredients?: number; // 預設 10
};

/**
 * 解析 Gemini 回傳的 JSON 字串
 */
function parseJsonFromText(text: string) {
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fence ? fence[1] : text;

  try {
    // 簡單的清理：嘗試抓取最外層的 {}
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const sliced =
      start !== -1 && end !== -1 && end > start
        ? raw.slice(start, end + 1)
        : raw;

    return JSON.parse(sliced);
  } catch (e) {
    console.error("[MultipleIngredients] JSON Parse Error:", e);
    // 如果解析失敗，嘗試修復常見的錯誤或直接拋出
    throw new Error("無法解析 AI 回傳的 JSON 格式");
  }
}

/**
 * 分析圖片中的多個食材
 * 1. 呼叫 AI 取得食材清單與座標
 * 2. (Opt) 裁切各食材圖片
 * 3. (Opt) 上傳裁切圖至 Cloudinary
 */
export const analyzeMultipleIngredients = async (
  imageSource: string | Buffer,
  options?: AnalyzeMultipleOptions
): Promise<MultipleIngredientsResult> => {
  const cropImages = options?.cropImages ?? true;
  const maxIngredients = options?.maxIngredients || 10;
  const todayDate = new Date().toISOString().split("T")[0];

  // 1. 準備圖片資料 for AI
  let base64Image: string;
  let mimeType = "image/jpeg"; // 預設，如果是 URL 可能需偵測但 Gemini 對 mimeType 寬容

  if (typeof imageSource === "string") {
    // 判斷是 URL 還是 本地路徑
    if (imageSource.startsWith("http")) {
      // URL: Fetch convert to base64
      const response = await fetch(imageSource);
      if (!response.ok)
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString("base64");
      mimeType = response.headers.get("content-type") || "image/jpeg";
    } else {
      // Local Path
      const imageBuffer = fs.readFileSync(imageSource);
      base64Image = imageBuffer.toString("base64");
    }
  } else {
    // Buffer
    base64Image = imageSource.toString("base64");
  }

  // 2. 建構 Prompt
  const prompt = `
你是一位專業的智慧廚房助理 API。
請依照以下步驟分析圖片：

### STEP 1: 情境判斷 (Mode Check)
首先，判斷圖片是「單一料理成品 (COOKED_DISH)」還是「食材清單 (GROCERY_LIST)」。

1.  **COOKED_DISH (單一料理)**: 圖片為已完成的料理（如一碗拉麵、一盤義大利麵）。
    *   **行為**: 僅回傳 **一個** 主要項目（料理名稱）。
    *   **不要裁切**: 不要嘗試分割食材。BoundingBox 請回傳整張圖片 (x:0, y:0, width:1, height:1)。
    *   **分類**: 依據該料理的主食材或屬性，強制歸類至下方 7 大嚴格分類之一。

2.  **GROCERY_LIST (食材清單)**: 圖片包含原始食材、包裝食品、冰箱內部。
    *   **行為**: 偵測並列出所有獨立食材。
    *   **過濾**: 忽略「基礎調味料」(鹽, 糖, 醬油, 水, 冰塊) 與「微量辛香料」(蔥花, 蒜末)。
    *   **分類**: 針對每個食材執行嚴格分類。

### STEP 2: 嚴格分類 (Strict Categories)
所有輸出項目 **必須** 歸類為以下 7 大類別 ID 之一 (請勿創造新 ID)：
- **fruit**: 蔬果類 (葉菜, 根莖, 水果, 菇類)
- **frozen**: 冷凍調理類 (水餃, 雞塊, 微波便當, 冰品)
- **bake**: 主食烘焙類 (米, 麵, 麵包, 堅果, 乾貨)
- **milk**: 乳品飲料類 (蛋, 奶, 優格, 起司, 飲品)
- **seafood**: 冷凍海鮮類 (魚, 蝦, 蟹, 貝)
- **meat**: 肉品類 (豬/牛/雞肉, 加工肉品)
- **others**: 乾貨醬料類 (特殊醬料/油品, 醃製品)

### STEP 3: 輸出格式
對於每一個辨識到的項目，請提供以下 JSON 資訊：
1. 產品資訊（名稱、分類、屬性、建議購買/庫存數量、單位）
2. 日期設定（購買日期、預估過期日期）
3. 儲存提醒（是否開啟低庫存提醒、提醒門檻）
4. **位置資訊**：邊界框座標 (x, y, width, height) 必須為 0-1 的相對比例。

輸出 JSON 範例：
{
  "ingredients": [
    {
      "productName": "紅燒牛肉麵",
      "category": "meat",
      "attributes": "熱食",
      "purchaseQuantity": 1,
      "unit": "碗",
      "purchaseDate": "${todayDate}",
      "expiryDate": "2025-12-30",
      "lowStockAlert": true,
      "lowStockThreshold": 1,
      "notes": "成品料理",
      "boundingBox": { "x": 0, "y": 0, "width": 1, "height": 1 },
      "confidence": 0.98
    }
  ]
}

規則：
- 座標 **必須** 是 0 到 1 之間的浮點數。
- 最多辨識 ${maxIngredients} 個項目。
- 語言使用繁體中文。
- 今天日期：${todayDate}。
`;

  // 3. 呼叫 Gemini Vision
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
  const parsedData = parseJsonFromText(text);

  // 檢查結構
  if (!parsedData || !Array.isArray(parsedData.ingredients)) {
    throw new Error("AI 回傳格式不符預期 (missing ingredients array)");
  }

  let ingredients: MultipleIngredientItem[] = parsedData.ingredients;

  // 基礎 URL (如果是 URL 輸入，就直接用；如果是檔案/Buffer，稍後可能需要上傳原圖或忽略)
  let originalImageUrl = "";
  if (typeof imageSource === "string" && imageSource.startsWith("http")) {
    originalImageUrl = imageSource;
  }

  // 4. 處理裁切與上傳
  // 為了進行裁切，我們需要完整的 Buffer
  if (cropImages) {
    let sourceBuffer: Buffer;
    if (typeof imageSource === "string") {
      if (imageSource.startsWith("http")) {
        const resp = await fetch(imageSource);
        const ab = await resp.arrayBuffer();
        sourceBuffer = Buffer.from(ab);
      } else {
        sourceBuffer = fs.readFileSync(imageSource);
      }
    } else {
      sourceBuffer = imageSource;
    }

    // 併發處理所有食材的裁切與上傳
    ingredients = await Promise.all(
      ingredients.map(async (item) => {
        try {
          // 修正座標格式：Gemini 有時會回傳 0-1000 的整數
          // 簡單判斷：如果任何值 > 1，則除以 1000
          const box = { ...item.boundingBox };
          if (box.x > 1 || box.y > 1 || box.width > 1 || box.height > 1) {
            box.x /= 1000;
            box.y /= 1000;
            box.width /= 1000;
            box.height /= 1000;
          }

          // 裁切
          const croppedBuffer = await cropImageByBoundingBox(sourceBuffer, box);

          // 上傳到 Cloudinary
          const uploadResult = await uploadToCloudinary(croppedBuffer);

          return {
            ...item,
            boundingBox: box, // 使用標準化後的座標
            imageUrl: uploadResult.secure_url,
          };
        } catch (err) {
          console.error(
            `[MultipleIngredients] Crop/Upload failed for ${item.productName}:`,
            err
          );
          // 如果失敗，保留原本 item，但 imageUrl 為空
          return item;
        }
      })
    );

    // 如果原圖還沒有 URL (例如上傳本地檔案)，也順便上傳原圖以便回傳
    if (!originalImageUrl) {
      try {
        const originUpload = await uploadToCloudinary(sourceBuffer);
        originalImageUrl = originUpload.secure_url;
      } catch (e) {
        console.warn(
          "[MultipleIngredients] Failed to upload original image:",
          e
        );
      }
    }
  }

  return {
    originalImageUrl,
    totalCount: ingredients.length,
    ingredients,
    analyzedAt: new Date().toISOString(),
  };
};
