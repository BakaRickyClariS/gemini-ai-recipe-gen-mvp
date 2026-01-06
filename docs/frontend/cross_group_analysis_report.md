# 跨群組通知分析報告

## 核心結論

後端目前的 `GET /notifications` API 其實已經支援跨群組查詢（它是基於 User ID，而非 Group ID）。

前端之所以覺得「只能看到當前群組」，可能有兩個原因：

1.  **前端自己在 UI 做了過濾**。
2.  **發送通知時漏掉了某些成員**（例如該成員沒有 `inventory_settings` 設定資料）。

## 調查結果

### 1. 前端 UI 過濾檢查

經檢查 `NotificationsPage.tsx` 與 `api/client.ts`，前端**並沒有**針對 `groupId` 進行任何主動過濾。`useNotificationsByCategoryQuery` 僅傳送 `category` 參數，顯示邏輯也僅依照日期分組。

### 2. 發送通知邏輯

目前我們已將入庫與消耗通知的發送方式統一改為傳送 `groupId`。
若後端的 `sendToRefrigeratorMembers` 邏輯是依賴查詢 `inventory_settings` 表格來找出群組成員，而某些成員尚未建立設定檔（例如新加入成員尚未開啟過庫存頁面），則可能導致這些成員收不到通知。

## 建議行動

1.  **確認原始資料**：前端應先確認 API 回傳的原始 JSON 資料 (`response.data.items`)。
2.  **後端邏輯調整**：如果確定前端收到的資料真的有少（即後端沒回傳），且確認非前端過濾問題，則建議後端檢查 `sendToRefrigeratorMembers` 的成員查詢邏輯，考慮將來源從 `inventory_settings` 改為 `user_refrigerators` (或 `UserGroups`)，以確保所有群組成員都能被正確撈取。
