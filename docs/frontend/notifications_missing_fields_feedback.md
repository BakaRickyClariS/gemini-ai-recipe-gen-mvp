# 後端 API 欄位回饋：缺少 `groupName` 和 `actorName`

**日期**：2026-01-05  
**狀態**：待處理  
**優先級**：高

---

## 問題描述

前端接收到的通知 API 回應（`GET /api/v1/notifications`）**缺少 `groupName` 和 `actorName` 欄位**，導致通知列表無法顯示群組名稱和操作者名稱。

---

## 目前 API 回傳結構

```json
{
  "id": "...",
  "title": "食材消耗通知",
  "content": "已消耗 1 份 紅蘿蔔",
  "type": "inventory",
  "subType": "consume",  // ✅ 有返回
  "actorId": "...",       // ⚠️ 返回 ID 而非名稱
  "actorAvatar": "...",
  "groupAvatar": "...",
  "createdAt": "..."
  // ❌ 缺少: actorName
  // ❌ 缺少: groupName
}
```

---

## 前端期望的結構

根據 `notifications_ui_upgrade_spec.md` 和 `notifications_ui_frontend_integration_guide.md`，前端需要：

```json
{
  "id": "...",
  "title": "食材消耗通知",
  "message": "已消耗 1 份 紅蘿蔔",
  "type": "inventory",
  "subType": "consume",
  "groupName": "我的冰箱",   // ← 需要這個欄位
  "actorName": "Ricky",     // ← 需要這個欄位
  "createdAt": "...",
  "action": { "type": "inventory", "payload": { "itemId": "..." } }
}
```

---

## 解決方案

### 方案 A：後端直接返回 name 欄位（推薦）

修改後端 API，在查詢通知時 JOIN 相關資料表來獲取名稱：

```sql
SELECT 
  n.*,
  u.display_name as actor_name,
  r.name as group_name
FROM notifications n
LEFT JOIN users u ON n.actor_id = u.id
LEFT JOIN refrigerators r ON n.refrigerator_id = r.id
```

### 方案 B：前端額外查詢（不推薦）

前端根據 `actorId` 和 `refrigeratorId` 額外呼叫 API 取得名稱，但這會增加請求數量和延遲。

---

## 備註

`subType` 欄位已正確返回，新通知的標籤顯示沒有問題。只有 `groupName` 和 `actorName` 尚未實作。
