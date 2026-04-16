# E2E 多 Worker 协作测试设计

## 背景

当前 E2E 测试用单一 admin 账号（mudasky）跑所有用例，无法测试多用户协作场景和并发竞态。需要改为 4 个 worker 各自使用不同角色，通过文件信号协调，模拟真实多用户系统。

## 原则

- `mudasky`/`whw23`/`nyx` 是真实账号，测试**绝不触碰**
- 所有测试操作只使用 `e2e_test_superuser` 和自注册的 E2E 账号
- Worker 间通过文件信号通信，实现协作测试
- 覆盖率六维度 100%，0 failed / 0 skipped / 0 flaky

## 角色分配

| Worker | 账号 | 初始角色 | 最终角色 | 职责 |
|--------|------|----------|----------|------|
| W1 | e2e_test_superuser | superuser | superuser | 管理操作：赋权、创建数据、禁用/删除 |
| W2 | 自注册 E2E-student-{ts} | visitor | student | 学生场景：上传文档、查看资料、portal 操作 |
| W3 | 自注册 E2E-advisor-{ts} | visitor | advisor | 顾问场景：查看学生、管理联系人 |
| W4 | 自注册 E2E-visitor-{ts} | visitor | visitor | 游客场景：公开页面、权限被拒验证 |

## global-setup

用 `e2e_test_superuser`（密码 `e2e_test_superuser@12321.`）账号密码登录，保存 `w1.json`。**不使用 mudasky。**

- 预热页面（SSR 编译）
- 清理上次残留的信号文件
- 不创建种子数据（由 W1 在测试中创建）

## 信号机制

### 文件结构

```text
/tmp/e2e-signals/
├── w2_registered.json    # W2 注册完成，内容: { phone, username, userId }
├── w3_registered.json    # W3 注册完成
├── w4_registered.json    # W4 注册完成
├── w2_student.json       # W1 已把 W2 提升为 student
├── w3_advisor.json       # W1 已把 W3 提升为 advisor
├── roles_assigned.json   # 所有角色分配完成
├── article_created.json  # W1 创建了文章，内容: { articleId, categorySlug }
├── case_created.json     # W1 创建了案例
├── university_created.json
├── category_created.json
├── role_created.json     # W1 创建了自定义角色
├── doc_uploaded.json     # W2 上传了文档，内容: { docId }
├── w4_disabled.json      # W1 禁用了 W4
├── w4_enabled.json       # W1 重新启用了 W4
├── w2_2fa_enabled.json   # W2 启用了 2FA
├── w2_phone_changed.json # W2 修改了手机号
├── config_updated.json   # W1 修改了配置
└── ...
```

### API

```typescript
// frontend/e2e/helpers/signal.ts

const SIGNAL_DIR = "/tmp/e2e-signals"

/** 发送信号（写文件） */
function emit(name: string, data?: unknown): void

/** 等待信号（轮询文件，默认超时 30s） */
async function waitFor(name: string, timeout?: number): Promise<unknown>

/** 清理所有信号（global-setup / global-teardown 调用） */
function cleanup(): void
```

- `emit` 是同步写文件，立即可见
- `waitFor` 每 200ms 轮询一次，超时抛错
- 信号名全局唯一，不同 Phase 用不同前缀

## 执行流程

### Phase 1: 注册（W2/W3/W4 并行，W1 等待）

```text
W1: 等待 w2_registered + w3_registered + w4_registered
W2: 打开首页 → 注册（SMS 验证码）→ emit("w2_registered", { phone, username, userId })
W3: 打开首页 → 注册 → emit("w3_registered", { ... })
W4: 打开首页 → 注册 → emit("w4_registered", { ... })
```

### Phase 2: 赋权（W1 操作，W2/W3/W4 等待）

