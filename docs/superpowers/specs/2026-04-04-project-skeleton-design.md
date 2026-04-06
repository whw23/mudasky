# mudasky 项目骨架架构设计

## 背景

mudasky 是一个教育机构的 Web 应用，第一期包含官网展示、用户注册/登录、文档上传管理、后台管理四个核心功能。后期将加入 Agent 工作流（多步骤流水线）处理文档。

部署环境为单台云服务器，使用 Docker Compose 编排。

## 技术栈

| 层 | 技术 |
|---|------|
| 网关 | OpenResty（Lua） |
| 前端 | Next.js 16+ + React + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| 后端 | FastAPI + Python 3.14 |
| 数据库 | PostgreSQL |
| ORM | SQLAlchemy（async） |
| 数据库迁移 | Alembic |
| 数据验证 | Pydantic |
| HTTP 客户端 | httpx（后端）/ axios（前端） |
| 状态管理 | React Context（运行时）+ localStorage（持久化） |
| 渲染策略 | 官网页面 SSG（构建时预渲染）、用户中心/后台 CSR（客户端渲染） |
| 测试 | pytest（后端）/ Vitest（前端） |
| 基础设施 | Docker + Docker Compose |

---

## 1. 后端架构

### 1.1 架构风格

领域分包（Domain-based），每个领域内包含完整的分层架构。

### 1.2 分层说明

| 层 | 文件 | 职责 | 依赖方向 |
|---|------|------|---------|
| API | `router.py` | 路由定义、请求/响应处理 | → Service |
| Schema | `schemas.py` | Pydantic 请求/响应模型 | 独立 |
| Service | `service.py` | 业务逻辑、编排 | → Repository |
| Repository | `repository.py` | 数据访问抽象、查询封装 | → Models |
| ORM | `models.py` | SQLAlchemy ORM 模型定义 | 独立 |

数据流：`Router → Service → Repository → ORM`

### 1.3 API 路由前缀

所有后端 API 路由统一挂载在 `/api/` 前缀下。

### 1.4 目录结构

```text
backend/
├── src/
│   └── app/
│       ├── main.py                        # FastAPI 入口，挂载路由
│       ├── core/                          # 通用共享层
│       │   ├── config.py                  # Pydantic Settings，环境变量管理
│       │   ├── database.py                # async engine / session factory
│       │   ├── security.py                # JWT 生成（HMAC-SHA256）、密码哈希
│       │   ├── dependencies.py            # 公共依赖注入（get_db, get_current_user）
│       │   ├── exceptions.py              # 自定义异常 + 全局异常处理
│       │   ├── pagination.py              # 通用分页模型
│       │   └── logging.py                 # JSON 结构化日志配置
│       │
│       ├── auth/                          # 认证领域
│       │   ├── router.py                  # POST /api/auth/sms-code, POST /api/auth/login, POST /api/auth/refresh
│       │   ├── schemas.py                 # SmsCodeRequest, LoginRequest, TokenResponse
│       │   ├── service.py                 # 验证码生成/校验、登录逻辑、token 签发/续签
│       │   └── sms.py                     # 阿里云短信 SDK 封装
│       │
│       ├── user/                          # 用户领域
│       │   ├── router.py                  # GET/PATCH /api/users/me, GET /api/users/{id}
│       │   ├── schemas.py                 # UserCreate, UserResponse, UserUpdate
│       │   ├── service.py                 # 用户 CRUD、配额检查
│       │   ├── repository.py              # 用户查询封装
│       │   └── models.py                  # User ORM 模型
│       │
│       ├── document/                      # 文档领域
│       │   ├── router.py                  # POST /api/documents, GET /api/documents/{id}, DELETE ...
│       │   ├── schemas.py                 # DocumentUpload, DocumentResponse
│       │   ├── service.py                 # 上传逻辑、配额校验、哈希去重
│       │   ├── repository.py              # 文档查询封装
│       │   ├── models.py                  # Document ORM 模型
│       │   └── storage/                   # 文件存储抽象
│       │       ├── base.py                # StorageBackend 抽象接口（save/delete/get_url）
│       │       └── local.py               # 本地磁盘实现
│       │
│       ├── content/                       # 内容管理领域
│       │   ├── router.py                  # GET /api/content, POST /api/content
│       │   ├── schemas.py                 # ArticleCreate, ArticleResponse, CategoryResponse
│       │   ├── service.py                 # 文章 CRUD、审核流程
│       │   ├── repository.py              # 文章/分类查询封装
│       │   └── models.py                  # Article, Category ORM 模型
│       │
│       └── admin/                         # 后台管理领域
│           ├── router.py                  # 管理员接口
│           ├── schemas.py
│           └── service.py
│
├── tests/
│   ├── conftest.py
│   ├── auth/
│   ├── user/
│   └── document/
│
├── alembic/                               # 数据库迁移
│   ├── versions/
│   └── env.py
├── alembic.ini
└── pyproject.toml
```

