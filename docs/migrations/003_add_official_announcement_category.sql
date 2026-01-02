-- =====================================================
-- Supabase Migration: 官方公告功能支援
-- 日期: 2026-01-02
-- 說明: 
-- 1. 為 notifications 表補上 updated_at 欄位 (Service 層依賴此欄位)
-- 2. 建立自動更新 updated_at 的 Trigger
-- 3. 確認 action_type 與 action_payload 欄位存在
-- =====================================================

-- 1. 新增 updated_at 欄位
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 建立/更新 Trigger Function (如果尚未存在)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 套用 Trigger 到 notifications 表
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. 確保 action 相關欄位存在 (官方公告需要)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS action_payload JSONB;

-- 5. (驗證用) 插入一條測試公告，確認沒問題後可刪除
-- INSERT INTO notifications (user_id, category, type, title, message, updated_at)
-- SELECT id, 'official', 'test', '系統升級測試', '此為測試訊息', NOW() FROM users LIMIT 1;
