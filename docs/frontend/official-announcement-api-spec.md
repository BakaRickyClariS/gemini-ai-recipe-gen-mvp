# 通知系統 API 完整規格

> 此文件整合所有通知相關 API，包含官方公告、批次操作、版本更新通知等功能。

---

## 📋 API 總覽

| 端點                           | 方法   | 說明                   | 後端狀態      |
| ------------------------------ | ------ | ---------------------- | ------------- |
| `/notifications`               | GET    | 取得通知列表           | ✅ 已實作     |
| `/notifications/:id`           | GET    | 取得單一通知           | ✅ 已實作     |
| `/notifications/:id/read`      | PATCH  | 標記已讀               | ✅ 已實作     |
| `/notifications/:id`           | DELETE | 刪除通知               | ✅ 已實作     |
| `/notifications/read-all`      | POST   | 全部標記已讀           | ⚠️ 待確認     |
| `/notifications/batch-read`    | POST   | **批次標記已讀**       | ❌ **待實作** |
| `/notifications/batch-delete`  | POST   | **批次刪除**           | ❌ **待實作** |
| `/notifications/send`          | POST   | 發送通知（需觸發 FCM） | ⚠️ 待確認     |
| `/admin/announcements`         | POST   | 官方公告               | ❌ **待實作** |
| `/admin/announcements/release` | POST   | 版本更新公告           | ❌ **待實作** |

---

## 🔧 批次操作 API（前端已實作，後端待實作）

### 1. 批次標記已讀 ❌

```http
POST /api/v1/notifications/batch-read
```

**Request Body:**

```json
{
  "ids": ["notification-1", "notification-2", "notification-3"],
  "isRead": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "updatedCount": 3
  }
}
```

**後端實作建議：**

```typescript
async function batchMarkAsRead(req, res) {
  const { ids, isRead } = req.body;
  const userId = req.headers['x-user-id'];

  const result = await db.notifications.updateMany({
    where: {
      id: { in: ids },
      userId,
    },
    data: { isRead },
  });

  return res.json({
    success: true,
    data: { updatedCount: result.count },
  });
}
```

---

### 2. 批次刪除 ❌

```http
POST /api/v1/notifications/batch-delete
```

**Request Body:**

```json
{
  "ids": ["notification-1", "notification-2", "notification-3"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deletedCount": 3
  }
}
```

**後端實作建議：**

```typescript
async function batchDelete(req, res) {
  const { ids } = req.body;
  const userId = req.headers['x-user-id'];

  const result = await db.notifications.deleteMany({
    where: {
      id: { in: ids },
      userId,
    },
  });

  return res.json({
    success: true,
    data: { deletedCount: result.count },
  });
}
```

---

## � 官方公告 API

### 3. 發送官方公告（管理員專用）❌

```http
POST /api/v1/admin/announcements
```

**Headers:**

```
Authorization: Bearer {admin-token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "🎉 FuFood v1.2.0 更新上線！",
  "message": "新功能：AI 智慧食譜推薦、共享購物清單",
  "type": "announcement",
  "pushNotification": true,
  "data": {
    "version": "1.2.0",
    "url": "/notifications"
  }
}
```

| 欄位               | 類型    | 必填 | 說明                                      |
| ------------------ | ------- | ---- | ----------------------------------------- |
| `title`            | string  | ✅   | 公告標題                                  |
| `message`          | string  | ✅   | 公告內容                                  |
| `type`             | string  | ❌   | `announcement` / `update` / `maintenance` |
| `pushNotification` | boolean | ❌   | 是否發送 FCM 推播（預設 true）            |
| `data`             | object  | ❌   | 額外資料                                  |

**後端邏輯：**

1. 驗證管理員權限
2. 取得所有使用者 ID
3. 批次寫入 `notifications` 表（`category: 'official'`）
4. 發送 FCM 推播（使用 Topic 或批次發送）

---

### 4. 版本更新公告（CI/CD 觸發）❌

```http
POST /api/v1/admin/announcements/release
```

**Headers:**

```
X-Deploy-Secret: {部署密鑰}
Content-Type: application/json
```

**Request Body:**

```json
{
  "version": "1.2.0",
  "releaseNotes": "### 新功能\n- AI 智慧食譜推薦\n- 共享購物清單",
  "forceUpdate": false
}
```

---

## 🗃️ 資料庫 Schema

### `notifications` 表

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  category VARCHAR(50) NOT NULL DEFAULT 'stock',
  is_read BOOLEAN DEFAULT FALSE,
  action JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

**category 欄位說明：**
| 值 | 說明 |
|------|------|
| `stock` | 食材管家（入庫、消耗、過期等） |
| `official` | 官方公告（版本更新、系統維護等） |

> 註：`inspiration`（靈感生活）tab 已從前端移除

---

## 🔄 CI/CD 整合

### GitHub Actions 範例

```yaml
# .github/workflows/deploy.yml
- name: Send Release Announcement
  if: success()
  run: |
    curl -X POST "${{ secrets.API_URL }}/api/v1/admin/announcements/release" \
      -H "X-Deploy-Secret: ${{ secrets.DEPLOY_SECRET }}" \
      -H "Content-Type: application/json" \
      -d '{
        "version": "${{ github.ref_name }}",
        "releaseNotes": "${{ github.event.head_commit.message }}",
        "forceUpdate": false
      }'
```

---

## ✅ 後端實作檢查清單

### 必要項目

- [ ] 實作 `POST /notifications/batch-read` - 批次標記已讀
- [ ] 實作 `POST /notifications/batch-delete` - 批次刪除
- [ ] 確認 `POST /notifications/send` 有同時呼叫 FCM

### 官方公告

- [ ] 實作 `POST /admin/announcements` - 管理員發送公告
- [ ] 實作 `POST /admin/announcements/release` - CI/CD 版本公告
- [ ] 設定 `X-Deploy-Secret` 環境變數

---

_文件更新時間：2026-01-02_