### 1.5 关键设计决策

**auth 领域没有 repository/models**
认证不管理自己的表，依赖 `user.repository` 查用户、`core.security` 做 token。

**文件存储方案**
文件存本地磁盘（Docker Volume 持久化），数据库只存元数据。后期可通过实现 `storage/oss.py` 平滑迁移到阿里云 OSS，通过配置切换。

#### User 模型关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| phone | str | 手机号（唯一） |
| role | str | 角色枚举：`user` / `admin` |
| is_active | bool | 是否启用 |
| storage_quota | int | 存储配额（字节） |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间（nullable） |

#### Document 模型关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| file_name | str | 原始文件名 |
| file_path | str | 存储路径 |
| file_hash | str | SHA-256 哈希，用于唯一性校验/去重 |
| mime_type | str | MIME 类型 |
| file_size | int | 字节数 |
| uploader_id | UUID | FK → user |
| status | str | pending / processed |
| created_at | datetime | 上传时间 |
| updated_at | datetime | 更新时间（nullable） |

#### Category 模型关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | str | 分类名称 |
| slug | str | URL 友好标识（唯一） |
| sort_order | int | 排序权重 |
| created_at | datetime | 创建时间 |

#### Article 模型关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | str | 文章标题 |
| content | text | 文章正文 |
| summary | str | 摘要（nullable） |
| cover_image | str | 封面图路径（nullable） |
| category_id | UUID | FK → category |
| author_id | UUID | FK → user |
| status | str | draft / pending / published / rejected |
| published_at | datetime | 发布时间（nullable） |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间（nullable） |

#### 文章发布流程

- 管理员发布：`draft` → `published`（直接发布，跳过审核）
- 用户投稿：`draft` → `pending`（提交审核）→ `published`（审核通过）/ `rejected`（审核拒绝）
- 已发布的文章前台可见，其他状态仅作者和管理员可见

#### 用户存储配额

- User 模型包含 `storage_quota` 字段（允许总量）
- 上传时 service 层查 `SUM(file_size) WHERE uploader_id = ?` 校验
- 单文件大小限制在 `core/config.py` 中配置，网关层也做一道上传大小拦截（`client_max_body_size`）

#### 角色鉴权

- 网关层注入 `X-User-Role` 请求头
- 后端 `core/dependencies.py` 提供 `require_role("admin")` 等依赖注入工具
- admin 领域路由通过依赖注入校验角色

#### 健康检查

- 后端提供 `GET /api/health` 端点（公开，不需要认证）
- Docker Compose 中 db 和 backend 服务配置 `healthcheck`
- backend 依赖 db 健康后再启动（`depends_on` + `condition: service_healthy`）

---

## 2. 认证架构

### 2.1 双 Token 机制

| | Access Token | Refresh Token |
|--|---|---|
| 过期时间 | 短（15-30 分钟） | 长（7-30 天） |
| 存储位置 | Cookie（HttpOnly + Secure + SameSite=Strict） | Cookie（HttpOnly + Secure + SameSite=Strict） |
| 用途 | 每次请求携带，网关验证 | 仅用于续签 access token |
| 包含信息 | user_id、role、is_active | 仅 user_id |
| 签名算法 | HMAC-SHA256 | HMAC-SHA256 |

### 2.2 CSRF 防护

Cookie 使用 `SameSite=Strict` 防止跨站请求。此外，所有变更操作（POST/PUT/PATCH/DELETE）要求携带自定义请求头 `X-Requested-With: XMLHttpRequest`，网关层校验此头存在性。浏览器表单提交和简单跨站请求无法携带自定义头，从而阻止 CSRF 攻击。

