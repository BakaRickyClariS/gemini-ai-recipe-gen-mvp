# Cloudinary Migration & AI Integration Guide

本文件說明如何將前端的 Cloudinary 上傳邏輯遷移至後端，並整合至 AI 食譜生成流程中。

## 1. 系統架構變更

### 目標
1. **安全性**：移除前端暴露的 Cloudinary Credentials。
2. **集中管理**：所有第三方服務 (Cloudinary, Gemini AI) 由後端統一管理。
3. **整合性**：AI 生成的 Base64 圖片直接由後端上傳至 Cloudinary，前端僅接收 URL。

---

## 2. 環境建置 (Backend)

### 2.1 新增依賴
請安裝以下 Node.js 套件：

```bash
npm install cloudinary multer
npm install @types/multer --save-dev
```

### 2.2 環境變數 (.env)
確保後端 `.env` 包含以下設定：

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Configuration
GEMINI_API_KEY=your_gemini_key
```

### 2.3 Cloudinary 設定模組
建議建立 `src/config/cloudinary.ts`：

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

---

## 3. API 實作

### 3.1 圖片上傳 API (已定義於 `ai_media_api_spec.md`)

*   **Endpoint**: `POST /api/v1/media/upload`
*   **功能**: 接收前端上傳的圖片檔案，轉傳至 Cloudinary。

**實作範例 (Express/Multer)**:

```typescript
import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // 使用記憶體儲存，直接串流上傳

router.post('/media/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // 將 Buffer 轉換為 Stream 上傳至 Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'fufood/user-uploads', // 建議設定資料夾
      resource_type: 'auto',
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url, // 回傳 HTTPS 網址
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

export default router;
```

---

## 4. AI 食譜圖片整合

### 4.1 問題描述
目前 Gemini AI 生成圖片回傳的是 Base64 字串。若是直接傳回前端：
1. **傳輸量大**：增加 JSON Payload 大小。
2. **無法快取**：瀏覽器無法有效快取 Base64 圖片。
3. **時效性**：若不儲存，下次檢視需重新生成。

### 4.2 解決方案流程
修改 `ai_recipe_api_spec.md` 中描述的流程：

1. **User** 發送請求 `POST /api/v1/ai/recipe`。
2. **Backend**:
    - 呼叫 Gemini AI 生成食譜文字。
    - 針對每道食譜，呼叫 Gemini AI 生成圖片 (Base64)。
    - **[新增步驟]** 將 Base64 圖片上傳至 Cloudinary (Server-to-Server)。
    - 取得 Cloudinary `secure_url`。
    - 將 `imageUrl` 欄位填入 Cloudinary URL。
3. **Backend** 回傳 JSON 給前端。

**整合程式碼範例**:

```typescript
import cloudinary from '../config/cloudinary';

// ... 在 AI 服務中 ...

async function generateAndUploadImage(recipeName: string, category: string): Promise<string> {
  // 1. 呼叫 Gemini 生成圖片 (取得 Base64)
  const base64Image = await generateRecipeImage(recipeName, category);
  
  if (!base64Image) return '';

  try {
    // 2. 上傳至 Cloudinary
    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: 'fufood/ai-recipes',
      public_id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
    
    // 3. 回傳 URL
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Failed:', error);
    return ''; // 失敗時回傳空字串或預設圖
  }
}
```

---

## 5. 前端對應調整 (參考)

前端將不再使用 Cloudinary SDK，所有圖片相關操作皆透過 Backend API。

1. **上傳**: `useImageUpload` 改打 `/api/v1/media/upload`。
2. **顯示**: `img src` 直接使用 API 回傳的 URL。