```text
W1: waitFor("w2_registered") → 在 admin/users 中找到 W2 → 提升为 student → emit("w2_student")
W1: waitFor("w3_registered") → 找到 W3 → 提升为 advisor → emit("w3_advisor")
W1: emit("roles_assigned")

W2: waitFor("w2_student") → refresh token → 验证角色变化 → 开始 student 测试
W3: waitFor("w3_advisor") → refresh token → 验证角色变化 → 开始 advisor 测试
W4: waitFor("roles_assigned") → 开始 visitor 测试（验证权限被拒）
```

### Phase 3: 协作测试（4 worker 并行）

**内容管理全流程（W1）：**

```text
W1: 创建分类 → emit("category_created", { categoryId })
W1: 创建文章（每个分类一篇，发布）→ emit("article_created", { articleId, categorySlug })
W1: 创建案例 → emit("case_created", { caseId })
W1: 创建院校 → emit("university_created", { universityId })
W1: 编辑文章（修改标题）
W1: 取消发布文章 → 再发布
```

**角色管理全流程（W1）：**

```text
W1: 创建自定义角色 → emit("role_created", { roleId })
W1: 编辑角色权限（assign-permissions）
W1: 角色排序（reorder）
W1: 删除自定义角色
```

**配置管理（W1）：**

```text
W1: 读取 general-settings
W1: 编辑 general-settings → emit("config_updated")
W1: 读取 web-settings
W1: 编辑 web-settings（ConfigEditDialog 交互）
```

**文档协作（W2 + W1/W3）：**

```text
W2: 上传文档（文本文件）→ emit("doc_uploaded", { docId })
W2: 上传第二个文档（PDF）
W2: 查看文档列表
W2: 分类 tab 切换筛选
W3: waitFor("doc_uploaded") → 在 admin/students 中查看 W2 的文档列表
W1: waitFor("doc_uploaded") → 在 admin/students 中也能查看
```

**Portal 全流程（W2）：**

```text
W2: 访问 portal/overview → 统计卡片可见
W2: 访问 portal/profile → 查看/修改用户名
W2: 修改密码
W2: 修改手机号 → emit("w2_phone_changed")
W2: 启用 2FA（SMS 方式）→ emit("w2_2fa_enabled")
W2: 禁用 2FA
W2: 查看登录设备列表
W2: 踢掉其他设备
```

**权限验证（正例/反例自然产生）：**

```text
# admin 端点
W1: 访问 admin/users → 200（正例）
W2: 访问 admin/users → 403（反例：student）
W3: 访问 admin/users → 403（反例：advisor 无 users 权限）
W4: 访问 admin/users → 重定向（反例：visitor）

# portal 端点
W2: 访问 portal/documents → 200（正例：student）
W3: 访问 portal/profile → 200（正例：advisor）
W4: 访问 portal/documents → 重定向（反例：visitor）

# admin 子模块权限
W3: 访问 admin/students → 200（正例：advisor 有学生管理权限）
W3: 访问 admin/contacts → 200（正例：advisor 有联系人权限）
W3: 访问 admin/articles → 403（反例：advisor 无文章权限）

# 公开页面
W4: 访问所有公开页面 → 200（正例：任何人可访问）
W4: 访问所有文章详情页 → 200
W4: 访问案例/院校详情页 → 200
```

**禁用/启用用户（W1 + W4）：**

```text
W1: 禁用 W4 → emit("w4_disabled")
W4: waitFor("w4_disabled") → 验证 API 返回 401 USER_DISABLED
W4: 验证页面访问被拒
W1: 重新启用 W4 → emit("w4_enabled")
W4: waitFor("w4_enabled") → refresh token → 验证恢复访问
```

**安全测试（分散到各 worker）：**

