# AI 後端通知 API 問題診斷與檢查規劃書

**版本**: v1.0  
**建立日期**: 2026-01-01  
**問題類型**: 通知無法顯示

---

## 📋 問題描述

| 項目           | 說明                                       |
| -------------- | ------------------------------------------ |
| **現象**       | 入庫完成後，通知頁面沒有顯示新通知         |
| **預期行為**   | 入庫成功 → 建立通知 → 通知頁面顯示         |
| **資料庫狀態** | ✅ 確認有通知資料                          |
| **前端狀態**   | ✅ `localStorage['user']` 有正確的用戶資料 |
| **User ID**    | `019b327e-333a-71e5-ba2f-5bfd91c5148`      |

---

## 🔍 第一階段：前端 Network 請求檢查

### 1.1 開啟開發者工具

1. 按 `F12` 或 `Ctrl+Shift+I` 開啟開發者工具
2. 切換到 **Network** 分頁
3. 勾選 **Preserve log** 保留請求記錄
4. 在 Filter 輸入 `notifications` 過濾

### 1.2 觸發通知 API 請求

1. 點擊底部導航的「通知」按鈕
2. 切換不同的 Tab（食材管家 / 靈感生活 / 官方公告）

### 1.3 檢查 Request Headers

找到 `GET /notifications` 請求，點擊查看 Headers：

```
✅ 必須包含以下 Header：
┌─────────────────────────────────────────────────────────────┐
│ X-User-Id: 019b327e-333a-71e5-ba2f-5bfd91c5148             │
│ Content-Type: application/json                              │
│ Authorization: Bearer <token> (如有)                        │
└─────────────────────────────────────────────────────────────┘
```

**檢查結果記錄**：

| 檢查項目           | 預期值                                 | 實際值 | 狀態 |
| ------------------ | -------------------------------------- | ------ | ---- |
| Request URL        | `/api/v1/notifications?category=stock` |        | ☐    |
| Request Method     | `GET`                                  |        | ☐    |
| `X-User-Id` Header | `019b327e-...`                         |        | ☐    |
| Cookie             | `access_token=...` (如有)              |        | ☐    |

### 1.4 檢查 Response

| 檢查項目      | 預期值                                     | 實際值 | 狀態 |
| ------------- | ------------------------------------------ | ------ | ---- |
| Status Code   | `200 OK`                                   |        | ☐    |
| Response Body | `{ status: true, data: { items: [...] } }` |        | ☐    |

**如果 Status Code 不是 200**：

| Status                      | 可能原因                             |
| --------------------------- | ------------------------------------ |
| `401 Unauthorized`          | Token 無效或過期，檢查 Cookie/Header |
| `403 Forbidden`             | 用戶無權限，檢查 User ID             |
| `404 Not Found`             | 路由不存在，檢查 API 端點            |
| `500 Internal Server Error` | 後端程式錯誤，查看後端 Log           |

---

## 🔍 第二階段：後端 API 端點檢查

### 2.1 確認路由註冊

檢查後端專案中通知路由是否正確註冊：

```javascript
// 預期的路由結構 (Express 範例)
router.get('/notifications', notificationController.getNotifications);
router.get('/notifications/:id', notificationController.getNotification);
router.patch('/notifications/:id', notificationController.markAsRead);
// ... 其他路由
```

**檢查項目**：

- [ ] `/api/v1/notifications` 路由是否存在
- [ ] 路由是否有正確的 prefix（`/api/v1`）
- [ ] 路由是否有 middleware 保護

### 2.2 確認 Middleware - X-User-Id 解析

檢查後端是否正確讀取 `X-User-Id` header：

```javascript
// 正確的讀取方式
const userId = req.headers['x-user-id'];
// 或
const userId = req.get('X-User-Id');

// ⚠️ 注意：header 名稱在 Node.js 中會被轉為小寫
// 所以應該使用 'x-user-id' 而非 'X-User-Id'
```

**檢查項目**：

- [ ] Middleware 是否有讀取 `x-user-id` header
- [ ] 是否有將 userId 附加到 `req.user` 或 `req.userId`
- [ ] 是否有驗證 userId 的有效性

### 2.3 檢查 CORS 設定

如果前端和 AI 後端不在同一個 domain，需要檢查 CORS：

```javascript
// 後端 CORS 設定應包含
app.use(
  cors({
    origin: ['https://your-frontend-domain.com', 'http://localhost:5173'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'], // ⚠️ 必須包含 X-User-Id
  }),
);
```

**檢查項目**：

- [ ] `Access-Control-Allow-Headers` 是否包含 `X-User-Id`
- [ ] `Access-Control-Allow-Credentials` 是否為 `true`
- [ ] OPTIONS preflight 請求是否正確處理

---

## 🔍 第三階段：資料庫查詢檢查

