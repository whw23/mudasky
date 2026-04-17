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

- 所有测试在**容器外**运行（宿主机 WSL）
- 后端测试（1-3）使用**开发容器**（`docker compose up`）：
  - 单元测试：mock 依赖，不需要连接容器
  - 接口测试（httpx）：直连 API 容器 `http://localhost:8000/api`（开发环境已暴露 8000 端口），不走网关
  - 网关集成测试（httpx）：通过网关 `http://localhost/api` 走完整链路（JWT 验签、CSRF、限流、请求头注入）
- 前端 E2E 测试（4）使用**生产构建容器**（`docker compose -f docker-compose.yml up`）：
  - 通过网关 `http://localhost` 走完整链路
  - 生产构建的行为与线上一致（standalone 模式、代码混淆）

### 测试验证流程

功能开发完成后按以下顺序验证：

| 阶段 | 目标 | 命令 |
|------|------|------|
| 1. 后端单元测试 | mock 验证逻辑 | `uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e` |
| 2. 后端接口测试 | `localhost:8000` 直连 API | `uv run --project backend/api python -m pytest backend/api/tests/ -v -m api` |
| 3. 后端网关测试 | `localhost:80` 走 gateway | `uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v` |
| 4. 前端 E2E（本地） | `localhost` 生产构建容器 | `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts` |
| 5. 前端 E2E（线上） | 部署后验证 | `BASE_URL=http://${PRODUCTION_HOST} INTERNAL_SECRET=<密钥> pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts` |

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

- 使用 Playwright + 任务队列调度框架
- 配置文件：`frontend/e2e/playwright.config.ts`
- 7 个 worker，每个角色一个，通过前置条件非阻塞调度
- Worker 角色：W1=superuser、W2=student、W3=advisor、W4=visitor、W5=content_admin、W6=support、W7=破坏性测试
- 所有操作通过 UI 执行，禁止直接调 API
- `INTERNAL_SECRET` 通过 cookie 传递，跳过短信发送（在注册/登录 fn 内部自动设置）
- 运行命令（本地）：`pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts`
- 运行命令（线上）：`TEST_ENV=production pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts`
- 重跑失败：`LAST_NOT_PASS=1 pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts`
- env 文件切换：`TEST_ENV=production` 加载 `env/production.env`，默认加载 `env/backend.env`

#### 任务调度模型

每个任务声明前置条件，worker 循环遍历找能做的任务：
1. 遍历自己的任务，找前置条件已满足的 → 执行
2. 自己的任务做完了 → 查看 backupWorkers 包含自己的其他任务 → 抢占执行
3. 没有能做的 → sleep(2s) → 重新遍历
4. 所有任务完成/熔断 → 退出
5. 总超时 10 分钟，超时后 pending 任务标记 timeout

#### 信号机制

任务完成后写信号文件（`/tmp/e2e-signals/{taskId}.json`），后续任务通过检查信号文件判断前置条件。
- 使用 `wx`（O_CREAT | O_EXCL）原子创建，防止竞态
- 信号文件 + API 验证双保险

#### 熔断机制

按前置条件链传播，区分直接失败（fail）和熔断失败（breaker）：
- 任务执行失败 → status: "fail"
- 依赖失败任务的后续任务 → status: "breaker"
- 级联传播，breaker 和 fail 都算失败，不重试

#### 正向 + 反向测试

每个 worker 同时做正向和反向测试：
- 正向：自己有权限的功能正常使用
- 反向：自己没权限的功能被正确拒绝（401/403/重定向）

#### 覆盖率

从任务定义的 `coverage` 声明汇总，四维度：

| 维度 | 收集方式 |
|------|----------|
| API 端点 | 自动：`page.on("response")` 拦截 |
| 页面路由 | 自动：`page.on("framenavigated")` 拦截 |
| 组件交互 | 手动：任务 coverage.components 声明 |
| 安全场景 | 手动：任务 coverage.security 声明 |

覆盖率计算脚本在 `framework/coverage.ts`，global-teardown 中执行。

#### 测试约定

- E2E 创建的数据以 `E2E` 开头，`global-teardown.ts` 负责清理（含 W2-W7 账号）
- 不修改/删除种子数据（superuser、预设角色等）
- W7 使用临时账号做破坏性测试，不影响 W1-W6 的 auth state
- **禁止使用 `waitForTimeout` 作为主要等待手段**，优先使用条件等待
- **禁止直接调 API**，所有操作通过 UI
- 无效路由（如 `/portal/articles`）作为 404 反向测试

#### 测试结果

```
[Test Results] 230 pass / 1 fail / 3 breaker / 0 timeout (total: 234)
```

- 0 failed（含 breaker 和 timeout）为通过标准
- 不重试，首次通过
- 四维度覆盖率 100%

#### E2E 测试目录结构

```text
frontend/e2e/
├── framework/
│   ├── types.ts             # Task, Signal 类型定义
│   ├── runner.ts            # 任务队列调度器
│   ├── signal.ts            # 信号文件读写（原子写入）
│   └── coverage.ts          # 覆盖率计算脚本
├── fns/                     # fn 实现，每个功能一个文件（多 worker 共用）
├── w1/tasks.ts              # superuser 任务声明
├── w2/tasks.ts              # student 任务声明
├── w3/tasks.ts              # advisor 任务声明
├── w4/tasks.ts              # visitor 任务声明
├── w5/tasks.ts              # content_admin 任务声明
├── w6/tasks.ts              # support 任务声明
├── w7/tasks.ts              # 破坏性测试任务声明
├── runner.spec.ts           # 通用 spec，7 个 project 共享
├── global-setup.ts          # 清理信号/熔断 + 预热
├── global-teardown.ts       # 结果汇总 + 覆盖率 + 清理数据
└── playwright.config.ts     # 7 worker, 无 dependencies
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