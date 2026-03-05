# 群組系統 v2 API 前端對接指南

本文件說明 `v2` 群組 (冰箱) API 最新改版後，前端該如何對接以渲染「成員數、交疊頭像預覽、成員詳細列表」等介面功能。

**重要：這些改動僅限於 `/api/v2/groups` 及以下端點，不會影響舊有 `/api/v1` 的邏輯。**

---

## 1. 取得群組列表 (提供成員數與預覽頭像)

**端點：**
`GET /api/v2/groups`

**用途：**
取得當前登入使用者所屬且活躍的所有群組/冰箱。
這個端點在最新版中加入了 `memberCount` 及 `memberAvatars`，以便於渲染群組卡片列表上的「成員 (X)」文字以及右下角的頭像交疊 UI。

**回傳資料結構範例 (JSON)：**

```json
{
  "status": "success",
  "data": [
    {
      "id": "group-id-1234",
      "name": "我的冰箱",
      "ownerId": "user-uuid-1",
      "createdAt": "2024-03-01T12:00:00.000Z",
      "updatedAt": "2024-03-01T12:00:00.000Z",
      "role": "owner",

      // ✨ [新增] UI 渲染用欄位
      "memberCount": 3,
      "memberAvatars": [
        "https://example.com/avatars/user1.png",
        "https://example.com/avatars/user2.png",
        null
      ]
    }
  ]
}
```

**TypeScript 型別定義參考：**

```typescript
interface GroupListItem {
  id: string;
  name: string;
  ownerId: string;
  role: "owner" | "member";
  createdAt: string;
  updatedAt: string;
  memberCount: number; // 該群組總人數
  memberAvatars: string[]; // 前 4 名成員的頭像網址 (可能含 null)
}

interface GetGroupsResponse {
  status: "success";
  data: GroupListItem[];
}
```

---

## 2. 取得群組詳細資料 (包含完整的成員清單)

**端點：**
`GET /api/v2/groups/{groupId}`

**用途：**
取得特定群組的詳細資訊，並在進入「群組設定」或「編輯成員」Modal 時，可以拿到完整的成員名單、頭像 (`avatar` / `profilePictureUrl`)、以及顯示名稱 (`name` / `displayName`)，以取代之前沒有對應資訊而顯示「未知」的狀況。

**回傳資料結構範例 (JSON)：**

```json
{
  "status": "success",
  "data": {
    "id": "group-id-1234",
    "name": "我的冰箱",
    "ownerId": "user-uuid-1",
    "createdAt": "...ISO...",
    "updatedAt": "...ISO...",

    // ✨ [新增] 每個成員物件現在包含 name 與 avatar
    "members": [
      {
        "membershipId": "mem-uuid-1",
        "userId": "user-uuid-1",
        "role": "owner",
        "joinedAt": "...ISO...",
        "name": "陳小明",
        "avatar": "https://example.com/avatars/user1.png"
      },
      {
        "membershipId": "mem-uuid-2",
        "userId": "user-uuid-2",
        "role": "member",
        "joinedAt": "...ISO...",
        "name": "王大王",
        "avatar": null
      }
    ]
  }
}
```

**TypeScript 型別定義參考：**

```typescript
interface GroupMember {
  membershipId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  name: string; // 顯示名稱（如果無名稱則回傳 "未知"）
  avatar: string | null; // 頭像網址 (優先取 profilePictureUrl, 若無則取 avatar, 若都沒有則為 null)
}

interface GroupDetail {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
}

interface GetGroupDetailResponse {
  status: "success";
  data: GroupDetail;
}
```

---

## 前端實作建議與注意事項

1. **群組列表卡片渲染 (`GroupCard`)**：
   可以直接使用 `item.memberCount` 來顯示「成員 (${item.memberCount})」。
   右下角的重疊頭像，可迴圈渲染 `item.memberAvatars`，遇到 `null` 時請替換成前端預設的通用大頭貼佔位圖 (placeholder)。

2. **編輯成員 Modal 渲染 (`GroupMembers` 元件)**：
   收到 `/api/v2/groups/{groupId}` 回傳的 `members` 陣列後，直接綁定 `member.name` 與 `member.avatar` 即可，不需再發出額外的 API 去查詢使用者明細。

3. **LINE 頭像圖片顯示問題 (`<img src="...">`)**：
   如果 `avatar` 的網址來自 `https://profile.line-scdn.net/...`，為了防止出現 403 Forbidden 破圖，請務必在 `<img>` 標籤加上 **`referrerpolicy="no-referrer"`** 屬性。
   ```tsx
   {
     /* React 寫法範例 */
   }
   <img
     src={member.avatar || DEFAULT_AVATAR_IMAGE}
     alt={member.name}
     referrerPolicy="no-referrer"
   />;
   ```