### 3.1 確認資料表結構

預期的 notifications 資料表：

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(50) NOT NULL, -- 'stock' | 'inspiration' | 'official'
  type VARCHAR(50) NOT NULL,     -- 'stock' | 'shared' | 'system'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  action_type VARCHAR(50),       -- 'inventory' | 'shopping-list' | 'recipe' | 'detail'
  action_payload JSONB,          -- { itemId?: string, listId?: string, recipeId?: string }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引（提升查詢效能）
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 3.2 手動查詢驗證

#### 查詢 1：確認該用戶有通知

```sql
SELECT id, category, type, title, is_read, created_at
FROM notifications
WHERE user_id = '019b327e-333a-71e5-ba2f-5bfd91c5148'
ORDER BY created_at DESC
LIMIT 10;
```

**預期結果**：應該看到最近入庫產生的通知

#### 查詢 2：按分類查詢（對應前端 Tab）

```sql
-- 食材管家 Tab
SELECT * FROM notifications
WHERE user_id = '019b327e-333a-71e5-ba2f-5bfd91c5148'
  AND category = 'stock'
ORDER BY created_at DESC;

-- 靈感生活 Tab
SELECT * FROM notifications
WHERE user_id = '019b327e-333a-71e5-ba2f-5bfd91c5148'
  AND category = 'inspiration'
ORDER BY created_at DESC;

-- 官方公告 Tab
SELECT * FROM notifications
WHERE user_id = '019b327e-333a-71e5-ba2f-5bfd91c5148'
  AND category = 'official'
ORDER BY created_at DESC;
```

#### 查詢 3：確認 User ID 格式

```sql
-- 檢查 user_id 欄位的格式
SELECT DISTINCT user_id FROM notifications LIMIT 10;

-- 比對前端傳來的 ID 是否存在
SELECT COUNT(*)
FROM notifications
WHERE user_id = '019b327e-333a-71e5-ba2f-5bfd91c5148';
```

**⚠️ 常見問題**：

| 問題          | 原因                              | 解決方式       |
| ------------- | --------------------------------- | -------------- |
| 查無資料      | User ID 格式不符（帶/不帶連字號） | 統一 UUID 格式 |
| category 不符 | 入庫時 category 設為其他值        | 檢查入庫邏輯   |

---

## 🔍 第四階段：通知建立流程檢查

### 4.1 入庫 API 與通知建立

確認入庫 API 成功後是否有建立通知的邏輯：

```javascript
// 入庫 Controller（參考）
async function addInventoryItem(req, res) {
  const userId = req.headers['x-user-id'];
  const item = req.body;

  // 1. 新增庫存
  const newItem = await inventoryService.add(item);

  // 2. 🔍 建立通知（檢查這段邏輯是否存在）
  await notificationService.create({
    userId: userId, // ⚠️ 確認是否正確傳入
    category: 'stock', // ⚠️ 確認是否為 'stock'
    type: 'stock',
    title: '入庫成功',
    description: `已成功入庫：${item.name}`,
    actionType: 'inventory',
    actionPayload: { itemId: newItem.id },
  });

  res.json({ status: true, data: newItem });
}
```

**檢查項目**：

- [ ] 入庫成功後是否呼叫 `notificationService.create`
- [ ] `userId` 是否從 `x-user-id` header 正確取得
- [ ] `category` 是否設為 `'stock'`
- [ ] 有無 try-catch 捕捉錯誤（錯誤可能被吞掉）

### 4.2 檢查後端 Log

查看入庫時的 Log：

```bash
# 搜尋關鍵字
grep -i "notification" logs/app.log
grep -i "create" logs/app.log
grep -i "019b327e" logs/app.log
```

**應該看到的 Log**：

```
[INFO] Creating notification for user: 019b327e-333a-71e5-ba2f-5bfd91c5148
[INFO] Notification created: { id: '...', category: 'stock', ... }
```

**可能的錯誤 Log**：

```
[ERROR] Failed to create notification: <錯誤訊息>
```

---

## 🔍 第五階段：API 回傳格式檢查

### 5.1 前端期望的回傳格式

