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
- **认证**：双 token（access 15min + refresh 30天，环境变量可配），Cookie HttpOnly+SameSite=Strict，白名单模式（默认 /api/* 需认证），refresh token 不轮换（保持原样直到过期或被撤销）；未勾选"保持登录"时 refresh token Cookie Max-Age 为 1 天
- **文件存储**：PostgreSQL BYTEA 存文件二进制数据，同表存元数据（文件名、大小、哈希），用户有存储配额
- **开发环境也走 gateway**，不需要 CORS
- **is_active 在 JWT claims 中**，禁用延迟可接受，续签时查库校验
- **前端用户信息**：登录/续签时响应体带用户信息，不存 localStorage，通过 `/api/portal/profile/meta/list` 获取最新状态，Cookie 保持 HttpOnly
- **RBAC 权限**：superuser、content_admin、advisor、support、student、visitor + 自定义角色；每个用户一个角色；Role.permissions 为 JSON 通配符数组；权限码 = 静态 URL 路径；通配符支持子路径 + 祖先路径匹配；改权限时踢下线（删 refresh_token）；角色分配后踢下线（删 refresh_token）；superuser/visitor 不可删除不可改名，superuser 不可改权限，visitor 可改权限；删除角色时用户迁移到 visitor
- **API 错误码**：后端异常返回具体 code（如 `PHONE_ALREADY_REGISTERED`），前端通过 `getApiError` 查 `ApiErrors` 翻译命名空间实现多语言错误提示
- **数据库迁移**：alembic（Python/SQLAlchemy），与初始建表保持同一技术栈
- **定时清理**：pg_cron 在数据库层执行，不在 API 进程中

- **内部密钥（INTERNAL_SECRET）**：通过 `internal_secret` cookie 传递（统一浏览器和 E2E 场景）；网关层：跳过 IP 限流；后端 sms-code 接口：跳过短信发送并返回验证码；网关→后端的内部调用（refresh_proxy、auth_proxy）仍用 `X-Internal-Secret` 请求头
- **gzip 压缩**：gateway nginx.conf 开启 gzip，覆盖 text/css/js/json/xml/svg
- **Token 即时撤销**：禁用/改角色/删角色时，后端通过 `X-Revoke-User` 响应头通知网关写入 shared dict 黑名单（TTL=20min）；登录/续签时自动清除黑名单；前端收到 `TOKEN_REVOKED` 触发会话过期跳转登录
- **网页设置所见即所得**：文章/分类/院校/案例管理统一到网页设置预览中；导航栏可拖动排序/增删（NavEditor + nav_config）；预设导航项硬编码，自定义项和排序存数据库；侧边栏不再有独立的文章/分类/院校/案例管理入口
- **权限树**：后端启动时遍历 FastAPI router 树，从 `router.label` 获取中文名、从路由 `summary` 获取叶子节点名，构建层级权限树；前端 PermissionTree 为 Miller Columns 无限层级分栏选择器，支持通配符自动折叠/展开
- **前端路由守卫（module 级）**：网关 page_guard.lua 和前端 PanelGuard 同时做 module 级权限校验；PanelGuard 用 MODULE_PERMISSIONS 映射（替代 PANEL_ROUTES）；无权限时 admin→dashboard、portal→profile、默认页也无权限→首页
- **UI 组件**：所有下拉选择用 shadcn Select（base-ui），所有确认弹窗用 AlertDialog，不用原生 `<select>` 和 `confirm()`

- **图片存储优化**：位图（PNG/JPEG/GIF）上传时自动转 WebP（quality=95），SVG/PDF 保持原格式，在 Image Repository 层统一处理；上传大小限制 10MB
- **文档上传白名单**：Portal 文档上传仅允许 PDF、Word（doc/docx）、Excel（xls/xlsx）、PPT（ppt/pptx）、PNG、JPEG、TXT，前后端双重校验
- **批量导入导出**：preview/confirm 两步流程（学科分类/院校/成功案例/文章），支持纯 Excel 或 ZIP（含图片/HTML/PDF 资源）；preview 返回变更预览（新增/更新/无变化），confirm 执行 merge（有值覆盖，空值保留）；各数据类型独立实现，通用工具放 `shared/app/utils/excel_io.py`；前端通用组件 `ImportExportToolbar` + `ImportPreviewDialog`
- **院校专业模型**：`University → UniversityProgram → Discipline`，每个专业关联一个学科小分类，院校学科方向 = 所有专业关联的小分类去重集合
- **Favicon 动态设置**：FaviconHead 组件从 ConfigContext 读取 `favicon_url`，通过 DOM 更新 `link[rel='icon']`；无静态 favicon.ico 文件
- **网页设置标签页**：web-settings 页面有"页面预览"和"高级设置"两个 tab；页面预览顶部有模拟浏览器标签栏（favicon 直接上传）；高级设置包含手机号国家码管理（原 general-settings 已合并到 web-settings）
- **网页设置字段级编辑**：一个数据字段 = 一个 EditableOverlay（铅笔+虚线框），弹窗只含该字段；图片类字段（Logo、二维码）改为直接上传 + 右上角红色删除按钮，不走弹窗；同一 LocalizedField 的多语言渲染合并为一个编辑点；复用数据源的字段可就近编辑（如 Footer 和联系信息的 phone 指向同一 contact_info.phone）
- **ConfigContext.refreshConfig**：保存配置后调用 `refreshConfig()` 强制绕过缓存刷新，所有使用 `useLocalizedConfig()` 的组件实时更新预览
- **品牌名/标语统一数据源**：Header 品牌名、浏览器标签栏、首页 Hero 标题、Footer 品牌名都读 `siteInfo.brand_name`；Header 标语和 Hero 副标题都读 `siteInfo.tagline`；不再有独立的 `hero_title`/`hero_subtitle` 字段
- **Footer 双二维码**：`wechat_service_qr_url`（客服微信，必展示）+ `wechat_official_qr_url`（公众号，有值才展示）；关于我们页面联系信息中的微信咨询也显示客服二维码（hover 弹出放大）
- **种子图片**：`backend/scripts/init/seed_images.py` 从 `assets/` 目录读取 Logo/Favicon/客服微信二维码，写入 Image 表并更新 site_info 配置
- **联系信息位置**：ContactInfoSection 在关于我们页面 Banner 之后（最顶部）；"立即咨询"按钮跳转到 `/about`，未登录时同时弹出登录弹窗

新功能开发遵循面板化组织结构，认证相关改动在网关层处理。