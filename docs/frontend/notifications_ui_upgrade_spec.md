# 通知系統 UI 升級：後端 API 修改規格書

**日期**：2026-01-05  
**狀態**：草案 (Draft)  
**優先級**：高  
**關聯文件**：`notifications_api_spec.md`, `push-notification-backend-spec.md`

---

## 1. 變更目的 (Objective)

為了配合前端通知列表 UI 升級，後端需要在通知 payload 中新增以下欄位，以便前端顯示：
1.  **群組名稱 (`groupName`)**：讓使用者知道此通知來自哪個群組或冰箱。
2.  **操作者名稱 (`actorName`)**：讓使用者知道是誰觸發了這個通知。
3.  **通知子類型 (`subType`)**：用於前端顯示更細緻的標籤樣式。

---

## 2. 現有資料模型 (Current Data Model)

根據 `notifications_api_spec.md`，現有的 `NotificationMessage` 結構如下：

```typescript
type NotificationMessage = {
  id: string; // UUID
  category: NotificationCategory; // 'stock' | 'inspiration' | 'official'
  type: NotificationType; // 'stock' | 'shared' | 'system'
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string; // ISO 8601
  actionType: NotificationActionType;
  actionPayload?: { itemId?: string; listId?: string; recipeId?: string; };
};
```

---

## 3. 建議的資料模型變更 (Proposed Data Model Changes)

### 3.1 新增欄位

| 欄位名稱 | 類型 | 必填 | 說明 |
| :--- | :--- | :---: | :--- |
| `subType` | `NotificationSubType` | 選填 | 更細緻的通知類型，用於前端標籤樣式渲染。 |
| `groupName` | `string` | 選填 | 觸發通知的群組或冰箱名稱。對於官方公告，此值應為 `"FuFood Official"`。 |
| `actorName` | `string` | 選填 | 觸發通知的使用者名稱 (Display Name)。 |

### 3.2 新增 `NotificationSubType` 列舉

此列舉用於決定前端通知項目標籤的樣式與顏色。

```typescript
type NotificationSubType =
  | 'generate'  // 生成 (AI食譜) - 黃色
  | 'stock'     // 庫存 (過期/低庫存提醒) - 綠色
  | 'consume'   // 消耗 - 粉紅色
  | 'stockIn'   // 入庫 - 紅色
  | 'share'     // 共享 (共享清單邀請) - 淺藍色
  | 'list'      // 清單 (購物清單更新) - 藍色
  | 'self'      // 本人 (個人操作) - 白色
  | 'member';   // 成員 (群組成員變更) - 灰色
```

### 3.3 更新後的 `NotificationMessage` 結構

```typescript
type NotificationMessage = {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  subType?: NotificationSubType; // [新增]
  title: string;
  description: string; // 前端欄位名為 message
  isRead: boolean;
  createdAt: string;
  actionType: NotificationActionType;
  actionPayload?: { itemId?: string; listId?: string; recipeId?: string; };
  groupName?: string;   // [新增]
  actorName?: string;   // [新增]
};
```

---

## 4. 通知場景與欄位填充邏輯

以下表格定義了各種業務場景下，後端應如何填充新增欄位。

| 業務場景 | `type` | `subType` | `groupName` 來源 | `actorName` 來源 | 前端標籤顯示 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AI 辨識完成！食材已入庫** | `inventory` | `stockIn` | 使用者當前選擇的冰箱名稱 | 執行掃描/入庫的使用者 | **入庫** (紅色) |
| **最後救援！檸檬塔 今天到期** | `inventory` | `stock` | 食材所屬冰箱名稱 | `"System"` 或不填 | **庫存** (綠色) |
| **搶救倒數！檸檬塔 快過期了** | `inventory` | `stock` | 食材所屬冰箱名稱 | `"System"` 或不填 | **庫存** (綠色) |
| **阿福發現，白花椰菜 正在變老...** | `inventory` | `stock` | 食材所屬冰箱名稱 | `"阿福"` (AI 暱稱) | **庫存** (綠色) |
| **生烏龍麵 快沒了，該補貨囉！** | `shopping` | `list` | 食材所屬冰箱名稱 | `"System"` (自動) 或手動新增者 | **清單** (藍色) |
| **消耗了 2 顆 雞蛋** | `inventory` | `consume` | 食材所屬冰箱名稱 | 執行消耗的使用者 | **消耗** (粉紅) |
| **新成員加入群組** | `group` | `member` | 群組名稱 | 被邀請/加入的成員 | **成員** (灰色) |
| **服務維護通知** (官方公告) | `system` | N/A | `"FuFood Official"` (固定) | `"System"` 或不填 | **(無標籤)** |
| **冰箱小隊進化了！新功能登場** (官方公告) | `system` | N/A | `"FuFood Official"` (固定) | `"System"` 或不填 | **(無標籤)** |

---

## 4.1 點擊行為與 `actionType` / `actionPayload` 規範

當使用者點擊通知時，前端會根據 `actionType` 和 `actionPayload` 開啟相應的 Modal 或導航至特定頁面。

