## 测试规范

### 测试层级

每个功能改动必须覆盖以下五层测试：

| 层级 | 工具 | 目标 | 位置 |
|------|------|------|------|
| 单元测试（后端） | pytest + mock | Service 层逻辑 | `backend/api/tests/{panel}/{domain}[/{sub}]/test_service.py` |
| 接口测试（后端） | pytest + httpx | 直连 API 容器的接口测试 | `backend/api/tests/{panel}/{domain}[/{sub}]/test_router.py` |
| 网关集成测试（后端） | pytest + httpx | 通过网关的完整链路测试 | `backend/api/tests/e2e/test_*.py` |
| 单元测试（前端） | Vitest + RTL | 组件渲染、交互、hooks | `frontend/src/**/*.test.tsx` |
| E2E 测试（前端） | Playwright | 浏览器端用户交互流程 | `frontend/e2e/**/*.spec.ts` |

### 测试执行环境

- 所有测试在**容器外**运行（宿主机）
- 单元测试：mock 依赖，不需要容器
- 后端接口测试（httpx）：直连 API 容器 `http://localhost:8000/api`（开发环境已暴露 8000 端口），不走网关
- 网关集成测试（httpx）：通过网关 `http://localhost/api` 走完整链路（JWT 验签、CSRF、限流、请求头注入）
- 前端 E2E 测试（Playwright）：通过网关 `http://localhost` 走完整链路

### 测试验证流程

功能开发完成后按以下顺序验证：

| 阶段 | 目标 | 命令 |
|------|------|------|
| 1. 后端单元测试 | mock 验证逻辑 | `uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e` |
| 2. 后端接口测试 | `localhost:8000` 直连 API | `uv run --project backend/api python -m pytest backend/api/tests/ -v -m api` |
| 3. 后端网关测试 | `localhost:80` 走 gateway | `uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v` |
| 4. 前端 E2E（本地） | `localhost` 生产容器 | `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts` |
| 5. 前端 E2E（线上） | 部署后验证 | `BASE_URL=http://REDACTED_HOST INTERNAL_SECRET=<密钥> pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts` |

- 本地前端 E2E 使用生产构建的容器（速度快、行为一致）
- 线上 E2E 在部署后执行，验证生产环境实际行为

### 测试覆盖要求

- 代码测试覆盖率必须达到 **100%**
- **接口测试覆盖率 100%**：每个 API 接口必须有正向测试 + 反向测试（异常/边界/权限拒绝等）
- 每个 service 方法必须有对应的单元测试
- **每个测试目标至少 2 个正例 + 2 个反例**（正例验证功能正确，反例验证异常/边界/拒绝）

### 覆盖率统计

所有覆盖率指标目标 **100%**。

| 维度 | 工具 | 清单文件 | 命令 |
|------|------|----------|------|
| 后端代码 | `pytest-cov`（行级） | — | `uv run --project backend/api python -m pytest --cov=api --cov-report=term-missing` |
| 前端代码 | `@vitest/coverage-v8` | — | `pnpm --prefix frontend test --coverage` |
| API 端点 | fixture 拦截 | `e2e/helpers/api-endpoints.json` | E2E 跑完自动输出 |
| 页面路由 | fixture 拦截 | `e2e/helpers/page-routes.json` | E2E 跑完自动输出 |
| 交互组件 | fixture 拦截 | `e2e/helpers/components.json` | E2E 跑完自动输出 |
| 安全场景 | fixture 拦截 | `e2e/helpers/security-scenarios.json` | E2E 跑完自动输出 |
| JS 代码 | `page.coverage` + istanbul | — | `E2E_COVERAGE=1` 时启用 |

覆盖率清单文件使用 JSON 格式，`global-teardown` 直接 `JSON.parse` 读取，与测试运行时收集的数据对比输出未覆盖项。

#### 覆盖率六维度

