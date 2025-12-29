# 前端整合與資料庫遷移建議書

針對本次「資料庫正規化 (Normalization)」與「AI 分類嚴格化」的更新，以下是給前端與後端整合的詳細指引。

## 1. 資料庫變更 (Database Changes)

已執行正規化，您的資料庫結構已變更：

### 新增 `categories` 表

| 欄位 (Field) | 型別 (Type) | 說明 (Description) | 範例 (Example)                 |
| :----------- | :---------- | :----------------- | :----------------------------- |
| `id`         | `TEXT (PK)` | 嚴格英文分類 ID    | `fruit`, `meat`                |
| `title`      | `TEXT`      | 中文顯示名稱       | `蔬果類`, `肉品類`             |
| `icon`       | `TEXT`      | 分類圖示 URL       | `/images/categories/fruit.png` |
| `bg_color`   | `TEXT`      | 背景色 Hex         | `#E8F5E9`                      |

### `inventory` 表變更

- `category`: 現在是 **Foreign Key**，必須對應到 `categories` 表中的 `id`。
- **資料遷移**: 所有舊的 `蔬菜類` 資料都已轉換為 `fruit`。

---

## 2. API 變更與前端應對 (Frontend Integration)

### A. 庫存列表 API (`GET /inventory`)

- **回傳資料**: `category` 欄位現在會回傳 **英文 ID** (如 `fruit`)。
- **前端顯示**: 前端不必再寫死 Mapping，建議改呼叫 `GET /inventory/categories` 來取得最新的分類對應表 (ID -> Title)。

### B. 分類列表 API (`GET /inventory/categories`)

- **邏輯更新**: 現在會直接從資料庫讀取分類設定，因此若後台改了圖示或名稱，前端重新整理即可生效。
- **建議**: App 啟動時先呼叫此 API，將分類資訊存入 Context 或 Redux，供全站使用。

### C. AI 影像辨識 API (`POST /ai/analyze-image/multiple`)

- **無縫接軌**: AI 現在回傳的 `category` (e.g., `meat`) 直接就是資料庫的合法 ID。
- **attributes 格式**: AI 現在回傳 `string[]` (如 `["牛肉類"]`)，可直接傳給後端。
- **寫入庫存**: 前端在將 AI 結果轉送給 `POST /inventory` 時，**不需要** 再做中文轉換，直接送出英文 ID 即可。

### D. 食譜生成 API

- 已更新 Prompt，`ingredients` 只包含庫存管理項目 (會自動忽略水、油、鹽)。生成的食材可直接對應到現有的 7 大分類。

---

## 3. 🚨 關鍵問題：X-User-Id Header

> [!CAUTION] > **所有 Inventory API** 都必須在 Request Header 中帶上 `X-User-Id`，否則後端會回傳 `400 Bad Request: 缺少 X-User-Id`。

### 受影響的 Endpoints

| Method   | Endpoint                                         | 需要 X-User-Id |
| :------- | :----------------------------------------------- | :------------: |
| `GET`    | `/api/v1/refrigerators/:id/inventory`            |       ✅       |
| `POST`   | `/api/v1/refrigerators/:id/inventory`            |       ✅       |
| `PUT`    | `/api/v1/refrigerators/:id/inventory/:itemId`    |       ✅       |
| `DELETE` | `/api/v1/refrigerators/:id/inventory/:itemId`    |       ✅       |
| `GET`    | `/api/v1/refrigerators/:id/inventory/categories` |       ✅       |
| `GET`    | `/api/v1/refrigerators/:id/inventory/settings`   |       ✅       |

### 建議實作 (Axios 範例)

```typescript
// 在 apiClient.ts 或 axios instance 中加入 interceptor
apiClient.interceptors.request.use((config) => {
  const userId = getUserId(); // 從您的 Auth Store 取得
  if (userId) {
    config.headers["X-User-Id"] = userId;
  }
  return config;
});
```

---

## 4. 檢查清單 (Validations)

- [ ] **X-User-Id Header**: 確認所有 Inventory API 請求都有帶上 `X-User-Id`。
- [ ] **確認分類顯示**: 在庫存列表頁，確認 "fruit" 能正確顯示為 "蔬果類"。
- [ ] **確認新增功能**: 嘗試手動新增一筆資料，Category 選單應送出英文 ID。
- [ ] **確認 AI 入庫**: 上傳照片後，確認 AI 辨識的 `category` 與 `attributes` 能正確存入。
- [ ] **確認資料讀取**: 入庫成功後，庫存列表應能正確顯示新增的項目數量。
