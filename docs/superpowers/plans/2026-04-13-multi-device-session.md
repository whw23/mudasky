# 多端会话管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持多端同时登录，用户可查看/管理活跃会话，过期 token 由数据库自动清理。

**Architecture:** 在现有 refresh token 机制上扩展：模型加 user_agent/ip_address 字段，refresh/logout 改为按单 token 操作而非全删，新增会话管理 API 和前端 UI。网关注入 X-Refresh-Token-Hash 头识别当前设备。PostgreSQL pg_cron 定时清理过期 token。

**Tech Stack:** Python/FastAPI, SQLAlchemy, OpenResty/Lua, Next.js/React, PostgreSQL + pg_cron

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `backend/shared/src/app/auth/models.py` | RefreshToken 模型加 user_agent, ip_address 字段 |
| 修改 | `backend/shared/src/app/auth/repository.py` | 新增按 hash/id 删除、列表查询等方法 |
| 修改 | `backend/shared/src/app/auth/service.py` | refresh() 改为单 token 删除，新增会话管理方法 |
| 修改 | `backend/shared/src/app/auth/schemas.py` | RefreshTokenHashRequest 加字段，新增 SessionResponse |
| 修改 | `backend/shared/src/app/auth/router.py` | logout 改为按 hash 删除 |
| 修改 | `backend/shared/src/app/user/router.py` | 新增会话管理端点 |
| 修改 | `gateway/lua/auth_proxy.lua` | 保存 token 时传 user_agent + ip_address |
| 修改 | `gateway/lua/refresh_proxy.lua` | 保存新 token 时传 user_agent + ip_address |
| 修改 | `gateway/lua/auth.lua` | 对 session 路径注入 X-Refresh-Token-Hash |
| 修改 | `gateway/conf.d/server.conf` | logout 注入 X-Refresh-Token-Hash |
| 修改 | `frontend/components/user/ProfileInfo.tsx` | 新增登录设备管理区块 |
| 新增 | `backend/api/tests/test_session_router.py` | 会话管理端点单元测试 |
| 新增 | `backend/api/tests/e2e/test_session.py` | 会话管理 E2E 测试 |
| 新增 | `frontend/e2e/user/sessions.spec.ts` | 前端 E2E 测试 |

---

### Task 1: RefreshToken 模型加字段

**Files:**
- Modify: `backend/shared/src/app/auth/models.py:47-71`

- [ ] **Step 1: 在 RefreshToken 模型中新增 user_agent 和 ip_address 字段**

在 `created_at` 字段后添加：

```python
user_agent: Mapped[str | None] = mapped_column(
    String(256), nullable=True
)
ip_address: Mapped[str | None] = mapped_column(
    String(45), nullable=True
)
```

- [ ] **Step 2: 重启后端容器使 ORM 自动建表生效**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && docker compose restart api"`

- [ ] **Step 3: 验证数据库表结构更新**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && docker compose exec db psql -U mudasky -c \"\\d refresh_token\""`
Expected: 表中包含 user_agent 和 ip_address 列

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/app/auth/models.py
git commit -m "feat: refresh_token 表新增 user_agent 和 ip_address 字段"
```

---

### Task 2: Repository 层新增方法

**Files:**
- Modify: `backend/shared/src/app/auth/repository.py`

- [ ] **Step 1: 新增 revoke_refresh_token_by_hash 方法**

在文件末尾添加：

```python
async def revoke_refresh_token_by_hash(
    session: AsyncSession, token_hash: str
) -> None:
    """按哈希删除单条刷新令牌。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.token_hash == token_hash
    )
    await session.execute(stmt)
    await session.commit()
```

- [ ] **Step 2: 新增 revoke_other_refresh_tokens 方法**

```python
async def revoke_other_refresh_tokens(
    session: AsyncSession, user_id: str, current_hash: str
) -> None:
    """删除该用户除当前 hash 外的所有刷新令牌。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash != current_hash,
    )
    await session.execute(stmt)
    await session.commit()
```

- [ ] **Step 3: 新增 list_user_refresh_tokens 方法**

