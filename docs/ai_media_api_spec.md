# AI 服務與媒體上傳 API 規格（更新版）

**版本**: v2.0  
**最後更新**: 2025-12-19  
**前端分支**: `Feature-connect-and-sort-ai-api`

> [!IMPORTANT]
> 此文件為前端與 AI 後端整合的 API 規格。媒體上傳功能已從 Backend API 遷移至 AI API。

---

## 快速索引

- [API 架構概覽](#api-架構概覽)
- [媒體上傳 API](#1-媒體上傳-api)
- [影像辨識 API](#2-影像辨識-api)
- [AI 食譜生成 API](#3-ai-食譜生成-api)
- [前端整合範例](#4-前端整合範例)
- [環境變數配置](#5-環境變數配置)

---

## API 架構概覽

### 雙 API 架構

前端採用雙 API 架構，區分為 **AI API** 和 **Backend API**：

| API 類型        | 環境變數                    | 用途                                |
| --------------- | --------------------------- | ----------------------------------- |
| **AI API**      | `VITE_AI_API_BASE_URL`      | OCR 辨識、AI 食譜生成、**媒體上傳** |
| **Backend API** | `VITE_BACKEND_API_BASE_URL` | 使用者認證、庫存管理、群組管理等    |

### Base URL 設定

```bash
# AI 服務 Base URL
VITE_AI_API_BASE_URL=https://your-ai-api.vercel.app/api/v1

# 或本地開發
VITE_AI_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 1. 媒體上傳 API

### 端點資訊

| Method | Path                   | 功能          | 備註         |
| ------ | ---------------------- | ------------- | ------------ |
| POST   | `/api/v1/media/upload` | 上傳圖片/檔案 | 回傳 CDN URL |

### 請求格式

```
POST /api/v1/media/upload
Content-Type: multipart/form-data
```

**FormData 欄位**:

| 欄位   | 類型      | 必填 | 說明             |
| ------ | --------- | ---- | ---------------- |
| `file` | File/Blob | ✅   | 要上傳的圖片檔案 |

### 回應格式

#### 成功回應 (200)

```typescript
type UploadSuccessResponse = {
  success: boolean; // true
  data: {
    /** 上傳後的公開 URL（CDN 優化） */
    url: string;
    /** Cloudinary Public ID（可選，用於後續管理） */
    publicId?: string;
  };
};
```

**範例**:

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fufood/abc123.jpg",
    "publicId": "fufood/abc123"
  }
}
```

#### 錯誤回應

| HTTP Status | 錯誤代碼    | 說明                        |
| ----------- | ----------- | --------------------------- |
| 400         | `MEDIA_001` | 未提供檔案                  |
| 400         | `MEDIA_002` | 檔案類型不支援              |
| 413         | `MEDIA_003` | 檔案過大（建議上限 10MB）   |
| 401         | `MEDIA_004` | 未授權                      |
| 500         | `MEDIA_005` | 上傳失敗（Cloudinary 錯誤） |

**錯誤回應格式**:

```json
{
  "success": false,
  "code": "MEDIA_002",
  "message": "不支援的檔案類型，請上傳 JPG、PNG 或 WebP 格式",
  "timestamp": "2025-12-19T10:00:00Z"
}
```

### 後端實作建議

#### Cloudinary 上傳範例 (Node.js)

```typescript
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// 設定 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 上傳圖片至 Cloudinary
 */
export async function uploadToCloudinary(file: Buffer, filename: string) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'fufood',
        resource_type: 'image',
        // 自動優化
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, crop: 'limit' }, // 限制最大寬度
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );

    Readable.from(file).pipe(uploadStream);
  });
}
```

#### Express/Next.js API Route 範例

```typescript
import formidable from 'formidable';
import { uploadToCloudinary } from './cloudinaryService';

export async function POST(req: Request) {
  const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB

  const [fields, files] = await form.parse(req);
  const file = files.file?.[0];

  if (!file) {
    return Response.json(
      { success: false, code: 'MEDIA_001', message: '未提供檔案' },
      { status: 400 },
    );
  }

  // 驗證檔案類型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype || '')) {
    return Response.json(
      { success: false, code: 'MEDIA_002', message: '不支援的檔案類型' },
      { status: 400 },
    );
  }

  try {
    const result = await uploadToCloudinary(
      file.filepath,
      file.originalFilename,
    );

    return Response.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { success: false, code: 'MEDIA_005', message: '上傳失敗' },
      { status: 500 },
    );
  }
}
```

---

## 2. 影像辨識 API

### 端點資訊

| Method | Path                       | 功能                 |
| ------ | -------------------------- | -------------------- |
| POST   | `/api/v1/ai/analyze-image` | OCR / 食材結構化辨識 |

### 請求格式

```json
{
  "imageUrl": "https://res.cloudinary.com/xxx/image/upload/v123/fufood/abc.jpg"
}
```

### 回應格式 (200)

```json
{
  "success": true,
  "data": {
    "productName": "蘋果",
    "category": "蔬果類",
    "attributes": "水果類",
    "purchaseQuantity": 1,
    "unit": "顆",
    "purchaseDate": "2025-12-20",
    "expiryDate": "2025-12-27",
    "lowStockAlert": true,
    "lowStockThreshold": 2,
    "notes": "",
    "imageUrl": "https://res.cloudinary.com/xxx/image/upload/v123/fufood/abc.jpg"
  },
  "timestamp": "2025-12-20T10:00:00Z"
}
```

---

## 3. AI 食譜生成 API

> 詳細規格請參考 [ai_recipe_api_spec.md](./ai_recipe_api_spec.md)

### 端點資訊

| Method | Path                       | 功能                         |
| ------ | -------------------------- | ---------------------------- |
| POST   | `/api/v1/ai/recipe`        | AI 產生食譜推薦              |
| POST   | `/api/v1/ai/recipe/stream` | AI 產生食譜（SSE Streaming） |

---

## 4. 前端整合範例

### API Client 架構

前端使用統一的 `ApiClient` 類別：

```typescript
// src/api/client.ts
import { ApiClient } from './ApiClient';

// AI API（OCR、食譜、媒體上傳）
export const aiApi = new ApiClient('ai');

// Backend API（認證、庫存、群組等）
export const backendApi = new ApiClient('backend');
```

### 媒體上傳 API 使用

```typescript
// src/modules/media/api/mediaApi.ts
import { aiApi } from '@/api/client';

export const mediaApi = {
  /**
   * 上傳圖片至後端
   * @param file - File 或 Blob 物件
   * @returns 上傳後的圖片 URL
   */
  uploadImage: async (file: File | Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await aiApi.post<UploadResponse>(
      '/media/upload',
      formData,
    );

    if (response.success && response.data?.url) {
      return response.data.url;
    }

    throw new Error('Upload failed: No URL returned');
  },
};
```

### React Hook 使用範例

```typescript
// 使用 TanStack Query 的 useMutation
import { useMutation } from '@tanstack/react-query';
import { mediaApi } from '@/modules/media/api/mediaApi';

export const useImageUpload = () => {
  return useMutation({
    mutationFn: async (file: File | Blob) => {
      return await mediaApi.uploadImage(file);
    },
    onSuccess: (url) => {
      console.log('上傳成功:', url);
    },
    onError: (error) => {
      console.error('上傳失敗:', error);
    },
  });
};
```

---

## 5. 環境變數配置

### AI API 後端需設定

```bash
# Cloudinary 設定
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini AI 設定
GEMINI_API_KEY=your_gemini_key

# 可選設定
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

### 前端需設定

```bash
# .env 或 .env.local
VITE_AI_API_BASE_URL=https://your-ai-api.vercel.app/api/v1
VITE_BACKEND_API_BASE_URL=https://api.fufood.jocelynh.me
```

---

## 附錄：API 路由總表

| #   | 模組  | Method | Path                       | 功能              |
| --- | ----- | ------ | -------------------------- | ----------------- |
| 51  | AI    | POST   | `/api/v1/ai/analyze-image` | OCR/影像辨識      |
| 52  | AI    | POST   | `/api/v1/ai/recipe`        | AI 產生食譜       |
| 52a | AI    | POST   | `/api/v1/ai/recipe/stream` | AI 產生食譜 (SSE) |
| 57  | Media | POST   | `/api/v1/media/upload`     | 上傳圖片          |

---

## 變更歷史

| 版本 | 日期       | 說明                                                           |
| ---- | ---------- | -------------------------------------------------------------- |
| v2.0 | 2025-12-19 | 媒體上傳遷移至 AI API，整合 `mediaApi.ts`，移除 `uploadApi.ts` |
| v1.0 | 2025-12-08 | 初版                                                           |
