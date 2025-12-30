# AI 食譜 API 問題確認 (2025/12/30)

> 此文件用於與 AI 後端團隊確認問題點

---

## 問題描述

前端在 AI 聊天介面中使用食譜生成功能時，發現以下問題：

### 1. 生成的食譜圖片都一樣

**現象**：
- 使用者在 AI 聊天介面生成多道食譜
- 每道食譜卡片顯示的圖片都相同

**預期行為**：
- 每道食譜應有獨立生成的圖片

**可能原因**：
- AI 後端沒有為每道食譜生成獨立圖片
- 圖片生成 API 返回相同的佔位圖
- `imageUrl` 欄位回傳 `null` 或空值，導致前端使用相同的 fallback 圖片

---

### 2. 食譜內容未根據庫存食材生成

**現象**：
- 使用者選擇庫存食材後生成食譜
- 生成的食譜內容與選擇的食材無關

**前端傳送的請求格式**：
```typescript
interface AIRecipeRequest {
  prompt: string;
  selectedIngredients?: string[];  // 使用者選擇的庫存食材名稱陣列
}
```

**範例請求**：
```json
{
  "prompt": "請根據我選擇的食材推薦食譜",
  "selectedIngredients": ["雞蛋", "番茄", "洋蔥"]
}
```

**請確認**：
1. 後端是否正確接收 `selectedIngredients` 參數？
2. AI 生成邏輯是否有使用 `selectedIngredients` 來影響食譜推薦？

---

### 3. imageUrl 回傳值問題

**前端錯誤訊息**：
```
An empty string ("") was passed to the src attribute. 
This may cause the browser to download the whole page again over the network.
```

**問題分析**：
- 當 `imageUrl` 為空字串時，會觸發瀏覽器警告
- 前端已有 fallback 圖片邏輯，但需要後端回傳 `null` 而非空字串

**請確認**：
- `imageUrl` 欄位在沒有圖片時，應回傳 `null` 還是空字串 `""`？

---

## API 回傳格式確認

根據前端使用的型別定義，預期的回傳格式如下：

```typescript
interface AIRecipeResponse {
  status: boolean;
  message: string;
  data: {
    greeting: string;
    recipes: RecipeListItem[];
    aiMetadata: {
      generatedAt: string;
      model: string;
    };
    remainingQueries: number;
  };
}

interface RecipeListItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;      // ← 此欄位的值是否正確？
  servings: number;
  cookTime: number;
  isFavorite: boolean;
  difficulty?: "簡單" | "中等" | "困難";
  ingredients?: IngredientItem[];
  seasonings?: IngredientItem[];
  steps?: CookingStep[];
}
```

**請確認**：
1. 每道食譜的 `imageUrl` 是否為獨立生成的圖片 URL？
2. 若使用 Base64 圖片，格式是否為 `data:image/png;base64,{base64_data}`？
3. 若圖片生成失敗，回傳的值是什麼？

---

## 相關 API 端點

| 功能 | 端點 | 方法 |
|------|------|------|
| 生成食譜（標準） | `/ai/recipe` | POST |
| 生成食譜（SSE） | `/ai/recipe/stream` | POST |
| 取得建議 Prompt | `/ai/recipe/suggestions` | GET |

---

## 待確認事項清單

- [ ] `selectedIngredients` 參數是否正確接收並用於生成食譜？
- [ ] 每道食譜是否有獨立生成的圖片？
- [ ] `imageUrl` 為空時回傳 `null` 還是 `""`？
- [ ] 圖片生成 API 是否正常運作？

---

## 聯絡資訊

若有疑問，請聯繫前端團隊確認問題細節。

---

## 新增問題：AI 回傳原始 JSON 字串

### 問題描述

用戶回報 AI 聊天介面中，AI 回應直接顯示原始 JSON 字串而非格式化內容：

![AI 回傳原始 JSON 問題](file:///C:/Users/User/.gemini/antigravity/brain/0720be44-7357-4d49-87b2-845c226069bb/uploaded_image_1767074209291.png)

### 問題分析

截圖顯示 AI 回傳的 `greeting` 欄位包含整個 JSON 字串：
```
```json { "greeting": "您好！很高興為您推薦美味又健康的低卡路里晚餐選擇。FuFood.AI 已經為您準備了兩道清爽無負擔的食譜...", "recipes": [{ "id": "ai-001", "name": "香煎鮭魚佐時蔬", ...
```

### 預期行為

`greeting` 欄位應**只包含問候語文字**，例如：
```json
{
  "greeting": "您好！很高興為您推薦美味又健康的低卡路里晚餐選擇。"
}
```

而非將整個 JSON 結構作為 `greeting` 的值。

### 待確認

- [ ] AI 生成邏輯中，`greeting` 的輸出是否正確？
- [ ] 是否有將 JSON 序列化後再放入 `greeting` 欄位的錯誤？
- [ ] SSE 串流模式的回傳格式是否與標準模式一致？

---

## 新功能需求：庫存食材自動使用

### 需求背景

用戶希望 AI 食譜生成能夠自動使用庫存中的食材，減少手動選擇的步驟。

### 功能需求

#### 1. 自動夾帶庫存食材

**場景**：用戶開啟 AI 聊天介面，系統自動取得用戶的庫存食材列表

**前端行為**：
- 自動呼叫 `GET /refrigerators/{refrigeratorId}/inventory` 取得庫存
- 將庫存食材名稱作為 `selectedIngredients` 傳送給 AI

**後端行為**：
- 接收 `selectedIngredients` 參數
- 優先使用這些食材來生成食譜推薦

#### 2. 無庫存時正常生成

**場景**：用戶沒有庫存食材

**預期行為**：
- `selectedIngredients` 為空陣列 `[]`
- AI 應按照一般模式生成推薦食譜（不根據特定食材）

#### 3. 手動選擇食材

**場景**：用戶想從庫存中選擇特定食材

**前端行為**：
- 提供 UI 讓用戶勾選/取消勾選庫存中的食材
- 只傳送用戶選擇的食材給 AI

**後端行為**：
- 只使用 `selectedIngredients` 中的食材生成食譜

#### 4. 關閉庫存食材功能

**場景**：用戶想完全不使用庫存食材，自由輸入

**前端行為**：
- 提供「使用庫存食材」開關
- 關閉時，不傳送 `selectedIngredients`（或傳空陣列）

**後端行為**：
- 當 `selectedIngredients` 為空時，按照 `prompt` 自由生成

### API 請求格式確認

```typescript
interface AIRecipeRequest {
  prompt: string;
  selectedIngredients?: string[];  // 可選，空表示不限制食材
}
```

**範例請求**：

1. **有庫存食材**：
```json
{
  "prompt": "請推薦晚餐",
  "selectedIngredients": ["雞蛋", "番茄", "洋蔥", "豬肉"]
}
```

2. **無庫存食材**：
```json
{
  "prompt": "請推薦晚餐",
  "selectedIngredients": []
}
```

3. **手動選擇部分食材**：
```json
{
  "prompt": "請推薦低卡料理",
  "selectedIngredients": ["雞蛋", "番茄"]
}
```

### 待確認事項

- [ ] 後端是否正確處理 `selectedIngredients` 參數？
- [ ] 當 `selectedIngredients` 為空時，AI 的行為是否符合預期？
- [ ] 若 `selectedIngredients` 包含 AI 不認識的食材名稱，如何處理？

