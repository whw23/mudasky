# E2E 测试设计

## 背景

当前所有后端测试均为单元测试（mock 数据库），前端测试为 jsdom 环境。缺少经过完整链路（gateway → API → DB）的端到端测试，无法验证：

- OpenResty Lua 认证中间件是否正确处理 Cookie/CSRF
- 网关注入的 `X-User-Id`、`X-User-Permissions` 等 headers 是否正确
- 数据库实际读写是否符合预期
- 各模块间的集成行为

## 方案

### 技术选型

- **测试框架**：pytest + pytest-asyncio
- **HTTP 客户端**：httpx.AsyncClient（内置 cookie jar，自动管理 Cookie）
- **测试入口**：通过 `http://localhost`（gateway:80）发请求，走完整链路
- **前置条件**：容器已通过 `./scripts/dev.sh` 启动并健康
- **pytest marker**：使用 `@pytest.mark.e2e` 标记，支持 `pytest -m e2e` 或 `pytest -m "not e2e"` 选择性执行

### 架构

```
pytest (本地)
    │  HTTP via httpx
    ▼
gateway:80 (OpenResty)
    │  Lua auth → Cookie 解析 → 注入 X-User-* headers
    │  CSRF: mutation 请求需 X-Requested-With header
    │  refresh_token cookie Path=/api/auth/refresh（路径限定）
    ▼
api:8000 (FastAPI)
    │  业务逻辑
    ▼
db:5432 (PostgreSQL)
```

### 目录结构

```
backend/api/tests/e2e/
├── conftest.py          # e2e 专用 fixtures（独立于单元测试 conftest）
├── test_health.py       # 健康检查
├── test_auth.py         # 注册/登录/刷新/短信验证码
├── test_user.py         # 个人信息/密码/手机号
├── test_content.py      # 文章/分类 CRUD（公开+认证+管理员）
├── test_document.py     # 文档上传/下载/删除
├── test_config.py       # 配置读取（公开）/管理（admin）
├── test_rbac.py         # 权限/权限组 CRUD
├── test_admin.py        # 用户管理（管理员操作）
├── test_case.py         # 成功案例 CRUD
└── test_university.py   # 院校信息 CRUD
```

注意：`tests/e2e/conftest.py` 完全独立，不继承 `tests/conftest.py` 中的 mock fixtures。

### conftest.py 核心 fixtures

```python
import httpx
import pytest

E2E_BASE_URL = "http://localhost"
CSRF_HEADER = {"X-Requested-With": "XMLHttpRequest"}


@pytest.fixture(scope="session")
async def wait_for_healthy():
    """session 级别：轮询 /api/health 直到服务就绪。"""
    async with httpx.AsyncClient(base_url=E2E_BASE_URL) as client:
        for _ in range(30):
            try:
                resp = await client.get("/api/health")
                if resp.status_code == 200:
                    return
            except httpx.ConnectError:
                pass
            await asyncio.sleep(1)
        pytest.fail("容器未就绪：/api/health 超时")


@pytest.fixture
async def anon_client(wait_for_healthy):
    """未认证的 client（不带 CSRF header，用于测试公开接口和 401/CSRF 场景）。"""
    async with httpx.AsyncClient(base_url=E2E_BASE_URL) as client:
        yield client


@pytest.fixture
async def e2e_client(wait_for_healthy):
    """未认证但带 CSRF header 的 client。"""
    async with httpx.AsyncClient(
        base_url=E2E_BASE_URL,
        headers=CSRF_HEADER,
    ) as client:
        yield client


@pytest.fixture
async def superuser_client(e2e_client):
    """已用超级管理员登录的 client。"""
    resp = await e2e_client.post("/api/auth/login", json={
        "username": "mudasky",
        "password": "mudasky@12321.",
    })
    assert resp.status_code == 200
    yield e2e_client


@pytest.fixture
async def regular_user_client(e2e_client, superuser_client):
    """已注册并登录的普通用户 client（用于测试 403 场景）。"""
    # 通过 SMS 注册流程创建普通用户
    # 测试结束后通过 admin API 清理
    ...
```

### 关键设计决策

1. **CSRF header 默认包含**：`e2e_client` 和 `superuser_client` 默认带 `X-Requested-With: XMLHttpRequest`，避免所有 mutation 请求被 403。`anon_client` 不带，用于测试 CSRF 防护。

2. **refresh_token 路径限定**：gateway 设置 `refresh_token` cookie 时指定 `Path=/api/auth/refresh`，httpx 的 cookie jar 会正确处理——只在请求 `/api/auth/refresh` 时发送该 cookie。

3. **服务就绪等待**：`wait_for_healthy` 是 session 级 fixture，在所有测试开始前轮询 `/api/health`，最多等待 30 秒。

4. **普通用户 fixture**：`regular_user_client` 通过 API 注册新用户，用于测试权限不足（403）的场景。测试结束后通过 admin API 删除。

5. **与单元测试隔离**：e2e 的 conftest.py 在 `tests/e2e/` 目录下，不会继承 `tests/conftest.py` 的 mock fixtures。

### 测试策略

每个模块覆盖：

1. **正向 CRUD 流程**：创建 → 查询 → 更新 → 删除
2. **权限控制**：`anon_client`（未登录）→ 401，`regular_user_client`（无权限）→ 403
3. **公开接口**：`anon_client` 不带 cookie 能正常访问
4. **CSRF 防护**：`anon_client` 发 mutation 请求（无 `X-Requested-With`）返回 403

### 测试数据管理

- 利用预置数据（superuser、分类、配置）作为基础
- 测试创建的数据在测试内通过 DELETE 接口清理
- 各模块测试独立，每个测试文件自行登录（通过 fixture），不依赖执行顺序
- 测试失败导致数据残留时，重新运行 `./scripts/dev.sh --clean` 可重置数据库

### 运行方式

```bash
# 1. 启动容器
./scripts/dev.sh

# 2. 等容器健康后运行 e2e
cd backend/api && uv run pytest tests/e2e/ -v

# 仅跑单个模块
uv run pytest tests/e2e/test_auth.py -v

# 排除 e2e 只跑单元测试
uv run pytest -m "not e2e" -v
```

## 端点覆盖清单

| 模块 | 端点数 | 测试覆盖 |
|------|--------|---------|
| health | 1 | GET /api/health |
| auth | 5 | sms-code, register, login, refresh, refresh-token-hash |
| user | 8 | me, password, phone, 2fa (totp/sms enable/confirm/disable) |
| content | 10 | 公开文章列表/详情, 分类列表, 我的文章, CRUD, admin CRUD |
| document | 5 | upload, list, detail, download, delete |
| config | 3 | 公开读取, admin 列表, admin 更新 |
| rbac | 7 | permissions, categories, groups CRUD |
| admin | 7 | users list/detail/update/type/password/groups/tokens |
| case | 5 | 公开列表/详情, admin CRUD |
| university | 6 | 公开列表/国家/详情, admin CRUD |
| **合计** | **57** | |
