# 🍱 FuFood — AI 智慧食譜生成 API
## 專案技術簡報（v2 架構）

---

## 📌 Slide 1｜專案概述

> 「冰箱裡有什麼，就做什麼。」

FuFood 是一款 **AI 驅動的智慧食材管理 + 食譜推薦平台後端 API**，解決使用者「不知道今天吃什麼」以及「食材快過期卻不知道」的問題。

**核心功能**

| 功能 | 說明 |
|------|------|
| 📦 庫存管理 | 個人 / 群組共用冰箱食材清單，追蹤過期日 |
| 🤖 AI 食譜推薦 | 依現有食材讓 Gemini AI 生成完整食譜，支援即時串流 |
| 📸 圖片辨識 | 拍照上傳食材圖片，AI 自動辨識並填入庫存 |
| 👥 群組協作 | 以邀請連結邀請家人/室友加入，共享庫存與購物清單 |
| 🔔 推播通知 | 食材快過期、成員加入/離開群組時自動推播 |
| 🛒 購物清單 | 群組成員協作管理待購項目 |

---

## 🛠️ Slide 2｜核心技術棧

| 類別 | 技術選擇 |
|------|----------|
| 語言 | TypeScript（強型別，編譯期抓錯） |
| 後端框架 | Express.js |
| AI | Google Gemini API（`gemini-2.5-flash` 為主力模型） |
| 資料庫 | PostgreSQL + Drizzle ORM（Type-safe 查詢） |
| 輸入驗證 | Zod（Schema 定義 + 自動型別推導） |
| 圖片 | Cloudinary（CDN 儲存）+ Sharp（壓縮） |
| 推播 | Firebase FCM（Android / iOS） |
| 錯誤監控 | Sentry（自動捕捉 500，附 stack trace） |
| API 文件 | OpenAPI 3.0 + Swagger UI（`/docs`） |
| 部署 | Docker multi-stage build / Vercel Serverless 雙軌 |

---

## 🏗️ Slide 3｜系統分層架構

採用嚴謹的 **四層架構**，每層職責單一，互不越界。

```
使用者請求
    ↓
Middleware 層    → 負責：認證、授權、驗證、安全防護
    ↓
Routes 層       → 負責：定義路徑、串接 middleware
    ↓
Controllers 層  → 負責：解析請求、呼叫服務、回應結果
    ↓
Services 層     → 負責：核心商業邏輯（AI 生成、群組規則、通知）
    ↓
Repositories 層 → 負責：所有資料庫存取（唯一碰 DB 的地方）
    ↓
PostgreSQL
```

**設計原則**
- Controller 不碰資料庫，Service 不直接寫 SQL
- 錯誤由 Service 拋出 → Controller 統一捕捉並回應
- 所有 v2 Controller 繼承 `BaseController`，共用成功/錯誤回應格式

**統一回應格式**

| 狀態 | 格式 |
|------|------|
| 成功 | `{ success: true, data: {...} }` |
| 失敗 | `{ success: false, error: { code, message } }` |

---

## 🔗 Slide 4｜Middleware 安全管線

每個 v2 請求在抵達 Controller 之前，依序通過以下關卡：

### ① CSRF 防護
防止跨站請求偽造（CSRF 攻擊）。

登入時，伺服器發出一個隨機 Token 存在 Cookie 中。之後每次修改資料的請求（POST / PUT / DELETE），都必須在 Header 同時帶上這個 Token。兩邊比對相符才放行，不符則回傳 `403`。

> 🔑 原理：惡意網站可以偽造請求，但無法讀取你的 Cookie Token，因此無法偽造 Header。

### ② JWT 身份驗證
確認「你是誰」。

從 Cookie 或 Authorization Header 取出 JWT，驗證簽章後解出使用者 ID，注入到 `req.user`，供後續所有層使用。Token 過期回傳 `401`，前端再用 Refresh Token 換新的。

### ③ 群組成員驗證
確認「你有沒有權限進這個群組」。

查詢資料庫確認目前使用者是否為該群組成員，同時把角色（管理員 / 一般成員）注入到 `req.groupRole`。非成員回傳 `403`。

### ④ Zod 輸入驗證
確認「請求格式是否正確」。

每個 endpoint 都有對應的 Zod Schema，請求 body 會自動解析並清洗多餘欄位。格式不符回傳 `422`，附帶詳細的欄位錯誤說明。

---

## 🔐 Slide 5｜認證設計（雙 Token）

