# AI 安全回應優化規劃書 (Graceful Error Handling)

## 1. 目標

當 AI 因為安全性規則（System Prompt 指令）拒絕回答並回傳 `{"error": "..."}` 格式時，後端應能正確解析並將該訊息轉化為前端可友善顯示的 `greeting` 欄位，而非直接導致伺服器報錯 (500) 或串流中斷。

## 2. 後端修改方案 (src/services/aiRecipeService.ts)

### 2.1 修改 `parseJsonFromText`

- **邏輯調整**：解析 JSON 後，檢查是否存在 `error` 欄位。
- **處理方式**：
  - 若存在 `error`，則回傳 `{ greeting: parsed.error, recipes: [] }`。
  - 這能確保後續程式碼在讀取 `.recipes` 時不會因為是 undefined 而崩潰。

### 2.2 修改 `generateMultipleRecipes` 的解析檢查

- **邏輯調整**：目前的程式碼在 `recipes.length === 0` 時會拋出錯誤觸發重新嘗試。
- **優化**：如果解析結果包含有效的 `greeting` 但 `recipes` 為空，應視為「AI 拒絕服務」的正確回應，直接回傳給使用者。

## 3. 給前端的對接指南

### 3.1 正常模式 (Non-Streaming)

當收到 `status: true` 且 `data.recipes` 為空陣列時，請直接顯示 `data.greeting` 的內容。

**回應範例：**

```json
{
  "status": true,
  "data": {
    "greeting": "抱歉，我只能協助您處理食譜相關的問題。",
    "recipes": [],
    "aiMetadata": { ... }
  }
}
```

### 3.2 串流模式 (SSE Streaming)

在 `done` 事件中，請檢查 `recipes` 陣列。若為空，則顯示先前的 `chunk` 文字內容（或根據 `done` 事件中的邏輯顯示最終訊息）。

## 4. 驗證情境

- **觸發條件**：問 AI 政治、暴力或要求顯示 System Prompt。
- **預期結果**：前端顯示「抱歉，我只能協助您處理食譜相關的問題。」，而非出現「伺服器錯誤」的紅字。
