# 後端反饋建議書：通知 API 問題

**日期**: 2026-01-02  
**前端版本**: fufood (localhost:5173)  
**後端版本**: AI Backend (localhost:3000)

---

## 問題摘要

前端通知頁面無法顯示任何通知，即使資料庫中已有資料。

---

## 問題詳情

### 1. API 回應異常

**請求**:

```
GET /api/v1/notifications?category=stock
```

**回應** (HTTP 200):

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0 },
  "unreadCount": 6
}
```

### 2. 矛盾點

| 欄位          | 值   | 說明                  |
| ------------- | ---- | --------------------- |
| `data`        | `[]` | 無資料回傳            |
| `total`       | `0`  | 篩選後無結果          |
| `unreadCount` | `6`  | **資料庫有 6 筆未讀** |

這表示資料庫確實有通知，但 `category=stock` 篩選條件沒有匹配到任何資料。

---

## 根因分析

根據資料庫截圖，通知記錄的 `type` 欄位值為：

- `inventory` ("食材消耗通知")

但前端查詢使用的參數為：

- `category=stock` / `inspiration` / `official`

**後端可能沒有將 `type` 與 `category` 對應起來。**

---

## 建議修正方案

### 方案 A：後端調整篩選邏輯 (推薦)

在 `GET /api/v1/notifications` 加入 `type` 到 `category` 的映射：

```javascript
// 建議的映射關係
const categoryToTypes = {
  stock: ['inventory', 'group'], // 食材管家：庫存、群組相關
  inspiration: ['recipe', 'shopping'], // 靈感生活：食譜、購物清單相關
  official: ['system', 'marketing'], // 官方公告：系統、行銷相關
};
```

### 方案 B：前端傳遞 `type` 參數

如果後端不想支援 `category` 參數，請告知前端改用 `type` 參數：

```
GET /api/v1/notifications?type=inventory
```

---

## 額外建議

1. **API 文件更新**: 請在 API 文件中明確說明 `category` 參數的預期值。
2. **Swagger/OpenAPI**: 建議使用 enum 定義可接受的 `category` 值。

---

## 聯絡資訊

如需進一步討論，請聯繫前端團隊。