1. **API 端点**：后端每个 router 端点必须被 E2E 触发
2. **页面路由**：前端每个 `page.tsx` 路由必须被访问
3. **交互组件**：每个可交互元素（按钮、输入框、下拉框、checkbox、tab、弹窗、展开面板）必须被操作
4. **安全场景**：JWT 篡改/过期/缺失、IDOR 越权、跨角色访问、禁用用户、文件上传安全、Token 轮换
5. **正反例**：每个测试目标至少 2 正例 + 2 反例
6. **通过率**：0 failed, 0 skipped, 0 flaky（首次就通过，不依赖 retry）

### 后端单元测试

- 使用 `unittest.mock.patch` 模拟依赖
- 测试目录按面板/域组织，与源码结构对应
- mock patch 路径需匹配被测模块内的引用：`"api.{panel}.{domain}.service.repository"`
- 运行命令：`uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e`

### 后端接口测试

- 通过 `http://localhost:8000/api` 直连 API 容器发送真实 HTTP 请求，不走网关
- 通过手动设置请求头模拟网关注入的用户信息（`X-User-Id`、`X-User-Permissions`、`X-User-Type`、`X-Is-Superuser`）
- 可精确控制不同权限组合，验证行级安全策略
- 标记 `@pytest.mark.api`
- 运行命令：`uv run --project backend/api python -m pytest backend/api/tests/ -v -m api`

### 网关集成测试

- 通过 `http://localhost/api`（网关）发送真实 HTTP 请求，验证完整链路
- 使用 `superuser_client` fixture 获取已认证的 httpx 客户端
- 覆盖认证流程、JWT 验签、CSRF 校验、权限拦截
- 标记 `@pytest.mark.e2e`
- 运行命令：`uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v`

### 前端单元测试

- 使用 Vitest + React Testing Library
- 测试 React 组件的渲染、交互、状态变化
- 测试自定义 hooks 和工具函数
- 测试文件与源码同目录：`ComponentName.test.tsx` 或 `utils.test.ts`
- 运行命令：`pnpm --prefix frontend test`

### 前端 E2E 测试

- 使用 Playwright + `adminPage` fixture（已登录的管理员页面）
- 使用 `gotoAdmin`、`clickAndWaitDialog` 等项目自定义辅助函数
- 配置文件：`frontend/e2e/playwright.config.ts`
- fixture 文件：`frontend/e2e/fixtures/base.ts`（基础）、`frontend/e2e/fixtures/coverage.ts`（覆盖率收集）
- 默认 2 worker 并发执行
- 运行命令（本地）：`pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts`
- 运行命令（线上）：`BASE_URL=http://REDACTED_HOST INTERNAL_SECRET=<密钥> pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts`
- 线上环境超时自动增大（`actionTimeout` 5s→15s，`navigationTimeout` 15s→30s）
- `INTERNAL_SECRET` 通过 cookie 传递，跳过网关限流和短信发送

#### 覆盖标准

每个前端页面的 E2E 测试必须覆盖以下三类：

1. **后端端点触发**：页面涉及的每个后端 API 调用，至少有一个测试通过 UI 操作触发该请求
2. **用户交互操作**：页面上每个可交互元素（按钮、输入框、下拉框、checkbox、tab、弹窗、展开面板等）至少被操作一次
3. **跨页面状态一致性**：不同页面/面板之间切换后状态正确（路由守卫、数据隔离、侧边栏高亮）

#### 测试分类

| 类型 | 说明 | 示例 |
|------|------|------|
| 端点覆盖 | 通过 UI 操作触发后端 API | 点击创建按钮 → 填表 → 保存 → 验证列表刷新 |
| 交互覆盖 | 验证 UI 元素可操作 | tab 切换、弹窗打开/关闭、展开/收起、拖拽排序 |
| 正向测试 | 操作成功的完整流程 | 创建 → 列表出现新数据 → 编辑 → 数据变更 → 删除 → 数据消失 |
| 反向测试 | 错误/边界/权限拒绝 | 空表单提交不关闭弹窗、未登录重定向、无权限 403 |
| 交叉测试 | 页面间快速切换 | admin→portal→admin 切换后数据正确 |

#### 测试约定

