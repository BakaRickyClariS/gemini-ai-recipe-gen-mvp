-- ============================================================
-- 多裝置 FCM Token 支援 - 資料庫遷移
-- 執行時間：2026-01-02
-- 功能：將 FCM Token 從 users 單一欄位遷移到獨立的 fcm_tokens 表
-- ============================================================

-- 1. 建立 fcm_tokens 表
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);

-- 3. 建立 updated_at 自動更新觸發器 (如果尚未存在)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 套用觸發器到 fcm_tokens 表
DROP TRIGGER IF EXISTS update_fcm_tokens_updated_at ON fcm_tokens;
CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 資料遷移：將現有的 users.fcm_token 遷移到 fcm_tokens 表
INSERT INTO fcm_tokens (user_id, token, platform, created_at)
SELECT 
  id as user_id,
  fcm_token as token,
  'web' as platform,
  NOW() as created_at
FROM users
WHERE fcm_token IS NOT NULL
ON CONFLICT (token) DO NOTHING;

-- 6. (選擇性) 移除 users 表的 fcm_token 欄位
-- 注意：建議先確認遷移成功後再執行此步驟
-- ALTER TABLE users DROP COLUMN IF EXISTS fcm_token;

-- ============================================================
-- 驗證指令（執行後可檢查遷移結果）
-- ============================================================
-- SELECT COUNT(*) as migrated_tokens FROM fcm_tokens;
-- SELECT u.id, u.fcm_token, ft.token as new_token 
-- FROM users u 
-- LEFT JOIN fcm_tokens ft ON u.id = ft.user_id 
-- WHERE u.fcm_token IS NOT NULL;
