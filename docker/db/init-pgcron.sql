-- 启用 pg_cron 扩展并创建定时清理任务
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天凌晨 3 点清理过期的 refresh token
SELECT cron.schedule('clean_expired_tokens', '0 3 * * *',
  $$DELETE FROM refresh_token WHERE expires_at < now()$$);
