# 冰箱（群組）成員 API 修復規劃書

## 目標說明

目前前端 UI（群組設定、編輯成員）高度依賴 v2 API 的回傳資料，但目前的 API 缺少了顯示介面所必須的資訊，導致 UI 顯示異常。

1. `GET /api/v2/groups`：回傳的群組列表缺乏成員數量摘要，導致前端群組卡片永遠顯示「成員 (0)」且無法顯示疊加的頭像 UI。
2. `GET /api/v2/groups/{groupId}`：回傳的 `members` 陣列中，每個成員物件只包含關聯 ID（`membershipId`, `userId`）、角色（`role`）以及加入時間（`joinedAt`）。**缺少了使用者的顯示名稱（`userName` 或 `name`）與頭像圖片網址（`profilePictureUrl` 或 `avatar`）**。這導致前端「編輯成員」的列表上只能顯示預設頭像與名稱為「未知」。

本次修復的目標是更新後端 Controller 或 Service，在查詢群組與成員關係時，透過 Join 等方式將 User collection/table 的名稱與頭像資訊一併打包回傳。

## 待確認細節（須提報決策者或相關負責人）

> [!IMPORTANT]
> 必須先確認以下 API 結構異動是否符合目前的資料庫設計：
>
> 1. **針對 `GET /api/v2/groups` (列表)：**
>    為了渲染 UI，我們是否要在這裡**計算並回傳一個 `memberCount` (整數)**？另外是否需要回傳 `previewAvatars` (字串陣列) 提供前 4 名成員的頭像預覽？或者是乾脆像 v1 一樣回傳完整的 `members` 陣列？
> 2. **針對 `GET /api/v2/groups/{groupId}` (詳細資料)：**
>    目前查詢 members 關聯表時，缺乏 User 的資料。後端目前的架構（Sequelize, Mongoose 或 Prisma 尤佳）是否可以直接在關聯查詢時引入 / populate User 資料表上的 `name` 與 `profilePictureUrl` 欄位？

## 提議的變更 (符合後端開發規範)

為遵循專案的後端架構規範 (`backend-dev-guidelines` 與 `backend-patterns`)，本次修改將嚴格進行分層 (Layered Architecture)，並確保 **完全不影響現行 v1 API**。

### 1. Repository 層 (資料存取與最佳化)

- **`GroupRepository`**：
  - 新增專供 v2 使用的查詢方法 (如 `findV2Groups`, `findV2GroupById`)，原 v1 方法保持原樣。
  - **防止 N+1 查詢問題**：在資料庫查詢階段，即透過 Prisma 的 `include` (或對應的 ORM 關聯查詢/JOIN) 一次性取得 Users 表中的顯示名稱 (`name`) 與頭像 (`avatar` / `profilePictureUrl`)，並在 SQL/ORM 層級妥善計算 `memberCount`。

### 2. Service 層 (商業邏輯)

- **`v2GroupService`**：
  - 呼叫 Repository 層取得包含 User 關聯的原始資料。
  - 負責將資料 Mapping 成為前端需要的 DTO (Data Transfer Object)：
    - **針對列表 (`GET /api/v2/groups`)**：轉換並確保每筆資料都包含 `memberCount`，並提供 `memberAvatars` (前 4 名成員的頭像) 以供 UI 渲染。
    - **針對詳情 (`GET /api/v2/groups/:groupId`)**：確保 `members` 陣列內的物件整合了使用者的 `name` 與 `avatar`，並過濾掉不應讓前端取得的機敏欄位。

### 3. Controller 層 (請求處理)

- **`V2GroupController`**：
  - **統一繼承 `BaseController`**：Controller 類別必須繼承 `BaseController`。
  - **輸入驗證 (Zod)**：使用 Zod schema 嚴格驗證 Route params (`groupId`) 或 Query params，驗證通過才傳入 Service。
  - **標準化回應與錯誤處理**：
    - 成功時使用 `this.handleSuccess(res, data)` 回傳資料。
    - 發生錯誤時，在 `catch` 區塊使用 `Sentry.captureException(error)` 捕捉，並以 `this.handleError(error, res, 'getGroupDetail')` 統一處理錯誤。

### 4. Route 層

- **`v2GroupRoutes`**：
  - 保持極簡，僅進行路由綁定 (`router.get('/:groupId', (req, res) => v2GroupController.getGroupDetail(req, res))`)，絕不包含任何商業邏輯。

## 驗證流程

### 自動化測試

- 建立或修改針對 v2 群組端點的單元測試/整合測試，檢查回傳的 JSON response 是否確實包含新加的欄位 (`name`, `avatar`/`profilePictureUrl`, `memberCount`)。

### 人工驗證步驟

1. 同時啟動後端與前端伺服器 (Local)。
2. 前往 `http://localhost:5173/groups` （或是任何觸發 `群組設定` Modal 的地方）。
3. 確認群組卡片上的文字顯示為「成員 (X)」(X 需正確計算該群組人數)，而且旁邊的小頭像也有正確帶出對應的圖片。
4. 點擊該群組卡片的「編輯成員」按鈕，打開 `GroupMembers` 彈出視窗。
5. 確認成員列表上，每個成員都有正確顯示他們自己的**名稱 (Name)**與**大頭貼 (Avatar)**，而不是出現「未知」或沒頭像的情形。
