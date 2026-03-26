/**
 * AI 安全防護模組
 * 負責驗證使用者輸入、防止 Prompt Injection 及 SSRF 攻擊
 */

// ===== 常數定義 =====

const MAX_PROMPT_LENGTH = 2000; // 縮短上限，減少攻擊面
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// 允許的圖片 MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Layer 1：基礎格式與長度驗證（快速 fail-fast）
 * 故意不做 injection 偵測（交由 promptValidator 做 regex）
 * 只負責：空值、長度、控制字元、Base64 繞過嘗試
 */
const BASE_PATTERNS: RegExp[] = [
  // Base64 編碼的注入嘗試（常見繞過手法）
  /^[A-Za-z0-9+/]{50,}={0,2}$/, // 超長 base64 字串
  // 大量重複字元（flooding 攻擊）
  /(.)\1{30,}/, // 同一字元重複 30 次以上
  // XML/HTML 注入標籤（在 Prompt 上下文中可能誤導 AI）
  /<\s*(script|iframe|object|embed)[\s>]/i,
];

// ===== 型別定義 =====

export type AIInputValidationResult = {
  isValid: boolean;
  sanitizedInput?: string;
  error?: string;
  code?: string;
};

// ===== 驗證函式 =====

/**
 * 驗證 AI 文字輸入（User Prompt）
 * Layer 1 驗證：格式 / 長度 / 明顯攻擊特徵
 * Layer 2（injection 偵測）在 promptValidator.ts 進行
 */
export function validateAIInput(input: string): AIInputValidationResult {
  if (!input || input.trim().length === 0) {
    return { isValid: false, error: 'Input cannot be empty', code: 'AI_001' };
  }

  // 1. 長度檢查
  if (input.length > MAX_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: `Input length (${input.length}) exceeds limit of ${MAX_PROMPT_LENGTH}`,
      code: 'AI_002',
    };
  }

  // 2. 基礎格式攻擊偵測
  for (const pattern of BASE_PATTERNS) {
    if (pattern.test(input)) {
      console.warn(`[AI Security] Blocked by base pattern: ${pattern}`);
      return {
        isValid: false,
        error: 'Invalid input format detected.',
        code: 'AI_007',
      };
    }
  }

  // 3. 輸入清洗
  //    - 移除 C0/C1 控制字元（保留 \t \n \r）
  //    - 移除 Unicode 零寬字元（常用於混淆繞過）
  // eslint-disable-next-line no-control-regex
  const sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // C0 控制字元
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');       // 零寬 / 軟連字元

  return { isValid: true, sanitizedInput: sanitized };
}

/**
 * 驗證圖片輸入（URL 或 Buffer）
 */
export type ImageInputOptions = {
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
};

// SSRF 黑名單：私有 IP 範圍
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./, // 127.x.x.x loopback
  /^10\./, // 10.0.0.0/8
  /^192\.168\./, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16-31.x.x
  /^0\.0\.0\.0$/,
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 private
  /^169\.254\./, // link-local
];

export function validateImageInput(options: ImageInputOptions): AIInputValidationResult {
  const { mimeType, sizeBytes, url } = options;

  // 1. URL 格式 + SSRF 防護（擴展到整個私有 IP 範圍）
  if (url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Invalid URL protocol', code: 'AI_001' };
      }
      const hostname = parsedUrl.hostname;
      if (PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(hostname))) {
        return { isValid: false, error: 'Private network access denied', code: 'AI_007' };
      }
    } catch {
      return { isValid: false, error: 'Invalid URL format', code: 'AI_001' };
    }
  }

  // 2. MIME Type 檢查
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: `Unsupported image type: ${mimeType}`,
      code: 'AI_001',
    };
  }

  // 3. 檔案大小檢查
  if (sizeBytes && sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Image size exceeds limit (${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`,
      code: 'AI_001',
    };
  }

  return { isValid: true };
}
