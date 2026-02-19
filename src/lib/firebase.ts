import admin from "firebase-admin";
import { createRequire } from "module";
import { config } from "../config/unifiedConfig.js";

const require = createRequire(import.meta.url);

let serviceAccount: Record<string, unknown> | undefined;

// 1. 優先從 unifiedConfig 讀取（來自環境變數，適用於 Vercel）
const envServiceAccount = config.firebase.serviceAccountKey;

if (envServiceAccount) {
  try {
    serviceAccount = JSON.parse(envServiceAccount);
    console.log(
      "✅ [Firebase] Loaded service account from environment variable",
    );
  } catch (error) {
    console.error(
      "❌ [Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var",
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
      "⚠️ [Firebase] No service account found. Push notifications will be disabled.",
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
          "⚠️ [Firebase] Mock send called because initialization failed. Check your FIREBASE_SERVICE_ACCOUNT_KEY.",
        );
        return "mock-id";
      },
    } as unknown as admin.messaging.Messaging);
