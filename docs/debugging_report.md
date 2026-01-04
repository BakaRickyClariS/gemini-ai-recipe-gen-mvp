# PWA 背景通知問題分析與修復報告

## 1. 問題分析

使用者回報無法觸發瀏覽器及手機 PWA 背景通知。經檢查，後端發送邏輯 (`messaging.send`) 已實作，且前端測試按鈕可觸發通知，顯示 Service Worker 基本功能正常。

問題極可能出在以下幾個環節：

### A. 後端 Firebase 初始化失敗 (最可能原因)

**現象**：後端 Log 出現 `⚠️ [Firebase] Mock send called...` 或類似警告。
**原因**：`src/lib/firebase.ts` 原本只讀取 `FIREBASE_SERVICE_ACCOUNT` 環境變數，但許多部署文件或 Vercel 設定可能使用 `FIREBASE_SERVICE_ACCOUNT_KEY`。
**影響**：Firebase Admin SDK 初始化失敗，系統自動切換到 Mock 模式，導致 Log 看起來有送出 (`mock-id`) 但實際上 FCM 沒收到請求。

### B. 推播發送條件未滿足

**原因**：`notificationService.send` 有嚴格的過濾邏輯：

- 使用者未開啟總開關 (`notify_push = false`)。
- 若為庫存通知 (`type = 'inventory'`)，需開啟過期提醒 (`notify_expiry = true`)。
- `fcm_tokens` 表中無有效 Token。
  **排查**：檢查後端 Log `[Notification] Skipping FCM for user...`。

### C. 客戶端 (前端/PWA) 限制

**原因**：

1. **iOS PWA 限制**：iOS 16.4+ 上，**必須**將網頁「加入主畫面」(Add to Home Screen) 才能接收背景通知。單純在 Safari 中開啟無法接收。
2. **Service Worker 範圍**：`firebase-messaging-sw.js` 必須位於網域根目錄 (root)，Scope 才能覆蓋整個 App。
3. **背景執行權限**：Android 上部分省電模式可能會殺掉 Service Worker。

## 2. 已實施的修復 (後端)

我已修改 `src/lib/firebase.ts`，進行以下改進：

1. **支援多種環境變數名稱**：現在同時支援讀取 `FIREBASE_SERVICE_ACCOUNT` 和 `FIREBASE_SERVICE_ACCOUNT_KEY`，確保 Vercel 設定能被正確讀取。
2. **增強 Debug Log**：如果 Firebase 初始化失敗進入 Mock 模式，現在會印出更明確的警告訊息：`⚠️ [Firebase] Mock send called because initialization failed. Check your FIREBASE_SERVICE_ACCOUNT_KEY.`。

## 3.給使用者的行動清單 (Checklist)

### ✅ 後端檢查

1. **檢查環境變數**：確保 `.env` 或 Vercel Settings 中有設定 `FIREBASE_SERVICE_ACCOUNT_KEY`，內容為完整的 JSON 字串（包含 `private_key`, `project_id` 等）。
2. **觀察 Server Log**：重新部署後，觸發一次通知，檢查 Log 是否出現 `✅ [Firebase] Loaded service account...`。

### ✅ 前端/PWA 檢查

1. **iOS 使用者**：
   - 確保 iOS 版本 >= 16.4。
   - 確保已點擊「分享」->「加入主畫面」。
   - 從主畫面開啟 App，並重新觸發「開啟通知」權限。
2. **Service Worker 檔案**：
   - 確認 `firebase-messaging-sw.js` 存在於 `public/` (或 build output 的根目錄)。
   - 內容必須包含 `onBackgroundMessage` 處理邏輯。
3. **測試流程**：
   - 讓 PWA 進入背景（回到手機桌面，不要滑掉 App）。
   - 觸發入庫/消耗操作。
   - 等待通知彈出。

## 4. 補充說明

如果您是在 Localhost 開發環境測試：

- 請確保 `service-account-file.json` 放在專案根目錄，**或者** `.env` 中有正確設定。
- Localhost 的背景通知有時會因為瀏覽器開發者工具開啟與否而有不同行為，建議用無痕模式或手機實際測試。
