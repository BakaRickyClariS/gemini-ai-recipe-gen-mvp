# 認證 API 欄位統一與錯誤處理重構規劃 (Backend Auth API Refactor SDD)

## 1. 概述 (Overview)
針對目前 `POST /api/v1/auth/register` (displayName) 與其餘 Profile 端點 (name) 的欄位不一致問題，提出重構方案以符合專案 `clean-code` 規範（DRY 與 Naming Rules）。

## 2. 修正目標 (Objectives)
- **統一口徑**：將所有使用者名稱相關欄位統一為 `name`。
- **簡化錯誤解析**：優化 422 驗證錯誤的回傳結構，將詳細訊息提取至頂層。

## 3. 具體變更方案 (Proposed Changes)

### 3.1 欄位對齊 (Field Alignment)
| API 端點 | 目前欄位 | 建議變更 | 說明 |
| :--- | :--- | :--- | :--- |
| `POST /register` | `displayName` | `name` | 為了與 `Profile` 模組一致，移除 `displayName` 命名。 |
| `GET /me` | `name` | `name` | 保持不變。 |
| `PUT /update-profile`| `name` | `name` | 保持不變。 |

> [!NOTE]
> 如果 `displayName` 是為了支援 LINE Login 原生欄位，建議在後端 Controller 層進行轉換（Map `displayName` → `name`），而不要將此命名暴露在標準 Email 註冊 API 中。

### 3.2 錯誤回應結構優化 (Error Response)
目前的 422 錯誤訊息過於隱晦：
```json
// 現狀
{ "message": "Invalid input", "error": { "details": [{ "message": "displayName is required" }] } }
```

**建議修正為：**
```json
// 優化後
{
  "status": false,
  "message": "請輸入使用者名稱", // 直接將細節提取至 message
  "error": {
    "code": "AUTH_422",
    "details": [...]
  }
}
```

## 4. 預期效益 (Benefits)
- 前端不需要在不同頁面維護兩套型別。
- 遵循 `clean-code` 的 **Naming Rules**（揭示意圖）與 **DRY** 原則。
- 提升錯誤處理的開發體驗。
