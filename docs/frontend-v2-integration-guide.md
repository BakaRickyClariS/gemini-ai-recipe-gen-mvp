# 前端 V2 API 對接更新指南 (2026-02-25)

這份文件總結了近期後端針對 V2 API 遷移過程中所修復的錯誤，並提供前端最新的 API 對接指引。

---

## 🛠️ 1. 圖片上傳 API (Media Upload)

前端先前反映 `POST /api/v1/media/upload` 回傳 404 的問題已經修復，並同步提供了最新的 V2 端點。

- **問題原因**: 原先 `index.ts` 與 `v1AiRoutes.ts` 的路由掛載發生重複，導致實際路徑變成 `/api/v1/media/media/upload`。
- **後端修復**:
  1. 修正 V1 路由別名，確保向下相容原本的路徑。
  2. **[推薦]** 新增專屬的 V2 Media 路由。
- **前端 Action / 對接方式**:
  - **建議將上傳端點切換至**: `POST /api/v2/media/upload`
  - **驗證方式**: Headers 中需帶有 `Authorization: Bearer <accessToken>` (JWTAuth)。
  - **Payload 格式維持不變**: `multipart/form-data`，夾帶 `file` 欄位。

---

## 🛠️ 2. 通知 Token 註冊 API (422 錯誤)

前端先前反映 `POST /api/v2/notifications/token` 發生 422 原文報錯。

- **問題原因**: 後端的 Zod 驗證器多包覆了一層 `body:`，導致找不到對應資料。
- **後端修復**: 取消多餘的結構包裝，確保與 `express.json()` 解析行為一致。
- **前端 Action / 對接方式**:
  - 無須修改任何 Payload。
  - 目前使用原有的 JSON 格式 `{ "fcmToken": "..." }` 呼叫即可正確收到 `200 OK` 回應。

---

## 🛠️ 3. 庫存設定版型與欄位 API (422 錯誤與無法儲存)

前端先前反映變更冰箱庫存的版型 (`PUT /api/v2/groups/:groupId/inventory/settings`) 無法真正存入資料庫，且有時會收到 422。

- **問題原因**: 後端 Zod `updateInventorySettingsSchema` 漏掉了 `layoutType` 等許多設定欄位，導致這些欄位在資料流進 API 時被強制定義為 undefined 並剔除。
- **後端修復**: 已將所有 `InventorySettings` 相關欄位補齊。
- **前端 Action / 對接方式**:
  - 現在可以安心地透過 PUT 將 `{ "layoutType": "layout-b", ... }` 送到後端，資料庫將正確保留，並在下次 `GET` 取回時套用。

---

## 🛠️ 4. 食材新增與編輯缺失圖片問題 (Missing imageUrl)

前端先前反映 `GET /api/v2/groups/:groupId/inventory` 會發現所有食材物件缺少 `imageUrl` 導致圖片顯示破圖。

- **問題原因**: 在建立與更新食材的 Zod Schema (`createInventorySchema`, `updateInventorySchema`) 中遺漏了 `imageUrl` 欄位的放行，使得圖片網址從未被真正寫入 DB。
- **後端修復**: 已將 `imageUrl` 加回驗證器的允許名單中。
- **前端 Action / 對接方式**:
  - 前台 `POST` 或 `PUT` 食材時帶上的 `imageUrl` 將會被確實記錄。
  - 重新嘗試新增含有照片的食材，接著再執行查詢，`imageUrl` 就能正常返回給 `<FoodCard />` 渲染了。

---

## 🛠️ 5. 採買清單項目更新 (422 錯誤)

前端反映 `PUT /api/v2/shopping-list-items/:itemId` 在清空數量或使用非預期 Payload 格式時會回傳 422 驗證錯誤。

- **問題原因**: 後端 Zod 驗證器嚴格限制 `quantity` 為正數 (`.positive()`)，且當前台發送字串化的數字時，未自動轉型；同時對 `photoPath` 採取強制 camelCase。
- **後端修復**:
  1. 將 `quantity` 及 `isChecked` 加上 `z.coerce` 以相容字串轉換，並將條件放寬至 `.min(0)` 允許 0。
  2. 新增支援 `photo_path` (snake_case)。
- **前端 Action / 對接方式**:
  - 移除舊的 `photo_path` / `photoPath` 雙修 Payload (保留單一即可，後端皆支援)。
  - 數量輸入 0 也已合法。

---

## 🛠️ 6. 通知列表讀取 API (500 錯誤)

前端反映 `GET /api/v2/notifications` 讀取通知時，API 拋出 500 系統錯誤。

- **問題原因**: 從舊版 (.NET) 轉移至 v2 版本過渡期間，部分舊的 `action_payload` 資料庫記錄是空字串 (`""`)，導致 PostgreSQL 在執行 `n.action_payload::json` 強制轉型時發生崩潰 (Crash)。
- **後端修復**: 在資料庫查詢的 `LEFT JOIN` 中加入了安全把關 (`CASE WHEN n.action_payload LIKE '{%}'`)，排除空字串與異常 JSON 轉型例外。
- **前端 Action / 對接方式**:
  - 現在可以正常呼叫 `GET /api/v2/notifications`，不再出現 500 錯誤。

---

## ✅ 總結與其他事項

- 針對第一次註冊新會員沒有預設冰箱群組導致畫面卡住的問題，目前後端已經加入**註冊時強迫生成「我的冰箱」**的機制以預防此狀態。
