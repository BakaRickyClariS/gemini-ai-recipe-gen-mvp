# 推播通知前端對接指南 (Push Notification Frontend Integration Guide)

本文件說明如何在前端整合 AI 後端的推播通知功能。

---

## 1. API 基本資訊

| 項目 | 值 |
|-----|---|
| Base URL | `https://your-ai-backend.vercel.app` |
| 認證方式 | Header `X-User-Id: <使用者ID>` |
| Content-Type | `application/json` |

---

## 2. 註冊 FCM Token

**用途**：將使用者裝置的 FCM Token 註冊到後端，讓後端能發送推播。

```typescript
POST /api/v1/notifications/token
Headers: { "X-User-Id": "user-uuid" }
Body: { "fcmToken": "firebase-device-token" }

// Response
{ "success": true, "message": "Token registered" }
```

### 前端範例
```typescript
import { getToken } from 'firebase/messaging';
import { messaging } from './firebase'; // 你的 Firebase 設定

const registerPushToken = async (userId: string) => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
  
  await fetch(`${AI_BACKEND_URL}/api/v1/notifications/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId
    },
    body: JSON.stringify({ fcmToken: token })
  });
};
```

---

## 3. 發送通知給群組成員

**用途**：在觸發某事件（入庫、消耗、群組變更等）後，通知所有群組成員。

```typescript
POST /api/v1/notifications/send
Headers: { "X-User-Id": "user-uuid" }
Body: {
  "userIds": ["user-1", "user-2", "user-3"],  // 接收者 ID 列表
  "title": "食材入庫",
  "body": "小明新增了「雞蛋」",
  "type": "inventory",  // inventory | group | shopping | system
  "action": {           // 可選，點擊通知後的跳轉資訊
    "type": "inventory",
    "payload": { "refrigeratorId": "xxx" }
  }
}

// Response
{
  "success": true,
  "data": {
    "sent": 3,
    "failed": 0,
    "details": { "success": ["user-1", "user-2", "user-3"], "failed": [] }
  }
}
```

### 前端整合範例
```typescript
// 假設你已有群組成員資料
const refrigerator = await getRefrigeratorDetail(refrigeratorId);
const memberIds = refrigerator.members.map(m => m.id);

// 新增食材成功後發送通知
const addInventoryItem = async (item: InventoryInput) => {
  const result = await inventoryApi.create(item);
  
  if (result.success) {
    // 發送通知給所有群組成員
    await fetch(`${AI_BACKEND_URL}/api/v1/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId
      },
      body: JSON.stringify({
        userIds: memberIds,
        title: '食材入庫',
        body: `${currentUserName} 新增了「${item.name}」`,
        type: 'inventory',
        action: { type: 'inventory', payload: { refrigeratorId } }
      })
    });
  }
};
```

---

## 4. 取得/更新通知設定

### 取得設定
```typescript
GET /api/v1/notifications/settings
Headers: { "X-User-Id": "user-uuid" }

// Response
{
  "success": true,
  "data": {
    "notifyPush": true,       // 總開關
    "notifyExpiry": true,     // 過期提醒
    "notifyLowStock": true,   // 低庫存提醒
    "daysBeforeExpiry": 3,    // 過期提醒天數 (預設 3 天)
    "notifyMarketing": false  // 行銷活動
  }
}
```

### 更新設定
```typescript
PATCH /api/v1/notifications/settings
Headers: { "X-User-Id": "user-uuid" }
Body: { 
  "notifyExpiry": false,
  "notifyLowStock": true,
  "daysBeforeExpiry": 7    // 可設定 1-30 天
}

// Response: 更新後的完整設定
```

---

## 5. 取得通知列表 (通知中心)

```typescript
GET /api/v1/notifications?page=1&limit=20
Headers: { "X-User-Id": "user-uuid" }

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "inventory",
      "title": "食材過期提醒",
      "message": "雞蛋即將過期...",
      "isRead": false,
      "action": { "type": "inventory", "payload": {...} },
      "createdAt": "2026-01-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  },
  "unreadCount": 5
}
```

---

## 6. 通知類型對照表

| type | 說明 | 建議觸發時機 |
|------|-----|------------|
| `inventory` | 庫存相關 | 入庫、消耗、低庫存 |
| `group` | 群組相關 | 成員加入/退出 |
| `shopping` | 購買清單 | 清單建立/更新 |
| `system` | 系統公告 | App 更新等 |

---

## 7. 環境變數

前端需設定以下環境變數：

```env
VITE_AI_BACKEND_URL=https://your-ai-backend.vercel.app
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

### 如何取得 VAPID Key

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇您的專案 → 點擊 **齒輪圖示** → **專案設定**
3. 切換到 **Cloud Messaging** 分頁
4. 滾動到 **網路推播憑證 (Web Push certificates)** 區塊
5. 點擊 **「產生金鑰組」** 按鈕
6. 複製產生的金鑰（類似 `BLc-L3...長字串...xYz`）
7. 將此金鑰設為 `VITE_FIREBASE_VAPID_KEY`

> [!NOTE]
> - **VAPID Key（公鑰）**：前端使用，用於向 Firebase 請求推播權限
> - **Service Account JSON（私鑰）**：後端使用，用於發送推播通知

---

## 8. 注意事項

1. **FCM Token 有效期**：Token 可能會過期或變更，建議每次 App 啟動時重新註冊。
2. **過期提醒**：由後端 Cron Job 每日 08:00 (UTC) 自動檢查並發送，無需前端觸發。
3. **錯誤處理**：若 `sendToMultiple` 回傳 `failed` 有值，表示部分使用者發送失敗（可能尚未註冊 Token）。
