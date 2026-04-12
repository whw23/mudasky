## 测试规范

### 测试层级

每个功能改动必须覆盖以下三层测试：

| 层级 | 工具 | 目标 | 位置 |
|------|------|------|------|
| 单元/集成测试（后端） | pytest + mock | Router/Service 层逻辑 | `backend/api/tests/test_*.py` |
| E2E 测试（后端） | pytest + httpx | 通过网关的完整 API 流程 | `backend/api/tests/e2e/test_*.py` |
| E2E 测试（前端） | Playwright | 浏览器端用户交互流程 | `frontend/e2e/**/*.spec.ts` |

### 后端单元/集成测试

- 使用 `unittest.mock.patch` 模拟依赖
- 每个 Router 端点至少一个正向测试 + 一个异常测试
- 测试文件与源码结构对应：`src/app/rbac/router.py` → `tests/test_rbac_router.py`
- 运行命令：`uv run --project backend/api python -m pytest backend/api/tests/test_*.py -v`

### 后端 E2E 测试

- 通过 `http://localhost`（网关）发送真实 HTTP 请求
- 使用 `superuser_client` fixture 获取已认证的 httpx 客户端
- 标记 `@pytest.mark.e2e`
- 覆盖认证、权限校验、完整数据流
- 运行命令：`uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v`

### 前端 E2E 测试

- 使用 Playwright + `adminPage` fixture（已登录的管理员页面）
- 测试完整用户交互流程（导航、填表、提交、验证结果）
- 使用 `gotoAdmin`、`clickAndWaitDialog` 等项目自定义辅助函数
- 配置文件：`frontend/e2e/playwright.config.ts`
- fixture 文件：`frontend/e2e/fixtures/base.ts`
- 运行命令：`pnpm --prefix frontend exec playwright test`

### 新增功能的测试清单

新增后端接口时：
1. `test_*.py` 中添加 mock 测试（正向 + 异常）
2. `tests/e2e/test_*.py` 中添加通过网关的真实请求测试

新增/修改前端组件时：
1. 如涉及用户可见的交互变化，更新或新增 `frontend/e2e/` 下的 Playwright 测试
2. 测试应覆盖：正向操作、边界情况、错误提示

### 禁止项

- 禁止跳过已有测试（除非有明确原因并注释说明）
- 禁止降低测试覆盖率
- 新增接口/组件不写测试视为未完成
