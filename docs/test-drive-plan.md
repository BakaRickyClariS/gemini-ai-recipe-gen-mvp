# 後端體驗流程實作規劃書 (Test Drive Flow - Backend Plan)

## 1. 資料庫 Schema 擴充

為了追蹤使用者的「新手體驗 (Test Drive)」完成度，以防跨裝置（換手機/網頁版）時被強迫重看導覽，需在 User 資料表新增紀錄欄位。

### Schema 異動 (User)

```typescript
// Mongoose 欄位擴充範例
const userSchema = new mongoose.Schema({
  // ... existing fields
  tourState: {
    isCompleted: { type: Boolean, default: false },
    currentStep: { type: String, default: 'LOGIN' },
  },
});
```

- **目的**：記錄最後在哪一步，或是是否已經 `isCompleted`。

## 2. API 介面開發

### 2.1 更新導覽進度 API

供前端在切換重大步驟，或是點擊「跳過/完成」時呼叫。

- **Endpoint API**: `PATCH /api/v1/users/me/tour`
- **Request Body**:
  ```json
  {
    "isCompleted": true,
    "currentStep": "COMPLETED"
  }
  ```
- **Response**: `200 OK` (更新使用者檔案與狀態)。

## 3. 核心流程支援實作 (假資料/Seeder 機制)

為了讓第四步的「庫存警報」能有感（看到即期品的視覺警示色），我們必須確保新使用者的冰箱內有東西。

### 3.1 觸發時機

當使用者首次成功呼叫「建立群組 API (`POST /api/v1/groups`)」時。

### 3.2 執行動作 (Hook)

在建立群組成功後，緊接著自動生成 **1~2 筆即期品假資料** 寫入該群組的庫存：

```typescript
// Pseudo code for creating mock inventory
const mockItems = [
  {
    name: '迎賓牛奶 (示範)',
    category: 'DAIRY',
    expireDate: dayjs().add(1, 'day').toDate(), // 明天過期，保證觸發黃/紅燈
    quantity: 1,
    unit: '瓶',
    note: '這是自動為你準備的示範食材，幫助你體驗即期食譜功能 ✨',
    groupId: newGroupId,
  },
];
await Inventory.insertMany(mockItems);
```

- **目的**：讓前端一進到庫存頁，就能立即高亮這筆即期資料，供 `react-joyride` 選取並指引使用者點擊生成 AI 食譜。

## 4. 通知與同步機制驗證

確認既有的通知邏輯 (WebSocket / FCM 推播或 DB Notification) 在以下動作時皆能正常觸發：

1. **食材被消耗 (庫存狀態)**：檢查現有 Webhooks 或 Controller 是否會在數量扣減時推播出庫/即期提醒。
2. **加入購物清單 (採買狀態)**：確認從食譜頁點擊加入採購單時，同群組的其他成員 (或自己跨裝置) 能收到更新通知。
3. **加入群組 (群組動態)**：測試家人掃描 QR Code 入群時，管理員會收到的即時推播。