- E2E 创建的数据以 `E2E` 开头，`global-teardown.ts` 负责清理
- 不修改/删除种子数据（superuser、预设角色等）
- 未登录测试使用 `test.use({ storageState: { cookies: [], origins: [] } })`
- 展开面板是行内渲染（非 dialog），用 `getByText("基本信息").waitFor()` 等待加载
- **禁止使用 `waitForTimeout` 作为主要等待手段**，优先使用条件等待：
  - 等待元素：`await page.locator("main").waitFor()` 或 `await expect(el).toBeVisible()`
  - 等待弹窗：`await expect(page.getByRole("dialog")).toBeVisible()`
  - 等待导航：`await page.waitForURL(/pattern/)`
  - 等待 API：`await page.waitForResponse(r => r.url().includes("/list"))`
  - 搜索防抖：允许 `waitForTimeout(500)`（唯一合理场景）

#### E2E 覆盖率统计

每次跑完 E2E 自动输出三种覆盖率：

| 指标 | 基准 | 收集方式 |
|------|------|----------|
| API 端点覆盖率 | 后端 73 个端点 | `page.on("response")` 拦截 API 请求 |
| 页面路由覆盖率 | 前端 35 个路由 | `page.on("framenavigated")` 拦截导航 |
| JS 代码覆盖率 | V8 Coverage | `page.coverage` API（`E2E_COVERAGE=1` 时启用） |

覆盖率数据在 `global-teardown` 中汇总输出。端点清单在 `helpers/api-endpoints.ts`，路由清单在 `helpers/page-routes.ts`。

#### E2E 测试目录结构

```text
frontend/e2e/
├── fixtures/
│   ├── base.ts              # adminPage fixture, gotoAdmin, clickAndWaitDialog
│   └── coverage.ts          # 覆盖率收集 fixture
├── helpers/
│   ├── sms.ts               # SMS 验证码获取（cookie 传 INTERNAL_SECRET）
│   ├── api-endpoints.ts     # 后端全量端点清单
│   └── page-routes.ts       # 前端全量路由清单
├── global-setup.ts           # 登录 + 种子数据 + 预热
├── global-teardown.ts        # 清理 E2E 数据 + 覆盖率报告
├── playwright.config.ts      # 2 worker, 线上自动增大超时
├── auth/                     # 认证流程（登录弹窗、tab 切换、退出）
├── public/                   # 公开页面（导航、ConsultButton、语言切换）
├── admin/                    # 管理面板（每个模块一个 spec）
├── portal/                   # 用户面板（profile、sessions、documents）
├── cross-navigation.spec.ts  # 路径乱序交叉测试
└── permission-guard.spec.ts  # 权限拦截测试
```

### 测试目录结构

```text
backend/api/tests/
├── conftest.py
├── auth/
│   ├── test_router.py
│   └── test_service.py
├── public/
│   ├── config/
│   │   ├── test_router.py
│   │   └── test_service.py
│   ├── content/
│   ├── case/
│   └── university/
├── admin/
│   ├── user/
│   ├── rbac/
│   ├── config/
│   ├── content/
│   ├── case/
│   ├── university/
│   ├── students/
│   └── contacts/
├── portal/
│   ├── profile/
│   │   ├── sessions/
│   │   └── two_factor/
│   └── document/
└── e2e/                         # 网关集成测试
```

### 测试文件命名

- 按模块命名：`test_router.py`、`test_service.py`
- 目录层级已区分面板和域，文件名无需再加前缀

### 新增功能的测试清单

新增后端接口时：
1. `tests/{panel}/{domain}/test_service.py` 中添加 service 单元测试
2. `tests/{panel}/{domain}/test_router.py` 中添加接口测试（直连 API，正向 + 反向）
3. `tests/e2e/` 中添加通过网关的集成测试

新增/修改前端组件时：
1. 如涉及用户可见的交互变化，更新或新增 `frontend/e2e/` 下的 Playwright 测试
2. 测试应覆盖：正向操作、边界情况、错误提示

### 禁止项

- 禁止跳过已有测试（除非有明确原因并注释说明）
- 禁止降低测试覆盖率
- 新增接口/组件不写测试视为未完成