# FuFood 通知系統優化方案 - 後端實作規範

本文件綜合了前端團隊的回饋 (`docs/notification-suggestions.md`)，並基於專案內建 Skills (`security-review`, `clean-code`, `backend-dev-guidelines`) 制定，旨在確保後端通知系統符合高效能、高安全與高維護性標準，同時解決重複推播與 Metadata 遺漏的問題。

## 1. 資料庫與 Payload 設計 (相容現有架構)

為降低重構成本，**不新增或更動現有 Schema**。前端所需的 `group_id`、`actor_id` 統一封裝於 JSON 格式的 `action` 欄位中，而基礎資訊則沿用現有欄位：

```typescript
// 完全相容現有資料庫結構
model Notification {
  id          String   @id @default(uuid())
  userId      String   @map("user_id") // 接收推播的目標使用者
  type        String   // 'inventory', 'group', 'shopping', 'system', 'recipe'
  subType     String?  // 'stockIn', 'consume', 'generate', etc.
  title       String
  message     String   // 負責儲存組合好的語句，推播時使用此欄位
  action      Json?    // 存放前端需要的完整 metadata：{ type: 'inventory', payload: { refrigeratorId: '...', actor_id: '...' } }
  groupName   String?  @map("group_name") // ✅ 必須填寫
  actorName   String?  @map("actor_name") // ✅ 必須填寫
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

**架構分層要求 (Backend Dev Guidelines)**：

- **禁止在 Controller 層處理推播邏輯**：應建立專屬的 `NotificationService` 處理通知組裝，確保 `groupName` 與 `action` JSON 的正確生成與發送。
- **Repository 封裝 (Repository Pattern)**：讀寫通知的動作收斂到 `NotificationRepository` 中，不直接在 Service 寫 Prisma 查詢。

## 2. 觸發字典、階段與推播內容 (對齊前端要求)

為解決前端「重複收到通知」的問題，前端建議選項 B 架構：**前端團隊將移除相關發送邏輯，統一由後端伺服器在事務 (Transaction) 完成後發起通知**。

| 觸發業務         | `type` / `subType`      | 觸發階段 (執行時機)                                                                | 推播標題 (`title`) | 推播內文 (`message`)                                 |
| :--------------- | :---------------------- | :--------------------------------------------------------------------------------- | :----------------- | :--------------------------------------------------- |
| **食材入庫完成** | `inventory` / `stockIn` | **業務階段**：使用者掃描或手動新增食材入庫，資料庫寫入完成後。                     | 📦 新食材入庫      | 「{actorName}」在「{groupName}」加入了「{foodName}」 |
| **食材消耗完成** | `inventory` / `consume` | **業務階段**：處理 `consumeItem` Transaction 後，若剩餘量達到門檻或歸零。          | 🛒 補貨提醒        | 「{foodName}」快用完囉。已自動加入購物清單。         |
| **食材即將過期** | `inventory` / `stock`   | **排程階段**：每日 `08:00 AM` Cron Job，掃描 `expiry_date` 為 (Today + 1) 的食材。 | 🚨 食物過期警告    | 「{foodName}」快過期了！點此查看如何處理。           |
| **食材已過期**   | `inventory` / `stock`   | **排程階段**：每日 `08:00 AM` Cron Job，掃描 `expiry_date` < Today 的食材。        | 😭 食物救援失敗    | 很遺憾「{foodName}」已過期，下次記得早點吃掉喔。     |
| **AI 食譜完成**  | `recipe` / `generate`   | **背景階段**：AI 食譜生成的非同步 Queue 任務完成，並寫入資料庫後。                 | ✨ 食譜準備好了    | 你的專屬食譜「{recipeName}」已生成完成，即刻開煮！   |
| **被加入新群組** | `group` / `member`      | **業務階段**：處理 `joinGroup` API，使用者成功加入群組後。                         | 👥 歡迎加入新冰箱  | 你已被加入「{groupName}」，點此與室友共享庫存。      |

> **資料對齊注意**：推播時必須填齊 `groupName`, `actorName`，並將前端必備的 `groupId` 與 `actorId` 塞入 FCM Payload 及 `action` JSON 中。

## 3. 安全性審查與輸入驗證 (Security Review & Zod)

依據 `security-review` 與 `backend-dev-guidelines` 規範：

1. **FCM Token 安全與驗證**：儲存 Token 的 API 必須增加 Rate Limiting 防範惡意寫入，所有傳入 API 的 Token 必須強制使用 **Zod Schema 進行輸入驗證** ，避免系統寫入污染資料。
2. **越權防護 (IDOR)**：
   - 在通知 API（如：`batch-read` 或 `batch-delete`）中，**絕對不可僅憑傳入的 notification ID 更新資料**。
   - `NotificationRepository` 更新資料的條件必須強制帶上 `user_id = req.user.id`。
3. **防禦性程式設計 (Defensive Programming)**：
   - 使用 **Sentry** (All Errors to Sentry 規則) 監控發送推播圖中的各種 FCM 異常。
   - 伺服器排程發送過期通知時，必須記下單日單品項的 `LastAlertSentAt` (可使用 Redis)，避免系統重啟引發的「重複通知風暴」(Thundering Herd Problem)。

## 4. 效能與推播非同步化 (Queueing & Early Return)

- **避免 Controller 阻塞**：呼叫 Firebase 推播網路耗時不可控。必須使用 Redis/BullMQ 等任務佇列把 Firebase HTTP 呼叫放至背景執行。
- **BaseController 及早回應**：Controller 層接收客戶端請求並透過 Service 成功寫入 DB 後，應立即使用 `this.handleSuccess(res, data)` 回傳 HTTP 200/201 狀態碼給前端，絕不可等待 FCM Push 流程結束。