```text
# JWT 安全（W4 负责，因为可以操作 cookie）
W4: 清除 cookie → 访问 admin API → 401 ACCESS_TOKEN_MISSING
W4: 伪造 token → 访问 admin API → 401 TOKEN_INVALID
W4: 篡改 JWT payload → 401 TOKEN_INVALID

# CSRF（W1 负责）
W1: POST 请求不带 X-Requested-With → 403 CSRF_REJECTED

# IDOR（W2 + W4 协作）
W2: 上传文档 → emit("idor_doc", { docId })
W4: waitFor("idor_doc") → 尝试访问 W2 的文档 → 403/404
W4: 尝试删除 W2 的文档 → 403/404

# 文件上传安全（W2 负责）
W2: 上传超大文件 → 413
W2: 上传无文件的请求 → 400+

# Token 轮换（W2 负责）
W2: 调用 refresh → 获取新 token
W2: 清除 cookie → refresh → 401
W2: 伪造 refresh_token → refresh → 401

# XSS / SQL 注入（W1 负责）
W1: 用户名含 <script> 标签 → 被转义
W1: 搜索框 SQL 注入 → 正常返回，不报 500
W1: 超长字符串 → 不报 500

# 路径穿越（W2 负责）
W2: 文档下载用 ../../../etc/passwd → 403/404
```

**删除用户（W1，最后执行）：**

```text
W1: 删除 W4 → emit("w4_deleted")
# W4 此时已完成所有测试
```

## 公开页面全覆盖（W4 负责）

W4 作为 visitor 覆盖所有公开页面：

```text
W4: / → 首页加载
W4: /about → 关于我们
W4: /contact → 联系我们
W4: /articles → 文章汇总
W4: /news → 新闻中心
W4: /news/[id] → 新闻详情
W4: /cases → 成功案例
W4: /cases/[id] → 案例详情
W4: /universities → 院校列表
W4: /universities/[id] → 院校详情
W4: /study-abroad → 留学项目
W4: /study-abroad/[id] → 详情
W4: /visa → 签证办理
W4: /visa/[id] → 详情
W4: /life → 留学生活
W4: /life/[id] → 详情
W4: /requirements → 申请条件
W4: /requirements/[id] → 详情

W4: 导航栏所有链接
W4: 语言切换（zh/en）
W4: 底部 ICP 备案
W4: 院校搜索筛选（国家/搜索框/重置）
```

## Admin 页面覆盖（W1 + W3 分担）

```text
# W1 负责（CRUD + 设置 + 用户管理）
W1: /admin/dashboard → 仪表盘
W1: /admin/users → 用户管理（列表/搜索/展开面板/状态切换/密码重置/强制登出/删除）
W1: /admin/roles → 角色管理（CRUD/权限树/排序）
W1: /admin/articles → 文章管理（CRUD/状态筛选）
W1: /admin/categories → 分类管理（CRUD）
W1: /admin/cases → 案例管理（CRUD）
W1: /admin/universities → 院校管理（CRUD）
W1: /admin/general-settings → 通用设置（编辑）
W1: /admin/web-settings → 网站设置（预览/ConfigEditDialog 编辑）
W1: /admin/documents → 管理员文档查看

# W3 负责（学生/联系人展开面板交互）
W3: /admin/students → 学生管理（列表/展开面板/激活checkbox/备注/顾问分配/降级）
W3: /admin/contacts → 联系人管理（列表/展开面板/状态标记/备注/升级学生/联系历史）
W3: /admin/dashboard → 仪表盘（advisor 视角）
W3: admin 侧边栏导航（advisor 可见的菜单项）
```

## Portal 页面全覆盖（W2 负责）

```text
W2: /portal/overview → 概览（统计卡片/快捷操作）
W2: /portal/profile → 个人资料
    - 基本信息/修改用户名
    - 修改密码
    - 修改手机号
    - 2FA 启用/禁用（SMS 方式）
    - 登录设备列表/踢下线
    - 角色显示
W2: /portal/documents → 文档管理
    - 上传/列表/分类 tab
```

## storageState 管理

| Worker | 文件 | 来源 |
|--------|------|------|
| W1 | `e2e/.auth/w1.json` | global-setup 密码登录 |
| W2 | `e2e/.auth/w2.json` | 测试中自注册后保存 |
| W3 | `e2e/.auth/w3.json` | 测试中自注册后保存 |
| W4 | `e2e/.auth/w4.json` | 测试中自注册后保存 |