### 2.3 认证流程

**登录流程：**

```text
1. 用户输入手机号 → 前端调 POST /api/auth/sms-code → 后端发阿里云短信验证码
2. 用户输入验证码 → 前端调 POST /api/auth/login
3. 后端校验验证码 → 生成 access_token + refresh_token
4. 响应：Set-Cookie（两个 token）+ 响应体（用户信息）
5. 前端将用户信息存入 localStorage
```

**请求认证流程（网关层）：**

```text
1. 检查路由是否在认证保护列表中 → 不在则放行
2. 如果是变更请求（POST/PUT/PATCH/DELETE），校验 X-Requested-With 头
3. 从 Cookie 读 access_token JWT
4. 验签（HMAC-SHA256）+ 检查过期时间
5. 从 claims 读取 user_id、role、is_active
6. is_active 为 false → 返回 401 + {"code": "USER_DISABLED"}
7. 通过 → 强制覆盖 X-User-Id / X-User-Role 请求头（防伪造） → 转发到后端
8. 验签失败 → 返回 401 + {"code": "TOKEN_INVALID"}
9. token 过期 → 返回 401 + {"code": "TOKEN_EXPIRED"}
10. 未携带 token → 返回 401 + {"code": "TOKEN_MISSING"}
```

**续签流程：**

```text
1. 前端 axios 响应拦截器收到 401 + TOKEN_EXPIRED
2. 自动调 POST /api/auth/refresh（携带 refresh_token Cookie）
3. 后端验证 refresh_token → 查库确认用户状态 → 签发新 access_token + 新 refresh_token
4. 响应：Set-Cookie（新 access_token + 新 refresh_token）+ 响应体（最新用户信息）
5. 前端更新 localStorage 中的用户信息
6. 自动重试原请求
```

**前端错误处理：**

| 响应 | 前端行为 |
|------|---------|
| 401 + TOKEN_EXPIRED | 自动续签 + 重试 |
| 401 + TOKEN_INVALID | 跳转登录页 |
| 401 + TOKEN_MISSING | 跳转登录页 |
| 401 + USER_DISABLED | 提示"账号已被禁用" |

### 2.4 认证保护列表（白名单模式）

默认所有 `/api/*` 路由需要认证。以下公开路由豁免认证：

- `POST /api/auth/sms-code` — 发送验证码
- `POST /api/auth/login` — 登录
- `POST /api/auth/refresh` — 续签
- `GET /api/health` — 健康检查
- `GET /api/content/articles` — 文章列表（公开）
- `GET /api/content/articles/{id}` — 文章详情（公开）
- `GET /api/content/categories` — 分类列表（公开）
- 官网静态页面（非 `/api/*` 路由）

新增的 `/api/*` 路由默认受保护，避免遗漏导致安全漏洞。

### 2.5 Refresh Token 轮换

每次续签时同时签发新的 refresh token，旧的 refresh token 立即失效。防止 refresh token 泄露后被长期利用。后端在数据库中记录当前有效的 refresh token（或其哈希），续签时校验并更新。

### 2.6 用户信息同步

- 登录、续签、修改用户信息时，响应体携带最新用户信息
- Cookie 保持 `HttpOnly`，前端不直接读取 Cookie
- 前端将用户信息存入 `localStorage`

### 2.7 is_active 时效性说明

`is_active` 存在 JWT claims 中，禁用用户后最长需等 access token 过期（15-30 分钟）才生效。续签时后端会查库校验最新状态，此时禁用立即生效。对于教育机构场景，此延迟可接受。如遇紧急情况（恶意用户），可在网关层临时按 user_id 手动拦截。

### 2.8 短信验证码

| 配置项 | 值 |
| ------ | ------ |
| 存储方式 | 数据库表（sms_code），含手机号、验证码、过期时间、已使用标记 |
| 有效期 | 5 分钟 |
| 发送频率限制 | 同一手机号每 60 秒最多 1 条，每小时最多 5 条 |
| 验证尝试限制 | 同一验证码最多尝试 5 次，超过自动失效 |
| 服务商 | 阿里云短信服务 |

auth 领域需要一个 `models.py` 存放 sms_code 表模型，以及对应的 `repository.py`。更新后的 auth 领域结构：

