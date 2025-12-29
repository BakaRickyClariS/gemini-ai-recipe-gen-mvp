# 前端庫存 API 整合修改規劃書

**版本**: v1.0  
**日期**: 2025-12-29  
**目的**: 解決庫存 API 呼叫時的 400 錯誤，並說明認證機制

---

## 問題摘要

目前前端呼叫庫存 API 時出現以下錯誤：

```json
{
  "status": false,
  "error": "缺少 X-User-Id"
}
```

---

## X-User-Id 與 Auth 的關係

### 架構說明

本專案採用**雙後端架構**：

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     前端        │      │   主後端 API    │      │   AI 後端 API   │
│  (localhost:    │◄────►│  (主系統認證)   │      │ (gemini-ai-     │
│   5173)         │      │                 │      │  recipe-gen-mvp)│
└─────────────────┘      └─────────────────┘      └─────────────────┘
       │                        │                        ▲
       │                        │                        │
       │            ┌───────────┴───────────┐            │
       │            │  JWT Token / Cookie   │            │
       │            │  認證使用者身份       │            │
       │            └───────────────────────┘            │
       │                                                 │
       └─────────────────────────────────────────────────┘
                    X-User-Id Header 傳遞使用者 ID
```

### 為什麼需要 X-User-Id？

| 項目 | 主後端 | AI 後端 (本專案) |
|------|--------|-----------------|
| **認證方式** | JWT Token / Cookie | **無獨立認證** |
| **身份識別** | 後端驗證 Token 取得 userId | 需前端傳入 `X-User-Id` |
| **安全責任** | 主後端負責 | 信任前端傳入的 userId |

### 流程說明

1. **使用者登入** → 主後端驗證成功，回傳 JWT Token
2. **前端取得 userId** → 從主後端 `/api/v1/profile` 取得使用者資訊
3. **呼叫 AI 後端 API** → 在 Header 中帶上 `X-User-Id: {userId}`
4. **AI 後端處理** → 使用 `X-User-Id` 識別操作歸屬

---

## 修改規劃

### 1. 建立統一的 AI API Client

**目標**: 所有呼叫 AI 後端的請求都自動帶上 `X-User-Id`

**建議位置**: `src/api/aiApiClient.ts`

```typescript
// src/api/aiApiClient.ts
import { getUserId } from '@/stores/authStore'; // 或從 localStorage 取得

const AI_API_BASE = import.meta.env.VITE_AI_API_URL;

export const aiApiClient = {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const userId = getUserId(); // 取得當前登入使用者 ID

    if (!userId) {
      throw new Error('使用者未登入');
    }

    const response = await fetch(`${AI_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,  // ← 自動帶入
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API 請求失敗');
    }

    return response.json();
  },

  get: <T>(endpoint: string) => aiApiClient.request<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    aiApiClient.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    aiApiClient.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    aiApiClient.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    aiApiClient.request<T>(endpoint, { method: 'DELETE' }),
};
```

---

### 2. 更新庫存 API 呼叫

**修改檔案**: `src/api/inventoryApi.ts` (或類似檔案)

```typescript
// src/api/inventoryApi.ts
import { aiApiClient } from './aiApiClient';

export const inventoryApi = {
  // 取得庫存設定
  getSettings: (refrigeratorId: string) =>
    aiApiClient.get<{ settings: InventorySettings }>(
      `/api/v1/refrigerators/${refrigeratorId}/inventory/settings`
    ),

  // 更新庫存設定
  updateSettings: (refrigeratorId: string, data: UpdateSettingsInput) =>
    aiApiClient.put(
      `/api/v1/refrigerators/${refrigeratorId}/inventory/settings`,
      data
    ),

  // 取得庫存列表
  getItems: (refrigeratorId: string, params?: InventoryParams) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return aiApiClient.get<{ items: InventoryItem[]; total: number }>(
      `/api/v1/refrigerators/${refrigeratorId}/inventory?${query}`
    );
  },

  // 新增食材
  createItem: (refrigeratorId: string, data: CreateItemInput) =>
    aiApiClient.post(
      `/api/v1/refrigerators/${refrigeratorId}/inventory`,
      data
    ),

  // 消耗食材
  consumeItem: (refrigeratorId: string, itemId: string, data: ConsumeInput) =>
    aiApiClient.post(
      `/api/v1/refrigerators/${refrigeratorId}/inventory/${itemId}/consume`,
      data
    ),

  // 取得分類列表
  getCategories: (refrigeratorId: string) =>
    aiApiClient.get<{ categories: CategoryInfo[] }>(
      `/api/v1/refrigerators/${refrigeratorId}/inventory/categories`
    ),

  // 取得庫存摘要
  getSummary: (refrigeratorId: string) =>
    aiApiClient.get<{ summary: InventorySummary }>(
      `/api/v1/refrigerators/${refrigeratorId}/inventory/summary`
    ),
};
```

---

### 3. 取得 User ID 的方法

**選項 A**: 從 Redux Store 取得

```typescript
// src/stores/authStore.ts
export const getUserId = (): string | null => {
  const state = store.getState();
  return state.auth.user?.id ?? null;
};
```

**選項 B**: 從 localStorage 取得

```typescript
export const getUserId = (): string | null => {
  const user = localStorage.getItem('user');
  if (user) {
    return JSON.parse(user).id;
  }
  return null;
};
```

**選項 C**: 從主後端 Profile API 取得（首次載入時）

```typescript
// 在登入成功後呼叫
const profile = await mainBackendApi.get('/api/v1/profile');
localStorage.setItem('userId', profile.data.id);
```

---

## 修改清單

| 優先級 | 檔案/模組 | 修改內容 |
|--------|----------|---------|
| 🔴 高 | `aiApiClient.ts` | 新建 AI API Client，自動帶入 X-User-Id |
| 🔴 高 | `inventoryApi.ts` | 改用 aiApiClient 發送請求 |
| 🟡 中 | `authStore.ts` | 新增 `getUserId()` helper |
| 🟡 中 | `OverviewPanel.tsx` | 確認使用新的 inventoryApi |
| 🟡 中 | `SettingsPanel.tsx` | 確認使用新的 inventoryApi |
| 🟢 低 | 其他庫存元件 | 統一使用 inventoryApi |

---

## 測試確認

修改完成後，請確認：

1. ✅ 開啟 DevTools → Network
2. ✅ 呼叫庫存 API 時 Request Headers 包含 `X-User-Id`
3. ✅ API 回傳 200 且資料正確

---

## 環境變數

確認 `.env` 設定：

```bash
# Development
VITE_AI_API_URL=http://localhost:3000

# Production
VITE_AI_API_URL=https://gemini-ai-recipe-gen-mvp.vercel.app
```