每个 worker 通过 Playwright project 确定身份，加载对应的 storageState。

## Playwright 配置

```typescript
// playwright.config.ts
workers: 4,
projects: [
  { name: "w1-superuser", use: { storageState: "e2e/.auth/w1.json" }, testMatch: "e2e/w1/**/*.spec.ts" },
  { name: "w2-student", use: { storageState: "e2e/.auth/w2.json" }, testMatch: "e2e/w2/**/*.spec.ts" },
  { name: "w3-advisor", use: { storageState: "e2e/.auth/w3.json" }, testMatch: "e2e/w3/**/*.spec.ts" },
  { name: "w4-visitor", use: { storageState: "e2e/.auth/w4.json" }, testMatch: "e2e/w4/**/*.spec.ts" },
  { name: "shared", testMatch: "e2e/shared/**/*.spec.ts" },
]
```

## 覆盖率六维度

### 维度 1: API 端点覆盖率

清单文件：`e2e/helpers/api-endpoints.json`（85 个端点）

4 个 worker 的 API 调用合并后对比。各 worker 的端点分工：

| 面板 | 端点数 | 负责 worker |
|------|--------|-------------|
| auth（7） | login/register/refresh/logout/sms-code/public-key/refresh-token-hash | W1+W2+W3+W4 |
| public（12） | config/content/cases/universities | W4 |
| admin/users（7） | list/detail/edit/reset-password/assign-role/force-logout/delete | W1 |
| admin/roles（7） | meta/list/create/reorder/detail/edit/delete | W1 |
| admin/settings（4） | general-settings + web-settings | W1 |
| admin/categories（4） | list/create/edit/delete | W1 |
| admin/articles（4） | list/create/edit/delete | W1 |
| admin/cases（4） | list/create/edit/delete | W1 |
| admin/universities（4） | list/create/edit/delete | W1 |
| admin/students（8） | list/detail/edit/assign-advisor/downgrade/documents | W1+W3 |
| admin/contacts（6） | list/detail/mark/note/history/upgrade | W1+W3 |
| portal/profile（6） | meta/list/edit/password/phone/delete-account | W2 |
| portal/sessions（3） | list/revoke/revoke-all | W2 |
| portal/two-factor（4） | enable-totp/confirm-totp/enable-sms/disable | W2 |
| portal/documents（5） | list/upload/detail/download/delete | W2 |

### 维度 2: 页面路由覆盖率

清单文件：`e2e/helpers/page-routes.json`（33 个路由）

| 页面组 | 路由数 | 负责 worker |
|--------|--------|-------------|
| 公开页面（18） | /、/about、/articles、/news 等 | W4 |
| admin 页面（12） | W1: dashboard/users/roles/articles/categories/cases/universities/settings(×2)/documents; W3: students/contacts/dashboard | W1+W3 |
| portal 页面（3） | /portal/overview 等 | W2 |

### 维度 3: 交互组件覆盖率

清单文件：`e2e/helpers/components.json`

列出所有可交互元素及负责 worker：

