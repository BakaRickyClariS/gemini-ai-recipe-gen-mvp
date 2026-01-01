# 後端通知系統擴充規格書 (Notifications Extension Spec)

**版本**: 1.1
**日期**: 2026-01-02
**狀態**: 待實作 (Pending Implementation)
**目標系統**: Recipe-API (AI Backend)

---

## 1. 變更目標

本文件旨在規範通知系統如何支援 **「共享採買清單」** 與 **「AI 食譜生成」** 之業務場景，確保前端能正確顯示標籤樣式並將通知歸類於正確的分頁中。

---

## 2. 資料庫更新需求 (Database Schema)

### 2.1 Notification Type 列舉

請在資料庫的 `notifications` 資料表（或對應型別定義）中擴充 `type` 欄位。

- **`shopping`**: 採買清單相關（建立清單、更補項目）。
- **`recipe`**: 食譜相關（AI 生成食譜成功）。

**SQL 修改範例 (PostgreSQL):**

```sql
-- 若 type 是 ENUM 型別
ALTER TYPE notification_type ADD VALUE 'shopping';
ALTER TYPE notification_type ADD VALUE 'recipe';
```

---

## 3. 分類與標籤映射規則 (Category & Type Mapping)

前端 UI 依據 `category` 決定分頁（Tab），依據 `type` 決定顯示標記（Badge）。

| 業務模組     | `type` (標籤) | `category` (分頁) | 跳轉行為 (`action.type`) |
| :----------- | :------------ | :---------------- | :----------------------- |
| **庫存管理** | `inventory`   | `stock`           | `inventory`              |
| **共享清單** | `shopping`    | `stock`           | `shopping-list`          |
| **AI 食譜**  | `recipe`      | `inspiration`     | `recipe`                 |
| **成員異動** | `group`       | `official`        | `detail`                 |
| **系統廣播** | `system`      | `official`        | `detail`                 |

> [!IMPORTANT]
> **分類建議**: 採買清單雖屬於「規劃」模組，但在通知中心內應歸類在 **`stock` (食材管家)**，因為它直接關乎食材的增補。而食譜通知則務必歸類在 **`inspiration` (靈感生活)**。

---

## 4. API 規格範例 (Request Payloads)

### 4.1 建立共享清單通知

**觸發時機**: 使用者在前端點擊「建立清單」成功後。

```json
{
  "groupId": "ref_uuid_001",
  "title": "新增共享清單",
  "body": "阿明 建立了一個新清單：本週採買",
  "type": "shopping",
  "category": "stock",
  "action": {
    "type": "shopping-list",
    "payload": {
      "refrigeratorId": "ref_uuid_001",
      "listId": "list_uuid_999"
    }
  }
}
```

### 4.2 清單項目更新通知

**觸發時機**: 在清單中新增商品或修改數量後。

```json
{
  "groupId": "list_uuid_999",
  "title": "採買清單變動",
  "body": "清單已更新，新增了：牛排、洋蔥",
  "type": "shopping",
  "category": "stock",
  "action": {
    "type": "shopping-list",
    "payload": {
      "listId": "list_uuid_999"
    }
  }
}
```

### 4.3 AI 食譜發布通知

**觸發時機**: AI 串流結束並成功將食譜存回 DB 後。

```json
{
  "groupId": "ref_uuid_001",
  "title": "AI 食譜生成完成",
  "body": "為您生成了 3 道新食譜：清燉洋蔥湯等",
  "type": "recipe",
  "category": "inspiration",
  "action": {
    "type": "recipe",
    "payload": {
      "recipeId": "recipe_uuid_456"
    }
  }
}
```

---

## 5. 推播通知 (FCM / PWA)

後端在發送以上站內通知時，應同時檢查該群組成員是否有對應的 `fcm_token`：

1. 若有，則送出 FCM 推播。
2. 推播的 `data` payload 結構應與站內通知相同，以便 PWA 在前景收到時正確處理跳轉。

---

## 6. 注意事項

- **`groupId` 優於 `userIds`**: 前端呼叫時會優先傳入 `groupId`。請後端務必將該群組所有成員（排除發送者本人）納入發送目標。
- **Action Type 校驗**: 請確保 `action.type` 欄位能容納新定義的字串。

---

**文件編製**: FuFood Frontend Team
