# 修復項目：Shopping List Item 缺乏建立者 (Creator) 資訊

## 🚨 問題描述 (Issue Summary)

目前前端在渲染「共享清單 (Shared List)」的明細項目 (Items) 貼文時，**無法正常顯示發布者的大頭貼與名稱**。
經前端攔截 API 回傳的 Payload 發現，在建立項目 (`POST`) 與取得項目列表 (`GET`) 時，**後端回傳的 Item JSON 中並未包含該項目的建立者 ID 或詳細資訊**。

**影響範圍：**

- `GET /api/v2/shopping-lists/:listId/items`
- `POST /api/v2/shopping-lists/:listId/items`

## ❌ 目前的錯誤 Payload (Actual Response)

從前端除錯日誌中抓取的原始回傳資料如下，可以看到完全沒有諸如 `creator_id` 或是 `creator` 的物件：

```json
{
  "id": "468c99be-ade9-4724-ad0b-b63faf84d1f2",
  "shoppingListId": "5644eb6f-5751-4ea7-a483-0a548e854155",
  "name": "fefefeggege",
  "quantity": "1.00",
  "unit": "包",
  "photoPath": "https://res.cloudinary.com/...",
  "updatedAt": "2026-02-26T06:17:17.137Z"
}
```

## ✅ 期望的正確 Payload (Expected Response)

為了讓前端能夠正確關聯群組成員並顯示發布者的名字與 LINE 大頭貼，**請後端在回傳 Item 時，至少補上該項目的建立者 User ID (`creator_id`)**。建議直接按照 V2 Snake Case 慣例回傳 `creator_id`。

（註：如果能直接 JOIN 出 `creator` 的詳細物件會更好，但若為了效能考量，僅回傳 `creator_id`，前端也已實作了從 `members` 列表自動配對的 Fallback 邏輯。）

**期望回傳格式（請補上 `creator_id` 欄位）：**

```json
{
  "id": "468c99be-ade9-4724-ad0b-b63faf84d1f2",
  "shoppingListId": "5644eb6f-5751-4ea7-a483-0a548e854155",
  "creator_id": "U57f210d8d8343d0ba59718d39667cdd9", // 👈 請務必補上此欄位
  "name": "fefefeggege",
  "quantity": "1.00",
  "unit": "包",
  "photoPath": "https://res.cloudinary.com/...",
  "updatedAt": "2026-02-26T06:17:17.137Z",
  "createdAt": "2026-02-26T06:17:17.137Z" // 👈 同時建議補上建立時間，方便排序
}
```

## 🛠️ 前端配套措施 (已完成)

前端已經準備好對接這個欄位了：

1. **防盜鏈設定 (`referrerPolicy`)** 已加在 `<img />` 組件上，以確保取到 LINE 頭貼網址時不會出現 `403 Forbidden`。
2. **前後端欄位 Mapping** 已處理完善 (`creator_id || creatorId`)。

只要後端實作補齊欄位並推上伺服器，前端畫面的大頭貼就能夠無縫正常顯示！
