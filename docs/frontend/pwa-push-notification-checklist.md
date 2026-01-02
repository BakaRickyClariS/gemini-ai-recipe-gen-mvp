# PWA 推播通知前端整合檢查清單

本文件為前端開發者提供完整的 PWA 推播通知整合指南，涵蓋**手機背景推播**與**電腦桌面通知**。

> [!IMPORTANT]
> 這裡的「推播」是指**真正的系統推播**（手機通知中心、電腦右下角彈出），不是 App 內的訊息提示。

---

## 📋 前端檢查清單

### ✅ 第一階段：Firebase 專案設定

| 項目                            | 狀態 | 說明                                                                     |
| ------------------------------- | ---- | ------------------------------------------------------------------------ |
| Firebase 專案建立               | ⬜   | 已有 `fufood-f19bb` 專案                                                 |
| 取得 Firebase Config            | ⬜   | 從 Firebase Console → 專案設定 → 一般 → 您的應用程式                     |
| 產生 VAPID Key（Web Push 憑證） | ⬜   | 從 Firebase Console → 專案設定 → Cloud Messaging → Web Push certificates |

### ✅ 第二階段：前端套件安裝

```bash
npm install firebase
```

### ✅ 第三階段：程式碼實作 (6 個檔案)

| 檔案                                        | 狀態 | 用途                                     |
| ------------------------------------------- | ---- | ---------------------------------------- |
| `src/lib/firebase.ts`                       | ⬜   | Firebase 初始化                          |
| `public/firebase-messaging-sw.js`           | ⬜   | **最重要**：Service Worker，處理背景推播 |
| `src/hooks/useFCM.ts`                       | ⬜   | FCM Token 管理 Hook                      |
| `src/components/NotificationPermission.tsx` | ⬜   | 權限請求 UI                              |
| `.env.local`                                | ⬜   | 環境變數                                 |
| `vite.config.ts` (或對應)                   | ⬜   | 確保 SW 正確註冊                         |

---

## 🔧 第一階段：Firebase 設定

### 1.1 取得 Firebase Config

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇 **FuFood** 專案
3. 點擊 **齒輪 → 專案設定 → 一般**
4. 滾動到「您的應用程式」區塊
5. 如果沒有 Web App，點擊「新增應用程式 → Web (</> 圖示)」
6. 複製 `firebaseConfig` 物件

```javascript
// 範例 (實際值需從 Console 取得)
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fufood-f19bb.firebaseapp.com",
  projectId: "fufood-f19bb",
  storageBucket: "fufood-f19bb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

### 1.2 產生 VAPID Key

1. 在 Firebase Console → **專案設定 → Cloud Messaging**
2. 滾動到 **「網路推播憑證 (Web Push certificates)」**
3. 點擊 **「產生金鑰組」**
4. 複製產生的公鑰（長字串，類似 `BLc-L3xY...`）

> [!NOTE]
> VAPID Key 是**公鑰**，可以安全放在前端程式碼中

---

## 💻 第二階段：程式碼實作

### 2.1 `src/lib/firebase.ts` - Firebase 初始化

```typescript
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Messaging 實例（僅瀏覽器環境）
let messaging: Messaging | null = null;

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  messaging = getMessaging(app);
}

export { app, messaging, getToken, onMessage };
```

### 2.2 `public/firebase-messaging-sw.js` - 🔴 最重要！

> [!CAUTION] > **這個檔案必須放在 `public/` 根目錄**，否則背景推播不會運作！

```javascript
// 給 Service Worker 使用的 Firebase SDK (不同於一般的 SDK)
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js"
);

// 與前端相同的 config
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "fufood-f19bb.firebaseapp.com",
  projectId: "fufood-f19bb",
  storageBucket: "fufood-f19bb.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// 處理背景訊息（App 不在前景時）
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] 收到背景訊息:", payload);

  const notificationTitle = payload.notification?.title || "新通知";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192x192.png", // 您的 App 圖示
    badge: "/icons/badge-72x72.png",
    tag: payload.data?.type || "default",
    data: payload.data,
    // 點擊行為
    actions: [
      { action: "open", title: "查看" },
      { action: "dismiss", title: "關閉" },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 處理通知點擊
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] 通知被點擊:", event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // 如果已有視窗，聚焦
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // 否則開新視窗
        clients.openWindow(urlToOpen);
      })
  );
});
```

### 2.3 `src/hooks/useFCM.ts` - FCM Token 管理

```typescript
import { useState, useEffect, useCallback } from "react";
import { messaging, getToken, onMessage } from "@/lib/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const API_BASE_URL = import.meta.env.VITE_AI_BACKEND_URL;

interface UseFCMOptions {
  userId: string | null;
  onMessageReceived?: (payload: any) => void;
}