```json
[
  { "component": "LoginModal", "elements": ["登录按钮", "tab切换", "用户名输入", "密码输入", "登录提交", "关闭按钮"], "worker": "W2" },
  { "component": "RegisterModal", "elements": ["手机号输入", "验证码输入", "获取验证码", "注册提交"], "worker": "W2" },
  { "component": "UserExpandPanel", "elements": ["状态切换", "角色下拉", "保存角色", "配额输入", "保存配额", "密码重置", "强制登出", "删除用户"], "worker": "W1" },
  { "component": "StudentExpandPanel", "elements": ["激活checkbox", "备注输入", "保存编辑", "顾问分配", "降级按钮", "确认降级"], "worker": "W3" },
  { "component": "ContactExpandPanel", "elements": ["状态下拉", "保存状态", "备注输入", "添加备注", "升级学生", "确认升级"], "worker": "W3" },
  { "component": "ConfigEditDialog", "elements": ["文本输入", "保存", "取消"], "worker": "W1" },
  { "component": "ArticleEditor", "elements": ["标题输入", "内容编辑", "分类选择", "状态切换", "保存"], "worker": "W1" },
  { "component": "RoleDialog", "elements": ["角色名输入", "权限树勾选", "保存"], "worker": "W1" },
  { "component": "CategoryDialog", "elements": ["分类名输入", "slug输入", "保存"], "worker": "W1" },
  { "component": "CaseDialog", "elements": ["学生名输入", "大学输入", "保存"], "worker": "W1" },
  { "component": "UniversityDialog", "elements": ["院校名输入", "国家选择", "保存"], "worker": "W1" },
  { "component": "DocumentUpload", "elements": ["上传按钮", "文件选择"], "worker": "W2" },
  { "component": "DocumentList", "elements": ["分类tab", "列表项"], "worker": "W2" },
  { "component": "ProfileInfo", "elements": ["修改用户名", "修改密码", "修改手机号"], "worker": "W2" },
  { "component": "TwoFactorSettings", "elements": ["启用SMS", "禁用2FA"], "worker": "W2" },
  { "component": "SessionManagement", "elements": ["设备列表", "踢下线按钮"], "worker": "W2" },
  { "component": "UniversitySearch", "elements": ["搜索框", "国家下拉", "重置按钮"], "worker": "W4" },
  { "component": "LocaleSwitcher", "elements": ["语言切换下拉"], "worker": "W4" },
  { "component": "ConsultButton", "elements": ["立即咨询按钮"], "worker": "W4" },
  { "component": "AdminSidebar", "elements": ["所有菜单链接", "返回官网"], "worker": "W1" },
  { "component": "UserSidebar", "elements": ["所有菜单链接", "返回官网"], "worker": "W2" }
]
```

收集方式：测试中操作元素时调用 `trackComponent(component, element)` 记录，teardown 对比清单。

### 维度 4: 安全场景覆盖率

清单文件：`e2e/helpers/security-scenarios.json`

```json
[
  { "category": "JWT", "scenario": "缺失token返回401", "worker": "W4" },
  { "category": "JWT", "scenario": "无效token返回401", "worker": "W4" },
  { "category": "JWT", "scenario": "篡改JWT签名返回401", "worker": "W4" },
  { "category": "JWT", "scenario": "有效token正常访问", "worker": "W1" },
  { "category": "CSRF", "scenario": "POST无X-Requested-With返回403", "worker": "W1" },
  { "category": "CSRF", "scenario": "POST有X-Requested-With正常", "worker": "W1" },
  { "category": "IDOR", "scenario": "用户访问自己文档成功", "worker": "W2" },
  { "category": "IDOR", "scenario": "用户访问他人文档被拒", "worker": "W4" },
  { "category": "IDOR", "scenario": "用户删除他人文档被拒", "worker": "W4" },
  { "category": "跨角色", "scenario": "superuser访问admin成功", "worker": "W1" },
  { "category": "跨角色", "scenario": "student访问admin被拒", "worker": "W2" },
  { "category": "跨角色", "scenario": "visitor访问portal被拒", "worker": "W4" },
  { "category": "跨角色", "scenario": "advisor访问admin/students成功", "worker": "W3" },
  { "category": "跨角色", "scenario": "advisor访问admin/articles被拒", "worker": "W3" },
  { "category": "禁用用户", "scenario": "禁用后API返回401", "worker": "W4" },
  { "category": "禁用用户", "scenario": "启用后恢复访问", "worker": "W4" },
  { "category": "文件上传", "scenario": "合法文件上传成功", "worker": "W2" },
  { "category": "文件上传", "scenario": "超大文件被拒413", "worker": "W2" },
  { "category": "文件上传", "scenario": "无文件请求被拒", "worker": "W2" },
  { "category": "Token轮换", "scenario": "refresh获取新token", "worker": "W2" },
  { "category": "Token轮换", "scenario": "无refresh_token被拒", "worker": "W2" },
  { "category": "Token轮换", "scenario": "伪造refresh_token被拒", "worker": "W2" },
  { "category": "XSS", "scenario": "script标签被转义", "worker": "W1" },
  { "category": "XSS", "scenario": "搜索框XSS不执行", "worker": "W1" },
  { "category": "SQL注入", "scenario": "登录注入返回正常错误", "worker": "W1" },
  { "category": "SQL注入", "scenario": "搜索参数注入安全", "worker": "W1" },
  { "category": "输入验证", "scenario": "空body返回422", "worker": "W1" },
  { "category": "输入验证", "scenario": "无效JSON返回422", "worker": "W1" },
  { "category": "输入验证", "scenario": "超长字符串不500", "worker": "W1" },
  { "category": "路径穿越", "scenario": "文档下载路径穿越被拒", "worker": "W2" }
]
```

