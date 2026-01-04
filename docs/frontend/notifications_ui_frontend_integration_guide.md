# 前端整合指南：通知 UI 升級 (詳細版)

本指南旨在協助前端開發人員將現有的通知系統升級，以支援新的 `subType`、`groupName` 與 `actorName` 顯示。

## 1. 更新型別定義 (Type Definitions)

請在 `src/types/notification.ts` (或相應檔案) 中更新以下定義：

```typescript
// 1. 新增 NotificationSubType 列舉
export type NotificationSubType =
  | 'generate'  // 生成 (AI食譜) - 黃色
  | 'stock'     // 庫存 (過期/低庫存提醒) - 綠色
  | 'consume'   // 消耗 - 粉紅色
  | 'stockIn'   // 入庫 - 紅色
  | 'share'     // 共享 (共享清單邀請) - 淺藍色
  | 'list'      // 清單 (購物清單更新) - 藍色
  | 'self'      // 本人 (個人操作) - 白色
  | 'member';   // 成員 (群組成員變更) - 灰色

// 2. 更新 NotificationMessage 介面
export interface NotificationMessage {
  id: string;
  category: string; // 'stock' | 'inspiration' | 'official'
  type: string;     // 'stock' | 'shared' | 'system'
  
  // [NEW] 新增欄位
  subType?: NotificationSubType; 
  groupName?: string;
  actorName?: string;
  
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  
  // 確保 action 結構完整
  action: {
    type?: string;     // 'inventory' | 'shopping-list' | 'recipe' | 'group' | 'detail'
    payload?: any;
  };
}
```

## 2. 實作 Helper 函式 (Tag Styles)

建議建立一個 Helper (`src/utils/notificationHelpers.ts`) 來統一管理標籤樣式與文字。

```typescript
import { NotificationSubType } from '@/types/notification';

export const getNotificationBadgeStyle = (subType?: NotificationSubType) => {
  switch (subType) {
    case 'stock':     return { bg: 'bg-green-100', text: 'text-green-800', label: '庫存' };
    case 'stockIn':   return { bg: 'bg-red-100', text: 'text-red-800', label: '入庫' };
    case 'consume':   return { bg: 'bg-pink-100', text: 'text-pink-800', label: '消耗' };
    case 'generate':  return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '生成' };
    case 'list':      return { bg: 'bg-blue-100', text: 'text-blue-800', label: '清單' };
    case 'share':     return { bg: 'bg-cyan-100', text: 'text-cyan-800', label: '共享' };
    case 'member':    return { bg: 'bg-gray-100', text: 'text-gray-800', label: '成員' };
    case 'self':      return { bg: 'bg-gray-50', text: 'text-gray-600', label: '通知' };
    default:          return null; // 若無 subType 或不匹配，不顯示標籤
  }
};
```

## 3. 更新 `NotificationItem` 元件 (Component Implementation)

在 `NotificationItem.tsx` 中，加入 Header 顯示邏輯與標籤渲染。

```tsx
import React from 'react';
import { NotificationMessage } from '@/types/notification';
import { getNotificationBadgeStyle } from '@/utils/notificationHelpers';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Props {
  notification: NotificationMessage;
  onClick: (notification: NotificationMessage) => void;
}

const NotificationItem: React.FC<Props> = ({ notification, onClick }) => {
  const { 
    title, message, isRead, createdAt, 
    groupName, actorName, subType, category 
  } = notification;

  // 1. 判斷是否為官方公告
  const isOfficial = groupName === 'FuFood Official' || category === 'official';
  
  // 2. 取得標籤樣式 (官方公告不顯示 subType 標籤)
  const badge = !isOfficial ? getNotificationBadgeStyle(subType) : null;

  return (
    <div 
      onClick={() => onClick(notification)}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        !isRead ? 'bg-blue-50/50' : 'bg-white'
      }`}
    >
      <div className="flex flex-col gap-1">
        
        {/* [NEW] Header 資訊列: 群組 • 操作者 */}
        {(groupName || actorName) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            {isOfficial && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                OFFICIAL
              </span>
            )}
            
            <div className="flex items-center gap-1">
              {groupName && <span className="font-medium">{groupName}</span>}
              {groupName && actorName && <span>•</span>}
              {actorName && <span>{actorName}</span>}
            </div>
          </div>
        )}

        {/* 標題列 (含標籤) */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
             {/* [NEW] Badge 渲染 */}
            {badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
            <h4 className={`font-medium text-sm ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
              {title}
            </h4>
          </div>
          
          {/* 時間 */}
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: zhTW })}
          </span>
        </div>

        {/* 內文 Description */}
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {message}
        </p>
      </div>
    </div>
  );
};

export default NotificationItem;
```

## 4. 點擊行為處理 (Navigation Handling)

前端在處理點擊事件時，需根據 `action.type` 導向正確位置。請確保您的 `useNotification` Hook 或全域 Context 能處理新的 action 類型。

```typescript
const handleNotificationClick = (notification: NotificationMessage) => {
  const { action } = notification;
  
  switch (action.type) {
    case 'inventory':
      // 開啟食材詳情 Modal
      // action.payload?.itemId, action.payload?.refrigeratorId
      break;
      
    case 'shopping-list':
      // 導航至購物清單
      // router.push(`/planning?tab=shopping&listId=${action.payload?.listId}`);
      break;
      
    case 'recipe':
      // 開啟食譜 Modal
      // action.payload?.recipeId
      break;
      
    case 'group':
      // 導航至群組設定
      // router.push(`/settings/group/${action.payload?.refrigeratorId}`);
      break;
      
    case 'detail':
      // [NEW] 官方公告詳情頁
      // router.push(`/notifications/${notification.id}`);
      break;
      
    default:
      console.warn('Unknown action type:', action.type);
  }
};
```

## 5. 整合檢核清單 (Checklist)

- [ ] **Type**: 確保 `NotificationSubType` 列舉包含所有 8 種狀態。
- [ ] **API**: 確認 `GET /api/v1/notifications` 回傳的資料結構包含 `subType` 等新欄位。
- [ ] **UI**: 
    - [ ] 是否正確顯示 `groupName` 與 `actorName` 組合？
    - [ ] 是否正確根據 `subType` 顯示不同顏色的標籤？
    - [ ] 官方公告是否隱藏了普通標籤並顯示官方識別？
- [ ] **Action**: 點擊各類通知是否能正確跳轉？
