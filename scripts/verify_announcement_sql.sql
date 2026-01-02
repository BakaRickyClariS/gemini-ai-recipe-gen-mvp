-- =====================================================
-- Supabase SQL: 驗證官方公告功能
-- 日期: 2026-01-02
-- 說明: 分步執行以下 SQL 以確認資料庫狀態與 API 功能
-- =====================================================

-- 1. 檢查 Schema 是否完整
-- 應包含 category, action_type, action_payload, updated_at
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'notifications';

-- 2. 模擬插入一則官方公告
INSERT INTO notifications (
    user_id, 
    category, 
    type, 
    title, 
    message, 
    action_type, 
    action_payload, 
    created_at, 
    updated_at
)
SELECT 
    id, -- 選取第一位使用者測試
    'official', 
    'announcement', 
    'SQL直接發送測試', 
    '這是一則透過 SQL 插入的公告', 
    'announcement_detail', 
    '{"url": "/test"}'::jsonb, 
    NOW(), 
    NOW()
FROM users 
LIMIT 1;

-- 3. 查詢是否寫入成功
SELECT id, user_id, title, category, created_at 
FROM notifications 
WHERE category = 'official' 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. 測試 API 權限 (需搭配 Postman 或 curl)
-- 嘗試發送 POST /api/v1/admin/announcements
-- Header: Authorization: Bearer {ADMIN_TOKEN}