export function useFCM({ userId, onMessageReceived }: UseFCMOptions) {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 註冊 Service Worker
  const registerServiceWorker = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );
        console.log("✅ Service Worker 註冊成功:", registration.scope);
        return registration;
      } catch (error) {
        console.error("❌ Service Worker 註冊失敗:", error);
        throw error;
      }
    }
    throw new Error("瀏覽器不支援 Service Worker");
  }, []);

  // 請求權限並取得 Token
  const requestPermission = useCallback(async () => {
    if (!messaging || !userId) return null;

    setIsLoading(true);
    setError(null);

    try {
      // 1. 請求通知權限
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setError("使用者拒絕通知權限");
        return null;
      }

      // 2. 確保 Service Worker 已註冊
      await registerServiceWorker();

      // 3. 取得 FCM Token
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (!fcmToken) {
        setError("無法取得 FCM Token");
        return null;
      }

      console.log("✅ FCM Token:", fcmToken.substring(0, 20) + "...");
      setToken(fcmToken);

      // 4. 註冊到後端
      await registerTokenToBackend(userId, fcmToken);

      return fcmToken;
    } catch (err: any) {
      console.error("❌ FCM 初始化失敗:", err);
      setError(err.message || "FCM 初始化失敗");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messaging, userId, registerServiceWorker]);

  // 註冊 Token 到後端
  const registerTokenToBackend = async (userId: string, fcmToken: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/notifications/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
          body: JSON.stringify({ fcmToken }),
        }
      );

      if (!response.ok) {
        throw new Error("後端 Token 註冊失敗");
      }

      console.log("✅ Token 已註冊到後端");
    } catch (error) {
      console.error("❌ 後端 Token 註冊失敗:", error);
      throw error;
    }
  };

  // 監聽前景訊息
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📩 收到前景訊息:", payload);
      onMessageReceived?.(payload);

      // 前景也顯示通知（可選）
      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || "新通知", {
          body: payload.notification?.body,
          icon: "/icons/icon-192x192.png",
        });
      }
    });

    return () => unsubscribe();
  }, [messaging, onMessageReceived]);

  return {
    token,
    permission,
    isLoading,
    error,
    requestPermission,
    isSupported:
      typeof Notification !== "undefined" && "serviceWorker" in navigator,
  };
}
```

### 2.4 `src/components/NotificationPermission.tsx` - 權限請求 UI

```tsx
import React from "react";
import { useFCM } from "@/hooks/useFCM";
import { useAuth } from "@/hooks/useAuth"; // 您的認證 Hook