> [!IMPORTANT]
> **後端必須確保為每個通知正確填寫 `actionType` 和 `actionPayload`**，否則前端無法正確導航。

### 4.1.1 `actionType` 列舉

```typescript
type NotificationActionType =
  | 'inventory'      // 開啟食材詳情 Modal (FoodDetailModal)
  | 'shopping-list'  // 導航至購物清單頁面/開啟清單 Modal
  | 'recipe'         // 開啟食譜詳情 Modal (RecipeDetailModal)
  | 'group'          // 導航至群組設定頁面
  | 'detail';        // 導航至通知詳情頁 (官方公告專用)
```

### 4.1.2 各通知類型的點擊行為表

| `subType` | `actionType` | `actionPayload` 必填欄位 | 前端行為 |
| :--- | :--- | :--- | :--- |
| `stockIn` (入庫) | `inventory` | `itemId`: 入庫的食材 ID；`refrigeratorId`: 冰箱 ID | 開啟 `FoodDetailModal` 顯示該食材 |
| `stock` (庫存提醒) | `inventory` | `itemId`: 食材 ID；`refrigeratorId`: 冰箱 ID | 開啟 `FoodDetailModal` 顯示該食材 |
| `consume` (消耗) | `inventory` | `itemId`: 食材 ID；`refrigeratorId`: 冰箱 ID | 開啟 `FoodDetailModal` 顯示該食材 |
| `list` (清單) | `shopping-list` | `listId`: 購物清單 ID | 導航至 `/planning?tab=shopping`，並開啟指定清單 |
| `share` (共享邀請) | `shopping-list` | `listId`: 購物清單 ID | 導航至 `/planning?tab=shopping`，並開啟指定清單 |
| `member` (成員變更) | `group` | `refrigeratorId`: 群組/冰箱 ID | 導航至群組設定頁面或開啟成員管理 Modal |
| `generate` (AI食譜) | `recipe` | `recipeId`: 食譜 ID | 開啟 `RecipeDetailModal` 顯示該食譜 |
| `system` (官方公告) | `detail` | 無 (可選 `notificationId`) | 導航至 `/notifications/:id` 通知詳情頁 |

### 4.1.3 `actionPayload` 結構

```typescript
type NotificationActionPayload = {
  itemId?: string;         // 食材 ID (用於 inventory action)
  refrigeratorId?: string; // 冰箱/群組 ID (用於切換上下文)
  listId?: string;         // 購物清單 ID (用於 shopping-list action)
  recipeId?: string;       // 食譜 ID (用於 recipe action)
  notificationId?: string; // 通知 ID (用於 detail action，選填)
};
```

### 4.1.4 官方公告的特殊處理

> [!NOTE]
> 官方公告 (`type=system`) 的點擊行為與其他通知不同：
> -   `actionType` 固定為 `detail`
> -   點擊後導航至 `/notifications/:id`，頁面會顯示該公告的完整內容 (標題、正文、發佈時間等)
> -   前端需要有一個「通知詳情頁」來渲染官方公告的完整內容

### 4.1.5 範例填充

**範例 1：食材入庫通知**
```json
{
  "actionType": "inventory",
  "actionPayload": {
    "itemId": "item-abc-123",
    "refrigeratorId": "fridge-xyz-789"
  }
}
```

**範例 2：低庫存自動加入清單通知**
```json
{
  "actionType": "shopping-list",
  "actionPayload": {
    "listId": "list-shopping-001"
  }
}
```

**範例 3：官方公告通知**
```json
{
  "actionType": "detail",
  "actionPayload": null
}
```

---

## 5. 範例 API Response Payload

