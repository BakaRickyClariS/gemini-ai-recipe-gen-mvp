# 前端 QR Code 掃描登入/註冊規劃書

> 對應後端：[qr-scan-auth-plan.md](./qr-scan-auth-plan.md)  
> 撰寫日期：2026-03-02

---

## 1. 整體流程概覽

```
[QR Code 掃描] → [選擇登入方式] → [登入/註冊] → [/auth/success] → [原始目的地]
```

QR Code 掃描後有兩條路：

| 登入方式   | API                           | 說明                           |
| ---------- | ----------------------------- | ------------------------------ |
| LINE 登入  | `POST /api/v2/auth/line/init` | 拿 `authUrl` → 瀏覽器跳轉 LINE |
| Email 登入 | `POST /api/v2/auth/login`     | 已有帳號直接登入               |
| Email 註冊 | `POST /api/v2/auth/register`  | 新帳號                         |

---

## 2. 關鍵頁面與元件

### `/auth/select` — 登入方式選擇頁（新增）

> 掃描 QR Code 後如果尚未登入，導到這裡

**功能：**

- 顯示「用 LINE 登入」和「用 Email 登入」兩個按鈕
- 把掃描帶來的 query param（如 `inviteToken`）存進 `sessionStorage` 再跳轉，避免 OAuth 跳轉後遺失

```ts
// 進入 /auth/select?inviteToken=xxx 時
const params = new URLSearchParams(location.search);
const inviteToken = params.get("inviteToken");
if (inviteToken) {
  sessionStorage.setItem("pendingInviteToken", inviteToken);
}
```

---

### LINE 登入按鈕 — `handleLineLogin()`

```ts
async function handleLineLogin() {
  const res = await fetch("/api/v2/auth/line/init", {
    method: "POST",
    credentials: "include",
  });
  const { data } = await res.json();
  window.location.href = data.authUrl; // 跳轉 LINE OAuth
}
```

> ⚠️ 必須帶 `credentials: 'include'`，後端會設 `line_state` HttpOnly Cookie 做 CSRF 防護。

---

### `/auth/success` — 登入成功過渡頁（新增）

> LINE 登入完成後後端 redirect 到這裡

**功能：**

1. 呼叫 `GET /api/v2/auth/me` 確認 Session 有效
2. 讀 `sessionStorage.getItem('pendingInviteToken')` 恢復原始意圖
3. 清除 `sessionStorage`
4. 根據是否有 `pendingInviteToken` 決定最終導向：
   - 有 → 導去群組邀請頁（帶上 token）
   - 沒有 → 導去 `/inventory`（主頁）

```ts
// /auth/success 頁面掛載時執行
async function onMount() {
  await fetch("/api/v2/auth/me", { credentials: "include" }); // 確認 cookie 有效

  const inviteToken = sessionStorage.getItem("pendingInviteToken");
  sessionStorage.removeItem("pendingInviteToken");

  if (inviteToken) {
    router.replace(`/invite?token=${inviteToken}`);
  } else {
    router.replace("/inventory");
  }
}
```

---

### Email 登入/註冊 — 現有頁面

不需新增頁面，現有的登入/註冊表單保持不變。

**注意事項：**

- API 回傳的 JWT 存在 HttpOnly Cookie 裡，**不需要**前端手動存 `localStorage`
- `credentials: 'include'` 要帶好（見下方通用要求）

---

## 3. API 呼叫通用要求

所有 v2 API 必須帶：

```ts
fetch("/api/v2/...", {
  credentials: "include", // 攜帶 / 接收 HttpOnly Cookie
  headers: {
    "Content-Type": "application/json",
  },
});
```

---

## 4. 認證狀態管理

### 取得當前用戶

```ts
// App 初始化 / 路由守衛 呼叫
GET / api / v2 / auth / me;
// 回傳用戶資料，401 表示未登入
```

### Token 自動刷新

Access Token 有效期 15 分鐘。若收到 `401`，先嘗試刷新：

```ts
POST / api / v2 / auth / refresh;
// credentials: 'include'（後端自動讀 Cookie 裡的 refresh_token）
// 成功後重試原請求
```

### 登出

```ts
POST / api / v2 / auth / logout;
// credentials: 'include'
// 後端清除所有 cookie
```

---

## 5. QR Code 掃描完整流程

```
用戶掃 QR Code
  └─ QR 帶 inviteToken 等參數
         │
         ▼
 /auth/select?inviteToken=xxx
  ├─ sessionStorage.set('pendingInviteToken', xxx)
  ├─ [LINE 登入] → lineInit → 跳轉 LINE → 後端 callback → redirect /auth/success
  └─ [Email 登入] → login/register → 前端導向 /auth/success
         │
         ▼
    /auth/success
  ├─ GET /api/v2/auth/me 確認登入
  ├─ 讀 sessionStorage pendingInviteToken
  ├─ 清除 sessionStorage
  ├─ 有 token → /invite?token=xxx
  └─ 沒有 → /inventory
```

---

## 6. 隱私政策頁面（申請 LINE email 權限需要）

路徑：`/privacy`（靜態頁，需包含）

- App 名稱與說明
- 收集的資料（email、LINE 用戶名稱、頭像）
- 用途說明（帳號建立與辨識）
- 聯絡方式

截圖後至 [LINE Developers Console](https://developers.line.biz/console/) → Channel → Basic settings → OpenID Connect → Apply 申請 email 權限。

---

## 7. Checklist

- [ ] 建立 `/auth/select` 頁面（LINE / Email 選擇）
- [ ] 建立 `/auth/success` 過渡頁（取回 session + 導向）
- [ ] `handleLineLogin()` 實作（POST line/init + 跳轉）
- [ ] `sessionStorage` 保存 `pendingInviteToken`
- [ ] 所有 fetch 加上 `credentials: 'include'`
- [ ] Token 刷新機制（401 攔截 + POST refresh）
- [ ] 建立 `/privacy` 頁提供 LINE email 審核截圖
