# 後端修正規劃書：groupMembership Middleware 使用舊表格問題

## 問題描述

登入後所有 `GET /api/v2/groups/:groupId/inventory/*` 的請求均回傳 `403 Forbidden`。

```
API Error (403): Access denied: You are not a member of this group
```

雖然 `GET /api/v2/groups` 正常回傳群組，且使用者確實是群組 owner，但 inventory 相關 API 全部失敗。

---

## 根本原因

`src/middleware/groupMembership.ts` 查詢的是 **v1 舊表格 `user_refrigerators`**：

```typescript
// ❌ 錯誤：舊表格
const result = await query(
  `SELECT role FROM user_refrigerators WHERE user_id = $1 AND refrigerator_id = $2`,
  [userId, groupId],
);
```

新的 Drizzle ORM 系統使用的是 `group_memberships` 表。所有透過 `groupRepository.create` 建立的群組，其成員資料都存在 `group_memberships` 表，導致查詢永遠為空 → 403。

> **為何 LINE 登入正常？** LINE 帳號是在 v1 舊系統時期建立的，成員資料仍存在 `user_refrigerators` 舊表中，所以查得到。Email 帳號是在 v2 Drizzle 遷移後才建立的，只有新表的資料。

---

## 修正方案

修改 `src/middleware/groupMembership.ts`，**全面改用 Drizzle ORM 查詢 `group_memberships` 新表**：

```typescript
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError.js";
import { db } from "../db/drizzle.js";
import { groupMemberships } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import * as Sentry from "@sentry/node";

export type GroupRole = "admin" | "member";

declare global {
  namespace Express {
    interface Request {
      groupRole?: GroupRole;
    }
  }
}

/**
 * Middleware to verify if the authenticated user is a member of the requested group.
 * Must be used AFTER jwtAuth middleware.
 * Expects the route parameter to contain the group ID (e.g. :groupId or :id).
 * ✅ 使用 group_memberships 表（Drizzle ORM）
 */
export function verifyGroupMembership(idParam: string = "groupId") {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      const groupId = req.params[idParam];
      if (!groupId) {
        throw ApiError.badRequest("Group ID missing in route parameters");
      }

      // ✅ 查詢新的 group_memberships 表
      const result = await db
        .select({ role: groupMemberships.role })
        .from(groupMemberships)
        .where(
          and(
            eq(groupMemberships.userId, userId),
            eq(groupMemberships.groupId, groupId),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        throw ApiError.forbidden(
          "Access denied: You are not a member of this group",
        );
      }

      req.groupRole = result[0].role as GroupRole;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
        return;
      }
      Sentry.captureException(error);
      next(ApiError.internal("Failed to verify group membership"));
    }
  };
}
```

---

## 注意事項

> [!WARNING]
> LINE 登入的舊帳號的成員資料仍存在 `user_refrigerators` 舊表。改完之後，如果有舊的 LINE 帳號沒有在 `group_memberships` 中有資料，就需要做一次資料遷移（或在 LINE 登入時補寫一筆進 `group_memberships`）。
>
> 確認方式：登入 LINE 帳號後，到 DB 確認 `group_memberships` 表中是否有該 user 的資料。

---

## 驗證方式

修正後：
1. 重啟後端
2. 用 `tt2@tt.com` 登入
3. `GET /api/v2/groups/:groupId/inventory/settings` 應該回傳 `200`
4. 庫存頁應該正常顯示，不再卡在「載入中...」

---

## 影響範圍

| 路由 | 受影響 |
|------|--------|
| `GET /api/v2/groups/:groupId/inventory` | ✅ 修正 |
| `GET /api/v2/groups/:groupId/inventory/settings` | ✅ 修正 |
| `GET /api/v2/groups/:groupId/inventory/summary` | ✅ 修正 |
| `GET /api/v2/groups/:id` (group detail) | ✅ 修正 |
