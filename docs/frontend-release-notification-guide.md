# CI/CD 部署自動通知整合指南

這份文件說明了如何在前端專案部署完成後（如 GitHub Actions、Vercel 或 CI/CD Pipeline 中），自動呼叫後端 API 來向全站使用者發送「新版本發佈」通知與推播。

## 端點資訊

- **Method**: `POST`
- **URL**: `https://<你的後端網域>/api/v1/admin/release`
- **Authentication**: `X-Deploy-Secret` Header

## Request Format

### Headers

```http
Content-Type: application/json
X-Deploy-Secret: <請填入環境變數中的 ADMIN_DEPLOY_SECRET>
```

> [!CAUTION]
> **安全警告**：請務必將此 Secret 存放在 CI/CD 的環境變數設定中（例如 GitHub Actions Secrets 或 Vercel Environment Variables），**絕對不要**將其寫死（Hardcode）在前端源碼中。

### Body (JSON)

| 欄位      | 型別   | 必填 | 說明                         |
| --------- | ------ | ---- | ---------------------------- |
| `version` | string | ✅   | 發佈的版本號（例如 "1.2.0"） |
| `changes` | string | ✅   | 版本更新內容或發佈日誌       |

**Example Body:**

```json
{
  "version": "1.3.0",
  "changes": "新增了 AI 食譜圖片生成功能，修復了部分 UI Bug！"
}
```

## Response

**成功 `200 OK`**

```json
{
  "success": true,
  "data": {
    "message": "Release v1.3.0 notification sent successfully",
    "details": {
      "recipientCount": 150, // 實際寫入資料庫的使用者數量
      "notificationCount": 150 // 寫入的通知資料筆數
    }
  }
}
```

## 在 CI/CD 中使用的範例

### cURL 範例 (Shell Script)

在部署腳本的最後一行加入：

```bash
curl -X POST https://api.fufood.com/api/v1/admin/release \
  -H "Content-Type: application/json" \
  -H "X-Deploy-Secret: $DEPLOY_SECRET" \
  -d '{
    "version": "1.3.0",
    "changes": "新增了 AI 食譜圖片生成功能！"
  }'
```

### GitHub Actions (`.github/workflows/deploy.yml`) 範例

```yaml
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # ... (你的 checkout, build, deploy 步驟) ...

      - name: Trigger Release Notification
        if: success() # 確保只有部署成功才發送通知
        env:
          DEPLOY_SECRET: ${{ secrets.ADMIN_DEPLOY_SECRET }}
          VERSION: ${{ github.ref_name }} # 使用 Git Tag 或其他方式取得版本號
        run: |
          curl -X POST https://your-backend.com/api/v1/admin/release \
            -H "Content-Type: application/json" \
            -H "X-Deploy-Secret: $DEPLOY_SECRET" \
            -d "{ \"version\": \"$VERSION\", \"changes\": \"新版本已上線，快來看看新功能！\" }"
```

## 後端行為說明

當你的 CI/CD 觸發這支 API 後，後端會：

1. 為系統內**每一位使用者**的工作清單 (`notifications` 表) 中新增一筆 `official` 類別的系統通知。
2. 通知標題將自動組成：`🎉 FuFood v<version> 更新上線！`
3. 使用所有已註冊的 FCM Tokens 發送手機/網頁推播通知（Multicast）。
