# 後端 Push Notification 實作計畫 (FCM)

本計畫書旨在指導後端開發人員實作 FCM 推播功能，包括裝置 Token 管理、FCM 整合，以及群組事件（如新成員加入）的自動推播觸發。

## 目標
- 建立使用者裝置 (FCM Token) 管理機制。
- 整合 Firebase Admin SDK 以發送訊息。
- 在群組成員變更時觸發推播通知。

## 1. 資料庫 schema 設計

### 1.1 新增 `user_devices` 表
用於儲存使用者的 FCM Token，支援多裝置登入。

| 欄位名稱 | 類型 | 描述 |
| --- | --- | --- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key -> users.id |
| `fcm_token` | TEXT | Firebase Registration Token (Unique) |
| `device_type` | VARCHAR | 'web', 'ios', 'android' |
| `last_active_at` | TIMESTAMP | 最後活躍時間 |
| `created_at` | TIMESTAMP | 建立時間 |

*建議加上索引：`user_id` 以加速查詢。*

## 2. API 介面設計

### 2.1 註冊裝置 Token
- **Endpoint**: `POST /api/v1/notifications/devices`
- **Auth**: Required
- **Body**:
  ```json
  {
    "fcmToken": "string",
    "deviceType": "web"
  }
  ```
- **Logic**:
  - 檢查 Token 是否已存在。
  - 若存在則更新 `last_active_at`。
  - 若不存在則新增記錄。

### 2.2 移除裝置 Token (登出時呼叫)
- **Endpoint**: `DELETE /api/v1/notifications/devices/{fcmToken}`
- **Auth**: Required
- **Logic**: 刪除該 Token 記錄。

## 3. 服務層實作

### 3.1 Firebase Integration Service
- 引入 `firebase-admin` SDK。
- 設定 Service Account Credentials。
- 實作 `sendMulticast(tokens: string[], payload: MessagingPayload)` 方法。

### 3.2 Notification Service
- 封裝業務通知邏輯。
- `notifyGroupMembers(groupId: string, event: NotificationEvent)`
  - 查詢群組內所有成員 (除了觸發者)。
  - 查詢這些成員的有效 FCM Tokens。
  - 呼叫 Firebase 發送訊息。

## 4. 業務邏輯整合 (群組事件)

### 4.1 監聽「加入群組」事件
在 `GroupsController.join` 或 `MembershipService.create` 成功後：

1. **觸發點**：成員 A 成功加入群組 G。
2. **查詢**：找出群組 G 的所有現有成員 (User B, User C...)。
3. **發送**：
   - 標題：`新成員加入`
   - 內容：`${User A.name} 剛剛加入了 ${Group G.name}`
   - Data Payload:
     ```json
     {
       "type": "GROUP_MEMBER_UPDATE",
       "groupId": "group_id_123",
       "action": "joined",
       "memberId": "user_a_id"
     }
     ```

### 4.2 其他建議事件
- 成員離開/被移除。
- 群組名稱修改。

## 5. 驗證計畫

### 5.1 單元測試
- 測試 `DeviceService` 的 Token 儲存與去重邏輯。
- Mock Firebase Admin SDK 測試 `notifyGroupMembers` 是否正確篩選 Token。

### 5.2 整合測試
- 使用 Postman 呼叫 `POST /devices` 註冊 Token。
- 模擬加入群組操作，確認 Firebase Console (或實際 Client) 收到推播。