### 5.1 GET `/api/v1/notifications?category=stock` (食材管家)

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "id": "uuid-1",
        "category": "stock",
        "type": "inventory",
        "subType": "stockIn",
        "title": "AI 辨識完成！食材已入庫",
        "description": "剛買的食材已安全進入庫房，快去看看庫房！",
        "groupName": "Ricky home",
        "actorName": "Z", 
        "isRead": false,
        "createdAt": "2026-01-05T10:00:00Z",
        "actionType": "inventory",
        "actionPayload": { "itemId": "item-abc" }
      },
      {
        "id": "uuid-2",
        "category": "stock",
        "type": "inventory",
        "subType": "stock",
        "title": "最後救援！檸檬塔 今天到期",
        "description": "就是今天！它是冰箱裡最需要被吃掉的，現在就開吃吧！",
        "groupName": "Ricky home",
        "actorName": "Z",
        "isRead": false,
        "createdAt": "2026-01-05T09:30:00Z",
        "actionType": "inventory",
        "actionPayload": { "itemId": "item-def" }
      },
      {
        "id": "uuid-3",
        "category": "stock",
        "type": "shopping",
        "subType": "list",
        "title": "生烏龍麵 快沒了，該補貨囉！",
        "description": "報告！庫存已低於安全水位，小隊已自動幫你…",
        "groupName": "Ricky home",
        "actorName": null,
        "isRead": false,
        "createdAt": "2026-01-04T15:00:00Z",
        "actionType": "shopping-list",
        "actionPayload": { "listId": "list-xyz" }
      }
    ],
    "total": 3,
    "unreadCount": 2
  }
}
```

### 5.2 GET `/api/v1/notifications?category=official` (官方公告)

對於 `category=official`，`subType` 不需要填寫，前端會隱藏標籤。`groupName` 應固定為 `"FuFood Official"`。

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "id": "uuid-10",
        "category": "official",
        "type": "system",
        "title": "服務維護通知",
        "description": "為了提供更穩定的 100GB 雲端空間，我們將於 [日期/時間] 進行…",
        "groupName": "FuFood Official",
        "actorName": null,
        "isRead": false,
        "createdAt": "2026-01-05T08:00:00Z",
        "actionType": "detail"
      },
      {
        "id": "uuid-11",
        "category": "official",
        "type": "system",
        "title": "冰箱小隊進化了！新功能登場",
        "description": "我們優化了 AI 辨識速度與介面體驗，快來更新 App，感受更流暢…",
        "groupName": "FuFood Official",
        "actorName": null,
        "isRead": false,
        "createdAt": "2026-01-05T07:00:00Z",
        "actionType": "detail"
      },
      {
        "id": "uuid-12",
        "category": "official",
        "type": "system",
        "title": "給小隊員的驚喜更新",
        "description": "發現新版本！修復了已知問題並加入更多可愛插畫，快去更新，…",
        "groupName": "FuFood Official",
        "actorName": null,
        "isRead": true,
        "createdAt": "2026-01-03T12:00:00Z",
        "actionType": "detail"
      }
    ],
    "total": 3,
    "unreadCount": 2
  }
}
```

---

## 6. 通知內文範本 (Content Templates)

以下提供各類型通知的建議文案範本：

### 6.1 入庫 (`stockIn`)
-   **Title**: `AI 辨識完成！食材已入庫`
-   **Description**: `剛買的食材已安全進入庫房，快去看看庫房！`

### 6.2 庫存提醒 (`stock`)
-   **當天到期**:
    -   Title: `最後救援！{食材名稱} 今天到期`
    -   Description: `就是今天！它是冰箱裡最需要被吃掉的，現在…`
-   **即將過期 (1-3天)**:
    -   Title: `搶救倒數！{食材名稱} 快過期了`
    -   Description: `冰箱小隊發現它只剩 {N} 天就要變垃圾了！別讓它心寒啊～`
-   **低庫存警告**:
    -   Title: `{食材名稱} 快沒了，該補貨囉！`
    -   Description: `報告！庫存已低於安全水位，小隊已自動幫你列入清單。`
-   **品質提醒 (AI偵測)**:
    -   Title: `阿福發現，{食材名稱} 正在變老...`
    -   Description: `蔬菜鮮度正在下降中！為了營養與口感，今天…`

### 6.3 清單 (`list`)
-   **低庫存自動新增**:
    -   Title: `{食材名稱} 快沒了，該補貨囉！`
    -   Description: `報告！庫存已低於安全水位，小隊已自動幫你列入清單。`

### 6.4 官方公告 (`system`)
-   **維護通知**:
    -   Title: `服務維護通知`
    -   Description: `為了提供更穩定的服務，我們將於 {日期/時間} 進行維護。`
-   **功能更新**:
    -   Title: `冰箱小隊進化了！新功能登場`
    -   Description: `我們優化了 AI 辨識速度與介面體驗，快來更新 App...`
-   **版本更新**:
    -   Title: `給小隊員的驚喜更新`
    -   Description: `發現新版本！修復了已知問題並加入更多可愛插畫。`

---

## 7. 資料庫 Schema 變更建議(如適用)

如果通知資料儲存於資料庫，建議新增以下欄位：

```sql
ALTER TABLE notifications 
ADD COLUMN sub_type VARCHAR(20) NULL,
ADD COLUMN group_name VARCHAR(100) NULL,
ADD COLUMN actor_name VARCHAR(100) NULL;
```

---

## 8. 實作注意事項

1.  **`groupName` 來源**：應從觸發事件的 `refrigerator` 或 `group` 資料表中取得 `name` 欄位。
2.  **`actorName` 來源**：應從觸發事件的 `user` 資料表中取得 `displayName` 或 `name` 欄位。
3.  **官方公告 (`type=system`)**：
    -   `groupName` 應固定填入 `"FuFood Official"`。
    -   `subType` 可不填寫或設為 `null`。
4.  **向下相容**：新欄位皆為選填 (`optional`)，舊版前端若不處理這些欄位，不會造成問題。

---

## 9. 前後端協作檢核清單

-   [ ] 後端：更新 `NotificationMessage` 資料模型
-   [ ] 後端：更新通知建立邏輯，填入 `subType`, `groupName`, `actorName`
-   [ ] 後端：更新 GET `/api/v1/notifications` 回傳結構
-   [ ] 後端：（如適用）更新資料庫 Schema
-   [ ] 前端：更新通知型別定義
-   [ ] 前端：更新 `NotificationItem` 元件渲染邏輯
-   [ ] 共同測試：驗證各情境下的通知顯示是否正確
