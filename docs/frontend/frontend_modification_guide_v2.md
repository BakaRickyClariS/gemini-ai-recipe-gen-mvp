# 前端修改建議書 (Frontend Modification Guide) - AI 食譜功能

> **日期**: 2025/12/30
> **對應變更**: AI 安全性升級與問題修復
> **優先級**: 高

為了配合後端進行的 AI 功能修復與安全升級，請前端團隊協助進行以下修改。

---

## 1. 型別定義更新 (Type Definitions)

後端已將 `imageUrl` 的定義修改為允許 `null`，以解決先前空字串導致的錯誤警告，並明確表示圖片生成失敗或未完成的狀態。

請同步更新前端的 TypeScript 介面 `RecipeListItem`：

```typescript
// [MODIFY] src/types/aiRecipe.ts (或前端對應檔案)

export interface RecipeListItem {
  id: string;
  name: string;
  category: string;
  
  // 修改：允許 null
  imageUrl: string | null; 
  
  servings: number;
  cookTime: number;
  isFavorite: boolean;
  difficulty?: "簡單" | "中等" | "困難";
  ingredients?: IngredientItem[];
  seasonings?: IngredientItem[];
  steps?: CookingStep[];
}
```

**UI 處理與效能建議**：
- **永久網址**：`imageUrl` 現在會回傳 Cloudinary 的永久 `https` 網址，不再回傳體積龐大的 Base64 字串，能有效提升前端載入效能。
- **預設圖片**：當 `imageUrl` 為 `null` 時（例如生成失敗或暫無圖片），請務必顯示預設的食譜佔位圖（Placeholder Image）。
- **快取優化**：Cloudinary URL 已包含版本資訊，前端可放心地進行快取處理。

---

## 2. 錯誤處理與安全提示 (Error Handling)

新增了 AI 安全防護層，當偵測到潛在的 **Prompt Injection** 攻擊或違規內容時，API 會回傳 `400 Bad Request` 與特定錯誤碼。

請在 AI 聊天介面或錯誤處理邏輯中，新增對 `AI_007` 錯誤碼的處理：

```typescript
// 錯誤回應範例
// {
//   "code": "AI_007",
//   "message": "Potential prompt injection detected."
// }

// 前端處理邏輯範例
if (error.code === 'AI_007') {
  showToast("輸入內容包含不允許的指令或關鍵字，請重新輸入。", "warning");
} else {
  // 其他錯誤處理...
}
```

---

## 3. 庫存食材選擇邏輯 (Inventory Selection)

為了確保 AI 能精確使用使用者希望消耗的食材，請遵循以下流程：

1. **主動夾帶**：不要依賴後端「自動讀取庫存」的隱式行為。
2. **流程建議**：
   - 呼叫 `GET /api/v1/refrigerators/{id}/inventory` 取得庫存列表。
   - 讓使用者勾選想要使用的食材。
   - 將勾選的食材名稱組成字串陣列 `string[]`。
   - 發送 `POST /api/v1/ai/recipe` 時，放入 `selectedIngredients` 欄位。

```typescript
// 請求範例
const requestBody = {
  prompt: "晚餐想吃清淡一點",
  selectedIngredients: ["雞胸肉", "花椰菜", "牛番茄"] // <-- 必須明確傳遞
};
```

---

## 4. Greeting 欄位顯示

後端已修正 System Prompt，強制 `greeting` 欄位回傳 **純文字**。

- **請移除**：前端任何嘗試解析 `greeting` JSON 的程式碼（例如 `JSON.parse(data.greeting)`）。
- **直接顯示**：直接將 API 回傳的 `data.greeting` 字串顯示在對話框中。

---

## 5. 輸入長度限制

為了配合後端安全策略：
- 建議前端在輸入框增加 `maxlength="4000"` 限制。
- 若使用者輸入超過 4000 字元，API 將會拒絕請求並回傳錯誤。

---

如有任何疑問，請聯繫後端開發團隊。