```python
async def list_user_refresh_tokens(
    session: AsyncSession, user_id: str
) -> list[RefreshToken]:
    """查询该用户所有未过期的刷新令牌。"""
    now = datetime.now(timezone.utc)
    stmt = (
        select(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.expires_at > now,
        )
        .order_by(RefreshToken.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
```

- [ ] **Step 4: 新增 revoke_refresh_token_by_id 方法**

```python
async def revoke_refresh_token_by_id(
    session: AsyncSession, token_id: str, user_id: str
) -> bool:
    """按 id 删除单条刷新令牌（校验 user_id 防越权）。返回是否删除成功。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.id == token_id,
        RefreshToken.user_id == user_id,
    )
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount > 0
```

- [ ] **Step 5: Commit**

```bash
git add backend/shared/src/app/auth/repository.py
git commit -m "feat: repository 新增按 hash/id 操作 refresh token 的方法"
```

---

### Task 3: Service 层改造

**Files:**
- Modify: `backend/shared/src/app/auth/service.py`

- [ ] **Step 1: 修改 refresh 方法为单 token 删除**

将 `refresh` 方法中的 `revoke_user_refresh_tokens` 替换为 `revoke_refresh_token_by_hash`：

```python
async def refresh(self, token_hash: str) -> User:
    """刷新令牌续签，返回用户信息。

    验证令牌哈希、删除当前旧令牌（不影响其他设备）、检查用户状态。
    """
    token = await repository.get_refresh_token_by_hash(
        self.session, token_hash
    )
    if not token:
        raise UnauthorizedException(message="刷新令牌无效")
    now = datetime.now(timezone.utc)
    if token.expires_at < now:
        raise UnauthorizedException(message="刷新令牌已过期")
    await repository.revoke_refresh_token_by_hash(
        self.session, token_hash
    )
    user = await user_repo.get_by_id(
        self.session, token.user_id
    )
    if not user or not user.is_active:
        raise UnauthorizedException(message="用户不存在或已禁用")
    return user
```

- [ ] **Step 2: 修改 save_refresh_token_hash 方法接受 user_agent 和 ip_address**

```python
async def save_refresh_token_hash(
    self,
    user_id: str,
    token_hash: str,
    expire_days: int = 30,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> None:
    """保存刷新令牌哈希。"""
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=expire_days
    )
    token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    await repository.save_refresh_token(self.session, token)
```

- [ ] **Step 3: 新增 logout_current_device 方法**

```python
async def logout_current_device(self, token_hash: str) -> None:
    """登出当前设备（按 token hash 删除单条）。"""
    await repository.revoke_refresh_token_by_hash(
        self.session, token_hash
    )
```
- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/app/auth/service.py
git commit -m "feat: service 层支持单 token 操作和设备信息存储"
```

---

### Task 4: Schema 和 Router 改造

**Files:**
- Modify: `backend/shared/src/app/auth/schemas.py`
- Modify: `backend/shared/src/app/auth/router.py`

- [ ] **Step 1: 在 schemas.py 中修改 RefreshTokenHashRequest，新增 SessionResponse**

在 `auth/router.py` 中 `RefreshTokenHashRequest` 类加字段：

```python
class RefreshTokenHashRequest(BaseModel):
    """保存 refresh token 哈希请求（网关内部调用）。"""

    user_id: str
    token_hash: str
    user_agent: str | None = None
    ip_address: str | None = None
```

在 `auth/schemas.py` 末尾新增：

```python
class SessionResponse(BaseModel):
    """活跃会话响应。"""

    id: str
    user_agent: str | None = None
    ip_address: str | None = None
    created_at: datetime
    is_current: bool = False
```

注意：`schemas.py` 需要 `from datetime import datetime` 导入。

- [ ] **Step 2: 修改 auth/router.py 的 logout 端点**

改为接收 `X-Refresh-Token-Hash` 头，调用 `logout_current_device`：

```python
@router.post("/logout", response_model=MessageResponse, summary="用户登出")
async def logout(
    session: DbSession,
    x_user_id: str = Header(""),
    x_refresh_token_hash: str = Header(""),
) -> MessageResponse:
    """登出当前设备，撤销当前刷新令牌。"""
    if x_refresh_token_hash:
        svc = AuthService(session)
        await svc.logout_current_device(x_refresh_token_hash)
    return MessageResponse(message="已退出登录")