根據 `notifications_api_spec.md`：

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "id": "notification-uuid",
        "category": "stock",
        "type": "stock",
        "title": "入庫成功",
        "description": "已成功入庫：蘋果 x 3",
        "isRead": false,
        "createdAt": "2026-01-01T15:00:00.000Z",
        "actionType": "inventory",
        "actionPayload": {
          "itemId": "item-uuid"
        }
      }
    ],
    "total": 1,
    "unreadCount": 1
  }
}
```

### 5.2 常見格式問題

| 問題     | 後端回傳        | 前端期望                  | 解法             |
| -------- | --------------- | ------------------------- | ---------------- |
| 欄位命名 | `is_read`       | `isRead`                  | 轉換為 camelCase |
| 欄位命名 | `action_type`   | `actionType`              | 轉換為 camelCase |
| 欄位命名 | `created_at`    | `createdAt`               | 轉換為 camelCase |
| 空結果   | `null`          | `{ items: [], total: 0 }` | 回傳空陣列       |
| 狀態欄位 | `success: true` | `status: true`            | 統一欄位名       |

### 5.3 欄位轉換範例

```javascript
// 後端查詢結果轉換
function formatNotification(dbRow) {
  return {
    id: dbRow.id,
    category: dbRow.category,
    type: dbRow.type,
    title: dbRow.title,
    description: dbRow.description,
    isRead: dbRow.is_read, // snake_case → camelCase
    createdAt: dbRow.created_at, // snake_case → camelCase
    actionType: dbRow.action_type, // snake_case → camelCase
    actionPayload: dbRow.action_payload,
  };
}
```

---

## 🛠️ 第六階段：常見問題排查

### 6.1 X-User-Id 格式問題

**症狀**：資料庫有資料，但 API 回傳空陣列

**原因**：前端傳送的 User ID 與資料庫儲存的格式不一致

```
前端傳送: 019b327e-333a-71e5-ba2f-5bf?d91c5148  (注意這個 ? 可能是編碼問題)
資料庫:   019b327e-333a-71e5-ba2f-5bfd91c5148
```

**解法**：

1. 確認前端 localStorage 中的 User ID 格式正確
2. 後端接收時做 UUID 格式驗證

### 6.2 CORS Preflight 問題

**症狀**：Network 中出現 OPTIONS 請求失敗

**解法**：確認後端 CORS 設定包含自訂 header

```javascript
// 後端設定
app.use(
  cors({
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  }),
);
```

### 6.3 通知只發給其他成員

**症狀**：入庫者本人收不到通知，其他群組成員可以

**原因**：通知邏輯可能排除了操作者本人

**解法**：確認通知建立邏輯的目標用戶列表

```javascript
// 檢查這段邏輯
const targetUserIds = groupMembers
  // .filter(m => m.id !== currentUserId)  // 是否排除了自己？
  .map((m) => m.id);
```

### 6.4 分類錯誤

**症狀**：切換 Tab 看不到通知，但切換到其他 Tab 可以看到

**原因**：通知的 `category` 欄位設定錯誤

**驗證 SQL**：

```sql
SELECT category, COUNT(*)
FROM notifications
WHERE user_id = '019b327e-333a-71e5-ba2f-5bfd91c5148'
GROUP BY category;
```

---

## ✅ 檢查結果彙整表

請在檢查後填寫此表：

### 前端檢查

| #   | 檢查項目               | 結果        | 備註                   |
| --- | ---------------------- | ----------- | ---------------------- |
| 1   | Network Request 有發出 | ☐ 是 / ☐ 否 |                        |
| 2   | X-User-Id Header 正確  | ☐ 是 / ☐ 否 | 實際值：**\_\_\_**     |
| 3   | Response Status 200    | ☐ 是 / ☐ 否 | 實際值：**\_\_\_**     |
| 4   | Response Body 有資料   | ☐ 是 / ☐ 否 | items 數量：**\_\_\_** |

### 後端檢查

| #   | 檢查項目                  | 結果        | 備註 |
| --- | ------------------------- | ----------- | ---- |
| 5   | /notifications 路由存在   | ☐ 是 / ☐ 否 |      |
| 6   | X-User-Id Middleware 正確 | ☐ 是 / ☐ 否 |      |
| 7   | CORS 設定包含 X-User-Id   | ☐ 是 / ☐ 否 |      |
| 8   | 入庫時有建立通知邏輯      | ☐ 是 / ☐ 否 |      |

### 資料庫檢查

| #   | 檢查項目                 | 結果        | 備註               |
| --- | ------------------------ | ----------- | ------------------ |
| 9   | notifications 資料表存在 | ☐ 是 / ☐ 否 |                    |
| 10  | 該用戶有通知資料         | ☐ 是 / ☐ 否 | 筆數：**\_\_\_**   |
| 11  | category 欄位值正確      | ☐ 是 / ☐ 否 | 實際值：**\_\_\_** |
| 12  | user_id 格式一致         | ☐ 是 / ☐ 否 |                    |

---

## 📝 診斷結論

**問題根因**：
（根據檢查結果填寫）

**修復方案**：
（根據問題根因填寫）

---

## 📚 相關文件參考

- [notifications_api_spec.md](./notifications_api_spec.md) - 通知 API 規格
- [api_auth_guide.md](./api_auth_guide.md) - 認證機制說明
- [frontend_integration_guide.md](./frontend_integration_guide.md) - 前端整合指南
