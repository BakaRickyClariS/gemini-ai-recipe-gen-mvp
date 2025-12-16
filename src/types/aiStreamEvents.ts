/**
 * SSE Streaming 事件型別定義
 * 對應 docs/ai_recipe_api_spec.md 規格
 */

import type { RecipeListItem } from "./aiRecipe.js";

// ===== SSE 事件基礎型別 =====

/** SSE 事件基礎型別 */
export type AIStreamEventBase = {
  id: string;
  timestamp: string;
};

// ===== 各種事件型別 =====

/** 開始事件 */
export type AIStreamStartEvent = AIStreamEventBase & {
  event: "start";
  data: {
    sessionId: string;
    model: string;
  };
};

/** 文字片段事件（Streaming 內容） */
export type AIStreamChunkEvent = AIStreamEventBase & {
  event: "chunk";
  data: {
    /** 本次 chunk 的部分文字 */
    text: string;
    /** 目前生成的部分 */
    section: "greeting" | "name" | "ingredients" | "steps" | "summary";
  };
};

/** 進度事件 */
export type AIStreamProgressEvent = AIStreamEventBase & {
  event: "progress";
  data: {
    /** 進度百分比 0-100 */
    percent: number;
    /** 目前階段描述 */
    stage: string;
  };
};

/** 完成事件 */
export type AIStreamDoneEvent = AIStreamEventBase & {
  event: "done";
  data: {
    /** 完整的結構化食譜陣列 */
    recipes: RecipeListItem[];
    aiMetadata: {
      generatedAt: string;
      model: string;
    };
    remainingQueries: number;
  };
};

/** 錯誤事件 */
export type AIStreamErrorEvent = AIStreamEventBase & {
  event: "error";
  data: {
    code: string;
    message: string;
  };
};

// ===== 統一事件聯合型別 =====

export type AIStreamEvent =
  | AIStreamStartEvent
  | AIStreamChunkEvent
  | AIStreamProgressEvent
  | AIStreamDoneEvent
  | AIStreamErrorEvent;
