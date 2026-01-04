/**
 * 庫存管理相關型別定義
 */

// ===== 食材分類 (Strict IDs) =====
export type FoodCategory =
  | "fruit"
  | "frozen"
  | "bake"
  | "milk"
  | "seafood"
  | "meat"
  | "others";

// ===== 庫存狀態 =====
export type InventoryStatus =
  | "normal"
  | "low-stock"
  | "expired"
  | "expiring-soon"
  | "frequent";

// ===== 消耗原因 =====
export type ConsumptionReason =
  | "recipe_consumption"
  | "duplicate"
  | "short_shelf"
  | "bought_too_much"
  | "custom";

// ===== 庫存食材 =====
export type InventoryItem = {
  id: string;
  userId: string;
  refrigeratorId: string;
  name: string;
  category: FoodCategory | string;
  quantity: number;
  unit: string;
  imageUrl?: string;
  purchaseDate: string;
  expiryDate: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  notes?: string;
  attributes?: string[];
  createdAt: string;
  updatedAt?: string;
};

// ===== 通知選項 =====
export type InventoryNotificationOptions = {
  title?: string;
  body?: string;
  groupName?: string;
  actorName?: string;
};

// ===== 新增食材請求 =====
export type CreateInventoryInput = Omit<
  InventoryItem,
  "id" | "userId" | "refrigeratorId" | "createdAt" | "updatedAt"
> & {
  notification?: InventoryNotificationOptions;
};

// ===== 更新食材請求 =====
export type UpdateInventoryInput = Partial<CreateInventoryInput>;

// ===== 消耗食材請求 =====
export type ConsumeInventoryInput = {
  quantity: number;
  reasons: ConsumptionReason[];
  customReason?: string;
  notification?: InventoryNotificationOptions;
};

// ===== 庫存統計 =====
export type InventoryStats = {
  totalItems: number;
  expiredCount: number;
  expiringSoonCount: number;
  lowStockCount: number;
  byCategory: Record<string, number>;
};

// ===== 庫存摘要 =====
export type InventorySummary = {
  total: number;
  expiring: number;
  expired: number;
  lowStock: number;
};

// ===== 分類資訊 =====
export type CategoryInfo = {
  id: string;
  title: string;
  count: number;
  imageUrl?: string;
  bgColor?: string;
  slogan?: string;
  description?: string[];
};

// ===== 類別設定項目 =====
export type CategorySettingItem = {
  id: string;
  title: string;
  isVisible: boolean;
  subCategories?: string[];
};

// ===== 庫存設定 =====
export type InventorySettings = {
  id?: string;
  userId: string;
  refrigeratorId?: string;
  layoutType: "layout-a" | "layout-b" | "layout-c";
  categoryOrder: string[];
  categories?: CategorySettingItem[];
  lowStockThreshold: number;
  expiringSoonDays: number;
  notifyOnExpiry: boolean;
  notifyOnLowStock: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// ===== 更新設定請求 =====
export type UpdateInventorySettingsInput = Partial<
  Omit<InventorySettings, "id" | "userId" | "createdAt" | "updatedAt">
>;

// ===== 分頁參數 =====
export type InventoryPaginationParams = {
  page?: number;
  limit?: number;
  category?: string;
  status?: InventoryStatus;
  include?: string; // 'summary' | 'stats' | 'summary,stats'
};
