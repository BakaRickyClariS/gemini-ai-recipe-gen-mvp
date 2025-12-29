# 庫存設定 API 整合問題排查報告

**版本**: v1.0  
**日期**: 2025-12-29  
**問題**: 庫存設定頁面未顯示類別資料

---

## 問題摘要

前端庫存設定頁面（`/inventory?tab=settings`）的「庫存排序設定」區塊顯示空白，未載入類別資料。

---

## 問題分析結果

### 根本原因

```
┌─────────────────┐                    ┌─────────────────┐
│     前端        │  /api/v1/          │   主後端 API    │
│  localhost:5173 │ ──refrigerators──► │  (非 AI 後端)   │
│                 │ ◄─── 500 Error ─── │                 │
└─────────────────┘                    └─────────────────┘
         │
         ▼
      ❌ 無法取得 refrigeratorId
         │
         ▼
      ❌ 從未呼叫 AI 後端的 inventory/settings API
```

| 步驟 | 預期行為 | 實際狀況 |
|------|----------|----------|
| 1. 取得冰箱列表 | 呼叫 `/api/v1/refrigerators` 成功 | ❌ 回傳 500 錯誤（空回應） |
| 2. 取得冰箱 ID | 從列表中取得 `refrigeratorId` | ❌ 無法取得（JSON 解析失敗） |
| 3. 呼叫設定 API | 呼叫 AI 後端 `/inventory/settings` | ❌ 從未執行 |
| 4. 顯示設定資料 | 頁面渲染類別資料 | ❌ 顯示空白 |

### AI 後端狀態

> [!TIP]
> **AI 後端已準備就緒**  
> - ✅ CORS 已設定允許 `X-User-Id` header  
> - ✅ `getInventorySettings` 已改為自動初始化（資料庫無記錄時會自動建立預設設定）  
> - ✅ API 端點: `GET /api/v1/refrigerators/{refrigeratorId}/inventory/settings`

---

## 前端修改建議

### 方案 A：處理主後端 API 失敗 (推薦)

當 `/api/v1/refrigerators` 失敗時，使用本地暫存的 `refrigeratorId` 或預設值。

```typescript
// src/modules/inventory/hooks/useInventorySettings.ts
const getRefrigeratorId = async (): Promise<string> => {
  try {
    // 嘗試從主後端取得
    const refrigerators = await mainBackendApi.get('/api/v1/refrigerators');
    if (refrigerators?.length > 0) {
      const id = refrigerators[0].id;
      localStorage.setItem('activeRefrigeratorId', id);
      return id;
    }
  } catch (error) {
    console.warn('[Inventory] 無法取得冰箱列表，使用暫存 ID');
  }
  
  // Fallback: 從 localStorage 取得
  const cachedId = localStorage.getItem('activeRefrigeratorId');
  if (cachedId) return cachedId;
  
  // 最後手段：使用 userId 作為預設 refrigeratorId
  const userId = getUserId();
  return userId || 'default-refrigerator';
};
```

---

### 方案 B：從 Groups API 取得冰箱 ID

根據 console 日誌，`[Groups API]` 有成功取得冰箱資料。可以共用該資料來源。

```typescript
// 如果 Groups 模組已成功取得冰箱資料
import { useAppSelector } from '@/stores';

const refrigeratorId = useAppSelector(
  (state) => state.groups.activeRefrigerator?.id
);
```

---

### 方案 C：延遲載入設定 API

確保只在取得有效 `refrigeratorId` 後才呼叫設定 API。

```typescript
// src/modules/inventory/components/SettingsPanel.tsx
useEffect(() => {
  const loadSettings = async () => {
    const refrigeratorId = await getRefrigeratorId();
    
    if (!refrigeratorId) {
      console.error('[Settings] 無法取得 refrigeratorId，跳過設定載入');
      return;
    }
    
    try {
      const settings = await aiApiClient.get(
        `/api/v1/refrigerators/${refrigeratorId}/inventory/settings`
      );
      setSettings(settings);
    } catch (error) {
      console.error('[Settings] 載入失敗', error);
    }
  };
  
  loadSettings();
}, []);
```

---

## 測試 AI 後端 API

前端可以使用以下方式測試 AI 後端是否正常：

### 瀏覽器 Console 測試

```javascript
// 在 DevTools Console 執行
fetch('https://gemini-ai-recipe-gen-mvp.vercel.app/api/v1/refrigerators/test-ref-123/inventory/settings', {
  headers: {
    'X-User-Id': 'test-user-123',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Settings:', data))
.catch(err => console.error('Error:', err));
```

### 預期回應

```json
{
  "status": true,
  "data": {
    "id": "uuid-xxx",
    "userId": "test-user-123",
    "refrigeratorId": "test-ref-123",
    "layoutType": "layout-a",
    "categoryOrder": ["fruit", "frozen", "bake", "milk", "seafood", "meat", "others"],
    "categories": [
      { "id": "fruit", "title": "蔬果類", "isVisible": true, "subCategories": [...] },
      // ... 7 個預設類別
    ],
    "lowStockThreshold": 2,
    "expiringSoonDays": 3,
    "notifyOnExpiry": true,
    "notifyOnLowStock": true,
    "createdAt": "2025-12-29T..."
  }
}
```

---

## 修改優先級

| 優先級 | 項目 | 說明 |
|--------|------|------|
| 🔴 高 | 處理 refrigerators API 失敗 | 實作 fallback 機制取得 refrigeratorId |
| 🔴 高 | 確保有 refrigeratorId 才呼叫設定 API | 避免 undefined 導致的錯誤 |
| 🟡 中 | 加入載入狀態 | 在等待 API 時顯示 loading |
| 🟢 低 | 錯誤處理優化 | 顯示友善的錯誤訊息給使用者 |

---

## 總結

> [!IMPORTANT]
> **問題不在 AI 後端**  
> AI 後端的 inventory settings API 已正常運作，並支援自動初始化預設設定。  
> 前端需要修改取得 `refrigeratorId` 的邏輯，以應對主後端 `/api/v1/refrigerators` 可能失敗的情況。
