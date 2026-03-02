# Profile API 前端修改建議書

> 對應後端修復日期：2026-03-02

---

## Bug 2. `PUT /api/v2/profile` 回應結構對應

### 問題

前端的 Axios Interceptor 或 Mutation 讀的是 `{ "status": "success", "data": {...} }`，但後端的**統一標準格式**一直都是：

```json
{
  "success": true,
  "data": { ... }
}
```

後端不會為個別 API 更改全域回應結構，以避免影響所有其他 v2 API。

### 前端修改

**Axios interceptor** 或個別 profile mutation 中，把判斷從 `status` 改為 `success`：

```ts
// ❌ 舊
if (response.data.status === "success") {
  updateCache(response.data.data);
}

// ✅ 新
if (response.data.success === true) {
  updateCache(response.data.data);
}
```

若有全域 interceptor，統一修改一個地方即可：

```ts
// axios interceptor example
axios.interceptors.response.use((response) => {
  // 後端統一格式是 { success: boolean, data: T }
  if (response.data?.success === false) {
    return Promise.reject(response.data.error);
  }
  return response;
});
```

---

## Bug 3. 開發環境 `401 Unauthorized` / Cookie 無法寫入

### 問題

`POST /api/v2/auth/login` 成功但後續請求一直 401，或 FCM 註冊卡住。  
原因：HttpOnly Cookie 未被攜帶到後續請求。

### 前端修改

**所有 API 請求都必須帶 `credentials: 'include'` / `withCredentials: true`**：

```ts
// fetch
fetch("/api/v2/auth/login", {
  method: "POST",
  credentials: "include", // ← 必須
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

// Axios（全域設定）
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // ← 必須，全域設定後所有請求都會帶 cookie
});
```

> ⚠️ 如果只有部分請求有加 `withCredentials`，Cookie 仍會消失。**建議一律在 axios instance 全域設定。**

### 確認清單

- [ ] Axios instance 有加 `withCredentials: true`
- [ ] 沒有混用 `fetch` 又沒帶 `credentials: 'include'`
- [ ] Dev 環境的 `VITE_API_BASE_URL` 指向正確的後端 URL（例如 `http://localhost:3001`）

---

## 已由後端修復（無需前端動作）

| Bug                | 說明                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| A. `name` 欄位為空 | 後端現在在 `GET /profile` 和 `PUT /profile` 均回傳 `name`（對應 `displayName`） |
| B. `gender` 為字串 | 後端現在一律回傳數字（`0~4`），例如 `"NotSpecified"` → `0`                      |