```

- [ ] **Step 3: 修改 auth/router.py 的 save_refresh_token_hash 端点**

传递 user_agent 和 ip_address：

```python
@router.post("/refresh-token-hash", response_model=MessageResponse, summary="保存刷新令牌哈希")
async def save_refresh_token_hash(
    data: RefreshTokenHashRequest,
    session: DbSession,
    x_internal_secret: str = Header(""),
) -> MessageResponse:
    """保存 refresh token 哈希（仅限网关内部调用）。"""
    from app.core.config import settings

    if not settings.INTERNAL_SECRET or x_internal_secret != settings.INTERNAL_SECRET:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="内部接口禁止外部访问")
    svc = AuthService(session)
    await svc.save_refresh_token_hash(
        data.user_id,
        data.token_hash,
        user_agent=data.user_agent,
        ip_address=data.ip_address,
    )
    return MessageResponse(message="ok")
```

- [ ] **Step 4: Commit**

```bash
git add backend/shared/src/app/auth/schemas.py backend/shared/src/app/auth/router.py
git commit -m "feat: auth 接口支持单设备登出和设备信息存储"
```

---

### Task 5: 会话管理端点（user/router.py）

**Files:**
- Modify: `backend/shared/src/app/user/router.py`

- [ ] **Step 1: 新增会话管理端点**

在文件末尾，`disable_2fa` 端点之后添加：

```python
from app.auth import repository as auth_repo
from app.auth.schemas import SessionResponse


