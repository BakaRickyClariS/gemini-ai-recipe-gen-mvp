# 前端 Push Notification 實作計畫 (FCM)

本計畫書旨在說明如何在前端專案中整合 Firebase Cloud Messaging (FCM)，以接收後端發送的推播通知（如成員變更），並即時刷新應用程式狀態。

## 目標
- 實作 FCM 初始化與權限請求。
- 實作 Service Worker 背景通知處理。
- 實作前景通知監聽與 Redux 狀態即時刷新。
- 支援「成員加入」等事件的即時 UI 更新。

## 1. 環境設定與依賴安裝

### 1.1 安裝 Firebase SDK
目前專案中已有 `@firebase/messaging`，確認是否需要完整 `firebase` 套件：
```bash
npm install firebase
```
*(若現有專案僅有部分模組，建議安裝完整 SDK 以確保相容性)*

### 1.2 環境變數
在 `.env` 中新增 Firebase 配置：
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_FIREBASE_VAPID_KEY=xxx
```

## 2. 程式碼實作

### 2.1 Firebase 初始化 (`src/lib/firebase.ts`)
建立共用的 Firebase 實例：
```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ... 其他配置
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

### 2.2 Service Worker 設定 (`public/firebase-messaging-sw.js`)
Service Worker 用於處理背景通知。由於專案使用 VitePWA，需確保兩者並存或整合。
- 建立獨立的 `firebase-messaging-sw.js` 用於 FCM。
- 註冊背景訊息處理器：
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

firebase.initializeApp({ ... }); // 需硬編碼或動態注入配置
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  // 自訂通知顯示邏輯
});
```

### 2.3 FCM Token 管理 Hook (`src/shared/hooks/useFCM.ts`)
負責處理權限請求與 Token 取得：
- `requestPermission()`: 請求瀏覽器通知權限。
- `getToken()`: 取得 FCM Registration Token。
- 監聽 Token 刷新事件。
- **關鍵**：取得 Token 後，呼叫後端 API `POST /api/v1/notifications/devices` 註冊裝置。

### 2.4 通知監聽與狀態刷新 (`src/modules/notifications/handlers/NotificationHandler.tsx`)
建立一個全域元件（放置於 App Root），負責監聽前景訊息：
```typescript
import { onMessage } from 'firebase/messaging';

// ...
onMessage(messaging, (payload) => {
  const { type, entityId } = payload.data;
  
  // 處理成員更新事件
  if (type === 'GROUP_MEMBER_UPDATE') {
    // 觸發 Redux action 刷新群組列表
    dispatch(fetchGroups());
    dispatch(fetchAllGroupsMembers()); // 若有此 action
    
    toast.info(`群組成員已更新: ${payload.notification.body}`);
  }
});
```

## 3. UI 整合

### 3.1 權限請求引導
在「設定 > 通知」頁面或登入後導覽頁，加入引導使用者開啟通知權限的 UI。

### 3.2 群組設定頁面更新
確保群組設定頁面中的成員列表來自 Redux store，這樣當 `fetchGroups` 被觸發時，列表會自動重新渲染。

## 4. 驗證計畫

### 4.1 測試流程
1. **Token 註冊**：登入後，檢查 Network Tab 是否發送 `POST /devices` 請求。
2. **接收測試**：使用 Firebase Console 發送測試訊息，確認前景/背景皆能收到。
3. **即時更新**：
   - 開啟兩個瀏覽器視窗 (A 與 B)。
   - 在 B 視窗加入群組。
   - 觀察 A 視窗是否收到通知並自動刷新成員列表。

### 4.2 除錯
- 檢查 Console 是否有 FCM 錯誤 (Permission denied, invalid key 等)。
- 檢查 Service Worker 是否正確註冊。