export function NotificationPermission() {
  const { userId } = useAuth();
  const { permission, isLoading, error, requestPermission, isSupported } =
    useFCM({
      userId,
      onMessageReceived: (payload) => {
        // 可以在這裡更新 UI 狀態，例如增加未讀數
        console.log("新訊息:", payload);
      },
    });

  if (!isSupported) {
    return <p className="text-sm text-gray-500">您的瀏覽器不支援推播通知</p>;
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <span>✅</span>
        <span>推播通知已啟用</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-red-600">❌ 推播通知已被封鎖</p>
        <p className="text-sm text-gray-500">請在瀏覽器設定中開啟通知權限</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-gray-700">
        開啟推播通知，即時收到食材過期提醒和群組動態
      </p>
      <button
        onClick={requestPermission}
        disabled={isLoading}
        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
      >
        {isLoading ? "設定中..." : "開啟推播通知"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

### 2.5 `.env.local` - 環境變數

```bash
# Firebase Config (從 Firebase Console 取得)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=fufood-f19bb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fufood-f19bb
VITE_FIREBASE_STORAGE_BUCKET=fufood-f19bb.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# VAPID Key (從 Cloud Messaging 設定取得)
VITE_FIREBASE_VAPID_KEY=BLc-L3xY...長字串...

# 後端 API
VITE_AI_BACKEND_URL=https://your-ai-backend.vercel.app
```

---

## 🚀 第三階段：整合到 App

### 3.1 在 App 啟動時自動請求權限

```tsx
// src/App.tsx 或 src/main.tsx
import { useEffect } from "react";
import { useFCM } from "@/hooks/useFCM";

function App() {
  const { userId } = useAuth();
  const { requestPermission, permission } = useFCM({ userId });

  useEffect(() => {
    // 如果已登入且尚未決定權限，延遲請求
    if (userId && permission === "default") {
      // 延遲 3 秒，避免太突兀
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userId, permission]);

  return <RouterProvider router={router} />;
}
```

### 3.2 在設定頁面顯示權限狀態

```tsx
// src/routes/Settings/NotificationSettings.tsx
import { NotificationPermission } from "@/components/NotificationPermission";

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <h2>推播通知設定</h2>

      {/* 權限狀態 */}
      <NotificationPermission />

      {/* 其他設定選項... */}
    </div>
  );
}
```

---

## 📱 第四階段：PWA 設定確認

### 4.1 確保 `manifest.json` 正確

```json
{
  "name": "FuFood 智慧食材管理",
  "short_name": "FuFood",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 4.2 確保 HTTPS

> [!WARNING] > **推播通知只能在 HTTPS 環境運作**（localhost 除外）

- 本機開發：`http://localhost:5173` ✅
- 部署環境：必須是 `https://` ✅

---

## 🧪 第五階段：測試

### 5.1 本機測試步驟

1. 啟動前端 `npm run dev`
2. 開啟瀏覽器 DevTools → Application → Service Workers
3. 確認 `firebase-messaging-sw.js` 已註冊
4. 允許通知權限
5. 確認 Console 顯示 `✅ FCM Token: ...`

### 5.2 發送測試通知

使用 Firebase Console 手動發送：

1. Firebase Console → Cloud Messaging → 撰寫通知
2. 填寫標題和內文
3. 目標選擇「單一裝置」
4. 貼上從 Console 取得的 FCM Token
5. 發送

### 5.3 完整流程測試

```bash
# 使用 curl 測試後端發送
curl -X POST https://your-ai-backend.vercel.app/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -H "X-User-Id: your-user-id" \
  -d '{
    "userIds": ["your-user-id"],
    "title": "測試推播",
    "body": "這是一條測試通知",
    "type": "system"
  }'
```

---

## ❓ 常見問題

### Q1: 收不到背景推播？

| 檢查項目              | 解決方式                                            |
| --------------------- | --------------------------------------------------- |
| Service Worker 未註冊 | 確認 `firebase-messaging-sw.js` 在 `public/` 根目錄 |
| VAPID Key 錯誤        | 重新從 Firebase Console 取得                        |
| 權限被拒絕            | 請使用者在瀏覽器設定中開啟                          |
| 手機 iOS Safari       | ⚠️ iOS 需要 16.4+ 且網站需安裝到主畫面              |

### Q2: iOS 特殊注意事項

> [!IMPORTANT] > **iOS Safari 推播限制**
>
> - 需要 **iOS 16.4+**
> - 網站必須 **安裝到主畫面** (Add to Home Screen)
> - 必須使用 **HTTPS**

### Q3: Token 會變嗎？

是的，Token 可能因為以下原因變更：

- 使用者清除瀏覽器資料
- App 重新安裝
- Token 過期（約 270 天）

**建議**：每次 App 啟動都重新呼叫 `getToken()` 並註冊到後端

---

## 📊 架構圖

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端 PWA                                    │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │  useFCM Hook    │───▶│ firebase.ts      │───▶│ Firebase SDK      │  │
│  │  - 權限請求      │    │ - 初始化 App     │    │ - getToken()     │  │
│  │  - Token 管理   │    │ - messaging      │    │ - onMessage()    │  │
│  └─────────────────┘    └──────────────────┘    └───────────────────┘  │
│           │                                                │            │
│           ▼                                                ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              firebase-messaging-sw.js (Service Worker)          │   │
│  │              - 處理背景推播                                       │   │
│  │              - 顯示系統通知                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  POST /api/v1/notifications/token
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             AI 後端                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │ Notification    │───▶│ notificationSvc │───▶│ Firebase Admin   │  │
│  │ Routes          │    │ - send()        │    │ - messaging.send │  │
│  └─────────────────┘    └──────────────────┘    └───────────────────┘  │
│                                                          │              │
└──────────────────────────────────────────────────────────│──────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Firebase      │
                                                  │   Cloud         │
                                                  │   Messaging     │
                                                  └─────────────────┘
                                                           │
                    ┌──────────────────────────────────────┼──────────────┐
                    │                                      │              │
                    ▼                                      ▼              ▼
           ┌─────────────┐                        ┌─────────────┐  ┌──────────┐
           │  📱 手機     │                        │  💻 電腦    │  │ 🔔 通知  │
           │  PWA 推播   │                        │  瀏覽器推播 │  │ 中心顯示 │
           └─────────────┘                        └─────────────┘  └──────────┘
```

---

## ✅ 最終檢查清單

- [ ] Firebase Config 已設定
- [ ] VAPID Key 已產生
- [ ] `firebase-messaging-sw.js` 在 `public/` 目錄
- [ ] `.env.local` 環境變數已設定
- [ ] Service Worker 可正常註冊
- [ ] 可取得 FCM Token
- [ ] Token 已註冊到後端
- [ ] 前景訊息可接收
- [ ] 背景推播可接收
- [ ] iOS 用戶已加到主畫面（如適用）
