# 前端 v2 AI 食譜生成 API 對接規劃書

**版本**: v1.0
**日期**: 2026-03-04
**適用範圍**: `/api/v2/ai/*`
**相關後端檔案**: `src/controllers/V2AiController.ts`, `src/routes/v2/aiRoutes.ts`

---

## 總覽

v2 AI 食譜生成 API 與 v1 在**功能上完全一致**（底層共用同一服務），差異在於：

| 項目         | v1                                   | v2                                        |
| ------------ | ------------------------------------ | ----------------------------------------- |
| 認證方式     | `X-User-Id` header / CookieAuth (舊) | JWT Cookie / `Authorization: Bearer`      |
| Request 驗證 | 自訂 middleware                      | Zod（在 Controller 層）                   |
| 路徑前綴     | `/api/v1/ai`                         | `/api/v2/ai`                              |
| 回應格式     | `{ status, message, data }`          | `{ success, data }` (BaseController 格式) |

> [!IMPORTANT]
> v1 API 不受任何影響，遷移是漸進式的，可在準備好時再切換。

---

## 端點一覽

### 1. 標準食譜生成

```http
POST /api/v2/ai/recipe
Content-Type: application/json
```

**認證**: Optional（登入可追蹤 daily quota；匿名仍可使用）

**Request Body**:

```json
{
  "prompt": "我想吃日式家常料理",
  "servings": 2,
  "recipeCount": 2,
  "difficulty": "簡單",
  "category": "日式",
  "selectedIngredients": ["雞腿", "馬鈴薯"],
  "excludeIngredients": ["花生"]
}
```

| 欄位                  | 型別                     | 必填 | 限制                 |
| --------------------- | ------------------------ | ---- | -------------------- |
| `prompt`              | string                   | ✅   | 3–500 字             |
| `servings`            | number                   | ❌   | 1–20，預設 2         |
| `recipeCount`         | number                   | ❌   | 1–5，預設 2          |
| `difficulty`          | `"簡單"\|"中等"\|"困難"` | ❌   |                      |
| `category`            | string                   | ❌   | 如：中式、日式、西式 |
| `selectedIngredients` | string[]                 | ❌   | 從庫存選取的食材     |
| `excludeIngredients`  | string[]                 | ❌   | 要排除的食材         |

**成功回應** `200`:

```json
{
  "success": true,
  "data": {
    "greeting": "以下是為您推薦的日式料理...",
    "recipes": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "照燒雞腿飯",
        "category": "日式",
        "imageUrl": "https://res.cloudinary.com/fufood/image/upload/v.../recipe.jpg",
        "servings": 2,
        "cookTime": 30,
        "difficulty": "簡單",
        "isFavorite": false,
        "ingredients": [{ "name": "雞腿", "amount": "2", "unit": "隻" }],
        "seasonings": [{ "name": "醬油", "amount": "3", "unit": "大匙" }],
        "steps": [{ "step": 1, "description": "將雞腿醃製 15 分鐘..." }]
      }
    ],
    "aiMetadata": {
      "generatedAt": "2026-03-04T13:48:00.000Z",
      "model": "gemini-1.5-flash",
      "apiKeyUsed": 1
    },
    "remainingQueries": 2
  }
}
```

> [!NOTE]
> `imageUrl` 現在會自動填入 Cloudinary HTTPS URL（後端生成），前端直接使用即可，無需特別處理。

