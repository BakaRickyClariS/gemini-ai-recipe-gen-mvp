import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// 使用 require 載入 JSON 檔案，避免 ESM JSON import 相容性問題
// 假設 service-account-file.json 位於專案根目錄 (即 src/lib/../../)
// 如果檔案不存在，這裡會拋出錯誤，這也是預期的，提醒使用者放檔案
let serviceAccount;
try {
    serviceAccount = require('../../service-account-file.json');
}
catch (error) {
    console.error('❌ [Firebase] 無法載入 service-account-file.json，請確認檔案是否存在於專案根目錄。');
    console.error(error);
}
if (serviceAccount && !admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ [Firebase] Admin SDK initialized successfully');
    }
    catch (error) {
        console.error('❌ [Firebase] Initialization failed:', error);
    }
}
export const messaging = admin.apps.length ? admin.messaging() : {
    // Mock implementation if init failed to prevent crash
    send: async () => { console.warn("⚠️ [Firebase] Mock send called because initialization failed."); return "mock-id"; }
};
