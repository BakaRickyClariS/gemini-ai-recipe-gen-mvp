import { Router } from "express";
import multer from "multer";
import fs from "fs";
import * as Sentry from "@sentry/node";
import { uploadToCloudinary } from "../../services/mediaService.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";

const router = Router();

// 智能判斷上傳目錄
const uploadDir = (() => {
  try {
    if (fs.existsSync("/tmp")) return "/tmp/uploads";
    return "uploads/";
  } catch {
    return "uploads/";
  }
})();

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

/** POST /upload — 上傳圖片到 Cloudinary */
router.post("/upload", jwtAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      code: "MEDIA_001",
      message: "未提供檔案",
    });
    return;
  }

  try {
    const result = await uploadToCloudinary(req.file.path);

    try {
      fs.unlinkSync(req.file.path);
    } catch {
      console.warn(`[WARN] 無法刪除暫存檔: ${req.file.path}`);
    }

    res.status(200).json({
      success: true,
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "上傳失敗";
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      code: "MEDIA_005",
      message: "上傳失敗",
      details: message,
    });
  }
});

export default router;