```text
auth/
├── router.py
├── schemas.py
├── service.py
├── repository.py          # 验证码查询/存储
├── models.py              # SmsCode 模型
└── sms.py                 # 阿里云短信 SDK 封装
```

---

## 3. 网关架构（OpenResty）

### 3.1 职责定位：厚网关

| 职责 | 说明 |
|------|------|
| 反向代理 | 将请求路由到后端服务 |
| 静态文件服务 | 生产环境直接服务前端 build 产物 |
| JWT 认证 | 验签、解 claims、注入请求头 |
| CSRF 校验 | 变更请求校验 X-Requested-With 头 |
| 动态限流 | 基于 Lua 实现灵活的限流策略 |
| 上传拦截 | `client_max_body_size` 限制上传大小 |
| 安全头 | X-Frame-Options、CSP 等 |
| SSL/TLS | HTTPS 终止 |

### 3.2 目录结构

```text
gateway/
├── nginx.conf                         # 主配置（worker 数、日志格式等）
├── conf.d/
│   ├── upstream.conf                  # 后端服务上游定义
│   └── server.conf                    # server 块、location 路由规则
└── lua/
    ├── init.lua                       # worker 初始化（加载 JWT 密钥、公开路由列表）
    ├── auth.lua                       # JWT 验签 + 解 claims + 白名单匹配 + CSRF 校验 + 注入请求头
    └── rate_limit.lua                 # 动态限流逻辑
```

### 3.3 auth.lua 流程

```text
1. 非 /api/* 路由 → 直接放行（静态资源、官网页面）
2. 检查当前路由是否在公开路由白名单中 → 在则放行
3. 如果是变更请求，校验 X-Requested-With 头 → 缺失则返回 403
4. 从 Cookie 读取 access_token
5. 未携带 → 返回 401 + {"code": "TOKEN_MISSING"}
6. HMAC-SHA256 验签 → 失败 → 返回 401 + {"code": "TOKEN_INVALID"}
7. 检查 exp → 过期 → 返回 401 + {"code": "TOKEN_EXPIRED"}
8. 读取 claims 中的 is_active → false → 返回 401 + {"code": "USER_DISABLED"}
9. 强制覆盖 X-User-Id、X-User-Role 请求头（防止外部伪造）
10. 转发请求到后端
```

---

## 4. 基础设施

### 4.1 Docker Compose 服务

| 服务 | 镜像 | 作用 |
|------|------|------|
| gateway | OpenResty | 反向代理、认证、限流、静态文件 |
| backend | python:3.14 | FastAPI 业务逻辑 |
| db | PostgreSQL | 数据库 |
| frontend | Node（仅构建阶段） | 构建前端产物，产物共享给 gateway |

### 4.2 端口策略

**生产环境（docker-compose.yml）：**
只暴露 gateway 端口（80/443），其他服务仅内部通信。

**开发环境（docker-compose.override.yml）：**

| 服务 | 端口映射 | 用途 |
|------|---------|------|
| gateway | 80/443 → 宿主机 | 完整流程测试 |
| backend | 8000 → 宿主机 | 直接调试 API |
| db | 5432 → 宿主机 | 数据库客户端连接 |
| frontend | 5173 → 宿主机 | Vite dev server |

### 4.3 数据持久化

| 数据 | 存储方式 |
|------|---------|
| PostgreSQL 数据 | named volume |
| 用户上传文件 | named volume（挂载到 backend 容器） |

### 4.4 开发环境特性

- 后端挂载源码目录，支持热重载
- 前端使用 Vite dev server 独立运行，gateway 反代到 `frontend:5173`
- 数据库端口暴露到宿主机，方便使用客户端工具

### 4.5 Dockerfile

```text
docker/
├── backend.Dockerfile         # python:3.14，不使用 uv
├── frontend.Dockerfile        # Node 多阶段构建，生产环境构建后退出
└── gateway.Dockerfile         # OpenResty 官方镜像
```

生产环境中 `frontend` 服务使用 Docker Compose profiles（`profiles: ["build"]`），构建完成后自动退出，不占用运行时资源。

### 4.6 前端部署（生产环境）

前端 build 产物通过 volume 共享给 gateway 容器，由 OpenResty 直接服务静态文件。

### 4.7 数据库迁移

