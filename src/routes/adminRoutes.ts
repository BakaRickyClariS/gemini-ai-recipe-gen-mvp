import express from "express";
import { notificationService } from "../services/notificationService.js";

const router = express.Router();

// Middleware: 驗證 Deploy Secret (用於 CI/CD 自動發布)
const requireDeploySecret = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const secret = req.headers["x-deploy-secret"];
  const expectedSecret = process.env.DEPLOY_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    console.warn(`[Admin] Invalid deploy secret attempt.`);
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid Deploy Secret" });
  }
  next();
};

// Middleware: 簡易管理員驗證 (目前僅檢查 header，實際上應結合 JWT Role 驗證)
const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  // 這裡是一個簡易實作，實務上應該驗證 JWT 中的 role claims
  // 假設我們在 .env 設定一個 ADMIN_TOKEN
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Admin access required" });
  }
  next();
};

// 1. 發送官方公告 (管理員手動)
router.post("/announcements", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      message,
      type = "announcement",
      pushNotification = true,
      data,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }

    const result = await notificationService.sendAnnouncement(
      title,
      message,
      type,
      pushNotification,
      data
    );

    res.json({
      success: true,
      message: "Announcement sent successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. 版本發布公告 (CI/CD 觸發)
router.post("/announcements/release", requireDeploySecret, async (req, res) => {
  try {
    const { version, releaseNotes, forceUpdate = false } = req.body;

    if (!version || !releaseNotes) {
      return res
        .status(400)
        .json({ error: "version and releaseNotes are required" });
    }

    const title = `🎉 FuFood v${version} 更新上線！`;
    const message = releaseNotes; // 前端可能只顯示摘要，或點擊後顯示完整內容

    // 這裡我們將 releaseNotes 放在 data 中，message 可以是精簡版
    // 為了簡單起見，我們取 releaseNotes 的第一行或前幾字當 message
    const lines = releaseNotes.split("\n");
    const shortMessage =
      lines.find((l: string) => l.trim().length > 0 && !l.startsWith("#")) ||
      "查看新功能與改善項目";

    const result = await notificationService.sendAnnouncement(
      title,
      shortMessage,
      "release",
      true, // 版本更新預設推播
      {
        version,
        releaseNotes,
        forceUpdate,
        url: "/settings/about", // 點擊導向
      }
    );

    res.json({
      success: true,
      message: `Release announcement for v${version} sent`,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
