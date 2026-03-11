# 後端新手教學狀態持久化製作規劃書

## 目標描述

實作後端存儲使用者教學進度的功能，確保使用者在跨裝置使用時不會重複看到已完成的教學。

## 建議更動

### [資料模型層]

#### [User Schema]

- 擴充 `tourState` 物件：
  ```typescript
  tourState: {
    isCompleted: { type: Boolean, default: false },
    currentStep: { type: String, default: 'LOGIN' },
    lastUpdated: { type: Date, default: Date.now }
  }
  ```

### [API 介面層]

#### [NEW] 更新教學進度 API

- **Method**: `PATCH`
- **Path**: `/api/v2/profile/tour`
- **Request Body**:
  ```json
  {
    "isCompleted": boolean,
    "currentStep": string
  }
  ```
- **邏輯描述**：
  1. 驗證使用者身份 (JWT/Cookie)。
  2. 根據請求內容更新 `tourState`。
  3. 回傳更新後的完整 User Profile。

## 驗證計畫

### API 測試

- 使用 Postman 或捲動測試腳本呼叫 `PATCH /api/v2/profile/tour`。
- 呼叫 `GET /api/v2/profile` 驗證 `tourState` 是否正確寫入。
