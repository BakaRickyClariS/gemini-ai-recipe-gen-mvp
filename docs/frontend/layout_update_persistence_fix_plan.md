# 📝 後端修改規劃書：庫存設定 API 版型更新失敗 (`PUT /api/v2/groups/:groupId/inventory/settings`)

## 🚨 問題摘要

前台在 Settings 面板選擇了新的庫存版型 (如 `layout-b`) 並點擊「套用版型」後，API 回傳了 `200 OK` 以及 `{"success": true}`。但是，回傳的 JSON 卻顯示設定仍然是舊的 `layout-a`，且實際重新整理頁面後，版面毫無更動。這代表**前端收到了假象的成功，但後端資料庫並沒有真正更新或回傳最新的設定**。

## 🔍 錯誤根源推斷

這個問題通常發生在 Controller 或 Service 處理設定更新的邏輯中，可能的原因有：

1. **參數未對應 / 被過濾**：在從 `req.body` 取出資料去更新資料庫時，`layoutType` 這個欄位可能沒有被放進去更新列表中（可能被解構賦值的邏輯漏掉了，或是 ORM 層設定了唯讀）。
2. **舊物件參照問題**：更新資料庫後，回傳給前端的是「更新前」撈取的舊物件，或是單純回傳了 `req.body` 但沒有將原本設定中缺失的資料補齊，導致錯亂。
3. **Mongoose / Prisma 更新語法有誤**：使用了不會觸發重新返回更新後證明的寫法（例如 Mongoose 的 `findByIdAndUpdate` 忘了加 `{ new: true }`，導致回傳的是舊資料）。

## 🛠️ 對應修改步驟 (Action Items)

### 1. 檢查 Update Controller / Service 邏輯

請至處理庫存設定更新的邏輯中，確認是否有明確將 `layoutType` 寫入資料庫：

```typescript
// 錯誤範例：可能漏抓了 layoutType
const { categoryOrder, lowStockThreshold, expiringSoonDays } = req.body;
// => 少了 layoutType!

// 修正範例
const { layoutType, categoryOrder, lowStockThreshold, expiringSoonDays } =
  req.body;
```

### 2. 確保 ORM 回傳「更新後」的資料

如果使用的是 MongoDB (Mongoose)，在做 `findOneAndUpdate` 時，務必加上 `{ new: true }` 來確保回傳最新的文件：

```typescript
// 修正範例 (Mongoose)
const updatedSettings = await InventorySettings.findOneAndUpdate(
  { groupId: req.params.groupId },
  { $set: updatePayload },
  { new: true, upsert: true }, // 確保 new: true，才會把「更新後的最新資料」吐回來給前端
);

res.status(200).json({
  success: true,
  data: { settings: updatedSettings },
});
```

如果使用的是 Prisma：

```typescript
// 修正範例 (Prisma)
const updatedSettings = await prisma.inventorySettings.update({
  where: { groupId: req.params.groupId },
  data: updatePayload,
});
// Prisma 預設會回傳更新後的結果，請確認是拿這個結果回饋給前端。
```

### 3. 加入欄位驗證 (Zod / Joi) 檢查

請順便檢查該 Update API 的 Schema 驗證中，是否有將 `layoutType` 限制在正確的 Enum 中：

```typescript
layoutType: z.enum(['layout-a', 'layout-b', 'layout-c']).optional(),
```

並確定資料庫 Schema 模型（如 Mongoose Schema）中確實存在 `layoutType` 這個 String (或 Enum) 欄位。

---

> 這個問題如果修復了，前端的 Redux Store 接到回傳的最新的 `layoutType` 就能直接發生同步更新，實現畫面上「套用版型」的即時效果。