收集方式：测试中验证安全场景时调用 `trackSecurity(category, scenario)` 记录，teardown 对比清单。

### 维度 5: 正反例

每个测试目标至少 2 正例 + 2 反例。正反例通过多 worker 角色自然产生：

| 操作 | 正例 | 反例 |
|------|------|------|
| 访问 admin/users | W1 superuser → 200 | W2 student → 403, W4 visitor → 重定向 |
| 上传文档 | W2 student → 201 | W4 visitor → 401 |
| 查看学生文档 | W3 advisor → 200 | W4 visitor → 403 |
| 修改个人资料 | W2 自己修改 → 200 | W4 访问 W2 资料 → 403/404 |
| 公开页面 | W4 visitor → 200 | — （公开页面无反例需求） |

### 维度 6: 通过率

**0 failed, 0 skipped, 0 flaky**

- 不使用 `test.skip`，如果功能不存在则测试不应存在
- 不依赖 retry 通过，超时问题通过预热和合理超时解决
- 信号超时设为 30s，足够覆盖最慢操作

## 测试目录结构

```text
frontend/e2e/
├── w1/                              # superuser 测试（~45 tests）
│   ├── 01-setup.spec.ts             # 等待注册 → 赋权 → 创建数据
│   ├── 02-admin-crud.spec.ts        # 文章/案例/院校/分类 CRUD
│   ├── 03-role-management.spec.ts   # 角色 CRUD/权限树/排序
│   ├── 04-user-management.spec.ts   # 用户搜索/展开面板/状态切换/配额/密码/强制登出
│   ├── 05-settings.spec.ts          # 通用设置/网站设置/ConfigEditDialog
│   ├── 06-security.spec.ts          # CSRF/XSS/SQL注入/输入验证
│   ├── 07-sidebar-navigation.spec.ts # 侧边栏/页面导航/仪表盘
│   └── 08-disable-delete.spec.ts    # 禁用/启用/删除用户（最后执行）
├── w2/                              # student 测试
│   ├── 01-register.spec.ts          # 自注册 → 等待赋权
│   ├── 02-portal-profile.spec.ts    # 个人资料/修改用户名/密码/手机号
│   ├── 03-documents.spec.ts         # 文档上传/列表/分类
│   ├── 04-two-factor.spec.ts        # 2FA 启用/禁用
│   ├── 05-sessions.spec.ts          # 登录设备/踢下线
│   ├── 06-permission.spec.ts        # 权限正例（portal）/反例（admin）
│   ├── 07-security.spec.ts          # Token轮换/文件上传安全/路径穿越/IDOR
│   └── 08-portal-navigation.spec.ts # portal 侧边栏/导航
├── w3/                              # advisor 测试（~30 tests）
│   ├── 01-register.spec.ts          # 自注册 → 等待赋权
│   ├── 02-student-management.spec.ts # 学生列表/展开面板（checkbox/备注/顾问分配/降级）
│   ├── 03-student-documents.spec.ts # 查看学生文档列表
│   ├── 04-contacts.spec.ts          # 联系人列表/展开面板（状态/备注/升级/历史）
│   ├── 05-permission.spec.ts        # 权限正例（students/contacts）/反例（articles/users）
│   └── 06-sidebar-navigation.spec.ts # advisor 侧边栏/仪表盘
├── w4/                              # visitor 测试
│   ├── 01-register.spec.ts          # 自注册 → 等待角色分配完成
│   ├── 02-public-pages.spec.ts      # 公开页面全覆盖（18 个路由）
│   ├── 03-public-detail.spec.ts     # 文章/案例/院校详情页
│   ├── 04-search-filter.spec.ts     # 院校搜索/筛选/语言切换
│   ├── 05-permission.spec.ts        # 权限反例（admin/portal 全拒绝）
│   ├── 06-security-jwt.spec.ts      # JWT 缺失/无效/篡改
│   ├── 07-idor.spec.ts              # IDOR 越权访问
│   └── 08-disabled.spec.ts          # 被禁用/重新启用
├── shared/                          # 不分 worker 的共享测试
│   └── auth-flow.spec.ts            # 登录弹窗/tab切换/登出（用独立上下文）
├── helpers/
│   ├── signal.ts                    # Worker 间信号通信
│   ├── sms.ts                       # SMS 验证码
│   ├── seed.ts                      # 数据创建
│   ├── api-endpoints.json           # API 端点清单
│   ├── page-routes.json             # 页面路由清单
│   ├── components.json              # 交互组件清单
│   └── security-scenarios.json      # 安全场景清单
├── fixtures/
│   └── base.ts                      # 覆盖率收集 + trackComponent/trackSecurity
├── global-setup.ts                  # e2e_test_superuser 登录 + 预热 + 清理信号
└── global-teardown.ts               # 清理 E2E 数据 + 信号 + 六维度覆盖率报告
```