使用 Alembic 管理迁移。后端容器启动脚本中先执行 `alembic upgrade head`，再启动 uvicorn。确保每次部署自动应用最新迁移。

### 4.8 环境变量

`core/config.py` 通过 Pydantic Settings 管理以下配置（`.env.example` 需同步更新）：

| 变量 | 说明 |
|------|------|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | 数据库连接 |
| `JWT_SECRET` | JWT 签名密钥 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token 过期时间（分钟） |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token 过期时间（天） |
| `SMS_ACCESS_KEY_ID` / `SMS_ACCESS_KEY_SECRET` | 阿里云 SMS 凭证 |
| `SMS_SIGN_NAME` / `SMS_TEMPLATE_CODE` | 阿里云短信签名和模板 |
| `MAX_UPLOAD_SIZE_MB` | 单文件上传大小限制 |
| `DEFAULT_STORAGE_QUOTA_MB` | 用户默认存储配额 |

---

## 5. 前端架构

> **待定**：需要先分析旧系统代码（`legacy/` 目录），再设计前端架构。

### 5.1 安全注意事项

Next.js 近期披露多个严重漏洞，开发时必须注意：

| CVE | 严重等级 | 类型 | 修复版本 |
|-----|---------|------|---------|
| CVE-2025-29927 | Critical (9.1) | Middleware 认证绕过 | 14.2.25+, 15.2.3+ |
| CVE-2025-66478 / CVE-2025-55182 (React2Shell) | Critical (10.0) | RSC 远程代码执行 | 16.0.7+ |
| CVE-2025-67779 / CVE-2025-55184 | High | DoS 无限循环 | 16.0.10+ |
| CVE-2025-55183 | Medium | Server Function 源码泄露 | 16.0.10+ |

#### 应对措施

1. **必须使用 Next.js >= 16.0.10**，覆盖所有已知漏洞修复
2. **禁止在 Next.js Middleware/Proxy 中做安全关键的认证逻辑** — 所有认证由 OpenResty 网关层处理
3. Next.js 仅负责页面渲染和前端路由，不承担安全职责
4. **不在 Server Components / Server Actions 中处理敏感业务逻辑**（如支付、权限变更）
5. **密钥必须通过环境变量访问**，禁止硬编码在代码中（防止源码泄露漏洞暴露密钥）
6. 定期执行 `npx fix-react2shell-next` 检查版本安全状态

#### axios 供应链攻击（2026-03-31）

axios 官方维护者 npm 账号被入侵，发布了两个植入 RAT 木马的恶意版本：

| 被投毒版本                                       | 安全版本                           |
| ------------------------------------------------ | ---------------------------------- |
| `axios@1.14.1`、`axios@0.30.4`（已从 npm 移除）  | `axios@1.14.0`（当前最新安全版本）  |

#### axios 应对措施

1. **锁定 axios 版本为 `1.14.0`**，`package.json` 中使用精确版本号，禁止 `^` 或 `~` 前缀
2. 使用 pnpm lockfile（`pnpm-lock.yaml`）确保每次安装一致
3. 定期执行 `pnpm audit` 检查依赖安全

---

## 6. 后期扩展

### 6.1 Agent 工作流

后期在后端增加 `workflow/` 领域模块，实现多步骤文档处理流水线。具体技术选型（LangGraph、Celery、自建等）待后续设计。

### 6.2 微信第三方登录

在 `auth/` 领域中扩展 OAuth 登录逻辑。

### 6.3 文件存储迁移

实现 `document/storage/oss.py`（阿里云 OSS），通过配置切换存储后端，无需改动业务代码。

---

## 7. 验证方式

1. `docker compose up` 所有服务正常启动，healthcheck 通过
2. 网关正确反代到后端，静态文件可访问
3. 登录流程完整走通：发验证码 → 登录 → Set-Cookie → 后续请求带认证
4. 公开路由白名单正常放行，其他 `/api/*` 路由需认证
5. CSRF 防护生效：无 X-Requested-With 头的变更请求被拒绝
6. token 过期后前端自动续签，refresh token 轮换正常
7. 文档上传配额校验、哈希去重正常工作
8. 角色鉴权：普通用户无法访问 admin 接口
9. 数据库迁移（Alembic）正常运行
10. 短信发送频率限制生效
