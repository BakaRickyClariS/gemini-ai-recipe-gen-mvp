# Auth API v2 前端整合指南 (Frontend Integration Guide)

本文件說明 `api/v2/auth` 的重大變更，包含欄位正名與錯誤處理優化。

## 1. 欄位正名 (Field Renaming)

為了符合 `clean-code` 規範（Naming Rules）並與 `Profile` 模組一致，註冊 API 的欄位已由 `displayName` 統一更名為 `name`。

### 註冊 API：`POST /api/v2/auth/register`

**Request Body 比照：**
```json
{
  "email": "user@example.com",
  "password": "password1234",
  "name": "使用者名稱" // 原為 displayName
}
```

---

## 2. 錯誤處理優化 (Error Response Optimization)

針對 **v2** 所有端點，當發生 422 驗證錯誤或業務邏輯錯誤時，後端會主動提取具體的錯誤描述至頂層 `message` 欄位，前端可直接顯示此訊息。

### 驗證錯誤範例 (422 Unprocessable Entity)
當欄位輸入不符（如密碼太短、Email 格式錯誤）時：

```json
{
  "success": false,
  "message": "密碼長度至少需 8 個字元", // 已提取至頂層，繁體中文
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...] // 原始 Zod 錯誤細節
  }
}
```

### 業務衝突範例 (409 Conflict)
當資料發生衝突時：

```json
{
  "success": false,
  "message": "該電子郵件已有人使用",
  "error": {
    "code": "CONFLICT",
    "message": "該電子郵件已有人使用"
  }
}
```

---

## 3. 前端建議介接方式

### API 呼叫 (Axios 範例)
```typescript
try {
  await api.post('/v2/auth/register', { email, password, name });
} catch (error) {
  // 優先抓取後端回傳的中文訊息
  const errMsg = error.response?.data?.message || '註冊失敗，請稍後再試';
  showToast(errMsg);
}
```

### 型別更新
請更新 `Auth` 相關的 TypeScript Interface：

```typescript
export interface RegisterRequest {
  email: string;
  password: string;
  name: string; // 更新此欄位
}
```

---

## 4. 向下相容性說明
- **v1 API (`/api/v1/auth/*`)**：完全不受影響，依舊使用舊有的欄位名稱與錯誤格式。
- **後端資料庫**：內部資料庫依舊存儲在 `display_name` 欄位，轉換邏輯由 Service 層自動處理。

---
*文件產生日期：2026-03-11*