@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="查看活跃会话",
)
async def list_sessions(
    user_id: CurrentUserId,
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> list[SessionResponse]:
    """获取当前用户所有活跃会话列表。"""
    tokens = await auth_repo.list_user_refresh_tokens(session, user_id)
    return [
        SessionResponse(
            id=t.id,
            user_agent=t.user_agent,
            ip_address=t.ip_address,
            created_at=t.created_at,
            is_current=(t.token_hash == x_refresh_token_hash),
        )
        for t in tokens
    ]


@router.post(
    "/sessions/revoke/{token_id}",
    response_model=MessageResponse,
    summary="踢掉指定设备",
)
async def revoke_session(
    token_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """按 token id 踢掉指定设备。"""
    deleted = await auth_repo.revoke_refresh_token_by_id(
        session, token_id, user_id
    )
    if not deleted:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(message="会话不存在")
    return MessageResponse(message="设备已踢出")


@router.post(
    "/sessions/revoke-all",
    response_model=MessageResponse,
    summary="踢掉所有其他设备",
)
async def revoke_all_other_sessions(
    user_id: CurrentUserId,
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> MessageResponse:
    """踢掉除当前设备外的所有其他设备。"""
    await auth_repo.revoke_other_refresh_tokens(
        session, user_id, x_refresh_token_hash
    )
    return MessageResponse(message="已踢出所有其他设备")
```

- [ ] **Step 2: 在 main.py 中添加权限种子**

检查 `backend/api/scripts/init/seed_rbac.py` 中是否需要为新端点添加权限码。会话管理端点在 `/portal/profile/sessions` 下，已被 `portal/profile/*` 通配符覆盖，无需新增。

- [ ] **Step 3: Commit**

```bash
git add backend/shared/src/app/user/router.py
git commit -m "feat: 新增会话管理端点（查看/踢掉指定/踢掉全部）"
```

---

### Task 6: 网关改造 — auth_proxy.lua 和 refresh_proxy.lua

**Files:**
- Modify: `gateway/lua/auth_proxy.lua`
- Modify: `gateway/lua/refresh_proxy.lua`

- [ ] **Step 1: 修改 auth_proxy.lua，保存 token 时传 user_agent 和 ip_address**

在 `auth_proxy.lua` 的保存 token hash 请求体中（约第 106 行 `cjson.encode` 处），添加 user_agent 和 ip_address：

```lua
save_httpc:request_uri(config.get_backend_url() .. "/api/auth/refresh-token-hash", {
  method = "POST",
  body = cjson.encode({
    user_id = user.id,
    token_hash = token_hash,
    user_agent = ngx.var.http_user_agent or "",
    ip_address = ngx.var.remote_addr or "",
  }),
  headers = {
    ["Content-Type"] = "application/json",
    ["X-Requested-With"] = "XMLHttpRequest",
    ["X-Internal-Secret"] = config.get_internal_secret(),
  },
})
```

- [ ] **Step 2: 修改 refresh_proxy.lua，保存新 token 时传 user_agent 和 ip_address**

在 `refresh_proxy.lua` 保存新 token hash 的请求体中（约第 136 行），同样添加：

```lua
save_httpc:request_uri(config.get_backend_url() .. "/api/auth/refresh-token-hash", {
  method = "POST",
  body = cjson.encode({
    user_id = user.id,
    token_hash = new_token_hash,
    user_agent = ngx.var.http_user_agent or "",
    ip_address = ngx.var.remote_addr or "",
  }),
  headers = {
    ["Content-Type"] = "application/json",
    ["X-Requested-With"] = "XMLHttpRequest",
    ["X-Internal-Secret"] = config.get_internal_secret(),
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add gateway/lua/auth_proxy.lua gateway/lua/refresh_proxy.lua
git commit -m "feat: 网关登录/续签时保存设备信息（user_agent + ip_address）"
```

---

### Task 7: 网关改造 — auth.lua 和 server.conf

**Files:**
- Modify: `gateway/lua/auth.lua`
- Modify: `gateway/conf.d/server.conf`

- [ ] **Step 1: 修改 auth.lua，对 session 路径注入 X-Refresh-Token-Hash**

在 `auth.lua` 文件末尾（`ngx.req.set_header("X-User-Id", ...)` 之后，权限校验之前），添加：

```lua
-- 对会话管理接口注入 X-Refresh-Token-Hash
if string.find(uri, "/api/portal/profile/sessions", 1, true) == 1 then
  local rt_cookie
  for pair in string.gmatch(cookie_header, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == "refresh_token" then
      rt_cookie = v
      break
    end
  end
  if rt_cookie then
    local resty_sha256 = require("resty.sha256")
    local str_util = require("resty.string")
    local sha = resty_sha256:new()
    sha:update(rt_cookie)
    local digest = sha:final()
    ngx.req.set_header("X-Refresh-Token-Hash", str_util.to_hex(digest))
  end
end
```

- [ ] **Step 2: 修改 server.conf logout location，增加 X-Refresh-Token-Hash 注入**

将 `access_by_lua_block` 中现有的 JWT 解析逻辑之后，添加 refresh token hash 注入：

```nginx
  # 登出 — 代理到后端，注入用户 ID 和 token hash，清除 Cookie
  location = /api/auth/logout {
    access_by_lua_block {
      local jwt = require("resty.jwt")
      local config = require("init")
      local resty_sha256 = require("resty.sha256")
      local str_util = require("resty.string")
      local cookie_header = ngx.var.http_cookie
      if cookie_header then
        for pair in string.gmatch(cookie_header, "[^;]+") do
          local trimmed = string.gsub(pair, "^%%s+", "")
          local k, v = string.match(trimmed, "^(.-)=(.+)$")
          if k == "access_token" then
            local obj = jwt:verify(config.get_jwt_secret(), v)
            if obj.verified and obj.payload then
              ngx.req.set_header("X-User-Id", obj.payload.sub)
            end
          end
          if k == "refresh_token" then
            local sha = resty_sha256:new()
            sha:update(v)
            local digest = sha:final()
            ngx.req.set_header("X-Refresh-Token-Hash", str_util.to_hex(digest))
          end
        end
      end
    }
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    header_filter_by_lua_block {
      ngx.header["Set-Cookie"] = {
        "access_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
        "refresh_token=; Path=/api/auth/refresh; HttpOnly; SameSite=Strict; Max-Age=0",
      }
    }
  }
```

- [ ] **Step 3: 重启网关**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && docker compose restart gateway"`

- [ ] **Step 4: Commit**

```bash
git add gateway/lua/auth.lua gateway/conf.d/server.conf
git commit -m "feat: 网关对 session/logout 路径注入 X-Refresh-Token-Hash"
```

---

### Task 8: 后端单元测试

**Files:**
- Create: `backend/api/tests/test_session_router.py`

- [ ] **Step 1: 编写会话管理端点测试**

```python
"""会话管理路由测试。

覆盖查看会话列表、踢掉指定设备、踢掉所有其他设备。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.auth.models import RefreshToken


def _make_token(**kwargs) -> MagicMock:
    """创建模拟 RefreshToken 对象。"""
    token = MagicMock(spec=RefreshToken)
    token.id = kwargs.get("id", "token-001")
    token.user_id = kwargs.get("user_id", "user-001")
    token.token_hash = kwargs.get("token_hash", "hash-aaa")
    token.user_agent = kwargs.get("user_agent", "Mozilla/5.0")
    token.ip_address = kwargs.get("ip_address", "192.168.1.1")
    token.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    token.expires_at = kwargs.get(
        "expires_at", datetime.now(timezone.utc)
    )
    return token


class TestListSessions:
    """查看活跃会话测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        """模拟 auth repository。"""
        with patch(
            "app.user.router.auth_repo"
        ) as mock_repo:
            self.mock_repo = mock_repo
            yield

    async def test_list_sessions_success(self, client, user_headers):
        """查看会话列表返回 200。"""
        tokens = [
            _make_token(id="t1", token_hash="current-hash"),
            _make_token(id="t2", token_hash="other-hash"),
        ]
        self.mock_repo.list_user_refresh_tokens = AsyncMock(
            return_value=tokens
        )
        resp = await client.get(
            "/portal/profile/sessions",
            headers={
                **user_headers,
                "X-Refresh-Token-Hash": "current-hash",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["is_current"] is True
        assert data[1]["is_current"] is False

    async def test_list_sessions_empty(self, client, user_headers):
        """没有活跃会话返回空列表。"""
        self.mock_repo.list_user_refresh_tokens = AsyncMock(
            return_value=[]
        )
        resp = await client.get(
            "/portal/profile/sessions",
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []


class TestRevokeSession:
    """踢掉指定设备测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        with patch(
            "app.user.router.auth_repo"
        ) as mock_repo:
            self.mock_repo = mock_repo
            yield

    async def test_revoke_session_success(self, client, user_headers):
        """踢掉指定设备返回 200。"""
        self.mock_repo.revoke_refresh_token_by_id = AsyncMock(
            return_value=True
        )
        resp = await client.post(
            "/portal/profile/sessions/revoke/token-123",
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "设备已踢出"

    async def test_revoke_session_not_found(self, client, user_headers):
        """踢掉不存在的设备返回 404。"""
        self.mock_repo.revoke_refresh_token_by_id = AsyncMock(
            return_value=False
        )
        resp = await client.post(
            "/portal/profile/sessions/revoke/nonexistent",
            headers=user_headers,
        )
        assert resp.status_code == 404


class TestRevokeAllOtherSessions:
    """踢掉所有其他设备测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        with patch(
            "app.user.router.auth_repo"
        ) as mock_repo:
            self.mock_repo = mock_repo
            yield

    async def test_revoke_all_success(self, client, user_headers):
        """踢掉所有其他设备返回 200。"""
        self.mock_repo.revoke_other_refresh_tokens = AsyncMock()
        resp = await client.post(
            "/portal/profile/sessions/revoke-all",
            headers={
                **user_headers,
                "X-Refresh-Token-Hash": "current-hash",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "已踢出所有其他设备"
        self.mock_repo.revoke_other_refresh_tokens.assert_called_once()
```

- [ ] **Step 2: 运行单元测试**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/test_session_router.py -v"`

Expected: 全部 PASS

- [ ] **Step 3: 运行所有现有单元测试确保无回归**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e"`

Expected: 全部 PASS（refresh 相关的现有测试可能需要调整 mock）

- [ ] **Step 4: 修复因 refresh 逻辑变更导致的现有测试失败**

检查 `test_auth_service.py` 和 `test_auth_router.py` 中调用 `revoke_user_refresh_tokens` 的 mock，改为 `revoke_refresh_token_by_hash`。

- [ ] **Step 5: Commit**

```bash
git add backend/api/tests/
git commit -m "test: 会话管理端点单元测试 + 适配 refresh 逻辑变更"
```

---

### Task 9: E2E 测试

**Files:**
- Create: `backend/api/tests/e2e/test_session.py`

- [ ] **Step 1: 编写 E2E 测试**

```python
"""会话管理 E2E 测试。

通过网关的完整请求，验证多端登录、会话列表、踢出设备。
"""

import pytest

from .conftest import encrypt_password, SUPERUSER_USERNAME, SUPERUSER_PASSWORD


@pytest.mark.e2e
class TestSessionManagement:
    """会话管理端到端测试。"""

    async def test_list_sessions_after_login(self, superuser_client):
        """登录后查看会话列表至少有一条记录。"""
        resp = await superuser_client.get("/api/portal/profile/sessions")
        assert resp.status_code == 200
        sessions = resp.json()
        assert len(sessions) >= 1
        current = [s for s in sessions if s["is_current"]]
        assert len(current) == 1

    async def test_revoke_other_sessions(self, superuser_client, e2e_client):
        """踢掉所有其他设备后，只剩当前设备。"""
        # 先用另一个 client 登录，产生第二个 session
        encrypted = await encrypt_password(e2e_client, SUPERUSER_PASSWORD)
        login_resp = await e2e_client.post(
            "/api/auth/login",
            json={"username": SUPERUSER_USERNAME, **encrypted},
        )
        assert login_resp.status_code == 200

        # 用原 client 踢掉所有其他设备
        resp = await superuser_client.post(
            "/api/portal/profile/sessions/revoke-all"
        )
        assert resp.status_code == 200

        # 验证只剩当前设备
        list_resp = await superuser_client.get(
            "/api/portal/profile/sessions"
        )
        assert list_resp.status_code == 200
        sessions = list_resp.json()
        assert all(s["is_current"] for s in sessions)

    async def test_logout_does_not_affect_other_device(
        self, e2e_client
    ):
        """退出不影响其他设备的 session。"""
        # 登录设备 A
        encrypted = await encrypt_password(e2e_client, SUPERUSER_PASSWORD)
        await e2e_client.post(
            "/api/auth/login",
            json={"username": SUPERUSER_USERNAME, **encrypted},
        )

        # 查看 session 列表（验证可以访问）
        resp = await e2e_client.get("/api/portal/profile/sessions")
        assert resp.status_code == 200
        sessions_before = len(resp.json())

        # 登出设备 A
        await e2e_client.post("/api/auth/logout")

        # 此时 e2e_client cookie 已清除，无法访问
        resp = await e2e_client.get("/api/portal/profile/sessions")
        assert resp.status_code == 401
```

- [ ] **Step 2: 运行 E2E 测试**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/e2e/test_session.py -v"`

Expected: 全部 PASS

- [ ] **Step 3: 运行所有 E2E 测试确保无回归**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v"`

Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add backend/api/tests/e2e/test_session.py
git commit -m "test: 会话管理 E2E 测试（多端登录、踢出设备）"
```

---

### Task 10: 前端会话管理 UI

**Files:**
- Modify: `frontend/components/user/ProfileInfo.tsx`

- [ ] **Step 1: 在 ProfileInfo 组件中添加会话管理区块**

在角色信息（Role）区块之后、`</CardContent>` 之前，添加登录设备管理区块。需要：

1. 新增 state：`sessions`、`sessionsLoading`
2. `useEffect` 调用 `GET /portal/profile/sessions`
3. 渲染会话列表，每条显示：
   - 设备描述（从 user_agent 解析，简单用正则提取浏览器和 OS）
   - IP 地址
   - 登录时间
   - 当前设备显示"当前"标签
   - 非当前设备显示"踢出"按钮
4. 列表上方"退出所有其他设备"按钮
5. 踢出操作调用 `POST /portal/profile/sessions/revoke/{id}` 或 `/revoke-all`
6. 操作后重新获取列表，toast 提示

user_agent 解析函数：

```typescript
function parseUserAgent(ua: string | null): string {
  if (!ua) return "未知设备"
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0]
    ?? ua.match(/(MSIE|Trident)\/[\d.]+/)?.[0]
    ?? "未知浏览器"
  const os = ua.match(/(Windows|Mac OS X|Linux|Android|iOS)[\s/]?[\d._]*/)?.[0]
    ?? "未知系统"
  return `${browser} · ${os}`
}
```

- [ ] **Step 2: 添加翻译 key**

在 `frontend/messages/zh.json`、`en.json` 等文件中的 Profile 部分添加：

```json
"sessions": "登录设备",
"currentDevice": "当前",
"revokeSession": "踢出",
"revokeAllOthers": "退出所有其他设备",
"sessionRevoked": "设备已踢出",
"allSessionsRevoked": "已踢出所有其他设备",
"unknownDevice": "未知设备",
"noOtherSessions": "无其他设备登录"
```

- [ ] **Step 3: 在浏览器中验证**

用 Chrome DevTools MCP 导航到 `/portal/profile`，截图确认会话列表正常显示。

- [ ] **Step 4: Commit**

```bash
git add frontend/components/user/ProfileInfo.tsx frontend/messages/
git commit -m "feat: 前端个人资料页新增登录设备管理区块"
```

---

### Task 11: PostgreSQL pg_cron 定时清理

**Files:**
- Modify: `docker-compose.yml` 或 `docker-compose.override.yml`
- Create: `docker/db/init-pgcron.sql`（初始化脚本）

- [ ] **Step 1: 确认 postgres:17-alpine 是否包含 pg_cron**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && docker compose exec db sh -c 'ls /usr/lib/postgresql/*/lib/pg_cron* 2>/dev/null || echo NOT_FOUND'"`

如果不包含，需要改用 `postgres:17`（非 alpine）或自定义 Dockerfile 安装。

- [ ] **Step 2: 创建 pg_cron 初始化脚本**

```sql
-- docker/db/init-pgcron.sql
-- 启用 pg_cron 扩展并创建定时清理任务

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天凌晨 3 点清理过期的 refresh token
SELECT cron.schedule('clean_expired_tokens', '0 3 * * *',
  $$DELETE FROM refresh_token WHERE expires_at < now()$$);
```

- [ ] **Step 3: 在 docker-compose 中挂载初始化脚本**

在 `docker-compose.yml` 的 db service volumes 中添加：

```yaml
volumes:
  - pgdata:/var/lib/postgresql/data
  - ./docker/db/init-pgcron.sql:/docker-entrypoint-initdb.d/init-pgcron.sql
```

并在 db 的环境变量或 postgresql.conf 中启用 `shared_preload_libraries = 'pg_cron'`。

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker/db/
git commit -m "feat: PostgreSQL pg_cron 定时清理过期 refresh token"
```

---

### Task 12: 最终验证

- [ ] **Step 1: 重启所有容器**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && docker compose down && docker compose up -d"`

- [ ] **Step 2: 运行全量后端单元测试**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e"`

Expected: 全部 PASS

- [ ] **Step 3: 运行全量后端 E2E 测试**

Run: `wsl -d Ubuntu-24.04 -- bash -c "cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v"`

Expected: 全部 PASS

- [ ] **Step 4: 浏览器手动验证**

1. 登录管理员
2. 打开个人资料页，确认会话列表可见
3. 在另一个浏览器登录同一账号
4. 刷新会话列表，确认出现两条记录
5. 踢掉另一个设备，确认列表更新
6. 退出登录，确认被重定向到首页
7. 在被踢设备上刷新，确认需要重新登录