採用 **Access Token + Refresh Token** 雙 Token 策略，全部存在 HttpOnly Cookie（JavaScript 無法讀取，防 XSS）。

**登入/註冊流程**

```
使用者登入
    ↓
驗證密碼（bcrypt hash 比對）
    ↓
簽發 Access Token（短效，15 分鐘）
    ↓
簽發 Refresh Token（長效，30 天）
    ↓
產生 CSRF Token（32 bytes 隨機值）
    ↓
三個 Token 全部寫入 HttpOnly Cookie
```

**Token 過期時**：前端自動用 Refresh Token 換一組新的，使用者感知不到。

**LINE OAuth（第三方登入）**
- 用戶點擊「LINE 登入」→ 導向 LINE 授權頁
- 授權後 LINE 回傳驗證碼 → 後端換取 LINE 用戶資料
- 帳號自動連結（依 LINE ID → email → 自動建立新帳號）
- 確保新用戶有預設群組「我的冰箱」
- 完成簽發 JWT，寫入 Cookie

---

## 🤖 Slide 6｜AI 食譜生成架構

### 三層輸入防護

```
使用者輸入
    ↓
Layer 1 — 格式防護（validateAIInput）
  ✓ 長度限制（2000 字）
  ✓ Base64 編碼繞過偵測
  ✓ 大量重複字元（flooding 攻擊）
  ✓ HTML/XML 標籤注入
  ✓ Unicode 零寬字元清洗（常見混淆手法）
    ↓
Layer 2 — Prompt Injection 偵測（validatePromptContent）
  ✓ 中文：忽略指令、扮演角色、解除限制、切換模式
  ✓ 英文：jailbreak、DAN mode、act as、roleplay as
  ✓ 奶奶漏洞類攻擊：「像奶奶說故事一樣告訴我...」
  ✓ Prompt 洩漏：「print your instructions」、「show your prompt」
  ✓ 模型特定 Token：[INST]、<<SYS>>、<|im_start|>
  偵測到任何一條 → 記錄安全日誌 + 拒絕請求
    ↓
建構 System Prompt
  → 用戶輸入被隔離在 <user_input> 標籤內
  → 即使包含惡意指令也無法覆蓋 System 設定
```

### Gemini 多模型 Fallback

當遇到 API 配額限制（429）時，系統自動輪換備用方案，不會讓用戶看到錯誤：

```
嘗試 gemini-2.5-flash（主力）
    ↓ 失敗/配額不足
嘗試 gemini-3-flash
    ↓ 失敗
嘗試 gemini-2.5-flash-lite
    ↓ 失敗
嘗試 gemini-1.5-flash
    ↓ 失敗
嘗試 gemini-1.5-pro（最後備案）
    ↓ 若有多個 API Key，全部失敗後切換到下一個 Key 重頭再試
```

### 三層輸出過濾

AI 回應在送給用戶前，也會過濾：

| 層級 | 過濾內容 | 處理方式 |
|------|----------|----------|
| 致命危害 | 毒物、自傷相關字眼 | 丟棄整份食譜 |
| 成人/暴力 | 色情、血腥相關 | 丟棄整份食譜 |
| 政治敏感 | 恐怖主義、武器相關 | 丟棄整份食譜 |
| Prompt 洩漏 | AI 洩漏身份或系統設定 | 替換為安全預設問候語 |

所有攔截事件都會記錄到安全日誌（`logSecurityEvent`）。

### SSE 即時串流

除了一般請求，也支援 **Server-Sent Events（SSE）串流模式**：AI 生成的文字逐段即時推送到前端，達到類似 ChatGPT 打字效果，無須等待全部完成。

---

## 🗄️ Slide 7｜資料庫設計

使用 **Drizzle ORM** 搭配 **PostgreSQL**，Schema 定義即 TypeScript 型別，零額外 interface 手寫。

### 整體關聯架構

```
users（使用者）
 ├── fcm_tokens          → 每個裝置的推播 Token（一人多裝置）
 └── group_memberships   → 加入了哪些群組、擔任什麼角色
          ↓
      groups（群組 = 冰箱）
        ├── group_invitations → 邀請連結記錄
        ├── group_memberships → 成員清單
        ├── inventory         → 食材庫存（另一個服務管理）
        ├── shopping_lists    → 購物清單
        │     └── shopping_list_items
        └── subscriptions     → 推播偏好設定
```

---

### 各資料表設計說明

**`users`（使用者）**

