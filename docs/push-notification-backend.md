# 後端推播功能完整實作規劃書 (Backend Implementation Plan)

本文件整合了 **基礎 Admin SDK 設定**、**資料庫設計** 以及 **API 端點實作** 的所有細節。

## 1. 基礎環境設定 (Infrastructure)

### 步驟 A: 安裝與設定
1.  **安裝套件**:
    ```bash
    npm install firebase-admin
    ```
2.  **Service Account**:
    將 `service-account-file.json` (從前端移除的那個私鑰檔案) 放入後端專案根目錄。
    > [!WARNING]
    > 務必將此檔案加入 `.gitignore`，防止洩漏。

### 步驟 B: 初始化 Admin SDK
建立 `src/lib/firebase-admin.ts` (或類似路徑)。

```typescript
import admin from 'firebase-admin';
import serviceAccount from '../../service-account-file.json'; 

// 防止重複初始化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const messaging = admin.messaging();
```

## 2. 資料庫設計 (Database Schema)

### 步驟 C: 更新 Schema (以 Prisma 為例)
需在 `User` 表新增 Token 與設定欄位，並新增 `Notification` 表以支援前端的通知中心列表。

```prisma
model User {
  id        String   @id @default(uuid())
  // ... 原有欄位
  
  // [NEW] FCM Token
  fcmToken  String?  @map("fcm_token")
  
  // [NEW] 通知偏好設定
  notifyPush      Boolean @default(true)  @map("notify_push")      // 總開關
  notifyExpiry    Boolean @default(true)  @map("notify_expiry")    // 食材過期
  notifyMarketing Boolean @default(false) @map("notify_marketing") // 行銷活動
  
  notifications Notification[]
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  // 通知內容
  type      String   // e.g. 'inventory', 'recipe', 'system'
  title     String
  message   String
  isRead    Boolean  @default(false)
  
  // 跳轉動作 (配合前端 actionType)
  actionType    String? // e.g. 'inventory'
  actionPayload Json?   // e.g. { itemId: "123" }
  
  createdAt DateTime @default(now())
}
```

## 3. API 端點實作 (API Implementation)

為了支援前端功能，需實作以下 API。

### 端點 1: 註冊 Token
- **Method**: `POST`
- **Path**: `/api/v1/notifications/token`
- **Body**: `{ "fcmToken": "..." }`
- **邏輯**:
  ```typescript
  const { fcmToken } = req.body;
  await prisma.user.update({
    where: { id: req.user.id },
    data: { fcmToken }
  });
  ```

### 端點 2: 取得通知設定
- **Method**: `GET`
- **Path**: `/api/v1/notifications/settings`
- **Response**: `{ notifyPush: true, notifyExpiry: true, ... }`
- **邏輯**: 回傳 User 表中的設定欄位。

### 端點 3: 更新通知設定
- **Method**: `PATCH`
- **Path**: `/api/v1/notifications/settings`
- **Body**: `{ "notifyExpiry": false }`
- **邏輯**: 更新 User 表中的對應欄位。

### 端點 4: 取得通知列表
- **Method**: `GET`
- **Path**: `/api/v1/notifications`
- **Params**: `category`, `page`
- **邏輯**: 查詢 `Notification` 表，依 `createdAt` 降序排列。

## 4. 發送通知核心邏輯 (Notification Service)

建立 `src/services/notification.service.ts`，這是後端主動發通知的入口。

```typescript
import { messaging } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

export const notificationService = {
  /**
   * 發送通知 (同時寫入 DB 與 發送 FCM)
   */
  send: async (userId: string, title: string, body: string, type: string, action?: any) => {
    // 1. 取得使用者與設定
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // 2. 判斷是否需要發送推播 (根據使用者設定)
    let shouldSendPush = user.notifyPush && user.fcmToken;
    
    // 細部設定判斷
    if (type === 'inventory' && !user.notifyExpiry) shouldSendPush = false;
    if (type === 'marketing' && !user.notifyMarketing) shouldSendPush = false;

    // 3. [必做] 寫入資料庫 (讓前端通知中心有資料)
    await prisma.notification.create({
      data: {
        userId,
        title,
        message: body,
        type,
        actionType: action?.type,
        actionPayload: action?.payload ?? {}
      }
    });

    // 4. [選做] 發送 FCM 推播
    if (shouldSendPush && user.fcmToken) {
      try {
        await messaging.send({
          token: user.fcmToken,
          notification: { title, body },
          // data 只能放字串，需轉型
          data: {
            type,
            actionType: action?.type || '',
            actionId: action?.payload?.id || '' 
          }
        });
        console.log(`Push sent to user ${userId}`);
      } catch (error) {
        console.error('FCM Send Error:', error);
        // 若 Token 失效 (error.code check)，可清除 DB 中的 Token
      }
    }
  }
};
```

## 5. 使用範例 (Usage Example)

在您的 Crond Job 或業務邏輯中呼叫：

```typescript
// 例如：每日檢查過期食材
import { notificationService } from '@/services/notification.service';

const expiringItems = await getExpiringItems();
for (const item of expiringItems) {
  await notificationService.send(
    item.userId,
    '食材過期提醒',
    `您的 ${item.name} 即將過期，請盡快使用。`,
    'inventory',
    { type: 'inventory', payload: { itemId: item.id } }
  );
}
```
