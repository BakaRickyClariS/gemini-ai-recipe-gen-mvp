# PWA 推播通知後端整合規劃書

> 前端已完成 FCM Token 取得與自動註冊邏輯，需後端配合實作以下 API 與功能。

---

## 📋 需求概覽

| 功能               | 優先級  | 說明                                     |
| ------------------ | ------- | ---------------------------------------- |
| FCM Token 註冊 API | 🔴 必要 | 前端取得 Token 後註冊到後端              |
| FCM Token 管理     | 🔴 必要 | 儲存、更新、刪除使用者的裝置 Token       |
| 推播發送 API       | 🔴 必要 | 觸發推播通知給指定使用者                 |
| 自動推播觸發       | 🟡 建議 | 在特定事件（入庫、過期等）時自動發送推播 |

---

## 🔧 API 規格

### 1. 註冊 FCM Token

前端會在使用者同意通知權限後，自動呼叫此 API 註冊裝置 Token。

```http
POST /api/v1/notifications/token
```

**Headers:**

```
Content-Type: application/json
X-User-Id: {userId}
```

**Request Body:**

```json
{
  "fcmToken": "fMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...",
  "platform": "web" | "ios" | "android"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token registered successfully"
}
```

**後端邏輯:**

1. 驗證 `X-User-Id` 是有效的使用者
2. 檢查此 Token 是否已存在：
   - 若存在且屬於同一使用者：更新 `updatedAt`
   - 若存在但屬於其他使用者：更新為新使用者（裝置易手）
   - 若不存在：新增記錄
3. 一個使用者可以有多個 Token（多裝置登入）

---

### 2. 刪除 FCM Token（登出時）

```http
DELETE /api/v1/notifications/token
```

**Headers:**

```
Content-Type: application/json
X-User-Id: {userId}
```

**Request Body:**

```json
{
  "fcmToken": "fMxxxxxxxx..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token removed successfully"
}
```

---

### 3. 發送推播通知

此 API 用於手動或自動觸發推播。

```http
POST /api/v1/notifications/send
```

**Headers:**

```
Content-Type: application/json
X-User-Id: {userId}  // 發送者（系統可為 system）
```

**Request Body:**

```json
{
  "userIds": ["user-id-1", "user-id-2"],  // 目標使用者
  "groupId": "group-id",                   // 或指定群組
  "title": "食材即將過期",
  "body": "您的牛奶將在 2 天後過期",
  "type": "expiry" | "inventory" | "shopping" | "recipe" | "system",
  "data": {
    "itemId": "inventory-item-id",
    "url": "/inventory/item/123"
  }
}
```

**Response:**

```json
{
  "success": true,
  "sentCount": 3,
  "failedTokens": []
}
```

---

## 🗃️ 資料庫 Schema

### 新增 `fcm_tokens` 表

```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_token ON fcm_tokens(token);

-- 觸發器：自動更新 updated_at
CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 平台類型

| 值        | 說明                           |
| --------- | ------------------------------ |
| `web`     | 網頁瀏覽器 PWA                 |
| `ios`     | iOS Safari PWA（需 iOS 16.4+） |
| `android` | Android Chrome PWA             |

---

## 🔌 Firebase Admin SDK 整合

### 安裝

```bash
npm install firebase-admin
```

### 初始化

```typescript
// services/firebase-admin.ts
import * as admin from "firebase-admin";

// 使用服務帳戶金鑰
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const messaging = admin.messaging();
```

### 發送推播

```typescript
// services/pushNotificationService.ts
import { messaging } from "./firebase-admin";

