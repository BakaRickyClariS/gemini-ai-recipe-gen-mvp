# 前端前景通知 (Foreground Notification) 實作指南

## 核心概念

Firebase (FCM) 預設行為：

- **背景 (Background)**：由系統自動彈出通知。
- **前景 (Foreground)**：系統**不**彈出通知，而是觸發 `onMessage` 事件，讓開發者自行決定如何處理（例如跳出 Toast 或自定義通知）。

因此，要在使用 App 時也能看到通知，您必須在**前端**程式碼中實作。

## 實作步驟

### 1. 監聽 `onMessage` 事件

在您的前端專案中（通常是 `useFCM.ts` 或 `App.tsx`），找到 `onMessage` 的處理區塊：

```typescript
import { getMessaging, onMessage } from "firebase/messaging";
import { toast } from "your-ui-library"; // 例如 sonner, react-hot-toast, sweetalert2

const messaging = getMessaging();

onMessage(messaging, (payload) => {
  console.log("📩 收到前景訊息:", payload);
  const { title, body } = payload.notification || {};

  // 1. 檢查使用者設定 (假設存在 localStorage)
  const enableForeground =
    localStorage.getItem("notify_foreground") !== "false";

  if (!enableForeground) return;

  // 2. 選擇呈現方式 (二選一)

  // 方式 A: 使用 UI Toast (推薦，體驗較好)
  toast.success(title, { description: body });

  // 方式 B: 強制彈出系統通知 (類似背景時的效果)
  // 注意: 瀏覽器可能會檔，且需要確定 permission 為 granted
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "/pwa-192x192.png", // 你的 App Icon路徑
      data: payload.data,
    });
  }
});
```

### 2. 新增設定開關 (UI)

在您的「通知設定」頁面，新增一個 Toggle 開關：

```tsx
// 範例 (React)
const [enableForeground, setEnableForeground] = useState(
  localStorage.getItem("notify_foreground") !== "false"
);

const handleToggle = (checked: boolean) => {
  setEnableForeground(checked);
  localStorage.setItem("notify_foreground", String(checked));
};

return (
  <Toggle
    label="使用 App 時顯示通知"
    checked={enableForeground}
    onChange={handleToggle}
  />
);
```

## 常見問題

- **Q: 為什麼 `new Notification` 沒反應？**
  A: 請確認使用者已經授權通知權限 (`Notification.requestPermission()`)，且當下瀏覽器沒有進入「勿擾模式」。
- **Q: 哪個方式比較好？**
  A: **Toast (方式 A)** 通常比較好，因為它不會離開 App 介面，視覺風格也比較一致。系統通知 (方式 B) 比較強烈，適合非常緊急的訊息。
