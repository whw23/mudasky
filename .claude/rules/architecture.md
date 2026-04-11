## 架构决策

- **后端架构**：领域分包（Domain-based），每个领域内 api→schema→service→repository→orm 分层
- **网关**：OpenResty 厚网关，处理 JWT 验签、解 claims、注入 X-User-Id/X-User-Role 请求头、CSRF 校验、限流
- **认证**：双 token（access 15-30min + refresh 7-30天），Cookie HttpOnly+Secure+SameSite=Strict，白名单模式（默认 /api/* 需认证），refresh token 轮换
- **文件存储**：磁盘存文件（Docker Volume），数据库存元数据（含 SHA-256 file_hash 去重），用户有存储配额
- **开发环境也走 gateway**，不需要 CORS
- **is_active 在 JWT claims 中**，禁用延迟可接受，续签时查库校验
- **前端用户信息**：登录/续签/修改时响应体带用户信息，存 localStorage，Cookie 保持 HttpOnly

新功能开发遵循领域分包结构，认证相关改动在网关层处理。
