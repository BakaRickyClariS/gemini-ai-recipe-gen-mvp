# 推播通知 API 整合待確認事項

> 📅 建立日期：2026-01-01  
> 📋 目的：前端整合 AI 後端推播通知 API 時發現的問題與建議

---

## 1. 通知設定欄位名稱對應

前端現有型別定義與新指南欄位名稱不一致，請確認後端實際使用的欄位名稱：

| 新指南欄位 | 前端現有欄位 | 請確認後端實際欄位 |
|-----------|-------------|------------------|
| `notifyPush` | `enablePush` | ✅ **以 `notifyPush` 為準** |
| `notifyExpiry` | `notifyOnExpiry` | ✅ **以 `notifyExpiry` 為準** |
| `notifyMarketing` | `enableEmail` | ✅ **以 `notifyMarketing` 為準** |

> [!IMPORTANT]
> 後端資料庫欄位為 `notify_push`、`notify_expiry`、`notify_marketing`，API 回傳時會轉換為 camelCase。請前端配合調整型別定義。

### 前端額外使用的欄位

下列欄位在前端已定義，但新指南未提及，請確認是否支援：

- `notifyOnLowStock: boolean` — 低庫存提醒開關
- `daysBeforeExpiry: number` — 過期提醒天數

> [!NOTE]
> **後端回覆：**
> - `notifyOnLowStock`: ⚠️ **目前尚未支援**，規劃中。若前端急需，可提 Issue 優先處理。
> - `daysBeforeExpiry`: ⚠️ **目前尚未支援**，預設為 3 天。若需自訂天數，請於 Issue 說明需求。

---

## 2. `/send` API 觸發責任歸屬

新指南提供 `POST /api/v1/notifications/send` 讓前端主動發送通知。

**問題**：前端是否需要在以下事件發生時主動呼叫此 API？還是後端會自動處理？

| 事件類型 | 前端呼叫？ | 後端自動？ |
|---------|----------|----------|
| 食材入庫 | ✅ 前端呼叫 | ❌ |
| 食材消耗 | ✅ 前端呼叫 | ❌ |
| 食材過期提醒 | ❌ | ✅ 後端 Cron Job |
| 低庫存提醒 | ❌ | ✅ 後端 Cron Job (規劃中) |
| 群組成員加入/退出 | ✅ 前端呼叫 | ❌ |
| 購買清單建立/更新 | ✅ 前端呼叫 | ❌ |

> [!NOTE]
> **後端回覆：**
> - **「食材入庫」、「食材消耗」、「群組成員變更」、「購買清單變更」** → 這些事件由前端觸發，因此需要前端主動呼叫 `/send` API 來通知群組成員。
> - **「食材過期提醒」** → 由後端 Cron Job 每日 08:00 (UTC) 自動檢查並發送，無需前端觸發。
> - **「低庫存提醒」** → 規劃中，未來會與過期提醒一樣由後端 Cron Job 自動處理。
> 
> **設計理由**：前端觸發的事件由前端呼叫 `/send`，可確保通知訊息內容由前端控制（如使用者名稱、食材名稱等），更靈活且貼近 UI 文案。

---

## 3. 通知列表回應格式

請確認 `GET /api/v1/notifications` 回傳的資料結構：

```typescript
// 後端實際回傳格式
{
  "id": "uuid",
  "type": "inventory",        // ✅ 以 inventory | group | shopping | system 為準
  "title": "食材過期提醒",
  "message": "雞蛋即將過期...", // ✅ 使用 `message`
  "isRead": false,
  "action": {                  // ✅ 使用合併物件格式
    "type": "inventory",
    "payload": { "refrigeratorId": "xxx" }
  },
  "createdAt": "2026-01-01T08:00:00Z"
}
```

### 需確認項目

1. **`type` 欄位值**：指南使用 `inventory | group | shopping | system`，前端現有 `stock | shared | system`，請問以何者為準？
   > ✅ **後端回覆：以 `inventory | group | shopping | system` 為準**，請前端配合修改。

2. **訊息內容欄位名**：使用 `message` 還是 `body`？
   > ✅ **後端回覆：使用 `message`**（對應資料庫 `message` 欄位）

3. **動作格式**：`action` 是一個物件還是拆成 `actionType` + `actionPayload`？
   > ✅ **後端回覆：使用合併物件 `action: { type, payload }`**

---

## 4. 分頁參數格式

`GET /api/v1/notifications?page=1&limit=20`

請確認：
- `page` 是否從 1 開始？
   > ✅ **後端回覆：是，`page` 從 1 開始**
- 回傳是否包含 `total` 總數與 `unreadCount` 未讀數？
   > ⚠️ **後端回覆：目前尚未包含 `total` 與 `unreadCount`**，若前端需要可提 Issue，後端會新增。

---

## 5. 認證方式確認

新指南使用 `X-User-Id` header：

```
Headers: { "X-User-Id": "user-uuid" }
```

請確認：
- 是否需要同時帶 `Authorization: Bearer <token>`？
   > ✅ **後端回覆：目前 AI 後端不強制驗證 JWT Token**，僅需帶 `X-User-Id` 即可。但建議前端同時帶 `Authorization` header 以便未來擴充安全驗證。
- `X-User-Id` 的值應為 Firebase UID 還是後端用戶 UUID？
   > ✅ **後端回覆：使用 Firebase UID**（即前端 `auth.currentUser.uid`）。後端 `users` 表的主鍵 `id` 欄位預期接收 Firebase UID。

---

## 後端回覆摘要

| 待辦項目 | 狀態 |
|---------|------|
| 欄位名稱統一 | ✅ 已確認，請前端以指南為準 |
| 低庫存設定欄位 `notifyOnLowStock` | ✅ 已實作為 `notifyLowStock` |
| 過期天數設定 `daysBeforeExpiry` | ✅ 已實作，預設值 3 天 |
| 分頁回傳 `total` / `unreadCount` | ✅ 已實作 |

如有其他問題，歡迎追問或開 Issue 討論！
