# 後端修正規劃書：邀請好友時出現「新成員加入」的誤導性通知

## 問題描述
當使用者點擊「產生邀請連結」時，手機與前台會收到一則標題為「新成員加入」的推播通知。這會讓使用者誤以為產生連結的當下，系統就把自己（或某個幽靈帳號）當成新成員加入了群組。

但實際上，群組的成員數量依然沒變，成員列表裡看到的「你」是因為**群組建立者本身就是預設的群組成員**，這並不是 Bug。

真正的 Bug 在於：**後端的 Controller 在處理產生邀請時，發送了錯誤標題的推播通知。**

## 修改範圍
檔案：`src/controllers/V2GroupController.ts` （以及舊版的 `src/controllers/GroupController.ts` 如果有的話）
方法：`createInvitation`

## 修改內容
請將 `notificationService.sendToRefrigeratorMembers` 裡面的第一個參數（標題）從 `新成員加入` 改成 `群組邀請`，這樣才不會造成誤會。

### 具體修改（V2GroupController.ts）

尋找 `createInvitation` 方法約第 80 行：

```typescript
// 修改前
      // Fire-and-forget: 邀請通知（通知群組現有成員有新邀請）
      notificationService
        .sendToRefrigeratorMembers(
          groupId,
          `新成員加入`,      // 這裡寫錯了！
          `已產生群組邀請連結`,
          "group",
          // ... 略
```

這段請改成：

```typescript
// 修改後
      // Fire-and-forget: 邀請通知（通知群組現有成員有新邀請）
      notificationService
        .sendToRefrigeratorMembers(
          groupId,
          `群組邀請`,        // ✨ 修改這裡的標題 ✨
          `已產生群組邀請連結`,
          "group",
          { type: "detail", payload: { refrigeratorId: groupId } },
          "official",
          userId,
          "member"
        )
        .catch((e) =>
          console.error("[Notification] createInvitation error:", e)
        );
```

> **額外建議**：其實產生邀請連結的動作不需要「發通知給群組所有人」，如果未來想要減少不必要的推播干擾，可以直接把這整段 `notificationService` 註解或刪除。加入群組時的 `join` 方法已經有另一段推播了。
