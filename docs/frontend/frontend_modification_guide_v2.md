# 前端修改建議書 (Frontend Modification Guide) v2

> **日期**: 2025/12/30
> **對應變更**: AI 核心邏輯升級、Cloudinary 整合、安全防護、資料庫穩定性修復
> **狀態**: 已更新 (含 UUID 與 Cloudinary 穩定網址說明)

為了確保 AI 食譜功能穩定運作並配合後端最新的安全與生圖邏輯，請前端團隊協助更新以下項目。

---

## 1. 核心型別更新 (Critical Type Changes)

### 1.1 `imageUrl` 允許 `null`
為了避免先前空字串 `""` 導致的瀏覽器 `404` 警告，且明確表示「圖片生成中」或「生成失敗」狀態，`imageUrl` 型別已修改。
- **後端行為**：初始為 `null`，生成結束後更新為 `Cloudinary 網址`。
- **前端動作**：請更新 TS 介面，並在 UI 渲染時判斷 `imageUrl === null` 時顯示預設佔位圖。

### 1.2 `id` 格式變更 (UUID)
為了配合資料庫 PostgreSQL 的 `UUID` 型別約束，並解決前端快取導致圖片不更新的問題。
- **變更內容**：ID 現在是標準的 UUID (例如：`550e8400-e29b-41d4-a716-446655440000`)，不再包含 `ai-` 前綴。
- **前端動作**：請確保在渲染清單時使用此 `id` 作為 `key`。當 ID 改變時，前端會強制重新掛載組件，解決圖片「卡住」不更新的問題。

```typescript
// [MODIFY] 推薦的介面定義
export interface RecipeListItem {
  id: string; // 標準 UUID
  name: string;
  category: string;
  imageUrl: string | null; // 必填，但值可能為 null
  servings: number;
  cookTime: number;
  isFavorite: boolean;
  // ... 其他欄位保持不變
}
```

---

## 2. 圖片處理與效能 (Images)

- **穩定網址**：後端現在會自動將 Gemini 或 Unsplash 的圖片轉存至 Cloudinary。API 會直接回傳 `https` 的 Cloudinary 網址，不再回傳 Base64。
- **快取優化**：因為網址現在是固定的 HTTPS 連結，前端可以利用瀏覽器原生快取機制，大幅提升二次載入速度。

---

## 3. 搜尋與庫存邏輯 (Search & Inventory)

### 3.1 主動傳遞食材
API 不會「自動」讀取資料庫庫存，請前端遵循以下對話流程：
1. 先呼叫庫存 API 取得食材。
2. 讓使用者勾選。
3. 將勾選的名稱傳入 `selectedIngredients: string[]`。

### 3.2 搜尋精準度
後端已優化搜尋 Prompt。現在會根據 AI 生成的具體料理名稱（英文+中文）去搜尋備援相片（Unsplash），精準度已大幅提升。

---

## 4. 安全與錯誤處理 (Security)

### 4.1 Prompt Injection 攔截 (AI_007)
後端新增了安全過濾層。如果使用者輸入試圖修改 AI 規則的指令，會回傳 `400 Bad Request`。
- **錯誤碼**：`AI_007`
- **前端處理**：捕捉到此代碼時，建議跳出提示：「您的輸入包含不允許的指令，請嘗試更換描述。」

### 4.2 輸入長度限制
- **限制**：`prompt` 最大長度為 **4000** 字元。
- **建議**：在 `<textarea>` 增加 `maxlength="4000"`。

---

## 5. Greeting 欄位純文字化

- **重點**：`greeting` 欄位現在保證只會回傳「純文字」問候語。
- **Frontend Action**：請 **移除** 任何針對 `greeting` 進行 `JSON.parse` 的邏輯，直接將其渲染為 Markdown 或一般文字即可。

---

如有任何整合上的問題，請隨時通知後端工程師調整。
