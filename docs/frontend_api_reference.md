# 前端 AI Recipe API 整合參考指南

**版本**: v1.0  
**最後更新**: 2025-12-21  
**適用對象**: 前端開發人員

> [!TIP]
> 本文件整合了 AI 服務的所有 API 端點，提供前端開發時的完整參考。包含 TypeScript 類型定義、請求/回應範例、錯誤處理及 SSE Streaming 整合指南。

---

## 📋 目錄

- [API 架構概覽](#api-架構概覽)
- [端點總覽](#端點總覽)
- [TypeScript 類型定義](#typescript-類型定義)
- [1. AI 食譜生成 API](#1-ai-食譜生成-api)
- [2. SSE Streaming API](#2-sse-streaming-api)
- [3. 媒體上傳 API](#3-媒體上傳-api)
- [4. 影像辨識 API](#4-影像辨識-api)
- [5. 預設 Prompt 建議 API](#5-預設-prompt-建議-api)
- [錯誤處理](#錯誤處理)
- [前端整合範例](#前端整合範例)
- [環境變數配置](#環境變數配置)

---

## API 架構概覽

前端採用**雙 API 架構**，區分 AI 服務與主後端服務：

| API 類型        | 環境變數                    | 用途                             |
| --------------- | --------------------------- | -------------------------------- |
| **AI API**      | `VITE_AI_API_BASE_URL`      | AI 食譜生成、影像辨識、媒體上傳  |
| **Backend API** | `VITE_BACKEND_API_BASE_URL` | 使用者認證、庫存管理、群組管理等 |

```typescript
// 建議的 API Client 架構
import { ApiClient } from "@/api/ApiClient";

// AI API（食譜生成、OCR、媒體上傳）
export const aiApi = new ApiClient(import.meta.env.VITE_AI_API_BASE_URL);

// Backend API（認證、庫存、群組等）
export const backendApi = new ApiClient(
  import.meta.env.VITE_BACKEND_API_BASE_URL
);
```

---

## 端點總覽

### AI 服務端點

| #   | Method | Path                            | 功能                         | Content-Type                                |
| --- | ------ | ------------------------------- | ---------------------------- | ------------------------------------------- |
| 1   | POST   | `/api/v1/ai/recipe`             | AI 多食譜生成（標準回應）    | `application/json`                          |
| 2   | POST   | `/api/v1/ai/recipe/stream`      | AI 食譜生成（SSE Streaming） | `text/event-stream`                         |
| 3   | GET    | `/api/v1/ai/recipe/suggestions` | 取得預設 Prompt 建議         | `application/json`                          |
| 4   | POST   | `/api/v1/media/upload`          | 上傳圖片至 CDN               | `multipart/form-data`                       |
| 5   | POST   | `/api/v1/ai/analyze-image`      | AI 食材辨識                  | `multipart/form-data` 或 `application/json` |

### 系統端點

| Method | Path            | 說明              |
| ------ | --------------- | ----------------- |
| GET    | `/health`       | 健康檢查          |
| GET    | `/status`       | 服務狀態          |
| GET    | `/docs`         | Swagger UI 文檔   |
| GET    | `/openapi.json` | OpenAPI 規格 JSON |

---

## TypeScript 類型定義

### 請求類型

```typescript
/**
 * AI 食譜生成請求
 */
export type AIRecipeRequest = {
  /** 使用者的自然語言提示（必填） */
  prompt: string;

  // ===== 預設自動納入（後端自動讀取） =====

  /** 是否自動納入使用者庫存食材（預設 true） */
  includeInventory?: boolean;

  /** 是否套用使用者飲食偏好設定（預設 true） */
  applyDietaryPreferences?: boolean;

  // ===== 額外篩選條件（讓結果更精準） =====

  /** 預計人數（可選，預設 2） */
  servings?: number;

  /** 難易度偏好（可選） */
  difficulty?: "簡單" | "中等" | "困難";

  /** 料理類型偏好（可選） */
  category?: string;

  /** 額外選擇的庫存食材名稱 */
  selectedIngredients?: string[];

  /** 額外排除的食材 */
  excludeIngredients?: string[];

  /** 希望推薦幾道食譜（預設 2，最多 5） */
  recipeCount?: number;
};
```

### 回應類型

```typescript
/** 食材項目（準備材料或調味料） */
export type IngredientItem = {
  name: string; // 食材名稱
  amount: string; // 數量（如 "3-4" 或 "1/2"）
  unit: string; // 單位（如：條、瓣、茶匙）
};

/** 烹煮步驟 */
export type CookingStep = {
  step: number; // 步驟編號
  description: string; // 步驟說明
};

/** 食譜項目（完整資訊） */
export type RecipeListItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string; // AI 生成的圖片（Base64 Data URL）
  servings: number;
  cookTime: number; // 烹飪時間（分鐘）
  isFavorite: boolean;
  difficulty?: "簡單" | "中等" | "困難";
  ingredients?: IngredientItem[]; // 準備材料
  seasonings?: IngredientItem[]; // 調味料
  steps?: CookingStep[]; // 烹煮步驟
};

/** AI 食譜生成回應 */
export type AIRecipeResponse = {
  status: boolean;
  message: string;
  data: {
    greeting: string; // AI 回應訊息
    recipes: RecipeListItem[]; // 生成的多個食譜
    aiMetadata: {
      generatedAt: string;
      model: string;
    };
    remainingQueries: number; // 剩餘查詢次數
  };
};
```

### SSE 事件類型

```typescript
/** SSE 事件基礎型別 */
type AIStreamEventBase = {
  id: string;
  timestamp: string;
};

/** 開始事件 */
type AIStreamStartEvent = AIStreamEventBase & {
  event: "start";
  data: { sessionId: string; model: string };
};

/** 文字片段事件 */
type AIStreamChunkEvent = AIStreamEventBase & {
  event: "chunk";
  data: {
    text: string;
    section: "greeting" | "name" | "ingredients" | "steps" | "summary";
  };
};

/** 進度事件 */
type AIStreamProgressEvent = AIStreamEventBase & {
  event: "progress";
  data: { percent: number; stage: string };
};

/** 完成事件 */
type AIStreamDoneEvent = AIStreamEventBase & {
  event: "done";
  data: {
    recipes: RecipeListItem[];
    aiMetadata: { generatedAt: string; model: string };
    remainingQueries: number;
  };
};

/** 錯誤事件 */
type AIStreamErrorEvent = AIStreamEventBase & {
  event: "error";
  data: { code: string; message: string };
};

/** SSE 事件聯合型別 */
type AIStreamEvent =
  | AIStreamStartEvent
  | AIStreamChunkEvent
  | AIStreamProgressEvent
  | AIStreamDoneEvent
  | AIStreamErrorEvent;
```

---

## 1. AI 食譜生成 API

### 端點資訊

```
POST /api/v1/ai/recipe
Content-Type: application/json
```

### 請求範例

**最簡單的請求：**

```json
{
  "prompt": "晚餐想吃日式"
}
```

**完整篩選條件：**

```json
{
  "prompt": "聖誕節大餐",
  "servings": 4,
  "difficulty": "中等",
  "category": "西式料理",
  "recipeCount": 3,
  "selectedIngredients": ["雞腿肉", "馬鈴薯"],
  "excludeIngredients": ["蝦", "花生"]
}
```

### 回應範例

```json
{
  "status": true,
  "message": "ok",
  "data": {
    "greeting": "這裡有幾道推薦的中式家常菜：",
    "recipes": [
      {
        "id": "ai-001",
        "name": "涼拌小黃瓜",
        "category": "中式",
        "imageUrl": "data:image/png;base64,iVBORw0KGgo...",
        "servings": 1,
        "cookTime": 20,
        "difficulty": "簡單",
        "isFavorite": false,
        "ingredients": [
          { "name": "小黃瓜", "amount": "3-4", "unit": "條" },
          { "name": "蒜頭", "amount": "4-5", "unit": "瓣" }
        ],
        "seasonings": [
          { "name": "醬油", "amount": "1.5", "unit": "大匙" },
          { "name": "黑醋", "amount": "1", "unit": "大匙" }
        ],
        "steps": [
          {
            "step": 1,
            "description": "將小黃瓜拍扁後切段，用鹽抓勻靜置 15 分鐘。"
          },
          { "step": 2, "description": "倒掉滲出的水分，準備蒜末。" },
          { "step": 3, "description": "混合調味料與小黃瓜充分拌勻，冷藏入味。" }
        ]
      }
    ],
    "aiMetadata": {
      "generatedAt": "2025-12-21T06:30:00Z",
      "model": "gemini-2.5-flash"
    },
    "remainingQueries": 2
  }
}
```

### 前端呼叫範例

```typescript
// 使用 TanStack Query
import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/api/client";

export const useGenerateRecipe = () => {
  return useMutation({
    mutationFn: async (request: AIRecipeRequest) => {
      const response = await aiApi.post<AIRecipeResponse>(
        "/ai/recipe",
        request
      );
      return response.data;
    },
  });
};

// 元件中使用
const { mutate, isPending, data } = useGenerateRecipe();

mutate({ prompt: "晚餐想吃日式", servings: 2 });
```

---

## 2. SSE Streaming API

### 端點資訊

```
POST /api/v1/ai/recipe/stream
Content-Type: application/json
Accept: text/event-stream
```

### SSE 事件流程

```
1. start    → 開始生成，取得 sessionId
2. chunk    → 文字片段（可能多次，依序：greeting → name → ingredients → steps）
3. progress → 進度更新（0-100%）
4. done     → 完成，包含完整結構化食譜資料
5. error    → 錯誤（如有發生）
```

### SSE 原始輸出範例

```
event: start
data: {"id":"evt-001","timestamp":"2025-12-21T00:35:00Z","sessionId":"session-abc","model":"gemini-2.5-flash"}

event: chunk
data: {"id":"evt-002","timestamp":"2025-12-21T00:35:01Z","text":"根據您想吃日式料理的需求，","section":"greeting"}

event: progress
data: {"id":"evt-003","timestamp":"2025-12-21T00:35:02Z","percent":20,"stage":"生成食材清單中..."}

event: chunk
data: {"id":"evt-004","timestamp":"2025-12-21T00:35:02Z","text":"日式照燒雞腿丼","section":"name"}

event: progress
data: {"id":"evt-005","timestamp":"2025-12-21T00:35:04Z","percent":50,"stage":"生成烹飪步驟中..."}

event: progress
data: {"id":"evt-006","timestamp":"2025-12-21T00:35:06Z","percent":90,"stage":"生成食譜圖片中..."}

event: done
data: {"id":"evt-007","timestamp":"2025-12-21T00:35:10Z","recipes":[...],"aiMetadata":{...},"remainingQueries":2}
```

### 前端 SSE 整合範例

```typescript
// SSE Hook
import { useCallback, useRef, useState } from "react";

type StreamState = {
  isStreaming: boolean;
  text: string;
  progress: number;
  stage: string;
  recipes: RecipeListItem[] | null;
  error: string | null;
};

export const useRecipeStream = () => {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    text: "",
    progress: 0,
    stage: "",
    recipes: null,
    error: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (request: AIRecipeRequest) => {
    // 使用 fetch + ReadableStream 處理 POST SSE
    const response = await fetch(
      `${import.meta.env.VITE_AI_API_BASE_URL}/ai/recipe/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(request),
      }
    );

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    setState((s) => ({ ...s, isStreaming: true, text: "", error: null }));

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          handleEvent(data);
        }
      }
    }

    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const handleEvent = (event: AIStreamEvent) => {
    switch (event.event) {
      case "chunk":
        setState((s) => ({ ...s, text: s.text + event.data.text }));
        break;
      case "progress":
        setState((s) => ({
          ...s,
          progress: event.data.percent,
          stage: event.data.stage,
        }));
        break;
      case "done":
        setState((s) => ({ ...s, recipes: event.data.recipes }));
        break;
      case "error":
        setState((s) => ({ ...s, error: event.data.message }));
        break;
    }
  };

  return { ...state, startStream };
};
```

---

## 3. 媒體上傳 API

### 端點資訊

```
POST /api/v1/media/upload
Content-Type: multipart/form-data
```

### 請求參數

| 欄位   | 類型      | 必填 | 說明             |
| ------ | --------- | ---- | ---------------- |
| `file` | File/Blob | ✅   | 要上傳的圖片檔案 |

### 回應範例

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fufood/abc123.jpg",
    "publicId": "fufood/abc123"
  }
}
```

### 前端呼叫範例

```typescript
// mediaApi.ts
import { aiApi } from "@/api/client";

export const mediaApi = {
  uploadImage: async (file: File | Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${import.meta.env.VITE_AI_API_BASE_URL}/media/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (result.success && result.data?.url) {
      return result.data.url;
    }

    throw new Error("Upload failed");
  },
};

// React Hook
export const useImageUpload = () => {
  return useMutation({
    mutationFn: mediaApi.uploadImage,
    onError: (error) => {
      console.error("上傳失敗:", error);
    },
  });
};
```

---

## 4. 影像辨識 API

### 端點資訊

```
POST /api/v1/ai/analyze-image
```

### 請求方式

**方式 A：使用圖片 URL（推薦）**

```json
{
  "imageUrl": "https://res.cloudinary.com/xxx/image/upload/sample.jpg"
}
```

**方式 B：直接上傳檔案**

```
Content-Type: multipart/form-data
FormData: { file: File }
```

### 回應範例

```json
{
  "success": true,
  "data": {
    "productName": "蘋果",
    "category": "蔬果類",
    "attributes": "水果類",
    "purchaseQuantity": 1,
    "unit": "顆",
    "purchaseDate": "2025-12-21",
    "expiryDate": "2025-12-28",
    "lowStockAlert": true,
    "lowStockThreshold": 2,
    "notes": "",
    "imageUrl": "https://res.cloudinary.com/xxx/image/upload/sample.jpg"
  },
  "timestamp": "2025-12-21T10:00:00Z"
}
```

### 前端整合流程（推薦）

```typescript
// 1. 先上傳圖片
const imageUrl = await mediaApi.uploadImage(file);

// 2. 使用 URL 進行辨識
const result = await aiApi.post("/ai/analyze-image", { imageUrl });
```

---

## 5. 預設 Prompt 建議 API

### 端點資訊

```
GET /api/v1/ai/recipe/suggestions
```

### 回應範例

```json
{
  "status": true,
  "message": "ok",
  "data": ["台灣感性的食物", "晚餐想吃日式", "聖誕節大餐", "想念泰國料理"]
}
```

### 前端使用範例

```typescript
// 用於快捷按鈕
const { data: suggestions } = useQuery({
  queryKey: ["recipe-suggestions"],
  queryFn: () => aiApi.get("/ai/recipe/suggestions"),
});

// 渲染快捷按鈕
{
  suggestions?.data.map((prompt) => (
    <Button key={prompt} onClick={() => handlePrompt(prompt)}>
      {prompt}
    </Button>
  ));
}
```

---

## 錯誤處理

### 錯誤回應格式

```typescript
type AIErrorResponse = {
  status: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

### 錯誤代碼對照表

| 錯誤代碼    | HTTP Status | 說明                        | 建議處理方式               |
| ----------- | ----------- | --------------------------- | -------------------------- |
| `AI_001`    | 400         | Prompt 不可為空             | 提示用戶輸入內容           |
| `AI_002`    | 400         | Prompt 過長（超過 1000 字） | 提示用戶縮短輸入           |
| `AI_003`    | 429         | 已達每日查詢上限            | 顯示剩餘次數與重置時間     |
| `AI_004`    | 401         | 未授權（需登入）            | 導向登入頁面               |
| `AI_005`    | 500         | AI 服務暫時無法使用         | 顯示錯誤訊息，建議稍後再試 |
| `AI_006`    | 504         | AI 生成逾時                 | 建議用戶重試或簡化需求     |
| `MEDIA_001` | 400         | 未提供檔案                  | 提示用戶選擇檔案           |
| `MEDIA_002` | 400         | 檔案類型不支援              | 提示支援的檔案格式         |
| `MEDIA_003` | 413         | 檔案過大（上限 10MB）       | 提示用戶壓縮圖片           |

### 前端錯誤處理範例

```typescript
const handleApiError = (error: unknown) => {
  if (error instanceof Error) {
    const apiError = error as { code?: string; message?: string };

    switch (apiError.code) {
      case "AI_003":
        toast.error("今日 AI 查詢次數已用完，請明天再試");
        break;
      case "AI_005":
        toast.error("AI 服務暫時無法使用，請稍後再試");
        break;
      case "MEDIA_003":
        toast.error("圖片過大，請選擇小於 10MB 的檔案");
        break;
      default:
        toast.error(apiError.message || "發生錯誤，請稍後再試");
    }
  }
};
```

---

## 前端整合範例

### API Client 架構

```typescript
// src/api/client.ts
const AI_API_BASE = import.meta.env.VITE_AI_API_BASE_URL;

class AIApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    return response.json();
  }
}

export const aiApi = new AIApiClient(AI_API_BASE);
```

### React Query Hooks

```typescript
// src/modules/ai/hooks/useAIRecipe.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { aiApi } from "@/api/client";

// 獲取建議 Prompts
export const useRecipeSuggestions = () => {
  return useQuery({
    queryKey: ["recipe-suggestions"],
    queryFn: () => aiApi.get("/ai/recipe/suggestions"),
    staleTime: 1000 * 60 * 60, // 1 小時
  });
};

// 生成食譜
export const useGenerateRecipe = () => {
  return useMutation({
    mutationFn: (request: AIRecipeRequest) =>
      aiApi.post<AIRecipeResponse>("/ai/recipe", request),
  });
};

// 上傳圖片
export const useUploadImage = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${AI_API_BASE}/media/upload`, {
        method: "POST",
        body: formData,
      });

      return res.json();
    },
  });
};

// 辨識食材
export const useAnalyzeImage = () => {
  return useMutation({
    mutationFn: (imageUrl: string) =>
      aiApi.post("/ai/analyze-image", { imageUrl }),
  });
};
```

---

## 環境變數配置

### 前端 `.env` 設定

```bash
# AI API 服務位址
VITE_AI_API_BASE_URL=https://your-ai-api.vercel.app/api/v1

# 主後端 API 位址
VITE_BACKEND_API_BASE_URL=https://api.fufood.jocelynh.me
```

### 開發環境

```bash
# 本地開發（連接本地 AI API）
VITE_AI_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 附錄：AI 圖片生成說明

AI 食譜回應中的 `imageUrl` 為 **Base64 Data URL** 格式：

```
data:image/png;base64,iVBORw0KGgoAAAANSU...
```

### 圖片使用範例

```tsx
// 直接用於 img 標籤
<img src={recipe.imageUrl} alt={recipe.name} />

// 或使用 Image 元件
<Image src={recipe.imageUrl} alt={recipe.name} width={300} height={200} />
```

### 圖片風格說明

AI 使用以下風格生成食譜圖片：

| 料理類型 | 容器風格           |
| -------- | ------------------ |
| 中式     | 中式陶碗           |
| 台式     | 中式陶碗           |
| 日式     | 日式陶盤           |
| 西式     | 白色瓷盤           |
| 義式     | 棕色陶盤           |
| 泰式     | 木質餐盤           |
| 韓式     | 韓式石鍋或黑色陶碗 |

---

## 相關文件

| 文件                                                         | 說明                        |
| ------------------------------------------------------------ | --------------------------- |
| [ai_recipe_api_spec.md](./ai_recipe_api_spec.md)             | AI 食譜 API 完整規格        |
| [ai_media_api_spec.md](./ai_media_api_spec.md)               | 媒體上傳與影像辨識 API 規格 |
| [frontend_migration_guide.md](./frontend_migration_guide.md) | 前端遷移變更說明            |
| [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)       | API 整合指南                |

---

**文件結束**
