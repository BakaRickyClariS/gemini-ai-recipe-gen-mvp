# 前端 V2 API 升級與修復指南

因應後端身分驗證機制的全面升級 (改採 HttpOnly JWT Cookie 配合 LINE 登入)，前端需要同步進行以下調整，以解決目前出現的 422 與 401 錯誤：

## 1. 修正通知 Token API 請求 (解決 422 錯誤)

**情境**：在呼叫 `POST /api/v2/notifications/token` 註冊 FCM Token 時，因為沒有正確夾帶 `Content-Type: application/json`，導致後端無法解析 Body 而拋出 422 錯誤。

**需要修改的地方**：
確保在使用 `fetch` 或 `axios` 等工具呼叫該 API 以及 `DELETE /api/v2/notifications/token` 時，**必須**包含 `Content-Type` Header：

```javascript
// 範例：
fetch("http://localhost:3000/api/v2/notifications/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // 'Authorization': 'Bearer ...' // 若仍有依賴 Header 傳遞的情況
  },
  body: JSON.stringify({
    fcmToken: "你的_token",
    platform: "web",
  }),
});
```

_(註：後端這邊我也會擴充 `express.json()` 以增加對 `text/plain` 的容錯，但前端主動標示正確格式是最佳實踐。)_

## 2. 將食譜 API 升級至 V2 (解決 401 錯誤)

**情境**：登入後自動執行 `seedDefaultRecipes` (儲存 AI 預設食譜) 失敗，且回傳 `401 Unauthorized`。這是因為前端仍在呼叫舊的 `/api/v1/recipes`，而該 V1 端點無法解讀 LINE 登入後發放的新版認證 Cookie。

**需要修改的地方**：
請將所有跟**我的食譜 (Saved Recipes)** 相關的 API 端點，從 `v1` 改為呼叫 `v2`。後端目前已準備直接將食譜系統升級：

- `GET /api/v1/recipes` ➡️ 右轉改用 `GET /api/v2/recipes`
- `POST /api/v1/recipes` ➡️ 右轉改用 `POST /api/v2/recipes`
- `PUT /api/v1/recipes/:id` ➡️ 右轉改用 `PUT /api/v2/recipes/:id`
- `DELETE /api/v1/recipes/:id` ➡️ 右轉改用 `DELETE /api/v2/recipes/:id`

(此 V2 路由套用了與其他模組如 Groups, Profile 一致的 JWT 驗證層。)

## 3. 群組 API 空資料時的畫面處理優化

**情境**：目前測試發現，當呼叫 `GET /api/v2/groups` 成功取得 `200` 狀態碼，但回傳為空陣列 `[]` 時 (例如剛用 LINE 登入的新帳號查無群組)，畫面會一直卡在 `Loading categories...`。

**需要修改的地方**：
前端應該攔截並處理 `[]` 的狀態，不要無限等待。建議可以：

- 當判斷使用者沒有群組時，顯示「尚未建立群組/冰箱」的空白佔位提示 (Empty State)。
- 或者自動引導/顯示建立新庫存群組的視窗。