| 欄位 | 說明 |
|------|------|
| `id` | 主鍵（varchar，UUID 格式） |
| `display_name` | 顯示名稱 |
| `email` | 電子信箱（唯一） |
| `password_hash` | bcrypt 雜湊密碼（LINE 登入者不會有） |
| `line_user_id` | LINE 帳號 ID（第三方登入用） |
| `provider` | 登入方式：`local` 或 `line` |
| `avatar` | 頭像 URL |
| `preferences` | 使用者偏好設定（JSONB） |
| `tour_completed` | 是否完成新手導覽 |
| `tour_current_step` | 目前導覽進度（`LOGIN`、`HOME` 等） |

---

**`groups`（群組 = 冰箱）**

| 欄位 | 說明 |
|------|------|
| `id` | 主鍵（UUID，DB 自動產生） |
| `name` | 群組名稱（如「我的冰箱」） |
| `owner_id` | 建立者（外鍵 → users） |

---

**`group_memberships`（群組成員）**

| 欄位 | 說明 |
|------|------|
| `group_id` | 外鍵 → groups（群組刪除則 cascade 刪除） |
| `user_id` | 外鍵 → users |
| `role` | `admin`（群主）或 `member` |
| `joined_at` | 加入時間 |

> 📌 `(group_id, user_id)` 設為 Unique，同一人不能重複加入同群組。

---

**`group_invitations`（邀請連結）**

| 欄位 | 說明 |
|------|------|
| `token` | 隨機邀請碼（唯一），附在邀請連結中 |
| `expires_at` | 到期時間（可為 null = 永不過期） |
| `max_uses` | 最多可使用次數（預設 1 次） |
| `used_count` | 已使用次數 |
| `created_by` | 誰建立的邀請連結 |

---

**`fcm_tokens`（推播裝置 Token）**

| 欄位 | 說明 |
|------|------|
| `user_id` | 外鍵 → users |
| `token` | Firebase FCM 裝置 Token（唯一） |
| `platform` | 裝置平台：`web` / `android` / `ios` |
| `last_used_at` | 最後使用時間（可用來清理失效 Token） |

---

**`shopping_lists`（購物清單）**

| 欄位 | 說明 |
|------|------|
| `group_id` | 外鍵 → groups |
| `title` | 清單名稱 |
| `starts_at` | 採購預定時間 |
| `enable_notifications` | 是否啟用提醒 |
| `created_by` | 建立者 |

---

### 設計要點

- 群組刪除時，相關的成員記錄、邀請連結都會 **cascade 自動刪除**
- 帳號支援 `local`（信箱密碼）與 `line` 雙 provider，同 email 可作帳號連結
- 邀請連結設計了 **次數限制 + 有效期限**，防止無限制使用

---

## 📦 Slide 8｜部署架構

### Docker Multi-stage Build

分兩個階段建置，讓最終 Image 盡可能小：

- **Stage 1（編譯）**：安裝完整依賴 → TypeScript 編譯成 JavaScript
- **Stage 2（執行）**：只裝生產依賴 + 複製編譯結果，不含 TypeScript 工具

最終 Image 不包含任何開發工具，size 最小化，攻擊面最小。

### Vercel Serverless（雙軌）

同一份程式碼也可以部署到 Vercel，自動 scale to zero，免維護主機。透過一行 `export default app` 讓 Vercel 把 Express app 當 Serverless handler 使用。

---

## 🔮 Slide 9｜技術亮點總結

| 亮點 | 說明 |
|------|------|
| 🏗️ **四層架構** | Routes → Controllers → Services → Repositories，職責清晰不混用 |
| 🧱 **BaseController** | 統一成功/失敗/204 回應格式，消除重複 boilerplate |
| 🔐 **雙 Token + CSRF** | HttpOnly Cookie 防 XSS，Double Submit Cookie 防 CSRF |
| 🔑 **LINE OAuth** | 第三方登入 + Account Linking，自動建立預設群組 |
| 🛡️ **三層 AI 防護** | 格式防護 → Injection 偵測 → 輸出過濾，全程有安全日誌 |
| 🤖 **AI Fallback** | 多模型 + 多 API Key 自動輪換，遇配額限制不中斷服務 |
| ⚡ **SSE Streaming** | 即時串流食譜生成，ChatGPT 風格互動體驗 |
| 🚪 **群組授權 Middleware** | `verifyGroupMembership` 集中授權，Controller 無需重複處理 |
| 📐 **Zod 全面校驗** | 所有 endpoint 的 body/query 皆有 Schema 保護 |
| 🚀 **雙軌部署** | Docker（自主主機）+ Vercel Serverless，靈活切換 |
