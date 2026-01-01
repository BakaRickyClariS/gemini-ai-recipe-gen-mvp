-- =====================================================
-- Supabase Migration: 正規化通知分類
-- 日期: 2026-01-02
-- 說明: 將現有通知的 type 欄位值映射到正確的 category
-- =====================================================

-- 1. 確保 category 欄位存在
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'system';

-- 2. 更新 stock 類通知
UPDATE notifications SET category = 'stock' WHERE type IN ('inventory', 'group', 'stock', 'expiry', 'low_stock') AND (category IS NULL OR category = 'system');

-- 3. 更新 inspiration 類通知
UPDATE notifications SET category = 'inspiration' WHERE type IN ('recipe', 'shopping', 'inspiration') AND (category IS NULL OR category = 'system');

-- 4. 更新 official 類通知
UPDATE notifications SET category = 'official' WHERE type IN ('system', 'marketing', 'official') AND (category IS NULL OR category = 'system');

-- 5. 建立索引（提升查詢效能）
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- 6. 驗證結果
SELECT category, COUNT(*) as count 
FROM notifications 
GROUP BY category 
ORDER BY count DESC;