**錯誤回應**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "path": ["prompt"], "message": "prompt 至少 3 個字" }]
  }
}
```

| 錯誤 code          | HTTP | 說明                  |
| ------------------ | ---- | --------------------- |
| `VALIDATION_ERROR` | 422  | Zod 驗證失敗          |
| `AI_003`           | 429  | 已達每日 quota        |
| `AI_005`           | 500  | AI 服務內部錯誤       |
| `AI_006`           | 408  | AI 請求超時           |
| `AI_007`           | 400  | Prompt Injection 偵測 |

---

### 2. SSE 串流生成

```http
POST /api/v2/ai/recipe/stream
Content-Type: application/json
```

**認證**: Optional（同上）

**Request Body**: 與標準生成完全相同

**回應格式**: `text/event-stream`（Server-Sent Events）

前端處理範例：

```typescript
const response = await fetch("/api/v2/ai/recipe/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // 帶上 Cookie
  body: JSON.stringify({ prompt: "我想吃日式料理" }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split("\n");
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const event = JSON.parse(line.slice(5).trim());

    switch (event.event) {
      case "start":
        // 開始生成，可顯示 loading
        break;
      case "progress":
        // event.data.percent (0-100), event.data.stage (文字說明)
        setProgress(event.data.percent);
        setStage(event.data.stage); // e.g. "正在為您生成食譜圖片..."
        break;
      case "done":
        // event.data.recipes[] 已包含 imageUrl
        setRecipes(event.data.recipes);
        break;
      case "error":
        // event.data.code, event.data.message
        showError(event.data.message);
        break;
    }
  }
}
```

**SSE 事件流程**:

```
start → chunk（x N）→ progress（90%）→ progress（95%，開始生圖）→ done（含 imageUrl）
```

> [!IMPORTANT]
> `done` 事件中的 `recipes` 並不在 `event.data.data.recipes`，而是直接在 `event.data.recipes`（SSE 格式不走 BaseController 包裝）。

---

### 3. 取得 Prompt 建議

```http
GET /api/v2/ai/recipe/suggestions
```

**認證**: 無

**成功回應** `200`:

```json
{
  "success": true,
  "data": {
    "suggestions": [
      "台灣感性的食物",
      "晚餐想吃日式",
      "聖誕節大餐",
      "想念泰國料理"
    ]
  }
}
```

---

### 4. 查詢 Quota 狀態

```http
GET /api/v2/ai/recipe/quota
Authorization: Bearer <access_token>
```

**認證**: JWT 必填

**成功回應** `200`:

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-...",
    "message": "請呼叫 POST /api/v2/ai/recipe 以取得剩餘次數"
  }
}
```

> [!NOTE]
> 實際剩餘次數（`remainingQueries`）會在每次呼叫生成 API 後一併回傳，不需要獨立呼叫此端點，此端點僅用於確認登入狀態。

---

## v1 → v2 遷移對照

| 原 v1 呼叫                          | 新 v2 呼叫                            | 差異                                                                          |
| ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| `POST /api/v1/ai/recipe`            | `POST /api/v2/ai/recipe`              | 回應格式：`data.*` → `data.*`（同，但外層從 `status/message` 改為 `success`） |
| `POST /api/v1/ai/recipe/stream`     | `POST /api/v2/ai/recipe/stream`       | SSE 內容格式完全一致，無需修改事件處理邏輯                                    |
| `GET /api/v1/ai/recipe/suggestions` | `GET /api/v2/ai/recipe/suggestions`   | 同                                                                            |
| `X-User-Id: <userId>` header        | JWT Cookie 或 `Authorization: Bearer` | 認證方式更換                                                                  |

### 回應格式差異

**v1**:

```json
{ "status": true, "message": "ok", "data": { ... } }
```

**v2**:

```json
{ "success": true, "data": { ... } }
```

前端只需把 `response.data.status` 的判斷改為 `response.data.success` 即可。

---

## 常見問題

**Q: `imageUrl` 為什麼有時還是 null？**

後端接收到請求後，圖片生成是非同步且有備援機制（Gemini → Pollinations → Unsplash），每張圖最長等待 10 秒。若三層都失敗，`imageUrl` 仍會是 `null`。前端應對此做防禦性渲染（顯示預設佔位圖）。

**Q: SSE 斷線了怎麼辦？**

SSE 連線中斷後，可重新呼叫 `POST /api/v2/ai/recipe`（非串流版本）取得完整結果。不建議自動重連 SSE（會扣 quota）。

**Q: 匿名用戶的 quota 怎麼計算？**

匿名用戶統一以 `"anonymous"` 計算，所有匿名請求共用 quota，生產環境建議引導用戶登入。
