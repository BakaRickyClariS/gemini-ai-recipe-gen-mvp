# 通知系統升級：前端整合指南 V2 (前端傳送資料版)

## 📌 變更摘要

由於後端無法跨服務 JOIN 取得使用者與群組資料，**前端已修改為在發送通知時直接傳入 `groupName` 與 `actorName`**。

後端僅需負責：
1.  在接收 `POST /notifications` 時，將這兩個欄位存入資料庫。
2.  在 `GET /notifications` 時，將這兩個欄位原樣回傳。

---

## 1. 寫入通知 API (`POST`)

前端呼叫 `sendNotification` 時，Payload 已新增 `groupName` 與 `actorName` 欄位。

### Request Payload 範例

```json
{
  "title": "AI 辨識完成！食材已入庫",
  "body": "剛買的食材已安全進入庫房，快去看看庫房！",
  "type": "inventory",
  "subType": "stockIn",
  "userIds": ["user_123"],
  "groupId": "group_456",
  
  // ✅ [NEW] 前端傳入的新欄位
  "groupName": "Ricky home",
  "actorName": "Ricky",
  
  "action": {
    "type": "inventory",
    "payload": { "refrigeratorId": "group_456" }
  }
}
```

### 後端需配合事項
-   擴充資料庫 `notifications` 表，新增儲存 `groupName` (String) 和 `actorName` (String)。
-   若資料庫不支援 Schema 變更，可考慮存入 `metadata` 或 `payload` JSON 欄位中。

---

## 2. 讀取通知 API (`GET`)

前端顯示通知列表時，依賴 API 回傳這兩個欄位來顯示 Header。

### Response 範例

```json
[
  {
    "id": "notify_001",
    "title": "AI 辨識完成！食材已入庫",
    "message": "剛買的食材已安全進入庫房，快去看看庫房！",
    "type": "inventory",
    "subType": "stockIn",
    "createdAt": "2026-01-05T10:00:00Z",
    "isRead": false,
    
    // ✅ [NEW] 需回傳儲存的資料
    "groupName": "Ricky home",
    "actorName": "Ricky"
  }
]
```

### UI 顯示對應
-   前端會顯示為：`[區塊標題] [Ricky home] • Ricky`
-   若 API 未回傳這些欄位，前端會顯示預設值或隱藏 Header，但**強烈建議回傳以符合新設計規範**。

---

## 3. 文案範本同步 (Reference)

前端已更新發送的通知文案，以符合「冰箱小隊」風格。若後端有任何自動發送的通知（如排程檢查過期），請參考以下文案風格：

| 類型 (subType) | 標題範本 | 內文範本 |
|---|---|---|
| **consume** (消耗) | `{食材} 完成任務，光榮退役！` | `冰箱小隊報告！{食材} 已順利上桌，美味任務達成！` |
| **stockIn** (入庫) | `AI 辨識完成！食材已入庫` | `剛買的食材已安全進入庫房，快去看看庫房！` |
| **generate** (生成) | `阿福靈感大爆發！新食譜出爐` | `冰箱小隊為您獻上今日料理靈感：{食譜}` |
| **list** (清單) | `採購清單「{清單}」已建立` | `快來看看需要買什麼，一起規劃下次的購物行程吧！` |

---

## 4. 待辦事項 (Checklist)

- [ ] **Database**: 確認資料庫可儲存 `groupName` 和 `actorName`。
- [ ] **API (Save)**: 修改 `createNotification` 邏輯，接收並儲存這兩個欄位。
- [ ] **API (Get)**: 修改 `getNotifications` 回傳結構，包含這兩個欄位。
