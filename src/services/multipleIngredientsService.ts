import type { MultipleIngredientsResult, IngredientRecognitionResult, MultipleIngredientItem } from '../types/imageAnalysis.js';
import { executeWithFallback } from './modelClient.js';
import { cropImageByBoundingBox } from '../utils/imageCropper.js';
import { uploadToCloudinary } from './mediaService.js';
import fs from 'fs';

export type AnalyzeMultipleOptions = {
  cropImages?: boolean;    // 預設 true
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
    const sliced = start !== -1 && end !== -1 && end > start ? raw.slice(start, end + 1) : raw;
    
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
  const todayDate = new Date().toISOString().split('T')[0];

  // 1. 準備圖片資料 for AI
  let base64Image: string;
  let mimeType = "image/jpeg"; // 預設，如果是 URL 可能需偵測但 Gemini 對 mimeType 寬容

  if (typeof imageSource === 'string') {
     // 判斷是 URL 還是 本地路徑
     if (imageSource.startsWith('http')) {
       // URL: Fetch convert to base64
       const response = await fetch(imageSource);
       if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
       const arrayBuffer = await response.arrayBuffer();
       base64Image = Buffer.from(arrayBuffer).toString('base64');
       mimeType = response.headers.get("content-type") || "image/jpeg";
     } else {
       // Local Path
       const imageBuffer = fs.readFileSync(imageSource);
       base64Image = imageBuffer.toString('base64');
     }
  } else {
    // Buffer
    base64Image = imageSource.toString('base64');
  }

  // 2. 建構 Prompt
  const prompt = `
你是一位專業的食材辨識助理。請分析圖片中的**所有食材或食物**。

對於每一個辨識到的食材，請提供以下資訊：
1. 產品資訊（名稱、分類、屬性、建議購買數量、單位）
2. 日期設定（購買日期、預估過期日期）
3. 儲存提醒（是否開啟低庫存提醒、提醒門檻）
4. **位置資訊**：該食材在圖片中的邊界框座標

輸出格式（僅輸出 JSON，不要其他文字）：

{
  "ingredients": [
    {
      "productName": "番茄",
      "category": "蔬果類",
      "attributes": "新鮮類",
      "purchaseQuantity": 3,
      "unit": "顆",
      "purchaseDate": "2025-12-28",
      "expiryDate": "2026-01-04",
      "lowStockAlert": true,
      "lowStockThreshold": 2,
      "notes": "新鮮度佳，冷藏保存",
      "boundingBox": {
        "x": 128,
        "y": 128,
        "width": 128,
        "height": 128
      },
      "confidence": 0.95
    }
  ]
}

規則：
- 如果圖片大於 1000x1000，座標請使用 0-1000 的整數比例；如果小於，請使用 0-1 的小數比例。**建議統一輸出 0-1 的相對比例（小數）**，方便後續處理。
- 請明確確保 boundingBox 的 x, y, width, height 都是 0 到 1 之間的浮點數（代表相對於原圖的比例）。
- 最多辨識 ${maxIngredients} 個主要食材。
- 依照信心度由高到低排序。
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
  if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
    originalImageUrl = imageSource;
  }

  // 4. 處理裁切與上傳
  // 為了進行裁切，我們需要完整的 Buffer
  if (cropImages) {
    let sourceBuffer: Buffer;
    if (typeof imageSource === 'string') {
        if (imageSource.startsWith('http')) {
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
    ingredients = await Promise.all(ingredients.map(async (item) => {
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
          imageUrl: uploadResult.secure_url
        };
      } catch (err) {
        console.error(`[MultipleIngredients] Crop/Upload failed for ${item.productName}:`, err);
        // 如果失敗，保留原本 item，但 imageUrl 為空
        return item;
      }
    }));
    
    // 如果原圖還沒有 URL (例如上傳本地檔案)，也順便上傳原圖以便回傳
    if (!originalImageUrl) {
        try {
            const originUpload = await uploadToCloudinary(sourceBuffer);
            originalImageUrl = originUpload.secure_url;
        } catch (e) {
            console.warn("[MultipleIngredients] Failed to upload original image:", e);
        }
    }
  }

  return {
    originalImageUrl,
    totalCount: ingredients.length,
    ingredients,
    analyzedAt: new Date().toISOString()
  };
};
