# 前端介接變更說明文件 (Backend Handoff)

**日期**: 2025-12-19  
**類別**: API 架構調整  
**影響範圍**: 庫存選擇功能、媒體上傳功能

---

## 1. 庫存 API 呼叫方式變更 (重大變更)

AI Server 用於轉發庫存請求的 Proxy 端點已**移除**，請前端改為直接呼叫主後端 API。

### ❌ 移除的端點 (AI Server)
*   **Path**: `GET /api/v1/inventory/ai-selection`
*   **Host**: `VITE_AI_API_BASE_URL` (AI Server)
*   **狀態**: <span style="color:red">已停用 (404 Not Found)</span>

### ✅ 新的呼叫方式 (Main Backend)
請前端直接向主後端請求庫存資料。

*   **Path**: `/api/v1/inventory/ai-selection` (請確認主後端的實際路徑)
*   **Host**: `VITE_BACKEND_API_BASE_URL` (主後端 Server)
*   **Header**: 需帶入 User 的 `Authorization: Bearer <token>`
*   **優點**: 減少一層轉發，降低延遲，權限驗證更直接。

**修改範例 (虛擬碼):**

```typescript
// 🔴 OLD (Don't use this)
// const response = await aiApi.get('/inventory/ai-selection');

// 🟢 NEW (Use this)
// 直接呼叫 backendApi
const response = await backendApi.get('/inventory/ai-selection');
```

---

## 2. 媒體上傳 API 更新

AI Server 新增了統一的媒體上傳端點，支援 Unsigned (免簽名) 模式，方便前端直接整合。

*   **端點**: `POST /api/v1/media/upload`
*   **Host**: `VITE_AI_API_BASE_URL`
*   **Content-Type**: `multipart/form-data`
*   **參數**:
    *   `file`: 要上傳的圖片檔案 (Binary)

**回應格式**:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "fufood/..."
  }
}
```

> **Note**: 上傳後取得的 `url` 可直接用於呼叫 AI 分析介面 (`/api/v1/ai/analyze-image` 的 `imageUrl` 參數)。
