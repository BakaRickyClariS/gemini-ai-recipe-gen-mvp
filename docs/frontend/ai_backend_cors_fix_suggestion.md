# AI 後端 CORS 設定修改建議書

**版本**: v1.0  
**日期**: 2025-12-29  
**目的**: 解決前端呼叫 AI 後端 API 時的 CORS 錯誤

---

## 問題摘要

前端已成功實作 `X-User-Id` header，但瀏覽器因 **CORS 政策** 阻擋了請求。

### 錯誤訊息

```
Access to fetch at 'https://gemini-ai-recipe-gen-mvp.vercel.app/api/v1/refrigerators/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Request header field x-user-id is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

### 問題分析

```
┌─────────────────┐      Preflight (OPTIONS)      ┌─────────────────┐
│     前端        │ ────────────────────────────► │   AI 後端       │
│  localhost:5173 │                               │ gemini-ai-...   │
│                 │ ◄────────────────────────────  ─┴─────────────────┘
└─────────────────┘   ❌ X-User-Id not allowed         
                      在 Access-Control-Allow-Headers
```

當瀏覽器發送跨域請求且包含自訂 header（如 `X-User-Id`）時，會先發送 **Preflight 請求（OPTIONS）**。
後端必須在 preflight 回應的 `Access-Control-Allow-Headers` 中明確允許 `X-User-Id`。

---

## 建議修改

### 1. 更新 CORS 設定

在 AI 後端的 CORS 配置中，將 `X-User-Id` 加入允許的 headers 列表。

#### Express.js 範例

```javascript
// server.js 或 cors.config.js
const cors = require('cors');

const corsOptions = {
  origin: [
    'http://localhost:5173',      // 本地開發
    'http://localhost:5174',      // 備用
    'https://fufood.vercel.app',  // 生產環境
    'https://fufood.jocelynh.me', // 自訂網域
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-User-Id',  // ← 新增這行
  ],
  credentials: true,
};

app.use(cors(corsOptions));
```

#### Vercel Serverless (vercel.json) 範例

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization,X-User-Id" },
        { "key": "Access-Control-Allow-Credentials", "value": "true" }
      ]
    }
  ]
}
```

#### Next.js API Route 範例

```typescript
// pages/api/[...path].ts 或 middleware.ts
export const config = {
  api: {
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // 處理 Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(204).end();
    return;
  }

  // 正常請求也要設定 CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // ... 其他處理邏輯
}
```

---

## 驗證步驟

修改完成後，請確認：

1. ✅ 從 `http://localhost:5173` 發送包含 `X-User-Id` header 的請求
2. ✅ 後端 Preflight 回應 (OPTIONS) 包含：
   ```
   Access-Control-Allow-Headers: Content-Type,Authorization,X-User-Id
   ```
3. ✅ 實際 API 請求成功（200/201）
4. ✅ 回應資料正確

### cURL 測試 Preflight

```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-User-Id,Content-Type" \
  https://gemini-ai-recipe-gen-mvp.vercel.app/api/v1/refrigerators/test/inventory \
  -v
```

預期回應應包含：
```
< Access-Control-Allow-Headers: Content-Type,Authorization,X-User-Id
< Access-Control-Allow-Origin: http://localhost:5173
```

---

## 影響範圍

| API 類型 | 影響 |
|----------|------|
| Inventory API | `/api/v1/refrigerators/{id}/inventory/*` |
| Recipe Storage API | `/api/v1/recipes/*` |
| 其他需要 X-User-Id 的 API | 所有使用者相關操作 |

---

## 前端狀態

> [!TIP]
> **前端已完成修改**  
> `src/api/client.ts` 中的 `ApiClient` 已正確實作 `X-User-Id` header 注入。  
> 只要後端 CORS 設定更新完成，API 即可正常運作。
