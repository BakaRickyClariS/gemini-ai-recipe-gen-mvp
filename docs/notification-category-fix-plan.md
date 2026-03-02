# 推播通知分類修正企劃書 (Notification Category Fix Plan)

## 1. 核心開發準則：前端極簡化

秉持著「**前端應盡量乾淨，能後端做的邏輯就後端做**」的原則，所有與資料篩選、狀態判斷、分頁過濾相關的核心業務邏輯，應完全收斂並集中於後端處理。前端的職責僅限於「發送請求並忠實呈現分類好的資料」。

---

## 2. 發現與問題癥結

經過詳細追蹤最新一次測試以及 API 回傳的資料結構，我們確定了「通知在前端突然消失」的原因是出在 **後端對請求參數 Mapping 與分類過濾邏輯的遺漏/錯誤**。

### 現象

當前端依照使用者的 Tab 切換，傳送 `GET /api/vX/notifications?category=stock` 給後端時：

- **預期行為**：後端回傳屬於「食材管家」的通知（即 `type` 為 `inventory`, `group`, `shopping` 以及特定系統推播）。
- **實際行為**：後端**沒有回傳** `group` (新成員加入) 與 `shopping` (採買清單建立) 的通知，導致前端這兩個相關的推播直接消失無蹤。

### 根本原因

為配合 v1 的資料庫相容性，原本後端推播物件並無 `category` 欄位，而是僅使用 `type`。
但目前後端的實作可能為了迎合 `?category=official` 或 `?category=stock` 這個查詢條件，**強行將群組 (`group`) 與採買清單 (`shopping`) 歸類為了 `official`**（或是直接在回傳的 JSON 洗上了 `category: 'official'` 的假屬性）。
因為後端沒有做好正確的特徵 Mapping，導致依賴分頁與分類的請求，直接把本該呈現的通知過濾掉了。

---

## 3. 修正實作規劃 (Backend Integration Plan)

為了保持前端乾淨，**不建議開放前端傳送複雜的複數 `type` 陣列（如 `?types=inventory,shopping,group`）進行查詢**。分類（Category）對應有哪些 `type` 應視為後端商業邏輯的一部分。

前端將**恢復維持單一、語意化的 API 請求**：

- 取得食材管家通知：`GET /api/vX/notifications?category=stock`
- 取得官方公告通知：`GET /api/vX/notifications?category=official`

### 後端需實作的 Data Mapping 規則：

當接收到 `category` Query Parameter 時，後端應於資料庫/ORM 查詢層面，實作以下條件過濾 (SQL Where Clause / MongoDB $match)：

#### A. 當收到 `category=stock` 時

後端需回傳符合以下條件的推播（分頁處理）：

1. `type` IN (`inventory`, `shopping`, `group`)
2. `type` = `system` **並且** 該通知帶有群組關聯特徵（例如資料庫欄位具有 `group_id`, `group_name` 或類似欄位）。

#### B. 當收到 `category=official` 時

後端需回傳符合以下條件的推播（分頁處理）：

1. `type` = `system` **並且** 該通知為純官方廣播性質（該資料庫紀錄**沒有**夾帶特定 `group_id`, `group_name` 或相關聯的使用者操作紀錄）。

---

## 4. 驗收標準 (Acceptance Criteria)

當後端完成上述 Mapping 修改後，前端即可撤除目前的 **全域拉取加本地防呆過濾的暫時性措施 (Workaround)**，直接使用後端回傳的乾淨分頁資料。
如此即可確保前端分頁流暢，且不再需要在客戶端進行高耗能的字串比對與邏輯判定。
