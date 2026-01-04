# 通知資料遷移規劃書：`subType` 欄位補齊

**日期**：2026-01-05  
**狀態**：待審閱  
**優先級**：中  
**關聯文件**：`notifications_ui_upgrade_spec.md`, `notifications_ui_frontend_integration_guide.md`

---

## 1. 問題描述

在新版通知 UI 升級後，前端需要依據 `subType` 欄位來決定通知標籤的樣式與顏色。然而，升級前建立的舊通知資料**沒有 `subType` 欄位值**，導致這些通知在前端顯示時缺少標籤。

### 影響範圍
- 所有在 API 升級前建立的通知
- 預估筆數：需查詢資料庫確認

---

## 2. 遷移目標

為所有缺少 `subType` 的舊通知資料，根據其 `type` 和 `title` 內容**自動推斷並補齊 `subType`**。

---

## 3. SubType 對照表

| subType | 標籤文字 | 推斷條件 (優先順序) |
|---------|---------|-------------------|
| `stockIn` | 入庫 | title 包含「入庫」或「辨識完成」 |
| `stock` | 庫存 | title 包含「到期」、「過期」、「庫存」、「低於」 |
| `consume` | 消耗 | title 包含「消耗」、「用掉」 |
| `list` | 清單 | title 包含「清單」、「補貨」 |
| `share` | 共享 | title 包含「邀請」、「共享」 |
| `member` | 成員 | title 包含「成員」、「加入」、「退出」 |
| `generate` | 生成 | title 包含「食譜」、「推薦」、「靈感」 |
| `self` | 本人 | type = 'user' 且無法匹配其他 |
| `NULL` | (無) | type = 'system' (官方公告不需要標籤) |

---

## 4. 遷移腳本

### 4.1 SQL 版本 (PostgreSQL)

```sql
-- 遷移腳本：補齊通知 subType 欄位
-- 執行前請先備份資料

BEGIN;

-- 1. 官方公告維持 NULL (不需要標籤)
-- (不做任何處理)

-- 2. 根據 title 關鍵字推斷 subType
UPDATE notifications 
SET sub_type = 'stockIn' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%入庫%' OR title LIKE '%辨識完成%');

UPDATE notifications 
SET sub_type = 'stock' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%到期%' OR title LIKE '%過期%' OR title LIKE '%庫存%' OR title LIKE '%低於%');

UPDATE notifications 
SET sub_type = 'consume' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%消耗%' OR title LIKE '%用掉%');

UPDATE notifications 
SET sub_type = 'list' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%清單%' OR title LIKE '%補貨%');

UPDATE notifications 
SET sub_type = 'share' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%邀請%' OR title LIKE '%共享%');

UPDATE notifications 
SET sub_type = 'member' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%成員%' OR title LIKE '%加入%' OR title LIKE '%退出%');

UPDATE notifications 
SET sub_type = 'generate' 
WHERE sub_type IS NULL 
  AND type != 'system'
  AND (title LIKE '%食譜%' OR title LIKE '%推薦%' OR title LIKE '%靈感%');

-- 3. 根據 type fallback (仍無法匹配的)
UPDATE notifications 
SET sub_type = 'stock' 
WHERE sub_type IS NULL AND type = 'inventory';

UPDATE notifications 
SET sub_type = 'list' 
WHERE sub_type IS NULL AND type = 'shopping';

UPDATE notifications 
SET sub_type = 'member' 
WHERE sub_type IS NULL AND type = 'group';

UPDATE notifications 
SET sub_type = 'generate' 
WHERE sub_type IS NULL AND type = 'recipe';

UPDATE notifications 
SET sub_type = 'self' 
WHERE sub_type IS NULL AND type = 'user';

-- 驗證結果
SELECT sub_type, COUNT(*) as count 
FROM notifications 
WHERE type != 'system'
GROUP BY sub_type;

COMMIT;
```

### 4.2 Node.js 版本 (如使用 ORM)

```typescript
// migration/backfill-notification-subtype.ts
import { db } from '../db';

const inferSubType = (notification: { title: string; type: string }): string | null => {
  const { title, type } = notification;
  
  // 官方公告不需要 subType
  if (type === 'system') return null;
  
  // 根據 title 關鍵字推斷 (優先)
  if (title.includes('入庫') || title.includes('辨識完成')) return 'stockIn';
  if (title.includes('到期') || title.includes('過期') || title.includes('庫存')) return 'stock';
  if (title.includes('消耗') || title.includes('用掉')) return 'consume';
  if (title.includes('清單') || title.includes('補貨')) return 'list';
  if (title.includes('邀請') || title.includes('共享')) return 'share';
  if (title.includes('成員') || title.includes('加入')) return 'member';
  if (title.includes('食譜') || title.includes('推薦')) return 'generate';
  
  // 根據 type fallback
  const typeToSubType: Record<string, string> = {
    inventory: 'stock',
    shopping: 'list',
    group: 'member',
    recipe: 'generate',
    user: 'self',
  };
  
  return typeToSubType[type] || null;
};

async function migrate() {
  const notifications = await db.notifications.findMany({
    where: { subType: null, type: { not: 'system' } },
  });
  
  console.log(`Found ${notifications.length} notifications to migrate`);
  
  for (const notification of notifications) {
    const subType = inferSubType(notification);
    if (subType) {
      await db.notifications.update({
        where: { id: notification.id },
        data: { subType },
      });
    }
  }
  
  console.log('Migration complete');
}

migrate().catch(console.error);
```

---

## 5. 執行步驟

1. **備份資料庫**
2. **在測試環境執行遷移腳本**
3. **驗證遷移結果**：檢查各 subType 的分佈是否合理
4. **在正式環境執行遷移**
5. **通知前端團隊確認效果**

---

## 6. 驗證 Query

```sql
-- 檢查遷移前後的分佈
SELECT 
  type,
  sub_type,
  COUNT(*) as count
FROM notifications
GROUP BY type, sub_type
ORDER BY type, sub_type;

-- 檢查是否還有遺漏 (非 system 類型但無 sub_type)
SELECT COUNT(*) 
FROM notifications 
WHERE type != 'system' AND sub_type IS NULL;
```

---

## 7. 回滾計畫

如需回滾，可將 `sub_type` 設回 NULL：

```sql
UPDATE notifications SET sub_type = NULL WHERE sub_type IS NOT NULL;
```

---

## 8. 審閱檢核清單

- [ ] 確認推斷邏輯符合業務需求
- [ ] 確認資料庫已備份
- [ ] 確認測試環境驗證通過
- [ ] 確認正式環境執行時間（建議低流量時段）
