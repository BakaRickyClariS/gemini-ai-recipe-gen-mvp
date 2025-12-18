# AI 食譜生成 API 規格

**版本**: v2.0  
**最後更新**: 2025-12-17  
**說明**: FuFood.AI 與 Gemini AI 整合的 API 規格，支援 SSE Streaming、多食譜推薦、完整食譜資訊及 AI 圖片生成。

> **設計原則**  
> AI 食譜推薦**預設會自動納入使用者的庫存食材與飲食習慣**（如素食、過敏原排除等）。使用者可額外透過篩選條件（難易度、料理類型、選擇特定食材等）讓推薦結果更加精準。

---

## 快速索引

- [API 端點設計](#api-端點設計)
- [請求格式](#請求格式request)
- [回應格式](#回應格式response)
- [Streaming 回應格式](#streaming-回應格式sse)
- [AI 圖片生成](#ai-圖片生成)
- [錯誤處理](#錯誤處理)
- [後端實作建議](#後端實作建議gemini)
- [環境變數](#環境變數新增)

---

## API 端點設計

### 路由資訊

| #   | Method | Path                             | 功能                                      | 備註                     |
| --- | ------ | -------------------------------- | ----------------------------------------- | ------------------------ |
| 52  | POST   | `/api/v1/ai/recipe`              | AI 產生多個食譜推薦（含完整資訊）         | 對應 API_REFERENCE_V2.md |
| 52a | POST   | `/api/v1/ai/recipe/stream`       | AI 產生食譜（SSE Streaming）              | 新增                     |
| 52b | GET    | `/api/v1/inventory/ai-selection` | 取得可供 AI 使用的庫存食材（含優先消耗）  | 新增                     |
| 52c | GET    | `/api/v1/ai/recipe/suggestions`  | 取得預設 Prompt 建議                      | 新增                     |

---

## 請求格式（Request）

### 型別定義

```typescript
/**
 * AI 食譜生成請求
 */
export type AIRecipeRequest = {
  /** 使用者的自然語言提示 */
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
  difficulty?: '簡單' | '中等' | '困難';

  /** 料理類型偏好（可選） */
  category?: string;

  /** 額外選擇的庫存食材名稱（透過「加入庫存食材」按鈕選擇） */
  selectedIngredients?: string[];

  /** 額外排除的食材（例如臨時不想吃的） */
  excludeIngredients?: string[];

  /** 希望推薦幾道食譜（預設 2） */
  recipeCount?: number;
};

/**
 * 使用者飲食偏好（存於使用者設定，後端自動讀取）
 */
export type UserDietaryPreferences = {
  /** 飲食類型：一般、素食、純素、無麩質等 */
  dietType?: 'normal' | 'vegetarian' | 'vegan' | 'gluten-free';
  /** 過敏原排除清單 */
  allergens?: string[]; // 如：['蝦', '蟹', '花生']
  /** 不喜歡的食材 */
  dislikedIngredients?: string[];
};

/**
 * 庫存食材選擇項目（供 AI 使用）
 */
export type AIInventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  /** 標籤：優先消耗（即將過期）或有庫存 */
  tag: 'priority' | 'available';
  /** 優先消耗原因（如：3天後過期） */
  priorityReason?: string;
};

/**
 * 庫存食材選擇 API 回應
 */
export type AIInventorySelectionResponse = {
  status: boolean;
  message: string;
  data: {
    /** 按分類分組的庫存食材 */
    categories: {
      name: string; // 分類名稱，如「蔬果類」
      items: AIInventoryItem[];
    }[];
    /** 最多可選數量 */
    maxSelection: number;
  };
};
```

### 請求範例

**最簡單的請求（自動納入庫存食材 + 飲食習慣）：**

```json
{
  "prompt": "晚餐想吃日式"
}
```

> 後端會自動讀取使用者的庫存食材和飲食偏好（如過敏原排除），無需前端傳送。

**額外指定篩選條件：**

```json
{
  "prompt": "聖誕節大餐",
  "servings": 4,
  "difficulty": "中等",
  "category": "西式料理"
}
```

**手動選擇特定庫存食材（更精準推薦）：**

```json
{
  "prompt": "想製作下午茶跟朋友分享",
  "selectedIngredients": ["草莓", "檸檬塔", "桶裝巧克力冰淇淋"]
}
```

**暫時關閉預設行為：**

```json
{
  "prompt": "推薦一道簡單的家常菜",
  "includeInventory": false,
  "applyDietaryPreferences": false
}
```

---

## 回應格式（Response）

### 標準回應（非 Streaming）— 多食譜推薦

> **重要**: 回應為 **多個完整食譜陣列**，包含準備材料、調味料、烹煮步驟，以及 AI 生成的圖片。

```typescript
export type AIRecipeResponse = {
  status: boolean;
  message: string;
  data: {
    /** AI 回應訊息（例如：這裡有幾道推薦的日式食譜選擇） */
    greeting: string;

    /** 生成的多個食譜（含完整資訊） */
    recipes: RecipeListItem[];

    /** AI 元資料 */
    aiMetadata: {
      generatedAt: string;
      model: string;
    };

    /** 剩餘查詢次數 */
    remainingQueries: number;
  };
};

/** 食材項目（準備材料或調味料） */
export type IngredientItem = {
  /** 食材名稱 */
  name: string;
  /** 數量（字串格式，如 "3-4" 或 "1/2"） */
  amount: string;
  /** 單位（如：條、瓣、根、茶匙、大匙） */
  unit: string;
};

/** 烹煮步驟 */
export type CookingStep = {
  /** 步驟編號 */
  step: number;
  /** 步驟說明 */
  description: string;
};

/** 食譜列表項目（含完整資訊） */
export type RecipeListItem = {
  id: string;
  name: string;
  category: string;
  /** AI 生成的圖片（Base64 Data URL） */
  imageUrl: string;
  servings: number;
  cookTime: number;
  isFavorite: boolean;
  /** 難易度 */
  difficulty?: "簡單" | "中等" | "困難";
  /** 準備材料 */
  ingredients?: IngredientItem[];
  /** 調味料 */
  seasonings?: IngredientItem[];
  /** 烹煮步驟 */
  steps?: CookingStep[];
};
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
        "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSU...",
        "servings": 1,
        "cookTime": 20,
        "difficulty": "簡單",
        "isFavorite": false,
        "ingredients": [
          { "name": "小黃瓜", "amount": "3-4", "unit": "條" },
          { "name": "蒜頭", "amount": "4-5", "unit": "瓣" },
          { "name": "辣椒", "amount": "1-2", "unit": "根" },
          { "name": "鹽", "amount": "1/2", "unit": "茶匙" }
        ],
        "seasonings": [
          { "name": "醬油", "amount": "1.5", "unit": "大匙" },
          { "name": "黑醋或白醋", "amount": "1", "unit": "大匙" },
          { "name": "砂糖", "amount": "1/2", "unit": "茶匙" },
          { "name": "麻油/香油", "amount": "1/2", "unit": "大匙" }
        ],
        "steps": [
          { "step": 1, "description": "將小黃瓜拍扁後切段，用 1/2 茶匙鹽抓勻，靜置 15-20分鐘出水。" },
          { "step": 2, "description": "倒掉滲出的水分。準備蒜末、辣椒圈。" },
          { "step": 3, "description": "混合醬油、醋、砂糖、麻油/香油（可加花椒油）。" },
          { "step": 4, "description": "將瀝乾的黃瓜、蒜末、辣椒圈與醬汁充分拌勻。" },
          { "step": 5, "description": "放入冰箱冷藏 30-60分鐘冰鎮入味。" },
          { "step": 6, "description": "擺盤即可享用。" }
        ]
      },
      {
        "id": "ai-002",
        "name": "蒜蓉炒時蔬",
        "category": "中式",
        "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSU...",
        "servings": 2,
        "cookTime": 15,
        "difficulty": "簡單",
        "isFavorite": false,
        "ingredients": [
          { "name": "青江菜", "amount": "300", "unit": "克" },
          { "name": "蒜頭", "amount": "3", "unit": "瓣" }
        ],
        "seasonings": [
          { "name": "鹽", "amount": "適量", "unit": "" },
          { "name": "油", "amount": "2", "unit": "大匙" }
        ],
        "steps": [
          { "step": 1, "description": "青江菜洗淨，蒜頭切末。" },
          { "step": 2, "description": "熱鍋下油，爆香蒜末。" },
          { "step": 3, "description": "放入青江菜大火快炒至軟，加鹽調味即可。" }
        ]
      }
    ],
    "aiMetadata": {
      "generatedAt": "2025-12-17T06:30:00Z",
      "model": "gemini-2.5-flash"
    },
    "remainingQueries": 2
  }
}
```

---

## Streaming 回應格式（SSE）

### 端點

```
POST /api/v1/ai/recipe/stream
Content-Type: application/json
Accept: text/event-stream
```

### SSE 事件類型

```typescript
/** SSE 事件基礎型別 */
export type AIStreamEventBase = {
  id: string;
  timestamp: string;
};

/** 開始事件 */
export type AIStreamStartEvent = AIStreamEventBase & {
  event: 'start';
  data: {
    sessionId: string;
    model: string;
  };
};

/** 文字片段事件（Streaming 內容） */
export type AIStreamChunkEvent = AIStreamEventBase & {
  event: 'chunk';
  data: {
    /** 本次 chunk 的部分文字 */
    text: string;
    /** 目前生成的部分 */
    section: 'greeting' | 'name' | 'ingredients' | 'steps' | 'summary';
  };
};

/** 進度事件 */
export type AIStreamProgressEvent = AIStreamEventBase & {
  event: 'progress';
  data: {
    /** 進度百分比 0-100 */
    percent: number;
    /** 目前階段描述 */
    stage: string;
  };
};

/** 完成事件 */
export type AIStreamDoneEvent = AIStreamEventBase & {
  event: 'done';
  data: {
    /** 完整的結構化食譜陣列（含材料、步驟、圖片） */
    recipes: RecipeListItem[];
    aiMetadata: {
      generatedAt: string;
      model: string;
    };
    remainingQueries: number;
  };
};

/** 錯誤事件 */
export type AIStreamErrorEvent = AIStreamEventBase & {
  event: 'error';
  data: {
    code: string;
    message: string;
  };
};
```

### SSE 實際輸出範例

```
event: start
data: {"id":"evt-001","timestamp":"2025-12-17T00:35:00Z","sessionId":"session-abc123","model":"gemini-2.5-flash"}

event: chunk
data: {"id":"evt-002","timestamp":"2025-12-17T00:35:01Z","text":"根據您想吃日式料理的需求，","section":"greeting"}

event: chunk
data: {"id":"evt-003","timestamp":"2025-12-17T00:35:01Z","text":"我推薦您製作「日式照燒雞腿丼」！","section":"name"}

event: progress
data: {"id":"evt-004","timestamp":"2025-12-17T00:35:02Z","percent":20,"stage":"生成食材清單中..."}

event: chunk
data: {"id":"evt-005","timestamp":"2025-12-17T00:35:02Z","text":"\n\n**準備材料：**\n- 去骨雞腿肉 2片\n","section":"ingredients"}

event: progress
data: {"id":"evt-007","timestamp":"2025-12-17T00:35:04Z","percent":50,"stage":"生成烹飪步驟中..."}

event: chunk
data: {"id":"evt-008","timestamp":"2025-12-17T00:35:04Z","text":"\n\n**烹飪步驟：**\n1. 雞腿肉用叉子戳洞，幫助入味\n","section":"steps"}

event: progress
data: {"id":"evt-010","timestamp":"2025-12-17T00:35:06Z","percent":90,"stage":"生成食譜圖片中..."}

event: done
data: {"id":"evt-011","timestamp":"2025-12-17T00:35:10Z","recipes":[...],"aiMetadata":{...},"remainingQueries":2}
```

---

## AI 圖片生成

### 功能說明

食譜 API 會自動為每道食譜生成 AI 圖片。使用 Gemini 2.0 Flash Image 模型，根據食譜名稱和料理類型生成專業的美食攝影照片。

### 圖片生成 Prompt 格式

根據設計師提供的風格：

```
a.核心-->{食譜名稱}主體、{容器風格}、盤子周圍放1-2個相關材料擺設或餐具
b.風格-->食物攝影形象照、{料理類型}風格、深色木紋背景、自然陽光、清新、俯視特寫
```

### 容器風格對應

| 料理類型 | 容器風格               |
| -------- | ---------------------- |
| 中式     | 放在中式陶碗中         |
| 台式     | 放在中式陶碗中         |
| 日式     | 放在日式陶盤中         |
| 西式     | 放在白色瓷盤中         |
| 義式     | 放在棕色陶盤中         |
| 泰式     | 放在木質餐盤中         |
| 韓式     | 放在韓式石鍋或黑色陶碗中 |

### 圖片回傳格式

圖片以 Base64 Data URL 格式回傳於 `imageUrl` 欄位：

```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

---

## 錯誤處理

### 錯誤回應格式

```typescript
export type AIRecipeErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
};
```

### 錯誤代碼

| 錯誤代碼 | HTTP Status | 說明                        |
| -------- | ----------- | --------------------------- |
| `AI_001` | 400         | Prompt 不可為空             |
| `AI_002` | 400         | Prompt 過長（超過 1000 字） |
| `AI_003` | 429         | 已達每日查詢上限            |
| `AI_004` | 401         | 未授權（需登入）            |
| `AI_005` | 500         | AI 服務暫時無法使用         |
| `AI_006` | 504         | AI 生成逾時                 |

### 錯誤回應範例

```json
{
  "code": "AI_003",
  "message": "您今天的 AI 查詢次數已用完，請明天再試",
  "details": {
    "dailyLimit": 3,
    "used": 3,
    "resetAt": "2025-12-18T00:00:00+08:00"
  },
  "timestamp": "2025-12-17T00:35:00Z"
}
```

---

## 後端實作建議（Gemini）

### System Prompt 建議

```
你是 FuFood.AI，一個專業的食譜生成助手。請根據使用者的需求生成完整的食譜推薦。

回應格式要求：
1. 先用友善的語氣回應使用者的問題（放在 greeting 欄位）
2. 根據使用者需求推薦 2 道食譜
3. 每道食譜需包含完整資訊：
   - id：使用 "ai-001" 格式
   - name：食譜名稱
   - category：料理類型（如：中式、日式、西式、台式、泰式等）
   - servings：人份數
   - cookTime：烹飪時間（分鐘）
   - difficulty：難易度（簡單、中等、困難）
   - imageUrl：留空字串，系統會自動生成
   - isFavorite：false
   - ingredients：準備材料陣列，每項包含 name（名稱）、amount（數量）、unit（單位）
   - seasonings：調味料陣列，格式同 ingredients
   - steps：烹煮步驟陣列，每項包含 step（步驟編號）、description（詳細說明）

輸出需符合以下 JSON 結構（僅輸出 JSON，不要加其他文字）：
{
  "greeting": "回應訊息",
  "recipes": [
    {
      "id": "ai-001",
      "name": "食譜名稱",
      "category": "料理類型",
      "servings": 2,
      "cookTime": 30,
      "difficulty": "簡單",
      "imageUrl": "",
      "isFavorite": false,
      "ingredients": [
        { "name": "食材名稱", "amount": "數量", "unit": "單位" }
      ],
      "seasonings": [
        { "name": "調味料名稱", "amount": "數量", "unit": "單位" }
      ],
      "steps": [
        { "step": 1, "description": "步驟說明" }
      ]
    }
  ]
}

請使用繁體中文回應。步驟說明要詳細具體，包含時間和技巧提示。
```

### Gemini API 整合範例（Node.js）

#### 食譜生成

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateRecipes(prompt: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\n使用者輸入：" + prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });

  return result.response.text();
}
```

#### 圖片生成

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateRecipeImage(recipeName: string, category: string) {
  const prompt = `a.核心-->${recipeName}主體、放在中式陶碗中、盤子周圍放1-2個相關材料擺設或餐具
b.風格-->食物攝影形象照、${category}風格、深色木紋背景、自然陽光、清新、俯視特寫`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp-image-generation',
    contents: prompt,
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  // 從回應中提取圖片 Base64
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
}
```

---

## 環境變數（新增）

| 變數                 | 說明                | 範例      |
| -------------------- | ------------------- | --------- |
| `GEMINI_API_KEY`     | Gemini API 金鑰     | `AIza...` |
| `GOOGLE_API_KEY`     | Google API 金鑰（備用） | `AIza...` |
| `AI_DAILY_LIMIT`     | 每日 AI 查詢上限    | `3`       |
| `AI_REQUEST_TIMEOUT` | AI 請求逾時（毫秒） | `30000`   |

---

## 預設 Prompt 建議

根據 UI 設計，建議的預設快捷按鈕：

```typescript
export const AI_SUGGESTION_PROMPTS = [
  '台灣感性的食物',
  '晚餐想吃日式',
  '聖誕節大餐',
  '想念泰國料理',
] as const;
```

---

## 相關檔案

| 檔案 | 說明 |
| ---- | ---- |
| `src/types/aiRecipe.ts` | 請求與回應型別定義 |
| `src/types/aiStreamEvents.ts` | SSE 事件型別定義 |
| `src/services/aiRecipeService.ts` | AI 食譜生成服務 |
| `src/services/imageGenerationService.ts` | AI 圖片生成服務 |
| `openapi.json` | OpenAPI 規格文件 |

---

**附註**: 此規格配合前端 `RecipeCard` 元件設計，回應的 `recipes` 欄位符合 `RecipeListItem` 型別，包含完整的食材、調味料、步驟資訊，前端可直接渲染食譜詳情頁面。
