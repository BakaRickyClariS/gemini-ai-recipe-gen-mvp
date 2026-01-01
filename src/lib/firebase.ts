import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// 使用 require 載入 JSON 檔案，避免 ESM JSON import 相容性問題
// 假設 service-account-file.json 位於專案根目錄 (即 src/lib/../../)
// 如果檔案不存在，這裡會拋出錯誤，這也是預期的，提醒使用者放檔案
let serviceAccount: any;

// 1. 優先嘗試從環境變數讀取 (適用於 Vercel)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log(
      "✅ [Firebase] Loaded service account from environment variable"
    );
  } catch (error) {
    console.error(
      "❌ [Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var"
    );
  }
}

// 2. 如果環境變數不存在，嘗試從本地檔案讀取 (適用於本地開發)
if (!serviceAccount) {
  try {
    serviceAccount = require("../../service-account-file.json");
    console.log("✅ [Firebase] Loaded service account from local file");
  } catch (error) {
    console.warn(
      "⚠️ [Firebase] No service account found. Push notifications will be disabled."
    );
  }
}

if (serviceAccount && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ [Firebase] Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ [Firebase] Initialization failed:", error);
  }
}

export const messaging = admin.apps.length
  ? admin.messaging()
  : ({
      // Mock implementation if init failed to prevent crash
      send: async () => {
        console.warn(
          "⚠️ [Firebase] Mock send called because initialization failed."
        );
        return "mock-id";
      },
    } as unknown as admin.messaging.Messaging);
