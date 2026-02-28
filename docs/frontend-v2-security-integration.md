# 前端 V2 安全升級 (CSRF + Cookie Session) 整合指南

為了防範 XSS 與 CSRF 攻擊，後端 V2 導入了 **HttpOnly Cookie** 存放憑證，並利用 **Double-Submit Cookie** 機制防護跨站請求偽造。

這份指南說明前端需要做出哪些調整，才能解決 `POST` 等請求遭遇 `403 Forbidden` 的問題，這也是目前業界最標準且安全的實作方式。

---

## 1. 核心概念與流程改變

### 以前的做法 (不安全)

- 登入拿到 Token → 前端自己把 Token 存到 `localStorage`。
- 每次打 API → 前端從 `localStorage` 撈出 Token 塞進 `Authorization: Bearer <token>` 裡。
- 缺點：若前端有 XSS 漏洞，惡意腳本能直接讀取 `localStorage` 偷走 Token。

### 現在的做法 (安全標準)

- 登入成功 → 後端會自動透過 `Set-Cookie` 將 Token 種入瀏覽器 (設定為 `HttpOnly`，JavaScript 抓不到)。
- 首次載入或登入後 → 前端呼叫 `GET /api/v2/auth/csrf-token`，後端會:
  1. 將 CSRF Token 寫入另一個 `HttpOnly` Cookie (`_csrf`)。
  2. 將這串 Token 透過 JSON Response 傳給前端 (`{ csrfToken: "xxxxxxx" }`)。
- 每次打 API →
  - `GET` 請求：瀏覽器會自動帶上 Cookie，直接放行。
  - `POST/PUT/DELETE` 請求：瀏覽器一樣會帶 Cookie，但前端必須把之前存下來的 CSRF Token 放到 Request Header (`x-csrf-token: "xxxxxxx"`) 裡面。後端此時會比對 Cookie 裡的 Token 跟 Header 的 Token 是否一致，一致才放行。

---

## 2. 前端需要修改的三個地方

假設專案目前使用 `axios` 與 `zustand` 等狀態管理來處理 API。

### 第一步：全域開啟 Axios 的 Cookie 權限

預設情況下，跨域請求不會夾帶 Cookie。必須在建立 axios 實體的時候開啟 `withCredentials`。

```typescript
// src/api/client.ts (你的 ApiClient 檔案)
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  // [重要] 允許跨域請求攜帶 Cookie
  withCredentials: true,
});
```

_(附註：如果你們已經在部分程式碼中保留了 `Authorization` Header，請確保後端會以 Cookie 優先，或者前端登入後直接捨棄 localStorage 中的 token)_

### 第二步：建立取得與管理 CSRF Token 的邏輯

在使用者登入成功後，或是每次應用程式初始化 (`App.tsx` 的 `useEffect` 中)，去打後端把 CSRF Token 取回來並存在「前端的記憶體 (In-Memory) 或是 Zustand」裡。

```typescript
// src/store/authStore.ts (範例)
import { create } from "zustand";
import { apiClient } from "../api/client";

interface AuthState {
  csrfToken: string | null;
  fetchCsrfToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  csrfToken: null,
  fetchCsrfToken: async () => {
    try {
      // 呼叫這支 Endpoint 讓後端發 Cookie，並把值回傳
      const response = await apiClient.get("/api/v2/auth/csrf-token");
      const token = response.data.data.csrfToken;

      set({ csrfToken: token });
      console.log("CSRF Token ready!");
    } catch (error) {
      console.error("Failed to fetch CSRF Token", error);
    }
  },
}));
```

### 第三步：實作 Axios Interceptor 自動補上 Header

讓所有送出的請求都會被攔截器檢查。如果是會改變狀態的請求 (`POST`, `PUT`, `DELETE`, `PATCH`)，就把剛剛存在 Store 裡的 CSRF Token 塞進 `x-csrf-token` 這個 Header 裡面。

```typescript
// src/api/client.ts
import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    // 判斷請求方法是否為會「改變狀態」的 Methods
    const requiresCsrf = ["post", "put", "delete", "patch"];

    if (config.method && requiresCsrf.includes(config.method.toLowerCase())) {
      // 從 Zustand（或其他你存放的地方）拿出 Token
      const token = useAuthStore.getState().csrfToken;

      if (token) {
        // [重要] 後端認定的 Header 名稱是 `x-csrf-token`
        config.headers["x-csrf-token"] = token;
      } else {
        console.warn("正在送出 POST 請求，但尚未準備好 CSRF Token！");
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 回應攔截器 (處理 401 與 403)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error("CSRF 認證失敗或是權限不足。");
      // 如果確定是 CSRF 失敗，可以考慮在這裡自動重新呼叫 fetchCsrfToken()
    }

    // 如果 HttpOnly Cookie 過期了，觸發登出讓使用者回首頁
    if (error.response?.status === 401) {
      console.log("連線逾時，請重新登入");
      // 實作登出邏輯 (例如：zustand 的 logout，然後導向 /login)
    }

    return Promise.reject(error);
  },
);
```

---

## 3. 實作順序建議

1. **修正 Axios 基礎設定**：先加上 `withCredentials: true`。
2. **抓取 Token**：在前端初始化時 (例如根組件的 `useEffect` 中)，執行 `GET /api/v2/auth/csrf-token` 把 token 存進全域狀態。
3. **攔截器上層**：在 `apiClient` 加上 request interceptor，把全域狀態裡的 Token 自動補入 header。
4. **驗收**：只要完成上述動作，你的這支 `POST /api/v2/notifications/token` (以及未來所有的 `POST/PUT`) 就會從 403 紅字變成 20X 綠字了！
