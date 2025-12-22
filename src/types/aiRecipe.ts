/**
 * AI 食譜生成相關型別定義
 * 對應 docs/ai_recipe_api_spec.md 規格
 */

// ===== 請求型別 =====

/**
 * AI 食譜生成請求
 */
export type AIRecipeRequest = {
  /** 使用者的自然語言提示 */
  prompt: string;

  // ===== 預設自動納入（後端自動讀取） =====

  /** 是否自動納入使用者庫存食材（預設 true） */
  includeInventory?: boolean;

  /** 是否套用使用者飲食偏好設定（預設 true） */
  applyDietaryPreferences?: boolean;

  // ===== 額外篩選條件（讓結果更精準） =====

  /** 預計人數（可選，預設 2） */
  servings?: number;

  /** 難易度偏好（可選） */
  difficulty?: "簡單" | "中等" | "困難";

  /** 料理類型偏好（可選） */
  category?: string;

  /** 額外選擇的庫存食材名稱（透過「加入庫存食材」按鈕選擇） */
  selectedIngredients?: string[];

  /** 額外排除的食材（例如臨時不想吃的） */
  excludeIngredients?: string[];

  /** 希望推薦幾道食譜（預設 2） */
  recipeCount?: number;
};

// ===== 回應型別 =====

/** 食材項目（準備材料或調味料） */
export type IngredientItem = {
  /** 食材名稱 */
  name: string;
  /** 數量（字串格式，如 "3-4" 或 "1/2"） */
  amount: string;
  /** 單位（如：條、瓣、根、茶匙、大匙） */
  unit: string;
};

/** 烹煮步驟 */
export type CookingStep = {
  /** 步驟編號 */
  step: number;
  /** 步驟說明 */
  description: string;
};

/** 食譜列表項目（供卡片顯示） */
export type RecipeListItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  servings: number;
  cookTime: number;
  isFavorite: boolean;
  /** 難易度 */
  difficulty?: "簡單" | "中等" | "困難";
  /** 準備材料 */
  ingredients?: IngredientItem[];
  /** 調味料 */
  seasonings?: IngredientItem[];
  /** 烹煮步驟 */
  steps?: CookingStep[];
};


/**
 * AI 食譜生成回應
 */
export type AIRecipeResponse = {
  status: boolean;
  message: string;
  data: {
    /** AI 回應訊息（例如：這裡有幾道推薦的日式食譜選擇） */
    greeting: string;

    /** 生成的多個食譜（符合 RecipeListItem 型別） */
    recipes: RecipeListItem[];

    /** AI 元資料 */
    aiMetadata: {
      generatedAt: string;
      model: string;
      /** 使用的 API Key 編號（安全：不顯示實際 Key 值） */
      apiKeyUsed?: number;
    };

    /** 剩餘查詢次數 */
    remainingQueries: number;
  };
};

// ===== 錯誤回應 =====

/**
 * AI 食譜錯誤回應
 */
export type AIRecipeErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

// ===== 庫存食材選擇 =====

/**
 * 庫存食材選擇項目（供 AI 使用）
 */
export type AIInventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  /** 標籤：優先消耗（即將過期）或有庫存 */
  tag: "priority" | "available";
  /** 優先消耗原因（如：3天後過期） */
  priorityReason?: string;
};

/**
 * 庫存食材選擇 API 回應
 */
export type AIInventorySelectionResponse = {
  status: boolean;
  message: string;
  data: {
    /** 按分類分組的庫存食材 */
    categories: {
      name: string;
      items: AIInventoryItem[];
    }[];
    /** 最多可選數量 */
    maxSelection: number;
  };
};

// ===== 使用者飲食偏好 =====

/**
 * 使用者飲食偏好（存於使用者設定，後端自動讀取）
 */
export type UserDietaryPreferences = {
  /** 飲食類型：一般、素食、純素、無麩質等 */
  dietType?: "normal" | "vegetarian" | "vegan" | "gluten-free";
  /** 過敏原排除清單 */
  allergens?: string[];
  /** 不喜歡的食材 */
  dislikedIngredients?: string[];
};
