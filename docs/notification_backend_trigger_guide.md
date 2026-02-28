# 通知系統全面遷移 — 後端統一觸發對接指南

> **日期**：2026-02-23
> **前端團隊**：FuFood PWA Frontend
> **目的**：前端將移除所有手動發送通知的邏輯，全部改由後端在業務 API 完成時自動觸發。本文件列出目前**前端所有 13 處** `sendNotification` 呼叫，包含完整的 type/subType、訊息內容、觸發時機及對應的後端 API，供後端團隊逐一實作。

---

## 📋 總覽

| #   | 業務場景            | `type`      | `subType`  | 前端檔案                | 對應後端 API                            |
| --- | ------------------- | ----------- | ---------- | ----------------------- | --------------------------------------- |
| 1   | 食材入庫 (單筆)     | `inventory` | `stockIn`  | `ScanResult.tsx`        | `POST /inventory`                       |
| 2   | 食材入庫 (批次)     | `inventory` | `stockIn`  | `ScanResult.tsx`        | `POST /inventory` (loop)                |
| 3   | 食材消耗            | `inventory` | `consume`  | `ConsumptionModal.tsx`  | `POST /inventory/:id/consume`           |
| 4   | 建立購物清單        | `shopping`  | `list`     | `useSharedLists.ts`     | `POST /shopping-lists`                  |
| 5   | 新增清單項目 (批次) | `shopping`  | `list`     | `useSharedListItems.ts` | `POST /shopping-lists/:id/items`        |
| 6   | 新增清單項目 (單筆) | `shopping`  | `list`     | `useSharedListItems.ts` | `POST /shopping-lists/:id/items`        |
| 7   | 編輯清單項目        | `shopping`  | `list`     | `CreatePost.tsx`        | `PUT /shopping-lists/:id/items/:itemId` |
| 8   | 新增清單項目 (表單) | `shopping`  | `list`     | `CreatePost.tsx`        | `POST /shopping-lists/:id/items`        |
| 9   | 邀請群組成員        | `group`     | `member`   | `useGroupMembers.ts`    | `POST /groups/:id/invite`               |
| 10  | 移除群組成員        | `group`     | `member`   | `useGroupMembers.ts`    | `DELETE /groups/:id/members/:memberId`  |
| 11  | AI 食譜完成 (SSE)   | `recipe`    | `generate` | `useRecipeStream.ts`    | SSE `/ai/recipes/stream`                |
| 12  | AI 食譜完成 (標準)  | `recipe`    | `generate` | `useAIRecipe.ts`        | `POST /ai/recipes`                      |
| 13  | 加入群組 (邀請連結) | `group`     | `member`   | `InviteAcceptPage.tsx`  | `POST /groups/:id/join`                 |

---

## 🔔 詳細觸發規格

### 1. 食材入庫 (單筆)

- **觸發時機**：`POST /inventory` 成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題** (`title`)：`{itemName} 新成員報到，入位成功！`
- **推播內文** (`message`)：`冰箱小隊報告！{itemName} 已安全進入庫房，隨時待命！`
- **action**：`{ type: 'inventory', payload: { refrigeratorId, itemId } }`

### 2. 食材入庫 (批次)

- **觸發時機**：多筆 `POST /inventory` 全部成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題**：
  - 單筆：`{firstName} 新成員報到，入位成功！`
  - 多筆：`{firstName} 等 {count} 項食材報到，全員入位！`
- **推播內文**：
  - 單筆：`冰箱小隊報告！{firstName} 已安全進入庫房，隨時待命！`
  - 多筆：`冰箱小隊報告！{count} 項新成員已入位，整裝待發！`
- **action**：`{ type: 'inventory', payload: { refrigeratorId } }`

### 3. 食材消耗

- **觸發時機**：`POST /inventory/:id/consume` 成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題**：
  - 單筆：`{firstItemName} 完成任務，光榮退役！`
  - 多筆：`{firstItemName} 等 {count} 項食材已出動！`
- **推播內文**：
  - 單筆：`冰箱小隊報告！{firstItemName} 已順利上桌，美味任務達成！`
  - 多筆：`冰箱小隊報告！{count} 項食材已順利上桌，任務達成！`
- **action**：`{ type: 'inventory', payload: { refrigeratorId } }`

### 4. 建立購物清單

- **觸發時機**：`POST /shopping-lists` (建立新清單) 成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題**：`新採購清單「{listTitle}」出爐！`
- **推播內文**：`採買小隊報告！新清單已建立，快來看看需要買什麼！`
- **action**：`{ type: 'shopping-list', payload: { refrigeratorId, listId } }`

### 5. 新增清單項目 (批次)

- **觸發時機**：`POST /shopping-lists/:id/items` (批次新增) 成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題**：
  - 單筆：`{firstItemName} 加入採買行列！`
  - 多筆：`{firstItemName} 等 {count} 項商品加入採買行列！`