## global-teardown 覆盖率报告输出

```text
[API Coverage] 85/85 (100.0%)
[Route Coverage] 33/33 (100.0%)
[Component Coverage] 21/21 components, 87/87 elements (100.0%)
[Security Coverage] 30/30 scenarios (100.0%)
[Test Results] 0 failed, 0 skipped, 0 flaky

✅ 六维度覆盖率全部 100%
```

## global-teardown 清理

- 用 W1 的 storageState 删除所有 `E2E-` 开头的用户和数据
- 清理信号文件 `/tmp/e2e-signals/`
- 合并四个 worker 的覆盖率数据
- 输出六维度覆盖率报告
- 清理 `.coverage/` 目录

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `frontend/e2e/helpers/signal.ts` |
| 新建 | `frontend/e2e/helpers/components.json` |
| 新建 | `frontend/e2e/helpers/security-scenarios.json` |
| 新建 | `frontend/e2e/w1/*.spec.ts`（8 个） |
| 新建 | `frontend/e2e/w2/*.spec.ts`（8 个） |
| 新建 | `frontend/e2e/w3/*.spec.ts`（6 个） |
| 新建 | `frontend/e2e/w4/*.spec.ts`（8 个） |
| 新建 | `frontend/e2e/shared/*.spec.ts`（1 个） |
| 重写 | `frontend/e2e/global-setup.ts` |
| 重写 | `frontend/e2e/global-teardown.ts` |
| 重写 | `frontend/e2e/playwright.config.ts` |
| 重写 | `frontend/e2e/fixtures/base.ts` |
| 修改 | `backend/scripts/init/seed_user.py`（已完成） |
| 删除 | `frontend/e2e/admin/*.spec.ts`（迁移到 w1/） |
| 删除 | `frontend/e2e/portal/*.spec.ts`（迁移到 w2/） |
| 删除 | `frontend/e2e/public/*.spec.ts`（迁移到 w4/） |
| 删除 | `frontend/e2e/auth/*.spec.ts`（迁移到 shared/） |
| 删除 | `frontend/e2e/layout/*.spec.ts`（迁移到 w1/） |
| 删除 | `frontend/e2e/cross-navigation.spec.ts`（迁移） |
| 删除 | `frontend/e2e/permission-guard.spec.ts`（迁移） |