interface SendPushParams {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotifications({
  tokens,
  title,
  body,
  data = {},
}: SendPushParams) {
  if (tokens.length === 0) return { successCount: 0, failedTokens: [] };

  const message = {
    notification: {
      title,
      body,
    },
    data,
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);

    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
        console.error(`Failed to send to ${tokens[idx]}:`, resp.error);
      }
    });

    return {
      successCount: response.successCount,
      failedTokens,
    };
  } catch (error) {
    console.error("Push notification error:", error);
    throw error;
  }
}
```

---

## 🔄 自動推播觸發點

建議在以下事件自動發送推播：

| 事件             | 觸發時機         | 通知內容範例                       |
| ---------------- | ---------------- | ---------------------------------- |
| **食材入庫**     | 群組成員入庫食材 | 「小明 新增了 牛奶 到冰箱」        |
| **食材即將過期** | 每日排程檢查     | 「您有 3 項食材即將在 3 天內過期」 |
| **食材已過期**   | 每日排程檢查     | 「您的 雞蛋 已過期」               |
| **購物清單更新** | 群組成員新增項目 | 「小美 新增了 3 項購物清單」       |
| **AI 食譜產生**  | 食譜生成完成     | 「您的 AI 食譜已產生：番茄炒蛋」   |
| **群組加入**     | 新成員加入群組   | 「小華 已加入您的群組」            |

### 排程任務範例

```typescript
// cron/expiryNotifier.ts
import { findExpiringItems } from "../services/inventoryService";
import { sendPushNotifications } from "../services/pushNotificationService";
import { getUserTokens } from "../services/tokenService";

// 每天早上 9 點執行
export async function notifyExpiringItems() {
  const expiringItems = await findExpiringItems({ daysAhead: 3 });

  // 按使用者分組
  const userItems = new Map<string, typeof expiringItems>();
  expiringItems.forEach((item) => {
    const userId = item.groupMembers; // 取得相關使用者
    // ... 分組邏輯
  });

  // 發送通知
  for (const [userId, items] of userItems) {
    const tokens = await getUserTokens(userId);
    if (tokens.length === 0) continue;

    await sendPushNotifications({
      tokens,
      title: "食材即將過期提醒",
      body: `您有 ${items.length} 項食材即將在 3 天內過期`,
      data: {
        type: "expiry",
        url: "/inventory?filter=expiring",
      },
    });
  }
}
```

---

## 🔐 環境變數

請在後端環境中設定：

```bash
# Firebase 服務帳戶金鑰（JSON 字串）
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"fufood-f19bb",...}
```

> **如何取得服務帳戶金鑰：**
>
> 1. Firebase Console → 專案設定 → 服務帳戶
> 2. 點擊「產生新的私密金鑰」
> 3. 下載 JSON 檔案，將內容作為環境變數

---

## ✅ 後端實作檢查清單

- [x] 建立 `fcm_tokens` 資料表 → `docs/migrations/002_fcm_tokens_multi_device.sql`
- [x] 實作 `POST /api/v1/notifications/token` - 註冊 Token（含 platform 欄位）
- [x] 實作 `DELETE /api/v1/notifications/token` - 刪除 Token
- [x] 實作 `POST /api/v1/notifications/send` - 發送推播（多裝置支援）
- [x] 設定 Firebase Admin SDK
- [ ] 設定 `FIREBASE_SERVICE_ACCOUNT_KEY` 環境變數 (Vercel)
- [ ] 在「入庫」API 中整合推播觸發
- [x] 設定每日排程檢查過期食材
- [x] 處理無效 Token 自動清理（FCM 回報錯誤時）

---

## 📞 前端已實作項目

| 項目            | 檔案                                   | 說明                       |
| --------------- | -------------------------------------- | -------------------------- |
| FCM Hook        | `src/hooks/useFCM.ts`                  | 管理 Token、權限、前景訊息 |
| FCM Provider    | `src/shared/providers/FCMProvider.tsx` | 全域 Context               |
| Service Worker  | `src/sw.ts`                            | 處理背景推播               |
| Firebase 初始化 | `src/lib/firebase.ts`                  | Firebase Messaging SDK     |

前端會在使用者登入後自動請求通知權限，並將取得的 FCM Token 透過 `POST /api/v1/notifications/token` 註冊到後端。

---

## 📝 備註

1. **Token 過期處理**：FCM Token 可能因使用者清除瀏覽器資料或久未使用而失效，後端在發送推播時若收到錯誤，應自動刪除該 Token。

2. **多裝置支援**：一個使用者可能有多個裝置（手機、電腦），因此 `fcm_tokens` 表是一對多關係。

3. **iOS 限制**：iOS Safari 僅在 PWA 安裝到主畫面後才支援推播，且需 iOS 16.4 以上版本。

---

_文件產生時間：2026-01-02_
