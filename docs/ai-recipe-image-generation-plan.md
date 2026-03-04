# 後端修改規劃書：AI 食譜圖片生成

**版本**: v1.0  
**日期**: 2026-03-04  
**狀態**: 待實作  
**相關規格**: [`ai_recipe_api_spec.md`](./ai_recipe_api_spec.md)

---

## 問題描述

目前 `/api/v1/ai/recipe` 和 `/api/v1/ai/recipe/stream` 回傳的食譜中，`imageUrl` 欄位一律為空字串或 `null`。

規格文件已定義後端應該：

1. **食譜生成完成後**，對每道食譜呼叫 Gemini 2.0 Flash Image 生成對應圖片
2. 將圖片以 **Base64 Data URL** 或上傳 Cloudinary 後回傳 **HTTPS URL**
3. 在 `done` 事件（SSE）與標準回應的 `imageUrl` 欄位填入結果

前端現在的行為已改為：**點擊 AI 食譜卡片 → 去後端 fetch 完整食譜（含 imageUrl）**，所以後端如果能在儲存時同步 `imageUrl`，前端就能正確顯示圖片。

---

## 需要修改的地方

### 1. AI 食譜生成服務（核心修改）

**位置**：AI 食譜生成邏輯（`/api/v1/ai/recipe` 和 `/api/v1/ai/recipe/stream`）

**修改**：Gemini 文字生成完成取得食譜陣列後，對每道食譜非同步生成圖片。

```typescript
/**
 * 圖片生成 Prompt 格式（依照設計規格）
 */
function buildImagePrompt(recipeName: string, category: string): string {
  const containerMap: Record<string, string> = {
    中式: '中式陶碗',
    台式: '中式陶碗',
    日式: '日式陶盤',
    西式: '白色瓷盤',
    義式: '棕色陶盤',
    泰式: '木質餐盤',
    韓式: '韓式石鍋或黑色陶碗',
  };

  const container = containerMap[category] || '白色瓷盤';

  return [
    `a.核心-->${recipeName}主體、放在${container}中、盤子周圍放1-2個相關材料擺設或餐具`,
    `b.風格-->食物攝影形象照、${category}風格、深色木紋背景、自然陽光、清新、俯視特寫`,
  ].join('\n');
}

/**
 * 呼叫 Gemini 2.0 Flash Image 生成食譜圖片
 * 失敗時回傳 null（不中斷主流程）
 */
async function generateRecipeImage(
  recipeName: string,
  category: string,
): Promise<string | null> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = buildImagePrompt(recipeName, category);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: prompt,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err) {
    console.error(`[AI Image] 圖片生成失敗 (${recipeName}):`, err);
    return null; // 失敗不中斷主流程
  }
}
```

**整合點**：在食譜文字生成完成後，批次並行生成圖片（`Promise.all`），然後把 `imageUrl` 填入每道食譜再回傳。

```typescript
// 文字生成完後
const recipes = parseRecipesFromGeminiOutput(geminiText);

// 並行生成圖片（不等待單張完成即可，但要 all settle）
const imageUrls = await Promise.allSettled(
  recipes.map((r) => generateRecipeImage(r.name, r.category)),
);

// 填入 imageUrl，失敗個別設為 null
const recipesWithImages = recipes.map((r, i) => ({
  ...r,
  imageUrl: imageUrls[i].status === 'fulfilled' ? imageUrls[i].value : null,
}));
```

---

### 2. 食譜儲存 API（`POST /api/v1/recipes`）

**問題**：目前前端存食譜時 `imageUrl` 傳入 `null`，後端存入 null，之後 fetch 也回傳 null。

**修改**：兩種方案，擇一實作：

#### 方案 A（建議）：圖片由 AI 生成端填入，存 Cloudinary URL

在 AI 生成階段完成圖片生成後，將圖片上傳至 Cloudinary，回傳 HTTPS URL（而非 Base64，避免 DB 存太大的字串）。

