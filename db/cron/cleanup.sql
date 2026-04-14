-- 定时清理过期的刷新令牌（每小时执行）
SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 * * * *',
    $$DELETE FROM refresh_token WHERE expires_at < NOW()$$
);
