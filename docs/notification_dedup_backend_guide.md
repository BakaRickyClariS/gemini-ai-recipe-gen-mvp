# 通知去重複 - 後端整合指南

**日期**：2026-01-05  
**狀態**：待實作  
**優先級**：高  
**關聯文件**：`notifications_ui_upgrade_spec.md`, `notification_system_refactor.md`

---

## 1. 目的 (Objective)

為了解決前端「同一操作跳出多次通知」的問題，需要後端在通知資料中新增 `actorId` 欄位。前端將依據此欄位判斷通知是否由本人觸發，若是則不顯示 Toast（但仍保留在通知列表）。

---

## 2. 問題描述

目前使用者執行操作（如消耗食材）時，會發生以下重複提示：

```
1. 前端立即顯示 → "消耗成功！" (SuccessModal)
2. 後端產生通知 → "小明 消耗了 2 顆雞蛋"
3. 前端輪詢偵測 → 又彈出 Toast "小明 消耗了 2 顆雞蛋"
```

使用者會看到**兩次**提示，造成干擾。

---

## 3. 解決方案

前端將在輪詢偵測新通知時，**過濾掉本人觸發的通知**（不顯示 Toast）。

### 3.1 過濾邏輯 (前端)

```typescript
// useNotificationPolling.ts
const currentUserId = useSelector(selectCurrentUserId);

// 在顯示 Toast 前過濾
const notificationsToShow = newNotifications.filter(
  (n) => n.actorId !== currentUserId
);
```

### 3.2 後端需提供的欄位

| 欄位名稱 | 類型 | 必填 | 說明 |
| :--- | :--- | :---: | :--- |
| `actorId` | `string` | **必填** | 觸發此通知的使用者 Firebase UID。若為系統自動觸發，填入 `"system"`。 |

---

## 4. API 變更

### 4.1 `GET /api/v1/notifications`

在每個通知物件中新增 `actorId` 欄位。

**範例回傳：**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "id": "notif-uuid-1",
        "type": "inventory",
        "subType": "consume",
        "title": "小明 消耗了 2 顆雞蛋",
        "message": "雞蛋庫存剩餘 4 顆。",
        "actorId": "firebase-uid-of-xiaoming",
        "actorName": "小明",
        "groupName": "我的冰箱",
        "isRead": false,
        "createdAt": "2026-01-05T11:00:00Z",
        "action": {
          "type": "inventory",
          "payload": { "itemId": "item-123", "refrigeratorId": "fridge-abc" }
        }
      },
      {
        "id": "notif-uuid-2",
        "type": "inventory",
        "subType": "stock",
        "title": "最後救援！檸檬塔 今天到期",
        "message": "就是今天！它是冰箱裡最需要被吃掉的。",
        "actorId": "system",
        "actorName": null,
        "groupName": "我的冰箱",
        "isRead": false,
        "createdAt": "2026-01-05T09:00:00Z",
        "action": {
          "type": "inventory",
          "payload": { "itemId": "item-456", "refrigeratorId": "fridge-abc" }
        }
      }
    ],
    "total": 2,
    "unreadCount": 2
  }
}
```

### 4.2 `POST /api/v1/notifications/send`

在建立通知時，後端應從請求來源取得當前使用者的 UID 並填入 `actorId`。

**建議邏輯：**

```python
# Python 範例 (Flask/FastAPI)
def create_notification(data, current_user):
    notification = Notification(
        type=data['type'],
        title=data['title'],
        message=data['body'],
        actor_id=current_user.uid,  # <-- 關鍵欄位
        actor_name=current_user.display_name,
        group_name=data.get('groupName'),
        # ... other fields
    )
    db.session.add(notification)
    db.session.commit()
```

---

## 5. 資料庫 Schema 變更

```sql
ALTER TABLE notifications
ADD COLUMN actor_id VARCHAR(128) NOT NULL DEFAULT 'system';

-- 若需要索引 (用於查詢特定使用者觸發的通知)
CREATE INDEX idx_notifications_actor_id ON notifications(actor_id);
```

---

## 6. 後端實作檢核清單

- [ ] `Notification` Model 新增 `actorId` 欄位
- [ ] 通知建立 Service 填入 `actorId` (取自 Request 的 current user)
- [ ] `GET /notifications` API 回傳 `actorId`
- [ ] 資料庫 Migration 執行
- [ ] (選做) 為現有通知 Backfill `actorId`，無法判斷時填入 `'system'`

---

## 7. 驗證方式

1. 呼叫 `GET /api/v1/notifications`，確認每個通知都有 `actorId` 欄位。
2. 使用使用者 A 執行消耗操作，確認產生的通知 `actorId` 等於使用者 A 的 UID。
3. 使用使用者 B 查看通知列表，確認看到使用者 A 的操作通知（且 `actorId` 為 A 的 UID）。

---

## 8. 聯絡窗口

如有任何問題，請聯繫前端 Ricky 或查看 `docs/refactor/notification_system_refactor.md`。
