/**
 * 通知的子類型 (SubType)
 * 用於前端顯示不同的標籤樣式
 */
export type NotificationSubType =
  | 'generate'  // 生成 (AI食譜) - 黃色
  | 'stock'     // 庫存 (過期/低庫存提醒) - 綠色
  | 'consume'   // 消耗 - 粉紅色
  | 'stockIn'   // 入庫 - 紅色
  | 'share'     // 共享 (共享清單邀請) - 淺藍色
  | 'list'      // 清單 (購物清單更新) - 藍色
  | 'self'      // 本人 (個人操作) - 白色
  | 'member';   // 成員 (群組成員變更) - 灰色

/**
 * 通知的動作類型 (ActionType)
 * 決定點擊通知後的前端導航行為
 */
export type NotificationActionType =
  | 'inventory'      // 開啟食材詳情 Modal
  | 'shopping-list'  // 導航至購物清單頁面
  | 'recipe'         // 開啟食譜詳情 Modal
  | 'group'          // 導航至群組設定頁面
  | 'detail';        // 導航至通知詳情頁 (官方公告)

/**
 * 通知的動作 Payload
 */
export type NotificationActionPayload = {
  itemId?: string;         // 食材 ID
  refrigeratorId?: string; // 冰箱/群組 ID
  listId?: string;         // 購物清單 ID
  recipeId?: string;       // 食譜 ID
  notificationId?: string; // 通知 ID
  [key: string]: any;      // 允許其他額外欄位
};

/**
 * 通知訊息結構 (Frontend View)
 */
export interface NotificationMessage {
  id: string;
  category: string; // 'stock' | 'inspiration' | 'official'
  type: string;     // 'stock' | 'shared' | 'system'
  subType?: NotificationSubType;
  title: string;
  message: string;  // Description
  isRead: boolean;
  createdAt: string; // ISO 8601
  groupName?: string;
  actorName?: string;
  action: {
    type?: NotificationActionType | string; // 允許 string 以相容舊資料
    payload?: NotificationActionPayload;
  };
}
