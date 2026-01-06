# 後端 API 調整建議：跨群組通知

## 問題描述

目前前端呼叫 `GET /notifications` 時，似乎只能取得「當前活躍群組」的通知。使用者期望能一次看到**所有參與群組**的通知（例如：同時看到「我的冰箱」和「週末烤肉趴」的入庫通知），而不需要切換群組。

## 建議調整

建議修改 `GET /notifications` 的查詢邏輯，使其不侷限於當前 Session 的 `groupId`。

### 查詢邏輯範例 (概念)

**原本可能邏輯：**

```sql
SELECT * FROM notifications
WHERE user_id = :current_user_id
AND group_id = :active_group_id  -- 限制了只看當前群組
```

**建議調整為：**

```sql
SELECT * FROM notifications
WHERE group_id IN (
    SELECT group_id FROM user_groups WHERE user_id = :current_user_id
)
-- 或者如果是發送給個人的通知 (type=system 或 user)
OR (user_id = :current_user_id AND group_id IS NULL)
ORDER BY created_at DESC
```

### 預期效益

前端無須傳送 `groupId` 參數（目前也未傳送），即可獲得該使用者所有相關的通知，提升使用者體驗。
