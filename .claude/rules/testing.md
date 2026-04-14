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

### 测试覆盖要求

- 代码测试覆盖率必须达到 **90% 以上**
- **接口测试覆盖率 100%**：每个 API 接口必须有正向测试 + 反向测试（异常/边界/权限拒绝等）
- 每个 service 方法必须有对应的单元测试
- 使用 `pytest-cov` 检查覆盖率：`uv run --project backend/api python -m pytest --cov=api --cov-report=term-missing`

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
- 测试完整用户交互流程（导航、填表、提交、验证结果）
- 使用 `gotoAdmin`、`clickAndWaitDialog` 等项目自定义辅助函数
- 配置文件：`frontend/e2e/playwright.config.ts`
- fixture 文件：`frontend/e2e/fixtures/base.ts`
- 禁止并发执行，单线程串行运行（宿主机压力大）
- 运行命令：`pnpm --prefix frontend exec playwright test --workers=1`

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