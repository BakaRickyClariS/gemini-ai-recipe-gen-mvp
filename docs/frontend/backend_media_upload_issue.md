# 採買清單圖片上傳與更新問題報告 (已排除前端，需後端支援)

在測試「採買清單 (Shopping List)」的圖片上傳與商品更新功能時，發現了兩個因為前後端 API 對接而導致的錯誤。其中一個（更新項目的 422 錯誤）已經由前端修復，但 **圖片上傳的 404 錯誤** 必須請後端協助處理。

---

## 🛑 1. 圖片上傳 API 遺失 (Status: 404 Not Found)

- **預期 API 端點**: `POST /api/v1/media/upload` (根據文件 `docs/sdd/backend/api-routes.md` 記載)
- **問題描述**:
  前端在 `mediaApi.ts` 使用 FormData 來上傳使用者選擇的圖片，但不管是本地端 (Localhost) 或是 AI 服務端 (`test.vercel.app`)，呼叫該路由皆得到 HTTP 404 Not Found。
- **前端 Request Payload**:
  - **Content-Type**: `multipart/form-data`
  - **Body**: 包含一個欄位 `file` 夾帶所選圖片的 Blob/File。
- **預期 Response 格式**:
  ```json
  {
    "success": true,
    "data": {
      "url": "https://res.cloudinary.com/...", // 必填：存入 Cloudinary 的圖片網址
      "publicId": "..." // 選填：Cloudinary Public ID
    }
  }
  ```
- **測試驗證 (cURL 反應)**:
  `curl -I -X POST http://localhost:3000/api/v1/media/upload` 👉 404
  `curl -I -X POST https://test.vercel.app/api/v1/media/upload` 👉 404
  `curl -I -X POST http://localhost:3000/api/v2/media/upload` 👉 404

### 💡 建議的後端修復方向

1. 確認原先實作 Cloudinary 圖片上傳的 Router (可能是放在 AI 服務端或主要後端) 是否有正確被掛載。
2. 若該 API 路由位址已更改 (例如：升級到 V2 變成 `/api/v2/media/upload`)，煩請更新文件並通知前端修改 `ENDPOINTS.AI.MEDIA_UPLOAD` 的設定。

---

## ✅ 2. 更新採買項目屬性型別錯誤 (Status: 422 Unprocessable Entity) - **(前端已修復)**

- **API 端點**: `PUT /api/v2/shopping-list-items/:itemId`
- **問題描述**:
  使用者在點選「更新項目」時，後端拋出了 422 資料驗證錯誤。
- **根本原因**:
  前台在發送更新 Payload 時，依照了 TypeScript Model 中的 CamelCase 慣例發送了 `{ "photoPath": "..." }`。但該 **V2 後端驗證器 (Zod)** 要求此欄位為 Snake Case `photo_path`。因為找不到該屬性而阻擋了更新請求。
- **前端修復方案**:
  目前前端已經在 `sharedListApi.ts` 內手動進行了雙向屬性相容設定（保留 `photoPath` 同時加送 `photo_path`），可正常銜接 V2 Endpoint，不再產生 422。
  _(此項僅為通知後端：目前採買清單寫入的 Payload 問題已由前端 Workaround 解決。)_
