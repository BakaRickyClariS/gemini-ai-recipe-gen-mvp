/**
 * 影像分析共用型別定義
 */

/** 食材辨識結果（基礎） */
export type IngredientRecognitionResult = {
  // 產品資訊
  productName: string;      // 產品名
  category: string;         // 分類
  attributes: string;       // 屬性
  purchaseQuantity: number; // 購物數量
  unit: string;             // 單位

  // 日期設定
  purchaseDate: string;     // 購物日期 (YYYY-MM-DD)
  expiryDate: string;       // 過期日期 (YYYY-MM-DD)

  // 低庫存提醒
  lowStockAlert: boolean;   // 開啟通知（預設 true）
  lowStockThreshold: number;// 低庫存數量通知（預設 2）

  // 備註
  notes: string;            // 備註
  imageUrl?: string | null; // 圖片 URL
};

/** 邊界框座標 (0-1 為基準的相對比例) */
export type BoundingBox = {
  x: number;      // 左上角 X (相對比例)
  y: number;      // 左上角 Y (相對比例)
  width: number;  // 寬度比例
  height: number; // 高度比例
};

/** 多食材分析項目 */
export type MultipleIngredientItem = IngredientRecognitionResult & {
  boundingBox: BoundingBox;  // 該食材在原圖的位置
  confidence: number;        // 辨識信心度 (0-1)
};

/** 多食材分析結果 */
export type MultipleIngredientsResult = {
  originalImageUrl: string;                // 原始圖片 URL (Cloudinary)
  totalCount: number;                      // 辨識到的食材總數
  ingredients: MultipleIngredientItem[];   // 食材列表
  analyzedAt: string;                      // ISO 時間戳
};
