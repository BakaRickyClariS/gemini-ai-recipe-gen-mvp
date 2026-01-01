# 前端修改建議書：通知系統更新

**日期**: 2026-01-02
**相關功能**: 通知中心 (Notification Center)、庫存管理 (Inventory)

---

## 摘要

後端已完成 **通知系統修復** 與 **群組廣播功能** 的更新。
目前的後端實作已調整為 **符合前端現有邏輯**，因此前端 **"不需要"** 進行重大修改即可恢復功能。

以下列出後端的變更點與前端可選的優化建議。

---

## 1. API 回應格式修正 (已修復)

後端已修正 `GET /api/v1/notifications` 的回應結構，以符合前端 `GetNotificationsResponse` 介面。

**後端現在回傳：**

```json
{
  "success": true,
  "data": {
    "items": [ ... ],       // 修正點：原本直接回傳 array，現在包裹在 items 內
    "total": 6,
    "unreadCount": 6
  },
  "pagination": { ... }
}
```

**前端行動：**

- ✅ **不需修改程式碼**（如果前端原本就在存取 `data.data.items`）。
- 測試：重新整理通知頁面，應可正常顯示列表。

---

## 2. 群組廣播功能 (新功能)

當使用者新增食材時，後端會自動查詢該冰箱 (Group) 的所有成員，並發送通知給所有人。

**行為變更：**

- **舊行為**：只有「操作者本人」收到通知。
- **新行為**：該冰箱的「所有成員」都會收到通知。

**前端行動：**

- ✅ **不需修改程式碼**。
- 測試：
  1. 使用 A 帳號新增食材。
  2. 登入 B 帳號 (同一群組成員)，檢查通知中心是否收到通知。

---

## 3. 分類篩選邏輯 (Category)

後端已正規化 `category` 欄位。

**前端行動：**

- ✅ **不需修改**：繼續使用 `category=stock`、`category=inspiration` 等參數查詢即可。

---

## 4. (可選) 程式碼優化建議

雖然功能已恢復，但建議前端可以檢視以下邏輯是否需要移除或簡化：

### A. 移除手動過濾 (若有)

如果您之前因為後端回傳錯誤而在前端做了 `category` 或 `type` 的手動過濾，現在可以移除，直接信任 API 回傳的結果。

### B. 若要啟用 HttpOnly Cookie (Auth Migration)

如果您計畫採用新的 Cookie 驗證機制 (Auth Migration Plan)，請參考之前提供的 `ai_api_auth_migration_plan.md` 進行 `sync-session` 的串接。若暫時維持現狀，則無需動作。

---

## 5. 群組成員變動通知 (需前端實作)

由於「群組管理（加入、退出、刪除）」由 Main Backend 負責，Recipe-API 無法自動偵測。請前端在相關操作成功後，主動呼叫以下 API 發送通知。

**API 端點**: `POST /api/v1/notifications/send`

**使用時機**:

- 成員加入群組成功後
- 成員退出群組成功後
- 群組刪除成功後 (通知其他成員)

**程式碼範例**:

```javascript
/**
 * 範例：當成員成功加入群組後，通知該群組所有成員
 */
async function notifyGroupMemberJoined(groupId, newMemberName, memberUserIds) {
  try {
    const response = await fetch(
      "http://localhost:3000/api/v1/notifications/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser.id, // 操作者的 ID
        },
        body: JSON.stringify({
          // 目標對象：群組內的所有成員 ID (包含自己或排除自己皆可)
          userIds: memberUserIds,

          // 通知標題與內容
          title: "新成員加入",
          body: `${newMemberName} 已加入群組`,

          // 類型與跳轉參數
          type: "system",
          action: {
            type: "group",
            payload: { id: groupId }, // 點擊通知可跳轉到群組頁
          },
        }),
      }
    );

    const result = await response.json();
    console.log("通知發送結果:", result);
  } catch (error) {
    console.error("發送通知失敗:", error);
  }
}
```

---

## 6. PWA 推播通知 (FCM) 注意事項

關於您詢問的「APP 推播 (PWA Push)」，後端已經準備好 **FCM 發送邏輯**。
只要後端資料庫中該使用者有 `fcm_token`，後端就會在發送通知時同步呼叫 Firebase Cloud Messaging 發送推播。

**前端必須完成以下事項，推播才會生效：**

1.  **Service Worker**: PWA 必須註冊 Service Worker (如 `firebase-messaging-sw.js`)。
2.  **Request Permission**: 前端必須呼叫 `Notification.requestPermission()` 取得使用者授權。
3.  **Get Token**: 呼叫 `getToken()` 取得 FCM Token。
4.  **Send Token to Backend**: 呼叫 Recipe-API `POST /api/v1/notifications/token` 將 Token 傳給後端儲存。
    - **重要**: 若沒有這一步，後端不知道要推給誰，User 只會看到「站內通知」而不會有手機能跳出的「推播」。
5.  **Handle OnMessage**: 實作 `onMessage` (前景) 與 `setBackgroundMessageHandler` (背景) 來顯示通知 UI。

---

## 7. 聯絡資訊

如有任何 API 對接問題，請隨時聯繫後端團隊。
