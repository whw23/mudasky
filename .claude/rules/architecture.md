## 架构风格

**分层架构 + 面板化组织（Layered Architecture + Panel-based Organization）**

### 分层

| 层 | 包 | 职责 | 技术选型 |
|----|----|------|----------|
| 基础设施层 | `shared/app` | 数据库、短信、加密等基础设施，不含业务逻辑 | SQLAlchemy, asyncpg |
| 业务层 | `api/api` | 路由、业务逻辑、请求/响应模型，按面板组织 | FastAPI, Pydantic |
| 网关层 | `gateway` | JWT 验签、CSRF、限流、请求头注入 | OpenResty, Lua |

### 面板化组织

API 按访问面板（Panel）划分，每个面板有独立的 router/service/schemas：

| 面板 | 前缀 | 访问者 | 数据范围 |
|------|------|--------|----------|
| auth | `/auth` | 所有人 | 认证相关 |
| public | `/public` | 匿名/所有人 | 仅已发布数据（只读） |
| admin | `/admin` | 管理员 | 全部数据（读写） |
| portal | `/portal` | 登录用户 | 仅自己的数据 |

### 调用链

```text
Router → Service → Repository → Models
  (api)    (api)     (shared)    (shared)
```

- Router 只调 Service，处理 HTTP 请求/响应
- Service 只调 Repository，处理业务逻辑
- Repository 只操作 Models，处理数据访问
- 禁止跨层调用和反向依赖
- 禁止跨面板调用，共享逻辑通过 Repository 层

### 基础设施层组织（shared/app）

按基础设施类型组织，不按领域：

| 目录 | 职责 |
|------|------|
| `db/` | 数据库引擎 + 各领域的 models/repository |
| `sms/` | 短信发送接口 |
| `core/` | 不可替换的基础设施（config, exceptions, logging） |
| `utils/` | 可替换的工具函数（crypto, security, model_utils） |

### 行级安全策略

每个面板的 Service 按以下规则约束数据访问：

| 面板 | 读权限 | 写权限 | 过滤条件 |
|------|--------|--------|----------|
| public | 只读 | 无 | `status = published` |
| admin | 全部 | 全部 | 无限制 |
| portal | 仅自己 | 仅自己 | `user_id = current_user_id` |

## 架构决策

- **网关**：OpenResty 厚网关，处理 JWT 验签、解 claims、注入 X-User-Id/X-User-Role 请求头、CSRF 校验、限流
- **认证**：双 token（access 15-30min + refresh 7-30天），Cookie HttpOnly+Secure+SameSite=Strict，白名单模式（默认 /api/* 需认证），refresh token 轮换
- **文件存储**：PostgreSQL BYTEA 存文件二进制数据，同表存元数据（文件名、大小、哈希），用户有存储配额
- **开发环境也走 gateway**，不需要 CORS
- **is_active 在 JWT claims 中**，禁用延迟可接受，续签时查库校验
- **前端用户信息**：登录/续签/修改时响应体带用户信息，存 localStorage，Cookie 保持 HttpOnly
- **RBAC 权限**：superuser、website_admin、student_advisor、student、visitor + 自定义角色，全部平等；每个用户只能有一个角色；权限采用树形结构（用户中心/管理后台 → 面板 → 功能），前后端同时控制
- **API 错误码**：后端异常返回具体 code（如 `PHONE_ALREADY_REGISTERED`），前端通过 `getApiError` 查 `ApiErrors` 翻译命名空间实现多语言错误提示
- **数据库迁移**：alembic（Python/SQLAlchemy），与初始建表保持同一技术栈
- **定时清理**：pg_cron 在数据库层执行，不在 API 进程中

新功能开发遵循面板化组织结构，认证相关改动在网关层处理。