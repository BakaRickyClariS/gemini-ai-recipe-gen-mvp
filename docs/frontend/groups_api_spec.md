# Groups Module API Specification

**版本**: v1.1  
**文件用途**: 後端協作規格（群組 CRUD、成員管理、邀請/加入/離開）

---

## 1. 基本規範

- Base URL: `/api/v1`
- 需要 Access Token（`Authorization: Bearer <token>`）

> [!NOTE]
> 串接方式可參考 Auth 模組。

標準錯誤格式同 `auth_api_spec.md`。

---

## 2. 資料模型

### 2.1 Group

```typescript
type Group = {
  id: string;
  name: string;
  admin?: string; // 建立者 ID 或名稱
  members?: GroupMember[];
  imageUrl?: string; // 群組自定義圖片 URL
  plan?: 'free' | 'premium';
  createdAt?: string;
  updatedAt?: string;
};
```

### 2.2 GroupMember

```typescript
type GroupMember = {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'member';
};
```

### 2.3 Forms

```typescript
type InviteMemberForm = {
  email: string;
  role?: GroupMember['role']; // default member
};

type JoinGroupForm = {
  inviteCode: string;
};
```

---

## 3. Groups API

> [!IMPORTANT]
> 後端實際使用 `/refrigerators` 作為群組的路由前綴，前端 API 已對應調整。

### 3.1 取得群組列表

- **GET** `/api/v1/refrigerators`
- 200 → `Group[]`

### 3.2 建立群組

- **POST** `/api/v1/refrigerators`
- Body: `{ name, color?, characterColor? }`
- 201 → `Group` (需包含完整 DTO 與 ID)

### 3.3 取得群組詳情

- **GET** `/api/v1/refrigerators/{id}`
- 200 → `Group`

### 3.4 更新群組

- **PUT** `/api/v1/refrigerators/{id}`
- Body: `{ name?, color?, characterColor? }`
- 200 → `Group`

### 3.5 刪除群組

- **DELETE** `/api/v1/refrigerators/{id}`
- 204 或 `{ success: true }`

### 3.6 取得群組成員列表

- **GET** `/api/v1/refrigerators/{id}/members`
- 200 → `GroupMember[]`

### 3.7 邀請/加入成員（合併路由）

- **POST** `/api/v1/refrigerators/{id}/members`
- Body: `InviteMemberForm & { mode?: 'invite' | 'join'; inviteCode?: string }`
- 204 或 `{ success: true }`

### 3.8 離開/移除成員

- **DELETE** `/api/v1/refrigerators/{id}/members/{memberId}`
- 204 或 `{ success: true }`（memberId 為自己代表離開）

### 3.9 更新成員權限

- **PATCH** `/api/v1/refrigerators/{id}/members/{memberId}`
- Body: `{ role: 'owner' | 'member' }`
- 204 或 `{ success: true }`

---

## 3.10 邀請好友 API (NEW - 待後端實作)

### 3.10.1 搜尋好友

- **GET** `/api/v1/users/friends?q={keyword}`
- 200 → `User[]` (搜尋結果)

### 3.10.2 產生邀請碼/QR Code

- **POST** `/api/v1/refrigerators/{id}/invite-code`
- 200 → `{ code: string, expiry: string, qrUrl?: string }`

### 3.10.3 發送邀請通知

- **POST** `/api/v1/refrigerators/{id}/invitations`
- Body: `{ targetUserId: string }` 或 `{ email: string }`
- 200/201 → 成功

---

## 4. 角色權限建議

| 操作          | owner | member |
| ------------- | ----- | ------ |
| 編輯/刪除群組 | ✓     | ✗      |
| 邀請/移除成員 | ✓     | ✗      |
| 更新成員角色  | ✓     | ✗      |
| 離開群組      | ✗     | ✓      |

---

## 5. 會員等級 API 需求（前端 UI 整合）

### 5.1 前端需求說明

TopNav 組件右側大頭貼需顯示會員等級徽章，需要從 User 資料取得會員等級資訊。

### 5.2 建議 User 型別擴充

在 `/api/v1/auth/me` 回傳的 User 資料中新增 `membershipTier` 欄位：

```typescript
type MembershipTier = 'free' | 'premium' | 'vip';

type User = {
  id: string;
  email?: string;
  name?: string;
  avatar: string;
  // ... 其他現有欄位
  membershipTier?: MembershipTier; // 新增：會員等級
};
```

### 5.3 UI 顯示邏輯

| 會員等級  | 顯示徽章 | 說明                                         |
| --------- | -------- | -------------------------------------------- |
| `free`    | 無       | 免費會員不顯示徽章                           |
| `premium` | ✓        | 顯示 Premium-membership-card.png             |
| `vip`     | ✓        | 顯示 Premium-membership-card.png（暫用同圖） |

> **備註**：目前前端僅有 `Premium-membership-card.png` 圖示，若需要區分不同等級的圖示，請提供對應的圖片資源。