- **推播內文**：
  - 單筆：`採買小隊報告！{firstItemName} 已加入購物清單，收到請回報！`
  - 多筆：`採買小隊報告！{count} 項新任務已登錄，大家快來看看！`
- **action**：`{ type: 'shopping-list', payload: { listId } }`

### 6. 新增清單項目 (單筆)

- **觸發時機**：`POST /shopping-lists/:id/items` (單筆新增) 成功後
- **推播內容**：同 #5 (count = 1)

### 7. 編輯清單項目

- **觸發時機**：`PUT /shopping-lists/:id/items/:itemId` 成功後（含新增/刪除/更新）
- **通知對象**：該 groupId 的所有成員
- **推播標題**：`「{listName}」清單內容變更！`
- **推播內文**：`採買小隊報告！「{listName}」已有異動，請各位確認！`
- **action**：`{ type: 'shopping-list', payload: { listId } }`

### 8. 新增清單項目 (表單建立模式)

- **觸發時機**：`POST /shopping-lists/:id/items` (從表單介面批次建立) 成功後
- **推播標題**：
  - 單筆：`{firstItem} 加入「{listName}」！`
  - 多筆：`{firstItem} 等 {count} 項商品加入「{listName}」！`
- **推播內文**：
  - 單筆：`採買小隊報告！{firstItem} 已加入「{listName}」，收到請回報！`
  - 多筆：`採買小隊報告！{count} 項新任務已登錄至「{listName}」！`
- **action**：`{ type: 'shopping-list', payload: { listId } }`

### 9. 邀請群組成員

- **觸發時機**：`POST /groups/:id/invite` 成功後
- **通知對象**：群組內目前的**所有成員** (透過 `userIds`)
- **推播標題**：`新成員加入`
- **推播內文**：`{email} 已被邀請加入群組`
- **action**：`{ type: 'detail', payload: { refrigeratorId } }`

### 10. 移除群組成員

- **觸發時機**：`DELETE /groups/:id/members/:memberId` 成功後
- **通知對象**：群組內**剩餘的成員** (排除被移除者)
- **推播標題**：`群組成員變動`
- **推播內文**：`{memberName} 已離開群組`
- **action**：`{ type: 'detail', payload: { refrigeratorId } }`

### 11. AI 食譜完成 (SSE 模式)

- **觸發時機**：SSE `done` 事件觸發，食譜自動儲存成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題**：`AI 食譜生成完成`
- **推播內文**：
  - 單道：`已為您生成新食譜：{firstRecipeName}`
  - 多道：`已為您生成 {firstRecipeName} 等 {count} 道新食譜！`
- **action**：`{ type: 'recipe', payload: { recipeId } }`

### 12. AI 食譜完成 (標準模式)

- **觸發時機**：`POST /ai/recipes` 回傳成功，食譜自動儲存成功後
- **通知對象**：該 groupId 的所有成員
- **推播標題**：
  - 單道：`阿福靈感大爆發！新食譜出爐`
  - 多道：`阿福靈感大爆發！{count} 道新食譜出爐`
- **推播內文**：
  - 單道：`冰箱小隊為您獻上今日料理靈感：{firstRecipeName}`
  - 多道：`冰箱小隊為您獻上 {firstRecipeName} 等 {count} 道料理靈感！`
- **action**：`{ type: 'recipe', payload: { recipeId } }`

### 13. 加入群組 (邀請連結)

- **觸發時機**：`POST /groups/:id/join` 成功後
- **通知對象**：群組內的**其他成員** (排除加入者本人)
- **推播標題**：`群組成員變動`
- **推播內文**：`{joinerName} 已加入群組`
- **action**：`{ type: 'detail', payload: { refrigeratorId } }`

---

## ⚠️ 注意事項

1. **所有通知的 `groupName`、`actorName`、`actorId` 由後端從 JWT/Session 與 DB 中取得**，前端不再傳遞這些欄位。
2. **`category` 欄位由後端依據 `type` 自動推導**：
   - `inventory` → `stock`
   - `recipe` → `inspiration`
   - `group` / `shopping` / `system` → `official`
3. **重複通知防護**：部分場景（如批次入庫）前端原本就只發一次合併通知。後端若逐筆觸發，需考慮合併或去重（例如同一個 Transaction 內的多筆 consume 只發一次通知）。

---

## ✅ 前端承諾

後端完成上述觸發點後，前端將：

1. 移除所有 13 處 `sendNotification` 呼叫
2. 移除 `useNotificationMetadata` Hook（不再需要）
3. 移除 `useSendNotificationMutation` Hook（不再需要）
4. 前端僅保留 **FCM Token 註冊** 與 **通知列表顯示** 功能
