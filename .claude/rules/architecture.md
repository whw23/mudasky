## 架构决策

- **后端架构**：领域分包（Domain-based），每个领域内 api→schema→service→repository→orm 分层
- **网关**：OpenResty 厚网关，处理 JWT 验签、解 claims、注入 X-User-Id/X-User-Role 请求头、CSRF 校验、限流
- **认证**：双 token（access 15-30min + refresh 7-30天），Cookie HttpOnly+Secure+SameSite=Strict，白名单模式（默认 /api/* 需认证），refresh token 轮换
- **文件存储**：磁盘存文件（Docker Volume），数据库存元数据（含 SHA-256 file_hash 去重），用户有存储配额
- **开发环境也走 gateway**，不需要 CORS
- **is_active 在 JWT claims 中**，禁用延迟可接受，续签时查库校验
- **前端用户信息**：登录/续签/修改时响应体带用户信息，存 localStorage，Cookie 保持 HttpOnly

- **RBAC 权限**：superuser、website_admin、student_advisor、student、visitor + 自定义角色，全部平等；每个用户只能有一个角色；权限采用树形结构（用户中心/管理后台 → 面板 → 功能），前后端同时控制
- **API 错误码**：后端异常返回具体 code（如 `PHONE_ALREADY_REGISTERED`），前端通过 `getApiError` 查 `ApiErrors` 翻译命名空间实现多语言错误提示

新功能开发遵循领域分包结构，认证相关改动在网关层处理。
