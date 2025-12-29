# AI 食譜儲存 API 製作計畫

**版本**: v1.0  
**最後更新**: 2025-12-28  
**文件用途**: 規劃 AI 生成食譜的持久化儲存功能

---

## 1. 目標

為 AI 服務新增食譜儲存功能，讓使用者可以：
- 儲存 AI 生成的食譜
- 依會員 ID 或群組 ID 查詢已儲存食譜
- 對食譜進行 CRUD 操作

---

## 2. 技術架構

```mermaid
flowchart LR
    Frontend["前端 App"]
    MainBackend["主後端<br/>(驗證/會員系統)"]
    AIService["AI 服務<br/>(本專案)"]
    Supabase["Supabase<br/>PostgreSQL"]

    Frontend -->|"1. 登入取得 Cookie/Token"| MainBackend
    Frontend -->|"2. 呼叫 AI 食譜 API<br/>攜帶 Access Token"| AIService
    AIService -->|"3. 儲存食譜"| Supabase
```

---

## 3. 驗證機制

根據 `auth_api_spec.md` 分析，驗證流程如下：

| 項目 | 說明 |
|------|------|
| **認證方式** | HttpOnly Cookie + `Authorization: Bearer <access_token>` |
| **使用者識別** | 從 Token 解析或由前端傳入 `X-User-Id` Header |
| **群組識別** | 由前端傳入 `X-Group-Id` Header (選填) |

### 3.1 API 呼叫範例

```typescript
// 前端呼叫儲存食譜 API
const response = await fetch(`${AI_API_BASE}/api/v1/recipes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': userId,       // 從 profile API 取得
    'X-Group-Id': groupId,     // 選填
  },
  body: JSON.stringify(recipeData),
});
```

---

## 4. 資料庫設計 (Supabase PostgreSQL)

### 4.1 環境變數

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.nzdvjkfvkjxvjtmghswy.supabase.co:5432/postgres
```

### 4.2 Table Schema

```sql
-- 執行於 Supabase SQL Editor
CREATE TABLE IF NOT EXISTS saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 歸屬關係（純個人）
  user_id VARCHAR(255) NOT NULL,
  
  -- 食譜內容（對應 RecipeListItem 型別）
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  image_url TEXT,
  servings INTEGER DEFAULT 2,
  cook_time INTEGER,                      -- 分鐘
  difficulty VARCHAR(20),                 -- 簡單/中等/困難
  
  -- JSON 欄位
  ingredients JSONB NOT NULL DEFAULT '[]',
  seasonings JSONB DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  
  -- 元資料
  source VARCHAR(50) DEFAULT 'ai_generated',
  original_prompt TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON saved_recipes(created_at DESC);
```

---

## 5. API 端點設計

| 方法 | 路徑 | 說明 | Headers |
|------|------|------|---------|
| `POST` | `/api/v1/recipes` | 儲存新食譜 | `X-User-Id` (必填), `X-Group-Id` (選填) |
| `GET` | `/api/v1/recipes` | 取得食譜列表 | Query: `userId`, `groupId`, `limit`, `offset` |
| `GET` | `/api/v1/recipes/:id` | 取得單一食譜 | - |
| `PUT` | `/api/v1/recipes/:id` | 更新食譜 | `X-User-Id` (權限驗證) |
| `DELETE` | `/api/v1/recipes/:id` | 刪除食譜 | `X-User-Id` (權限驗證) |

### 5.1 Request/Response 範例

#### POST /api/v1/recipes

```json
// Request
{
  "name": "蒜香奶油蝦義大利麵",
  "category": "義式料理",
  "description": "簡單快速的經典義大利麵",
  "imageUrl": "https://res.cloudinary.com/...",
  "servings": 2,
  "cookTime": 25,
  "difficulty": "簡單",
  "ingredients": [
    { "name": "義大利麵", "amount": "200", "unit": "g" }
  ],
  "seasonings": [
    { "name": "蒜頭", "amount": "3", "unit": "瓣" }
  ],
  "steps": [
    { "step": 1, "description": "煮義大利麵至8分熟" }
  ],
  "originalPrompt": "我想吃義大利麵"
}

// Response (201)
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "蒜香奶油蝦義大利麵",
    "userId": "user_abc123",
    "createdAt": "2025-12-28T15:00:00Z"
  }
}
```

#### GET /api/v1/recipes?userId=xxx

```json
// Response (200)
{
  "success": true,
  "data": {
    "recipes": [...],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

## 6. 程式碼結構

```
src/
├── db/
│   └── index.ts              # [NEW] PostgreSQL 連線
├── routes/
│   └── recipeRoutes.ts       # [NEW] API 路由
├── services/
│   └── recipeStorageService.ts  # [NEW] CRUD 邏輯
├── types/
│   └── savedRecipe.ts        # [NEW] 型別定義
└── index.ts                  # [MODIFY] 掛載新路由
```

---

## 7. 依賴套件

```bash
npm install pg
npm install --save-dev @types/pg
```

> **Note**: 為保持輕量，使用原生 `pg` 套件而非 ORM。

---

## 8. 實作步驟

1. **[ ] 設定環境變數** — 將 `DATABASE_URL` 加入 `.env`
2. **[ ] 建立資料庫** — 在 Supabase SQL Editor 執行 Schema
3. **[ ] 實作 db 連線** — `src/db/index.ts`
4. **[ ] 實作型別定義** — `src/types/savedRecipe.ts`
5. **[ ] 實作 Service** — `src/services/recipeStorageService.ts`
6. **[ ] 實作 Routes** — `src/routes/recipeRoutes.ts`
7. **[ ] 掛載路由** — 修改 `src/index.ts`
8. **[ ] 測試 API** — 使用 curl 或 Postman
9. **[ ] 更新 OpenAPI** — 新增 API 文件

---

## 9. 驗證計畫

### 9.1 手動測試

```bash
# 1. 新增食譜
curl -X POST http://localhost:3000/api/v1/recipes \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test_user_001" \
  -d '{"name":"測試食譜","ingredients":[{"name":"雞蛋","amount":"2","unit":"顆"}],"steps":[{"step":1,"description":"打蛋"}]}'

# 2. 取得列表
curl "http://localhost:3000/api/v1/recipes?userId=test_user_001"

# 3. 取得單一食譜
curl http://localhost:3000/api/v1/recipes/{id}
```

### 9.2 Supabase Dashboard 驗證

```sql
SELECT * FROM saved_recipes ORDER BY created_at DESC LIMIT 10;
```

---

## 10. 待確認事項

> [!IMPORTANT]
> **請確認密碼**  
> 請將 Supabase 連線字串中的 `[YOUR-PASSWORD]` 替換為您的實際密碼後告知我。

> [!NOTE]
> **群組食譜邏輯**  
> 目前設計為：若 `groupId` 有值，該食譜屬於群組；否則屬於個人。需確認是否符合需求？
