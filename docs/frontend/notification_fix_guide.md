# 前端通知顯示修正建議書

## 1. 現狀確認 (Backend Status)

經後端驗證，目前 `GET /api/v1/notifications` API **已回傳該使用者所有參與群組的通知**，並無依照「當前冰箱」進行過濾。

### 驗證證據

後端模擬 API 請求 (User ID: `019b327e-3334-71e5-ba2f-5bf2d91c5148`)，單次 Response 即包含下列跨群組資料：

```json
{
  "Unknown": 8,
  "FuFuX教授": 3,
  "我的冰箱": 16,
  "徹適用": 1,
  "七個火箭人": 6,
  "巧可力吐司加薯餅": 12
}
```

這證實後端資料流正常，所有群組的通知都已傳送給前端。

## 2. 問題診斷 (Problem)

使用者反映：「切換群組後，通知列表內容會跟著改變，只顯示該群組的通知」。

這顯示 **前端 (Frontend)** 在接收到完整的通知列表後，在 UI 渲染層這段邏輯中，**主動過濾了** 非當前群組的資料。

### 可能的程式碼位置

請檢查與 `NotificationsPage` 或 `NotificationList` 相關的元件，尋找類似以下的過濾邏輯：

```typescript
// ❌ 錯誤寫法：這會導致使用者看不到其他群組的通知
const displayedNotifications = notifications.filter(
  (n) =>
    n.groupName === currentRefrigerator.name ||
    n.action?.payload?.refrigeratorId === currentRefrigerator.id
);
```

## 3. 建議修正 (Action Items)

請前端工程師執行以下修正：

1.  **移除過濾邏輯**：
    在「通知中心 (Notification Center)」頁面，移除任何針對 `refrigeratorId` 或 `groupName` 的過濾器。除非是「過濾 Tabs (如：全部 / 庫存 / 系統)」，否則不應過濾來源群組。

2.  **確認顯示欄位**：
    確保通知卡片 (Notification Card) 上有顯示 `groupName` (群組名稱)，讓使用者知道這則通知來自哪個冰箱。

    - API Response 欄位：`groupName` (例如："七個火箭人")
    - 若 `groupName` 為 null，可顯示 "系統通知" 或對應的 Fallback。

3.  **測試驗證**：
    - 登入一個參與多個群組的帳號。
    - 進入通知頁面，確認是否能同時看到 "冰箱 A" 與 "冰箱 B" 的通知。
    - 切換當前冰箱 Context，確認通知頁面內容**保持不變** (應該要顯示所有內容)。

## 4. API 參考

**Endpoint**: `GET /api/v1/notifications`

**Response Example**:

```json
{
  "status": true,
  "data": {
    "notifications": [
      {
        "id": "uuid...",
        "title": "AI 辨識完成",
        "groupName": "七個火箭人",  <-- 關鍵欄位
        "isRead": false,
        ...
      },
      {
        "id": "uuid...",
        "title": "食材過期提醒",
        "groupName": "我的冰箱",    <-- 關鍵欄位
        "isRead": true,
        ...
      }
    ]
  }
}
```
