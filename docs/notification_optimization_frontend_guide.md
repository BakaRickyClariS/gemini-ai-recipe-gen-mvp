# 通知系統優化 - 前端對接指南

> **日期**：2026-02-23（Phase 2 更新）
> **後端團隊**：FuFood AI Microservice

---

## 📋 摘要

後端已**全面完成**通知統一觸發。所有以下場景的通知，現在由後端在 API 業務邏輯完成後自動發送，前端**不需要也不應該**再呼叫 `sendNotification` API。

前端唯一的職責：

1. **FCM Token 註冊**（登入後 POST token）
2. **通知列表 UI 顯示**（GET /notifications）
3. **推播 Toast / Service Worker 處理**

---

## 🚀 後端已自動觸發的全部場景

| #   | 場景         | `type`      | `subType`  | `category`    | 通知對象         |
| --- | ------------ | ----------- | ---------- | ------------- | ---------------- |
| 1   | 食材入庫     | `inventory` | `stockIn`  | `stock`       | 群組全員         |
| 2   | 批次入庫     | `inventory` | `stockIn`  | `stock`       | 群組全員（逐筆） |
| 3   | 食材消耗     | `inventory` | `consume`  | `stock`       | 群組全員         |
| 4   | 建立購物清單 | `shopping`  | `list`     | `official`    | 群組全員         |
| 5   | 新增清單項目 | `shopping`  | `list`     | `official`    | 群組全員         |
| 7   | 編輯清單項目 | `shopping`  | `list`     | `official`    | 群組全員         |
| 9   | 產生邀請連結 | `group`     | `member`   | `official`    | 群組全員         |
| 10  | 移除成員     | `group`     | `member`   | `official`    | 群組剩餘成員     |
| 12  | AI 食譜完成  | `recipe`    | `generate` | `inspiration` | 建立者本人       |
| 13  | 加入群組     | `group`     | `member`   | `official`    | 群組全員         |
| —   | 食材即將過期 | `inventory` | `stock`    | `stock`       | 群組全員（cron） |
| —   | 食材已過期   | `inventory` | `stock`    | `stock`       | 群組全員（cron） |

---

## 🔔 FCM Push Payload

推播 `data` 欄位包含完整資訊，前端可直接使用：

```typescript
interface FCMData {
  type: string; // "inventory" | "recipe" | "group" | "shopping"
  actionType: string; // action.type
  actionId: string; // action.payload 中的 ID
  subType: string; // "stockIn" | "consume" | "generate" | "member" | "list"
  groupName: string; // 群組名稱（保證有值）
  actorName: string; // 操作者名稱
  actorId: string; // 操作者 UID
  refrigeratorId: string; // 冰箱 ID
}
```

---

## ⚠️ 前端需要調整的事項

> [!CAUTION]
> 以下所有 `sendNotification` / `notificationsApiImpl.send()` 呼叫都必須移除，否則會產生重複通知。

1. ☐ 移除 `ConsumptionModal.tsx` 中消耗食材後的通知發送
2. ☐ 移除 `ScanResult.tsx` 中入庫後的通知發送
3. ☐ 移除購物清單相關頁面中的通知發送（建立清單、新增/編輯項目）
4. ☐ 移除群組管理中的通知發送（邀請、移除成員、加入群組）
5. ☐ 移除 AI 食譜生成完成後的通知發送
6. ☐ 移除通知頁面 `[我的冰箱]` 的 fallback（`groupName` 保證有值）
7. ☐ （選配）利用 `subType` 強化推播 toast 顯示

---

如有任何問題，請與後端團隊聯繫。
