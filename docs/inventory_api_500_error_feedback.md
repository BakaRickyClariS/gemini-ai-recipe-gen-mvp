# AI 後端 API 錯誤反饋報告

**報告日期**: 2025-12-29  
**錯誤類型**: 500 Internal Server Error  
**影響功能**: 食材入庫歸納 (Inventory Submission)

---

## 1. 錯誤現象

前端嘗試將 AI 辨識後的食材提交至庫存時，收到 500 錯誤。

**請求端點**:
```
POST /api/v1/refrigerators/{refrigeratorId}/inventory
```

**錯誤訊息**:
```
[AI API] Request failed: Error: API Error: 500
Submission failed: Error: API Error: 500
```

---

## 2. 前端發送的 Request 格式

根據 `frontend_integration_guide.md` 規格，前端目前發送的 payload 如下：

```typescript
// Headers
{
  "Content-Type": "application/json",
  "X-User-Id": "<userId>",           // 從 localStorage 取得
  "Authorization": "Bearer <token>"   // 若有
}

// Body
{
  "name": "海鮮類",                    // 食材名稱
  "category": "frozen",               // ★ 英文 ID
  "quantity": 500,                    // 數量
  "unit": "克",                       // 單位
  "purchaseDate": "2025-12-29",       // 購買日期
  "expiryDate": "2026-12-29",         // 保存期限
  "lowStockAlert": true,
  "lowStockThreshold": 2,
  "notes": "請保持冷凍，勿讓肉解凍",
  "attributes": ["冷凍"],              // ★ string[] 格式
  "imageUrl": ""                       // 可選
}
```

---

## 3. 需要後端檢查的項目

### 3.1 必填欄位驗證
請確認後端是否正確處理以下欄位：

| 欄位 | 前端發送類型 | 是否必填 | 備註 |
|------|-------------|---------|------|
| `name` | `string` | ✅ 是 | |
| `category` | `string` | ✅ 是 | 英文 ID: `fruit`, `frozen`, `bake`, `milk`, `seafood`, `meat`, `others` |
| `quantity` | `number` | ✅ 是 | |
| `unit` | `string` | ✅ 是 | |
| `purchaseDate` | `string` | ❓ | `YYYY-MM-DD` 格式 |
| `expiryDate` | `string` | ❓ | `YYYY-MM-DD` 格式 |
| `attributes` | `string[]` | ❌ 否 | **注意：現在是陣列，非字串** |

### 3.2 Headers 檢查
- **`X-User-Id`**: 前端會從 `localStorage` 取得 userId 並帶入此 header
  - 若 user 未正確登入，此值可能為 `null` 或缺失
  - 後端應返回 401/403 而非 500

### 3.3 Path 參數
- **`refrigeratorId`**: 從 URL path 取得，例如 `/refrigerators/01b6a40-0878-73a3.../inventory`
  - 請確認此 ID 在資料庫中存在
  - 若 ID 不存在，應返回 404 而非 500

### 3.4 資料庫連線
- 請檢查 Supabase/PostgreSQL 連線是否正常
- 確認 `inventory` table schema 與 API 預期一致

---

## 4. 建議的錯誤處理改進

```typescript
// 後端應返回明確的錯誤訊息，而非 500
try {
  // 驗證必填欄位
  if (!body.name || !body.category || !body.quantity) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "缺少必填欄位",
      details: { missing: ["name", "category", "quantity"].filter(...) }
    });
  }

  // 驗證 refrigeratorId
  const refrigerator = await db.refrigerators.findById(refrigeratorId);
  if (!refrigerator) {
    return res.status(404).json({
      code: "REFRIGERATOR_NOT_FOUND",
      message: `冰箱 ${refrigeratorId} 不存在`
    });
  }

  // ... 其他邏輯
} catch (error) {
  console.error('[Inventory API]', error);
  return res.status(500).json({
    code: "INTERNAL_ERROR",
    message: error.message,  // ← 返回具體錯誤訊息以便 debug
    timestamp: new Date().toISOString()
  });
}
```

---

## 5. 前端聯絡資訊

如需進一步 debug，請提供：
1. 後端收到的實際 request body（console log）
2. 後端錯誤堆疊 (stack trace)
3. 資料庫 table schema（若有變更）

---

**附件**: 錯誤截圖
![500 Error Screenshot](./uploaded_image_1767023763720.png)