```typescript
// 上傳圖片到 Cloudinary
async function uploadImageToCloudinary(
  base64DataUrl: string,
): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(base64DataUrl, {
      folder: 'fufood/recipes',
      transformation: [{ width: 600, height: 600, crop: 'fill' }],
    });
    return result.secure_url;
  } catch (err) {
    console.error('[Cloudinary] 上傳失敗:', err);
    return null;
  }
}
```

流程：  
`Gemini 文字生成` → `Gemini 圖片生成 (Base64)` → `Cloudinary 上傳` → 回傳 HTTPS URL → 前端 save 時帶入 `imageUrl`

#### 方案 B（快速）：存 Base64 Data URL 進 DB

- 優點：不依賴 Cloudinary
- 缺點：DB 資料量大（每張圖約 200-500KB），效能差
- **不建議用於生產環境**

---

### 3. SSE 流程調整

**現況**：`done` 事件的 `recipes[]` 中 `imageUrl` 為空。

**修改**：在 SSE 流程中，文字 streaming 結束後，非同步生成圖片，然後才發送 `done` 事件。

```
[進度 progress: 90% - "生成食譜圖片中..."]
→ 並行呼叫圖片生成 (最多等 10 秒)
→ [done event: recipes[] 含有 imageUrl]
```

可以加一個超時保護：如果圖片生成超過指定時間就跳過（`imageUrl: null`），不讓使用者等太久。

```typescript
const IMAGE_GENERATION_TIMEOUT_MS = 10_000;

const imageResults = await Promise.allSettled(
  recipes.map((r) =>
    Promise.race([
      generateRecipeImage(r.name, r.category),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), IMAGE_GENERATION_TIMEOUT_MS),
      ),
    ]),
  ),
);
```

---

## 回傳格式確認（無須改動 API 欄位）

`imageUrl` 欄位本來就存在，只是從空字串改為實際 URL：

```json
{
  "imageUrl": "https://res.cloudinary.com/fufood/image/upload/v.../recipe.jpg"
}
```

或 Base64（方案 B）：

```json
{
  "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
```

---

## 環境變數（確認已設定）

| 變數             | 說明                | 備註                  |
| ---------------- | ------------------- | --------------------- |
| `GEMINI_API_KEY` | Gemini API 金鑰     | 圖片生成用同一把 key  |
| `CLOUDINARY_URL` | Cloudinary 連線字串 | 如果走方案 A 必須設定 |

---

## 預期效果

| 狀況                  | 修改前   | 修改後                           |
| --------------------- | -------- | -------------------------------- |
| AI 生成食譜後點擊卡片 | No Image | 顯示 Gemini 生成的食物圖片       |
| 食譜列表中的 AI 食譜  | No Image | 顯示圖片縮圖                     |
| 圖片生成失敗時        | No Image | No Image（不影響功能，僅記 log） |

---

## 實作順序建議

1. **先測試** Gemini 2.0 Flash Image 是否可用（試打一個 prompt）
2. 實作 `generateRecipeImage` 函式並加上 10 秒 timeout
3. 若走方案 A：整合 Cloudinary 上傳（參考 [`cloudinary_migration_guide.md`](./cloudinary_migration_guide.md)）
4. 接到食譜生成流程（非 SSE 先，SSE 後），測試回傳含 `imageUrl` 的食譜
5. 確認 `POST /api/v1/recipes` 儲存時 `imageUrl` 也帶進來（目前前端已正確帶入，若後端存的就有 URL 就自然解決）

---

## 相關文件

- [ai_recipe_api_spec.md](./ai_recipe_api_spec.md) — 完整 AI 圖片生成規格（§AI 圖片生成）
- [cloudinary_migration_guide.md](./cloudinary_migration_guide.md) — Cloudinary 整合指南
- [ai_media_api_spec.md](./ai_media_api_spec.md) — 媒體上傳 API
