# 後端通知功能驗證與除錯檢查表 (Debug Checklist)

**版本**: v2.0 (針對通知文案與名稱欄位問題)
**建立日期**: 2026-01-05
**問題描述**: 前端發送正確的新文案與 Actor Name，但列表仍顯示舊文案且無名稱。

如果前端顯示的通知文案仍是舊的，或者缺少操作者名稱 (Actor Name)，請後端工程師依照此清單進行檢查。

## 1. 接收與儲存 (Receive & Store)

檢查點：`POST /api/v1/notifications` (或對應的 Gateway/Service)

- [ ] **檢查 Payload 接收**：確認後端是否正確接收前端傳送的 `groupName` (或 `group_name`) 與 `actorName` (或 `actor_name`)。
    -   *前端已同時傳送 camelCase 與 snake_case 兩種格式以確保相容性。*
- [ ] **檢查資料庫寫入**：
    -   確認資料庫 `notifications` 表是否有 `group_name` 和 `actor_name` 欄位。
    -   確認寫入時，這兩個欄位是否被正確填入（非 NULL）。
    -   **關鍵**：確認後端是否**忽略**了前端傳送的 `title` 和 `body`，而改用後端自己的 Template 覆寫？
        -   *現象：前端傳送「紅蘿蔔 完成任務...」，但資料庫存的卻是「食材消耗通知」。*
        -   *修正建議：若 `type=inventory`，應優先使用前端傳入的客製化文案，或更新後端的 Template。*

## 2. 讀取與回傳 (Read & Return)

檢查點：`GET /api/v1/notifications`

- [ ] **檢查 API Response**：確認回傳的 JSON 物件中包含 `groupName` 與 `actorName`。
    -   *前端 UI 依賴這兩個欄位來顯示 `[群組] • 使用者` Header*。
- [ ] **檢查命名慣例**：確認回傳的 JSON key 是 `groupName` (camelCase) 還是 `group_name` (snake_case)。
    -   *前端目前預設讀取 `groupName` 與 `actorName`。*

## 3. 推播通知 (Push Notification / FCM)

- [ ] **檢查推播 Payload**：
    -   如果推播顯示的是**新文案**（前端傳的），但 API 電列表顯示的是**舊文案**（後端存的），這表示後端在「轉發推播」時用了前端資料，但在「存入資料庫」時用了舊邏輯。
    -   *請確保資料庫儲存的內容與推播內容一致。*

---

### 前端已做的相容性調整 (Reference)

為了降低對接門檻，前端目前發送的 Payload 格式如下：

```json
{
  "title": "紅蘿蔔 完成任務，光榮退役！",
  "body": "冰箱小隊報告！...",
  
  // 前端同時傳送兩種命名慣例
  "groupName": "我的冰箱",
  "group_name": "我的冰箱",
  
  "actorName": "Ricky",
  "actor_name": "Ricky",

  "type": "inventory",
  "subType": "consume"
}
```
