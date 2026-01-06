# 後端通知系統建議書

> **日期**：2026-01-07  
> **前端團隊**：FuFood

---

## 📋 摘要

前端在進行通知系統優化時，發現以下問題需要與後端協調解決。

---

## 🔴 問題一：重複通知

### 現象

- 消耗一項食材會產生 **7 則以上的通知**
- 後端資料庫中同時出現兩種類型的通知：
  - `stock` 類型（後端發送）
  - `inventory` 類型（前端發送）

### 原因分析

| 來源 | type        | group_name | actor_name | 問題             |
| ---- | ----------- | ---------- | ---------- | ---------------- |
| 後端 | `stock`     | NULL       | NULL       | ❌ 缺少 metadata |
| 前端 | `inventory` | FuFuX教授  | 楊學民     | ✓ 有 metadata    |

### 建議

**選項 A（推薦）：後端停止發送消耗/入庫通知**

- 前端已經在發送完整的通知，後端無需重複發送
- 這樣可以避免重複通知，且確保 metadata 正確

**選項 B：後端統一處理所有通知**

- 前端可以移除通知發送邏輯
- 但需要後端在發送通知時正確設置：
  - `group_name`：群組名稱
  - `actor_name`：操作者名稱
  - `actor_id`：操作者 UID

---

## 🔴 問題二：通知 Metadata 缺失

### 現象

通知頁面顯示「[我的冰箱]」而非正確的群組名稱，且無使用者名稱。

### 後端需要確保的欄位

在發送通知時，請確保包含以下欄位：

```json
{
  "type": "inventory",
  "sub_type": "consume", // 或 "stockIn"
  "title": "...",
  "body": "...",
  "group_id": "refrigerator-uuid",
  "group_name": "FuFuX教授", // ⬅️ 必須填寫
  "actor_name": "楊學民", // ⬅️ 必須填寫
  "actor_id": "user-firebase-uid", // ⬅️ 必須填寫
  "action": {
    "type": "inventory",
    "payload": {
      "refrigeratorId": "refrigerator-uuid"
    }
  }
}
```

---

## 🟡 問題三：通知類型不一致

### 現象

- 後端發送 `stock` 類型
- 前端發送 `inventory` 類型
- 通知頁面「食材管家」tab 過濾 `stock` category，導致前端發送的通知不顯示

### 建議

請統一通知類型的命名：

- 入庫通知：`type: 'inventory'`, `sub_type: 'stockIn'`
- 消耗通知：`type: 'inventory'`, `sub_type: 'consume'`

---

## ✅ 前端已完成的修改

1. **統一使用 `groupId` 發送通知**
   - 不再使用 `userIds` 為每個成員各發一則
   - 改用 `groupId` 由後端處理群組成員推播

2. **統一使用 `notificationsApiImpl`**
   - 與「採購清單建立」通知保持一致的發送方式

3. **傳遞完整的 Metadata**
   - `groupName`/`group_name`
   - `actorName`/`actor_name`
   - `actorId`/`actor_id`

---

## 📞 需要後端確認的事項

1. ☐ 後端是否有在消耗/入庫 API 中自動發送通知？
2. ☐ 如果有，是否可以關閉？或者需要前端移除通知發送邏輯？
3. ☐ 通知 API 接收 `groupId` 時，是否會自動推播給群組所有成員？
4. ☐ `group_name`、`actor_name`、`actor_id` 欄位是否正確儲存和回傳？

---

## 📎 相關檔案

- 前端消耗通知：`src/modules/inventory/components/consumption/ConsumptionModal.tsx`
- 前端入庫通知：`src/routes/FoodScan/ScanResult.tsx`
- 通知 API：`src/modules/notifications/api/notificationsApiImpl.ts`

---

如有任何問題，請與前端團隊聯繫。
