# mudasky 项目骨架搭建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 mudasky 项目骨架——后端 FastAPI 项目结构、OpenResty 网关、Docker Compose 编排、数据库模型和迁移，使 `docker compose up` 可以启动完整的开发环境。

**Architecture:** 领域分包后端（auth/user/document/content/admin），每个领域内 router→schemas→service→repository→models 分层。OpenResty 厚网关处理 JWT 认证、CSRF 校验、限流。Docker Compose 编排 gateway + backend + db 三个服务。

**Tech Stack:** FastAPI, Python 3.14, SQLAlchemy (async), Alembic, Pydantic, PostgreSQL, OpenResty (Lua), Docker

**Spec:** `docs/superpowers/specs/2026-04-04-project-skeleton-design.md`

**Code Style Rules:**
- Python: 4 spaces, snake_case, async/await, Pydantic BaseModel（禁止 dataclass）, Black formatter
- Lua: 2 spaces, snake_case
- 所有注释使用中文
- 所有函数/类/文件头部必须有文档注释
- Git commit: Conventional Commits, 中文描述

---

## 文件结构总览

### 后端（backend/）

| 文件路径 | 职责 |
|---------|------|
| `backend/pyproject.toml` | 项目配置和依赖声明 |
| `backend/alembic.ini` | Alembic 迁移配置 |
| `backend/src/app/__init__.py` | 包初始化 |
| `backend/src/app/api/main.py` | FastAPI 入口，挂载路由，注册异常处理 |
| `backend/src/app/core/__init__.py` | 包初始化 |
| `backend/src/app/core/config.py` | Pydantic Settings 环境变量管理 |
| `backend/src/app/core/database.py` | async engine / session factory |
| `backend/src/app/core/security.py` | JWT 生成/验证（HMAC-SHA256） |
| `backend/src/app/core/dependencies.py` | 公共依赖注入（get_db, get_current_user, require_role） |
| `backend/src/app/core/exceptions.py` | 自定义异常 + 全局异常处理器 |
| `backend/src/app/core/pagination.py` | 通用分页模型 |
| `backend/src/app/core/logging.py` | JSON 结构化日志配置 |
| `backend/src/app/user/__init__.py` | 包初始化 |
| `backend/src/app/user/models.py` | User ORM 模型 |
| `backend/src/app/user/schemas.py` | User Pydantic schemas |
| `backend/src/app/user/repository.py` | User 数据访问层 |
| `backend/src/app/user/service.py` | User 业务逻辑 |
| `backend/src/app/user/router.py` | User API 路由 |
| `backend/src/app/auth/__init__.py` | 包初始化 |
| `backend/src/app/auth/models.py` | SmsCode ORM 模型 |
| `backend/src/app/auth/schemas.py` | Auth Pydantic schemas |
| `backend/src/app/auth/repository.py` | 验证码数据访问层 |
| `backend/src/app/auth/service.py` | 认证业务逻辑 |
| `backend/src/app/auth/router.py` | Auth API 路由 |
| `backend/src/app/auth/sms.py` | 阿里云短信 SDK 封装 |
| `backend/src/app/document/__init__.py` | 包初始化 |
| `backend/src/app/document/models.py` | Document ORM 模型 |
| `backend/src/app/document/schemas.py` | Document Pydantic schemas |
| `backend/src/app/document/repository.py` | Document 数据访问层 |
| `backend/src/app/document/service.py` | Document 业务逻辑 |
| `backend/src/app/document/router.py` | Document API 路由 |
| `backend/src/app/document/storage/__init__.py` | 包初始化 |
| `backend/src/app/document/storage/base.py` | StorageBackend 抽象接口 |
| `backend/src/app/document/storage/local.py` | 本地磁盘存储实现 |
| `backend/src/app/content/__init__.py` | 包初始化 |
| `backend/src/app/content/models.py` | Article, Category ORM 模型 |
| `backend/src/app/content/schemas.py` | Content Pydantic schemas |
| `backend/src/app/content/repository.py` | Content 数据访问层 |
| `backend/src/app/content/service.py` | Content 业务逻辑（含审核流程） |
| `backend/src/app/content/router.py` | Content API 路由 |
| `backend/src/app/admin/__init__.py` | 包初始化 |
| `backend/src/app/admin/schemas.py` | Admin Pydantic schemas |
| `backend/src/app/admin/service.py` | Admin 业务逻辑 |
| `backend/src/app/admin/router.py` | Admin API 路由 |
| `backend/src/app/worker/__init__.py` | 包初始化 |
| `backend/src/app/worker/models.py` | Task ORM 模型 |
| `backend/src/app/worker/queue.py` | PostgreSQL 任务队列（入队/抢占/完成） |
| `backend/src/app/worker/main.py` | Worker 入口，队列消费循环 |
| `backend/alembic/env.py` | Alembic 迁移环境配置 |
| `backend/alembic/script.py.mako` | 迁移脚本模板 |
| `backend/tests/conftest.py` | pytest fixtures |
| `backend/scripts/start.sh` | 容器启动脚本（迁移 + uvicorn） |

### 网关（gateway/）

| 文件路径 | 职责 |
|---------|------|
| `gateway/nginx.conf` | OpenResty 主配置 |
| `gateway/conf.d/upstream.conf` | 后端上游定义 |
| `gateway/conf.d/server.conf` | server 块和 location 路由 |
| `gateway/lua/init.lua` | worker 初始化（JWT 密钥、白名单） |
| `gateway/lua/auth.lua` | JWT 认证 + CSRF + 请求头注入 |
| `gateway/lua/rate_limit.lua` | 动态限流 |

### 基础设施

| 文件路径 | 职责 |
|---------|------|
| `docker/backend.Dockerfile` | 后端镜像 |
| `docker/gateway.Dockerfile` | 网关镜像 |
| `docker-compose.yml` | 生产环境服务编排 |
| `docker-compose.override.yml` | 开发环境覆盖 |
| `.env.example` | 环境变量模板 |

---

## Task 1: 后端项目初始化（pyproject.toml + 依赖）

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `.env.example`

- [ ] **Step 1: 编写 pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.backends"

[project]
name = "mudasky-backend"
version = "0.1.0"
description = "mudasky 后端服务"
requires-python = ">=3.14"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.30",
    "alembic>=1.15",
    "pydantic>=2.11",
    "pydantic-settings>=2.9",
    "pyjwt>=2.10",
    "httpx>=0.28",
    "python-multipart>=0.0.20",
    "aiofiles>=24.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.26",
    "httpx>=0.28",
    "black>=25.1",
]

[tool.black]
line-length = 88

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.hatch.build.targets.wheel]
packages = ["src/app"]
```

- [ ] **Step 2: 更新 .env.example**

```bash
# Copy this file to .env and fill in the values

# PostgreSQL
DB_HOST=db
DB_PORT=5432
DB_NAME=mudasky
DB_USER=mudasky
DB_PASSWORD=

# JWT
JWT_SECRET=

# Token 过期时间
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# 阿里云短信
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=
SMS_TEMPLATE_CODE=

# 文件上传
MAX_UPLOAD_SIZE_MB=10
DEFAULT_STORAGE_QUOTA_MB=100
```

- [ ] **Step 3: 安装依赖（本地开发用 uv）**

Run: `cd d:/Code/mudasky/backend && uv sync`
Expected: 依赖安装成功，生成 `uv.lock`

- [ ] **Step 4: 提交**

```bash
git add backend/pyproject.toml backend/uv.lock .env.example
git commit -m "chore: 初始化后端项目配置和依赖"
```

---

## Task 2: 后端核心层——config + database + logging

**Files:**
- Create: `backend/src/app/__init__.py`
- Create: `backend/src/app/core/__init__.py`
- Create: `backend/src/app/core/config.py`
- Create: `backend/src/app/core/database.py`
- Create: `backend/src/app/core/logging.py`
- Test: `backend/tests/test_core_config.py`

- [ ] **Step 1: 创建包结构**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/core
touch d:/Code/mudasky/backend/src/app/__init__.py
touch d:/Code/mudasky/backend/src/app/core/__init__.py
```

- [ ] **Step 2: 编写 config.py 的测试**

```python
"""core/config 单元测试。"""
import os

import pytest


def test_settings_loads_from_env(monkeypatch):
    """验证 Settings 能正确读取环境变量。"""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("DB_USER", "testuser")
    monkeypatch.setenv("DB_PASSWORD", "testpass")
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    from app.core.config import settings

    # 重新加载以获取 monkeypatch 的值
    from app.core.config import Settings

    s = Settings()
    assert s.DB_HOST == "localhost"
    assert s.DB_NAME == "testdb"
    assert s.JWT_SECRET == "test-secret"
    assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 30
    assert s.MAX_UPLOAD_SIZE_MB == 10


def test_settings_database_url(monkeypatch):
    """验证 database_url 属性拼接正确。"""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("DB_USER", "testuser")
    monkeypatch.setenv("DB_PASSWORD", "testpass")
    monkeypatch.setenv("JWT_SECRET", "secret")

    from app.core.config import Settings

    s = Settings()
    assert s.database_url == "postgresql+asyncpg://testuser:testpass@localhost:5432/testdb"
```

File: `backend/tests/test_core_config.py`

- [ ] **Step 3: 运行测试确认失败**

Run: `cd d:/Code/mudasky/backend && uv run pytest tests/test_core_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 4: 编写 config.py**

```python
"""应用配置管理。

通过 Pydantic Settings 从环境变量加载配置。
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置。"""

    # 数据库
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_NAME: str = "mudasky"
    DB_USER: str = "mudasky"
    DB_PASSWORD: str = ""

    # JWT
    JWT_SECRET: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 阿里云短信
    SMS_ACCESS_KEY_ID: str = ""
    SMS_ACCESS_KEY_SECRET: str = ""
    SMS_SIGN_NAME: str = ""
    SMS_TEMPLATE_CODE: str = ""

    # 文件上传
    MAX_UPLOAD_SIZE_MB: int = 10
    DEFAULT_STORAGE_QUOTA_MB: int = 100

    @property
    def database_url(self) -> str:
        """构建 asyncpg 数据库连接 URL。"""
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def max_upload_size_bytes(self) -> int:
        """单文件上传大小限制（字节）。"""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def default_storage_quota_bytes(self) -> int:
        """用户默认存储配额（字节）。"""
        return self.DEFAULT_STORAGE_QUOTA_MB * 1024 * 1024

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
```

File: `backend/src/app/core/config.py`

- [ ] **Step 5: 运行测试确认通过**

Run: `cd d:/Code/mudasky/backend && uv run pytest tests/test_core_config.py -v`
Expected: PASS

- [ ] **Step 6: 编写 database.py**

```python
"""数据库引擎和会话管理。

提供异步 SQLAlchemy engine 和 session factory。
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)

async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话的依赖注入函数。"""
    async with async_session_factory() as session:
        yield session
```

File: `backend/src/app/core/database.py`

- [ ] **Step 7: 编写 logging.py**

```python
"""JSON 结构化日志配置。

使用标准库 logging，输出 JSON 格式日志。
"""

import json
import logging
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """JSON 格式日志 formatter。"""

    def format(self, record: logging.LogRecord) -> str:
        """将日志记录格式化为 JSON 字符串。"""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(level: int = logging.INFO) -> None:
    """配置全局 JSON 结构化日志。"""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # 降低第三方库日志级别
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
```

File: `backend/src/app/core/logging.py`

- [ ] **Step 8: 提交**

```bash
git add backend/src/ backend/tests/
git commit -m "feat: 添加后端核心层——配置、数据库、日志"
```

---

## Task 3: 后端核心层——security + exceptions + pagination + dependencies

**Files:**
- Create: `backend/src/app/core/security.py`
- Create: `backend/src/app/core/exceptions.py`
- Create: `backend/src/app/core/pagination.py`
- Create: `backend/src/app/core/dependencies.py`
- Test: `backend/tests/test_core_security.py`

- [ ] **Step 1: 编写 security.py 的测试**

```python
"""core/security 单元测试。"""
import pytest


def test_create_access_token():
    """验证生成的 access token 可以正确解码。"""
    from app.core.security import create_access_token, decode_token

    token = create_access_token(
        user_id="test-uuid",
        role="user",
        is_active=True,
        secret="test-secret",
    )
    payload = decode_token(token, secret="test-secret")
    assert payload["sub"] == "test-uuid"
    assert payload["role"] == "user"
    assert payload["is_active"] is True
    assert payload["type"] == "access"


def test_create_refresh_token():
    """验证 refresh token 只包含 user_id。"""
    from app.core.security import create_refresh_token, decode_token

    token = create_refresh_token(user_id="test-uuid", secret="test-secret")
    payload = decode_token(token, secret="test-secret")
    assert payload["sub"] == "test-uuid"
    assert payload["type"] == "refresh"
    assert "role" not in payload


def test_decode_expired_token():
    """验证过期 token 解码抛出异常。"""
    from app.core.security import create_access_token, decode_token

    token = create_access_token(
        user_id="test-uuid",
        role="user",
        is_active=True,
        secret="test-secret",
        expire_minutes=-1,
    )
    with pytest.raises(Exception):
        decode_token(token, secret="test-secret")


def test_decode_invalid_token():
    """验证无效 token 解码抛出异常。"""
    from app.core.security import decode_token

    with pytest.raises(Exception):
        decode_token("invalid-token", secret="test-secret")
```

File: `backend/tests/test_core_security.py`

- [ ] **Step 2: 运行测试确认失败**

Run: `cd d:/Code/mudasky/backend && uv run pytest tests/test_core_security.py -v`
Expected: FAIL

- [ ] **Step 3: 编写 security.py**

```python
"""安全工具模块。

提供 JWT token 生成/解码功能。
"""

from datetime import datetime, timedelta, timezone

import jwt


def create_access_token(
    *,
    user_id: str,
    role: str,
    is_active: bool,
    secret: str,
    expire_minutes: int = 30,
) -> str:
    """生成 access token。

    Args:
        user_id: 用户 ID。
        role: 用户角色。
        is_active: 用户是否启用。
        secret: JWT 签名密钥。
        expire_minutes: 过期时间（分钟）。

    Returns:
        编码后的 JWT 字符串。
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "is_active": is_active,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=expire_minutes),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def create_refresh_token(
    *,
    user_id: str,
    secret: str,
    expire_days: int = 7,
) -> str:
    """生成 refresh token。

    Args:
        user_id: 用户 ID。
        secret: JWT 签名密钥。
        expire_days: 过期时间（天）。

    Returns:
        编码后的 JWT 字符串。
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=expire_days),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, *, secret: str) -> dict:
    """解码并验证 JWT token。

    Args:
        token: JWT 字符串。
        secret: JWT 签名密钥。

    Returns:
        解码后的 payload 字典。

    Raises:
        jwt.ExpiredSignatureError: token 已过期。
        jwt.InvalidTokenError: token 无效。
    """
    return jwt.decode(token, secret, algorithms=["HS256"])
```

File: `backend/src/app/core/security.py`

- [ ] **Step 4: 运行测试确认通过**

Run: `cd d:/Code/mudasky/backend && uv run pytest tests/test_core_security.py -v`
Expected: PASS

- [ ] **Step 5: 编写 exceptions.py**

```python
"""自定义异常和全局异常处理。

定义业务异常类和 FastAPI 异常处理器。
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """应用业务异常基类。"""

    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


class NotFoundException(AppException):
    """资源未找到异常。"""

    def __init__(self, message: str = "资源不存在"):
        super().__init__(status_code=404, code="NOT_FOUND", message=message)


class ForbiddenException(AppException):
    """权限不足异常。"""

    def __init__(self, message: str = "权限不足"):
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


class ConflictException(AppException):
    """资源冲突异常。"""

    def __init__(self, message: str = "资源冲突"):
        super().__init__(status_code=409, code="CONFLICT", message=message)


class QuotaExceededException(AppException):
    """配额超限异常。"""

    def __init__(self, message: str = "存储配额已满"):
        super().__init__(status_code=413, code="QUOTA_EXCEEDED", message=message)


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器。"""

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request, exc: AppException
    ) -> JSONResponse:
        """处理业务异常。"""
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message},
        )
```

File: `backend/src/app/core/exceptions.py`

- [ ] **Step 6: 编写 pagination.py**

```python
"""通用分页模型。

提供分页请求参数和分页响应包装。
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """分页请求参数。"""

    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")

    @property
    def offset(self) -> int:
        """计算数据库查询偏移量。"""
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应包装。"""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
```

File: `backend/src/app/core/pagination.py`

- [ ] **Step 7: 编写 dependencies.py**

```python
"""公共依赖注入。

提供数据库会话、当前用户、角色校验等依赖。
"""

from typing import Annotated

from fastapi import Depends, Header

from app.core.database import AsyncSession, get_db
from app.core.exceptions import ForbiddenException


async def get_current_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """从网关注入的请求头获取当前用户 ID。

    网关层已完成 JWT 验证，后端信任 X-User-Id 请求头。
    """
    if not x_user_id:
        raise ForbiddenException(message="未获取到用户信息")
    return x_user_id


async def get_current_user_role(
    x_user_role: Annotated[str | None, Header()] = None,
) -> str:
    """从网关注入的请求头获取当前用户角色。"""
    if not x_user_role:
        raise ForbiddenException(message="未获取到用户角色")
    return x_user_role


def require_role(*roles: str):
    """创建角色校验依赖。

    Args:
        roles: 允许的角色列表。

    Returns:
        依赖注入函数。
    """

    async def check_role(
        current_role: Annotated[str, Depends(get_current_user_role)],
    ) -> str:
        """校验当前用户角色是否在允许列表中。"""
        if current_role not in roles:
            raise ForbiddenException(message="角色权限不足")
        return current_role

    return check_role


# 类型别名，方便路由函数使用
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
CurrentUserRole = Annotated[str, Depends(get_current_user_role)]
AdminRole = Annotated[str, Depends(require_role("admin"))]
```

File: `backend/src/app/core/dependencies.py`

- [ ] **Step 8: 提交**

```bash
git add backend/src/app/core/ backend/tests/
git commit -m "feat: 添加安全、异常、分页、依赖注入模块"
```

---

## Task 4: User 领域——models + schemas + repository

**Files:**
- Create: `backend/src/app/user/__init__.py`
- Create: `backend/src/app/user/models.py`
- Create: `backend/src/app/user/schemas.py`
- Create: `backend/src/app/user/repository.py`

- [ ] **Step 1: 创建 user 包**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/user
touch d:/Code/mudasky/backend/src/app/user/__init__.py
```

- [ ] **Step 2: 编写 user/models.py**

```python
"""User ORM 模型。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """用户表。"""

    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, comment="手机号"
    )
    role: Mapped[str] = mapped_column(
        String(20), default="user", comment="角色：user / admin"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, comment="是否启用"
    )
    storage_quota: Mapped[int] = mapped_column(
        Integer, comment="存储配额（字节）"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间",
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        onupdate=lambda: datetime.now(timezone.utc),
        comment="更新时间",
    )
```

File: `backend/src/app/user/models.py`

- [ ] **Step 3: 编写 user/schemas.py**

```python
"""User Pydantic schemas。"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    """创建用户请求。"""

    phone: str


class UserUpdate(BaseModel):
    """更新用户请求。"""

    is_active: bool | None = None
    role: str | None = None
    storage_quota: int | None = None


class UserResponse(BaseModel):
    """用户响应。"""

    id: uuid.UUID
    phone: str
    role: str
    is_active: bool
    storage_quota: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
```

File: `backend/src/app/user/schemas.py`

- [ ] **Step 4: 编写 user/repository.py**

```python
"""User 数据访问层。"""

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.user.models import User


class UserRepository:
    """用户数据查询封装。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """根据 ID 查询用户。"""
        return await self.session.get(User, user_id)

    async def get_by_phone(self, phone: str) -> User | None:
        """根据手机号查询用户。"""
        stmt = select(User).where(User.phone == phone)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        """创建用户。"""
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: User) -> User:
        """更新用户。"""
        await self.session.flush()
        return user

    async def list_users(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[User], int]:
        """分页查询用户列表。

        Returns:
            (用户列表, 总数) 元组。
        """
        count_stmt = select(func.count()).select_from(User)
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = select(User).offset(offset).limit(limit).order_by(User.created_at.desc())
        result = await self.session.execute(stmt)
        users = list(result.scalars().all())
        return users, total
```

File: `backend/src/app/user/repository.py`

- [ ] **Step 5: 提交**

```bash
git add backend/src/app/user/
git commit -m "feat: 添加 User 领域——模型、schemas、repository"
```

---

## Task 5: User 领域——service + router

**Files:**
- Create: `backend/src/app/user/service.py`
- Create: `backend/src/app/user/router.py`

- [ ] **Step 1: 编写 user/service.py**

```python
"""User 业务逻辑层。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.user.models import User
from app.user.repository import UserRepository
from app.user.schemas import UserUpdate


class UserService:
    """用户业务逻辑。"""

    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def get_user(self, user_id: uuid.UUID) -> User:
        """根据 ID 获取用户，不存在则抛异常。"""
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(message="用户不存在")
        return user

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        """更新用户信息。"""
        user = await self.get_user(user_id)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        return await self.repo.update(user)

    async def list_users(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[User], int]:
        """分页获取用户列表。"""
        return await self.repo.list_users(offset=offset, limit=limit)
```

File: `backend/src/app/user/service.py`

- [ ] **Step 2: 编写 user/router.py**

```python
"""User API 路由。"""

import uuid

from fastapi import APIRouter

from app.core.dependencies import CurrentUserId, DbSession
from app.core.pagination import PaginatedResponse
from app.user.schemas import UserResponse, UserUpdate
from app.user.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """获取当前登录用户信息。"""
    service = UserService(session)
    user = await service.get_user(uuid.UUID(user_id))
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_id: CurrentUserId,
    data: UserUpdate,
    session: DbSession,
) -> UserResponse:
    """更新当前登录用户信息。"""
    service = UserService(session)
    user = await service.update_user(uuid.UUID(user_id), data)
    return UserResponse.model_validate(user)
```

File: `backend/src/app/user/router.py`

- [ ] **Step 3: 提交**

```bash
git add backend/src/app/user/
git commit -m "feat: 添加 User 领域——service 和 router"
```

---

## Task 6: Auth 领域——models + schemas + repository + sms

**Files:**
- Create: `backend/src/app/auth/__init__.py`
- Create: `backend/src/app/auth/models.py`
- Create: `backend/src/app/auth/schemas.py`
- Create: `backend/src/app/auth/repository.py`
- Create: `backend/src/app/auth/sms.py`

- [ ] **Step 1: 创建 auth 包**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/auth
touch d:/Code/mudasky/backend/src/app/auth/__init__.py
```

- [ ] **Step 2: 编写 auth/models.py**

```python
"""Auth ORM 模型。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SmsCode(Base):
    """短信验证码表。"""

    __tablename__ = "sms_code"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(
        String(20), index=True, comment="手机号"
    )
    code: Mapped[str] = mapped_column(
        String(6), comment="验证码"
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否已使用"
    )
    attempts: Mapped[int] = mapped_column(
        Integer, default=0, comment="验证尝试次数"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), comment="过期时间"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间",
    )


class RefreshToken(Base):
    """Refresh token 记录表，用于 token 轮换。"""

    __tablename__ = "refresh_token"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        index=True, comment="用户 ID"
    )
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, comment="refresh token 的 SHA-256 哈希"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), comment="过期时间"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间",
    )
```

File: `backend/src/app/auth/models.py`

- [ ] **Step 3: 编写 auth/schemas.py**

```python
"""Auth Pydantic schemas。"""

from pydantic import BaseModel

from app.user.schemas import UserResponse


class SmsCodeRequest(BaseModel):
    """发送验证码请求。"""

    phone: str


class LoginRequest(BaseModel):
    """登录请求。"""

    phone: str
    code: str


class TokenResponse(BaseModel):
    """登录/续签响应（响应体部分，token 通过 Set-Cookie 返回）。"""

    user: UserResponse
```

File: `backend/src/app/auth/schemas.py`

- [ ] **Step 4: 编写 auth/repository.py**

```python
"""Auth 数据访问层。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken, SmsCode


class AuthRepository:
    """认证数据查询封装。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ── 验证码 ──

    async def create_sms_code(self, sms_code: SmsCode) -> SmsCode:
        """保存验证码记录。"""
        self.session.add(sms_code)
        await self.session.flush()
        return sms_code

    async def get_latest_sms_code(self, phone: str) -> SmsCode | None:
        """获取手机号最新的未使用验证码。"""
        now = datetime.now(timezone.utc)
        stmt = (
            select(SmsCode)
            .where(
                and_(
                    SmsCode.phone == phone,
                    SmsCode.is_used.is_(False),
                    SmsCode.expires_at > now,
                    SmsCode.attempts < 5,
                )
            )
            .order_by(SmsCode.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_recent_sms(
        self, phone: str, since: datetime
    ) -> int:
        """统计指定时间范围内的发送次数。"""
        stmt = select(func.count()).select_from(SmsCode).where(
            and_(SmsCode.phone == phone, SmsCode.created_at >= since)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    # ── Refresh Token ──

    async def save_refresh_token(self, token: RefreshToken) -> RefreshToken:
        """保存 refresh token 记录。"""
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_refresh_token_by_hash(
        self, token_hash: str
    ) -> RefreshToken | None:
        """根据哈希查找 refresh token。"""
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_user_refresh_tokens(self, user_id: uuid.UUID) -> None:
        """撤销用户所有 refresh token（删除记录）。"""
        stmt = select(RefreshToken).where(RefreshToken.user_id == user_id)
        result = await self.session.execute(stmt)
        for token in result.scalars().all():
            await self.session.delete(token)
        await self.session.flush()
```

File: `backend/src/app/auth/repository.py`

- [ ] **Step 5: 编写 auth/sms.py（骨架，实际发送待阿里云配置就绪）**

```python
"""阿里云短信服务封装。

提供短信发送功能，当前为骨架实现。
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_sms_code(phone: str, code: str) -> bool:
    """发送短信验证码。

    Args:
        phone: 手机号。
        code: 验证码。

    Returns:
        是否发送成功。
    """
    # TODO: 对接阿里云短信 SDK（alibabacloud-dysmsapi）
    # SECURITY: 仅开发环境使用，生产环境必须对接真实短信服务
    logger.info(
        "发送短信验证码（开发模式）",
        extra={"phone": phone, "code": code},
    )
    return True
```

File: `backend/src/app/auth/sms.py`

- [ ] **Step 6: 提交**

```bash
git add backend/src/app/auth/
git commit -m "feat: 添加 Auth 领域——模型、schemas、repository、短信封装"
```

---

## Task 7: Auth 领域——service + router

**Files:**
- Create: `backend/src/app/auth/service.py`
- Create: `backend/src/app/auth/router.py`

- [ ] **Step 1: 编写 auth/service.py**

```python
"""Auth 业务逻辑层。"""

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken, SmsCode
from app.auth.repository import AuthRepository
from app.auth.sms import send_sms_code
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.user.models import User
from app.user.repository import UserRepository

logger = logging.getLogger(__name__)


class AuthService:
    """认证业务逻辑。"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.auth_repo = AuthRepository(session)
        self.user_repo = UserRepository(session)

    async def send_code(self, phone: str) -> None:
        """发送短信验证码。"""
        # 频率限制：60 秒内最多 1 条
        one_minute_ago = datetime.now(timezone.utc) - timedelta(seconds=60)
        recent_count = await self.auth_repo.count_recent_sms(phone, one_minute_ago)
        if recent_count > 0:
            raise AppException(429, "RATE_LIMITED", "发送过于频繁，请稍后再试")

        # 频率限制：1 小时内最多 5 条
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        hourly_count = await self.auth_repo.count_recent_sms(phone, one_hour_ago)
        if hourly_count >= 5:
            raise AppException(429, "RATE_LIMITED", "发送次数已达上限，请 1 小时后再试")

        # 生成 6 位验证码
        code = f"{secrets.randbelow(1000000):06d}"

        # 保存到数据库
        sms_code = SmsCode(
            phone=phone,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        await self.auth_repo.create_sms_code(sms_code)

        # 发送短信
        await send_sms_code(phone, code)
        await self.session.commit()

    async def login(self, phone: str, code: str) -> tuple[User, str, str]:
        """验证码登录。

        Returns:
            (用户, access_token, refresh_token) 元组。
        """
        # 校验验证码
        sms_code = await self.auth_repo.get_latest_sms_code(phone)
        if not sms_code or sms_code.code != code:
            if sms_code:
                sms_code.attempts += 1
                await self.session.flush()
            raise AppException(401, "INVALID_CODE", "验证码错误或已过期")

        # 标记验证码已使用
        sms_code.is_used = True
        await self.session.flush()

        # 查找或创建用户
        user = await self.user_repo.get_by_phone(phone)
        if not user:
            user = User(
                phone=phone,
                storage_quota=settings.default_storage_quota_bytes,
            )
            user = await self.user_repo.create(user)

        if not user.is_active:
            raise AppException(401, "USER_DISABLED", "账号已被禁用")

        # 生成 token
        access_token = create_access_token(
            user_id=str(user.id),
            role=user.role,
            is_active=user.is_active,
            secret=settings.JWT_SECRET,
            expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        )
        refresh_token = create_refresh_token(
            user_id=str(user.id),
            secret=settings.JWT_SECRET,
            expire_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
        )

        # 保存 refresh token 哈希
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        rt = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        await self.auth_repo.save_refresh_token(rt)
        await self.session.commit()

        logger.info("用户登录成功", extra={"user_id": str(user.id)})
        return user, access_token, refresh_token

    async def refresh(self, refresh_token_str: str) -> tuple[User, str, str]:
        """续签 token。

        Returns:
            (用户, 新 access_token, 新 refresh_token) 元组。
        """
        # 解码 refresh token
        try:
            payload = decode_token(refresh_token_str, secret=settings.JWT_SECRET)
        except Exception:
            raise AppException(401, "TOKEN_INVALID", "无效的 refresh token")

        if payload.get("type") != "refresh":
            raise AppException(401, "TOKEN_INVALID", "token 类型错误")

        user_id = uuid.UUID(payload["sub"])

        # 校验 refresh token 哈希（轮换机制）
        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        stored_token = await self.auth_repo.get_refresh_token_by_hash(token_hash)
        if not stored_token:
            # 可能被重放攻击，撤销该用户所有 refresh token
            await self.auth_repo.revoke_user_refresh_tokens(user_id)
            await self.session.commit()
            raise AppException(401, "TOKEN_INVALID", "refresh token 已失效")

        # 删除旧 refresh token
        await self.session.delete(stored_token)

        # 查询用户最新状态
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            await self.session.commit()
            raise AppException(401, "USER_DISABLED", "账号已被禁用")

        # 签发新 token
        new_access = create_access_token(
            user_id=str(user.id),
            role=user.role,
            is_active=user.is_active,
            secret=settings.JWT_SECRET,
            expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        )
        new_refresh = create_refresh_token(
            user_id=str(user.id),
            secret=settings.JWT_SECRET,
            expire_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
        )

        # 保存新 refresh token 哈希
        new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
        new_rt = RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        await self.auth_repo.save_refresh_token(new_rt)
        await self.session.commit()

        return user, new_access, new_refresh
```

File: `backend/src/app/auth/service.py`

- [ ] **Step 2: 编写 auth/router.py**

```python
"""Auth API 路由。"""

from fastapi import APIRouter, Cookie, Response

from app.auth.schemas import LoginRequest, SmsCodeRequest, TokenResponse
from app.core.config import settings
from app.core.dependencies import DbSession
from app.core.exceptions import AppException
from app.auth.service import AuthService
from app.user.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_token_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """设置认证 Cookie。"""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth/refresh",
    )


@router.post("/sms-code")
async def send_sms_code(
    body: SmsCodeRequest,
    session: DbSession,
) -> dict:
    """发送短信验证码。"""
    service = AuthService(session)
    await service.send_code(body.phone)
    return {"message": "验证码已发送"}


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    session: DbSession,
) -> TokenResponse:
    """手机号+验证码登录。"""
    service = AuthService(session)
    user, access_token, refresh_token = await service.login(body.phone, body.code)
    _set_token_cookies(response, access_token, refresh_token)
    return TokenResponse(user=UserResponse.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    session: DbSession,
    refresh_token: str | None = Cookie(default=None),
) -> TokenResponse:
    """续签 access token。"""
    if not refresh_token:
        raise AppException(401, "TOKEN_MISSING", "缺少 refresh token")
    service = AuthService(session)
    user, new_access, new_refresh = await service.refresh(refresh_token)
    _set_token_cookies(response, new_access, new_refresh)
    return TokenResponse(user=UserResponse.model_validate(user))
```

File: `backend/src/app/auth/router.py`

- [ ] **Step 3: 提交**

```bash
git add backend/src/app/auth/
git commit -m "feat: 添加 Auth 领域——service 和 router"
```

---

## Task 8: Document 领域

**Files:**
- Create: `backend/src/app/document/__init__.py`
- Create: `backend/src/app/document/models.py`
- Create: `backend/src/app/document/schemas.py`
- Create: `backend/src/app/document/repository.py`
- Create: `backend/src/app/document/service.py`
- Create: `backend/src/app/document/router.py`
- Create: `backend/src/app/document/storage/__init__.py`
- Create: `backend/src/app/document/storage/base.py`
- Create: `backend/src/app/document/storage/local.py`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/document/storage
touch d:/Code/mudasky/backend/src/app/document/__init__.py
touch d:/Code/mudasky/backend/src/app/document/storage/__init__.py
```

- [ ] **Step 2: 编写 document/models.py**

```python
"""Document ORM 模型。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Document(Base):
    """文档表。"""

    __tablename__ = "document"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    file_name: Mapped[str] = mapped_column(
        String(255), comment="原始文件名"
    )
    file_path: Mapped[str] = mapped_column(
        String(500), comment="存储路径"
    )
    file_hash: Mapped[str] = mapped_column(
        String(64), index=True, comment="SHA-256 哈希"
    )
    mime_type: Mapped[str] = mapped_column(
        String(100), comment="MIME 类型"
    )
    file_size: Mapped[int] = mapped_column(
        Integer, comment="文件大小（字节）"
    )
    uploader_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id"), index=True, comment="上传者 ID"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="状态：pending / processed"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="上传时间",
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        onupdate=lambda: datetime.now(timezone.utc),
        comment="更新时间",
    )
```

File: `backend/src/app/document/models.py`

- [ ] **Step 3: 编写 document/storage/base.py**

```python
"""文件存储抽象接口。"""

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """存储后端抽象基类。"""

    @abstractmethod
    async def save(self, path: str, data: bytes) -> str:
        """保存文件。

        Args:
            path: 存储路径。
            data: 文件二进制内容。

        Returns:
            实际存储路径。
        """
        ...

    @abstractmethod
    async def delete(self, path: str) -> None:
        """删除文件。

        Args:
            path: 文件存储路径。
        """
        ...

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """检查文件是否存在。

        Args:
            path: 文件存储路径。
        """
        ...
```

File: `backend/src/app/document/storage/base.py`

- [ ] **Step 4: 编写 document/storage/local.py**

```python
"""本地磁盘文件存储实现。"""

import asyncio
from pathlib import Path

from app.document.storage.base import StorageBackend


class LocalStorage(StorageBackend):
    """本地磁盘存储后端。"""

    def __init__(self, base_dir: str = "/data/uploads"):
        self.base_dir = Path(base_dir)

    async def save(self, path: str, data: bytes) -> str:
        """保存文件到本地磁盘。"""
        full_path = self.base_dir / path
        await asyncio.to_thread(full_path.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(full_path.write_bytes, data)
        return str(full_path)

    async def delete(self, path: str) -> None:
        """从本地磁盘删除文件。"""
        full_path = self.base_dir / path
        if await asyncio.to_thread(full_path.exists):
            await asyncio.to_thread(full_path.unlink)

    async def exists(self, path: str) -> bool:
        """检查本地文件是否存在。"""
        return await asyncio.to_thread((self.base_dir / path).exists)
```

File: `backend/src/app/document/storage/local.py`

- [ ] **Step 5: 编写 document/schemas.py**

```python
"""Document Pydantic schemas。"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    """文档响应。"""

    id: uuid.UUID
    file_name: str
    file_hash: str
    mime_type: str
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
```

File: `backend/src/app/document/schemas.py`

- [ ] **Step 6: 编写 document/repository.py**

```python
"""Document 数据访问层。"""

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.document.models import Document


class DocumentRepository:
    """文档数据查询封装。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, document: Document) -> Document:
        """保存文档记录。"""
        self.session.add(document)
        await self.session.flush()
        return document

    async def get_by_id(self, doc_id: uuid.UUID) -> Document | None:
        """根据 ID 查询文档。"""
        return await self.session.get(Document, doc_id)

    async def get_by_hash(self, file_hash: str, uploader_id: uuid.UUID) -> Document | None:
        """根据文件哈希和上传者查询文档（去重用）。"""
        stmt = select(Document).where(
            Document.file_hash == file_hash,
            Document.uploader_id == uploader_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_storage_used(self, user_id: uuid.UUID) -> int:
        """查询用户已使用的存储空间（字节）。"""
        stmt = select(func.coalesce(func.sum(Document.file_size), 0)).where(
            Document.uploader_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def list_by_user(
        self, user_id: uuid.UUID, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Document], int]:
        """分页查询用户的文档列表。"""
        count_stmt = (
            select(func.count())
            .select_from(Document)
            .where(Document.uploader_id == user_id)
        )
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Document)
            .where(Document.uploader_id == user_id)
            .offset(offset)
            .limit(limit)
            .order_by(Document.created_at.desc())
        )
        result = await self.session.execute(stmt)
        docs = list(result.scalars().all())
        return docs, total

    async def delete(self, document: Document) -> None:
        """删除文档记录。"""
        await self.session.delete(document)
        await self.session.flush()
```

File: `backend/src/app/document/repository.py`

- [ ] **Step 7: 编写 document/service.py**

```python
"""Document 业务逻辑层。"""

import hashlib
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    QuotaExceededException,
)
from app.document.models import Document
from app.document.repository import DocumentRepository
from app.document.storage.local import LocalStorage
from app.user.repository import UserRepository

logger = logging.getLogger(__name__)

storage = LocalStorage()


class DocumentService:
    """文档业务逻辑。"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.doc_repo = DocumentRepository(session)
        self.user_repo = UserRepository(session)

    async def upload(
        self,
        *,
        user_id: uuid.UUID,
        file_name: str,
        mime_type: str,
        data: bytes,
    ) -> Document:
        """上传文档。"""
        file_size = len(data)

        # 单文件大小校验
        if file_size > settings.max_upload_size_bytes:
            raise QuotaExceededException(
                message=f"文件大小超过限制（最大 {settings.MAX_UPLOAD_SIZE_MB}MB）"
            )

        # 用户配额校验
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(message="用户不存在")
        used = await self.doc_repo.get_user_storage_used(user_id)
        if used + file_size > user.storage_quota:
            raise QuotaExceededException(message="存储配额已满")

        # 文件哈希去重
        file_hash = hashlib.sha256(data).hexdigest()
        existing = await self.doc_repo.get_by_hash(file_hash, user_id)
        if existing:
            raise ConflictException(message="文件已存在")

        # 生成存储路径
        now = datetime.now(timezone.utc)
        path = f"{user_id}/{now.strftime('%Y/%m')}/{uuid.uuid4()}/{file_name}"

        # 保存文件
        stored_path = await storage.save(path, data)

        # 保存记录
        document = Document(
            file_name=file_name,
            file_path=stored_path,
            file_hash=file_hash,
            mime_type=mime_type,
            file_size=file_size,
            uploader_id=user_id,
        )
        document = await self.doc_repo.create(document)
        await self.session.commit()

        logger.info("文档上传成功", extra={"doc_id": str(document.id), "user_id": str(user_id)})
        return document

    async def get_document(self, doc_id: uuid.UUID) -> Document:
        """获取文档详情。"""
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundException(message="文档不存在")
        return doc

    async def list_user_documents(
        self, user_id: uuid.UUID, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Document], int]:
        """获取用户文档列表。"""
        return await self.doc_repo.list_by_user(user_id, offset=offset, limit=limit)

    async def delete_document(self, doc_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """删除文档。"""
        doc = await self.get_document(doc_id)
        if doc.uploader_id != user_id:
            raise NotFoundException(message="文档不存在")
        await storage.delete(doc.file_path)
        await self.doc_repo.delete(doc)
        await self.session.commit()
```

File: `backend/src/app/document/service.py`

- [ ] **Step 8: 编写 document/router.py**

```python
"""Document API 路由。"""

import uuid

from fastapi import APIRouter, UploadFile

from app.core.dependencies import CurrentUserId, DbSession
from app.core.pagination import PaginatedResponse, PaginationParams
from app.document.schemas import DocumentResponse
from app.document.service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile,
    user_id: CurrentUserId,
    session: DbSession,
) -> DocumentResponse:
    """上传文档。"""
    data = await file.read()
    service = DocumentService(session)
    doc = await service.upload(
        user_id=uuid.UUID(user_id),
        file_name=file.filename or "unnamed",
        mime_type=file.content_type or "application/octet-stream",
        data=data,
    )
    return DocumentResponse.model_validate(doc)


@router.get("", response_model=PaginatedResponse[DocumentResponse])
async def list_documents(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[DocumentResponse]:
    """获取当前用户的文档列表。"""
    params = PaginationParams(page=page, page_size=page_size)
    service = DocumentService(session)
    docs, total = await service.list_user_documents(
        uuid.UUID(user_id), offset=params.offset, limit=params.page_size
    )
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    session: DbSession,
) -> DocumentResponse:
    """获取文档详情。"""
    service = DocumentService(session)
    doc = await service.get_document(doc_id)
    return DocumentResponse.model_validate(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除文档。"""
    service = DocumentService(session)
    await service.delete_document(doc_id, uuid.UUID(user_id))
```

File: `backend/src/app/document/router.py`

- [ ] **Step 9: 提交**

```bash
git add backend/src/app/document/
git commit -m "feat: 添加 Document 领域——模型、存储抽象、service、router"
```

---

## Task 9: Content 领域——models + schemas + repository

**Files:**
- Create: `backend/src/app/content/__init__.py`
- Create: `backend/src/app/content/models.py`
- Create: `backend/src/app/content/schemas.py`
- Create: `backend/src/app/content/repository.py`

- [ ] **Step 1: 创建 content 包**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/content
touch d:/Code/mudasky/backend/src/app/content/__init__.py
```

- [ ] **Step 2: 编写 content/models.py**

```python
"""Content ORM 模型。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    """文章分类表。"""

    __tablename__ = "category"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(50), unique=True, comment="分类名称"
    )
    slug: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, comment="URL 友好标识"
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, comment="排序权重"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间",
    )


class Article(Base):
    """文章表。"""

    __tablename__ = "article"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(
        String(200), comment="文章标题"
    )
    content: Mapped[str] = mapped_column(
        Text, comment="文章正文"
    )
    summary: Mapped[str | None] = mapped_column(
        String(500), default=None, comment="摘要"
    )
    cover_image: Mapped[str | None] = mapped_column(
        String(500), default=None, comment="封面图路径"
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("category.id"), index=True, comment="分类 ID"
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id"), index=True, comment="作者 ID"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft",
        comment="状态：draft / pending / published / rejected",
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, comment="发布时间"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间",
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        onupdate=lambda: datetime.now(timezone.utc),
        comment="更新时间",
    )
```

File: `backend/src/app/content/models.py`

- [ ] **Step 3: 编写 content/schemas.py**

```python
"""Content Pydantic schemas。"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    """创建分类请求。"""

    name: str
    slug: str
    sort_order: int = 0


class CategoryResponse(BaseModel):
    """分类响应。"""

    id: uuid.UUID
    name: str
    slug: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    """创建文章请求。"""

    title: str
    content: str
    summary: str | None = None
    cover_image: str | None = None
    category_id: uuid.UUID


class ArticleUpdate(BaseModel):
    """更新文章请求。"""

    title: str | None = None
    content: str | None = None
    summary: str | None = None
    cover_image: str | None = None
    category_id: uuid.UUID | None = None


class ArticleResponse(BaseModel):
    """文章响应。"""

    id: uuid.UUID
    title: str
    content: str
    summary: str | None = None
    cover_image: str | None = None
    category_id: uuid.UUID
    author_id: uuid.UUID
    status: str
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
```

File: `backend/src/app/content/schemas.py`

- [ ] **Step 4: 编写 content/repository.py**

```python
"""Content 数据访问层。"""

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Article, Category


class ContentRepository:
    """内容数据查询封装。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ── 分类 ──

    async def create_category(self, category: Category) -> Category:
        """创建分类。"""
        self.session.add(category)
        await self.session.flush()
        return category

    async def get_category_by_id(self, category_id: uuid.UUID) -> Category | None:
        """根据 ID 查询分类。"""
        return await self.session.get(Category, category_id)

    async def list_categories(self) -> list[Category]:
        """查询所有分类（按排序权重）。"""
        stmt = select(Category).order_by(Category.sort_order)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ── 文章 ──

    async def create_article(self, article: Article) -> Article:
        """创建文章。"""
        self.session.add(article)
        await self.session.flush()
        return article

    async def get_article_by_id(self, article_id: uuid.UUID) -> Article | None:
        """根据 ID 查询文章。"""
        return await self.session.get(Article, article_id)

    async def list_published(
        self, *, offset: int = 0, limit: int = 20, category_id: uuid.UUID | None = None
    ) -> tuple[list[Article], int]:
        """分页查询已发布文章（公开接口用）。"""
        conditions = [Article.status == "published"]
        if category_id:
            conditions.append(Article.category_id == category_id)

        count_stmt = select(func.count()).select_from(Article).where(*conditions)
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Article)
            .where(*conditions)
            .offset(offset)
            .limit(limit)
            .order_by(Article.published_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def list_by_author(
        self, author_id: uuid.UUID, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Article], int]:
        """分页查询用户自己的文章（全部状态）。"""
        count_stmt = (
            select(func.count())
            .select_from(Article)
            .where(Article.author_id == author_id)
        )
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Article)
            .where(Article.author_id == author_id)
            .offset(offset)
            .limit(limit)
            .order_by(Article.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def list_pending(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Article], int]:
        """分页查询待审核文章（管理员用）。"""
        count_stmt = (
            select(func.count())
            .select_from(Article)
            .where(Article.status == "pending")
        )
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Article)
            .where(Article.status == "pending")
            .offset(offset)
            .limit(limit)
            .order_by(Article.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def delete_article(self, article: Article) -> None:
        """删除文章。"""
        await self.session.delete(article)
        await self.session.flush()
```

File: `backend/src/app/content/repository.py`

- [ ] **Step 5: 提交**

```bash
git add backend/src/app/content/
git commit -m "feat: 添加 Content 领域——模型、schemas、repository"
```

---

## Task 10: Content 领域——service + router

**Files:**
- Create: `backend/src/app/content/service.py`
- Create: `backend/src/app/content/router.py`

- [ ] **Step 1: 编写 content/service.py**

```python
"""Content 业务逻辑层。"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Article, Category
from app.content.repository import ContentRepository
from app.content.schemas import ArticleCreate, ArticleUpdate
from app.core.exceptions import ForbiddenException, NotFoundException

logger = logging.getLogger(__name__)


class ContentService:
    """内容业务逻辑。"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ContentRepository(session)

    # ── 分类 ──

    async def create_category(self, name: str, slug: str, sort_order: int = 0) -> Category:
        """创建分类。"""
        category = Category(name=name, slug=slug, sort_order=sort_order)
        category = await self.repo.create_category(category)
        await self.session.commit()
        return category

    async def list_categories(self) -> list[Category]:
        """获取所有分类。"""
        return await self.repo.list_categories()

    # ── 文章 ──

    async def create_article(
        self, data: ArticleCreate, author_id: uuid.UUID, role: str
    ) -> Article:
        """创建文章。

        管理员直接发布，普通用户提交待审核。
        """
        article = Article(
            title=data.title,
            content=data.content,
            summary=data.summary,
            cover_image=data.cover_image,
            category_id=data.category_id,
            author_id=author_id,
            status="published" if role == "admin" else "pending",
            published_at=datetime.now(timezone.utc) if role == "admin" else None,
        )
        article = await self.repo.create_article(article)
        await self.session.commit()
        logger.info("文章创建", extra={"article_id": str(article.id), "status": article.status})
        return article

    async def get_article(self, article_id: uuid.UUID) -> Article:
        """获取文章详情。"""
        article = await self.repo.get_article_by_id(article_id)
        if not article:
            raise NotFoundException(message="文章不存在")
        return article

    async def update_article(
        self, article_id: uuid.UUID, data: ArticleUpdate, user_id: uuid.UUID, role: str
    ) -> Article:
        """更新文章。"""
        article = await self.get_article(article_id)
        if article.author_id != user_id and role != "admin":
            raise ForbiddenException(message="无权修改此文章")
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(article, field, value)
        await self.session.flush()
        await self.session.commit()
        return article

    async def delete_article(
        self, article_id: uuid.UUID, user_id: uuid.UUID, role: str
    ) -> None:
        """删除文章。"""
        article = await self.get_article(article_id)
        if article.author_id != user_id and role != "admin":
            raise ForbiddenException(message="无权删除此文章")
        await self.repo.delete_article(article)
        await self.session.commit()

    async def submit_for_review(self, article_id: uuid.UUID, user_id: uuid.UUID) -> Article:
        """用户提交文章审核。"""
        article = await self.get_article(article_id)
        if article.author_id != user_id:
            raise ForbiddenException(message="无权操作此文章")
        if article.status != "draft":
            raise ForbiddenException(message="只有草稿状态的文章可以提交审核")
        article.status = "pending"
        await self.session.flush()
        await self.session.commit()
        return article

    async def review_article(
        self, article_id: uuid.UUID, approved: bool
    ) -> Article:
        """管理员审核文章。"""
        article = await self.get_article(article_id)
        if article.status != "pending":
            raise ForbiddenException(message="只有待审核的文章可以审核")
        if approved:
            article.status = "published"
            article.published_at = datetime.now(timezone.utc)
        else:
            article.status = "rejected"
        await self.session.flush()
        await self.session.commit()
        logger.info("文章审核", extra={"article_id": str(article.id), "status": article.status})
        return article

    async def list_published(
        self, *, offset: int = 0, limit: int = 20, category_id: uuid.UUID | None = None
    ) -> tuple[list[Article], int]:
        """获取已发布文章列表（公开）。"""
        return await self.repo.list_published(
            offset=offset, limit=limit, category_id=category_id
        )

    async def list_my_articles(
        self, author_id: uuid.UUID, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Article], int]:
        """获取用户自己的文章列表。"""
        return await self.repo.list_by_author(author_id, offset=offset, limit=limit)

    async def list_pending(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Article], int]:
        """获取待审核文章列表（管理员用）。"""
        return await self.repo.list_pending(offset=offset, limit=limit)
```

File: `backend/src/app/content/service.py`

- [ ] **Step 2: 编写 content/router.py**

```python
"""Content API 路由。"""

import uuid

from fastapi import APIRouter, Depends

from app.content.schemas import (
    ArticleCreate,
    ArticleResponse,
    ArticleUpdate,
    CategoryCreate,
    CategoryResponse,
)
from app.content.service import ContentService
from app.core.dependencies import (
    CurrentUserId,
    CurrentUserRole,
    DbSession,
    require_role,
)
from app.core.pagination import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/content", tags=["content"])


# ── 公开接口（白名单，无需认证） ──


@router.get("/articles", response_model=PaginatedResponse[ArticleResponse])
async def list_published_articles(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
    category_id: uuid.UUID | None = None,
) -> PaginatedResponse[ArticleResponse]:
    """获取已发布文章列表（公开）。"""
    params = PaginationParams(page=page, page_size=page_size)
    service = ContentService(session)
    articles, total = await service.list_published(
        offset=params.offset, limit=params.page_size, category_id=category_id
    )
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[ArticleResponse.model_validate(a) for a in articles],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_published_article(
    article_id: uuid.UUID,
    session: DbSession,
) -> ArticleResponse:
    """获取文章详情（公开，仅已发布）。"""
    service = ContentService(session)
    article = await service.get_article(article_id)
    if article.status != "published":
        from app.core.exceptions import NotFoundException
        raise NotFoundException(message="文章不存在")
    return ArticleResponse.model_validate(article)


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    session: DbSession,
) -> list[CategoryResponse]:
    """获取分类列表（公开）。"""
    service = ContentService(session)
    categories = await service.list_categories()
    return [CategoryResponse.model_validate(c) for c in categories]


# ── 需要认证的接口 ──


@router.post("", response_model=ArticleResponse, status_code=201)
async def create_article(
    data: ArticleCreate,
    user_id: CurrentUserId,
    role: CurrentUserRole,
    session: DbSession,
) -> ArticleResponse:
    """创建文章（管理员直接发布，用户提交待审核）。"""
    service = ContentService(session)
    article = await service.create_article(data, uuid.UUID(user_id), role)
    return ArticleResponse.model_validate(article)


@router.patch("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: uuid.UUID,
    data: ArticleUpdate,
    user_id: CurrentUserId,
    role: CurrentUserRole,
    session: DbSession,
) -> ArticleResponse:
    """更新文章。"""
    service = ContentService(session)
    article = await service.update_article(article_id, data, uuid.UUID(user_id), role)
    return ArticleResponse.model_validate(article)


@router.delete("/{article_id}", status_code=204)
async def delete_article(
    article_id: uuid.UUID,
    user_id: CurrentUserId,
    role: CurrentUserRole,
    session: DbSession,
) -> None:
    """删除文章。"""
    service = ContentService(session)
    await service.delete_article(article_id, uuid.UUID(user_id), role)


@router.get("/my", response_model=PaginatedResponse[ArticleResponse])
async def list_my_articles(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[ArticleResponse]:
    """获取当前用户的文章列表（全部状态）。"""
    params = PaginationParams(page=page, page_size=page_size)
    service = ContentService(session)
    articles, total = await service.list_my_articles(
        uuid.UUID(user_id), offset=params.offset, limit=params.page_size
    )
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[ArticleResponse.model_validate(a) for a in articles],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.post("/{article_id}/submit", response_model=ArticleResponse)
async def submit_article(
    article_id: uuid.UUID,
    user_id: CurrentUserId,
    session: DbSession,
) -> ArticleResponse:
    """提交文章审核。"""
    service = ContentService(session)
    article = await service.submit_for_review(article_id, uuid.UUID(user_id))
    return ArticleResponse.model_validate(article)


# ── 管理员接口 ──


@router.get(
    "/pending",
    response_model=PaginatedResponse[ArticleResponse],
    dependencies=[Depends(require_role("admin"))],
)
async def list_pending_articles(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[ArticleResponse]:
    """获取待审核文章列表（管理员）。"""
    params = PaginationParams(page=page, page_size=page_size)
    service = ContentService(session)
    articles, total = await service.list_pending(
        offset=params.offset, limit=params.page_size
    )
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[ArticleResponse.model_validate(a) for a in articles],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.post(
    "/{article_id}/review",
    response_model=ArticleResponse,
    dependencies=[Depends(require_role("admin"))],
)
async def review_article(
    article_id: uuid.UUID,
    approved: bool,
    session: DbSession,
) -> ArticleResponse:
    """审核文章（管理员）。"""
    service = ContentService(session)
    article = await service.review_article(article_id, approved)
    return ArticleResponse.model_validate(article)


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_category(
    data: CategoryCreate,
    session: DbSession,
) -> CategoryResponse:
    """创建分类（管理员）。"""
    service = ContentService(session)
    category = await service.create_category(data.name, data.slug, data.sort_order)
    return CategoryResponse.model_validate(category)
```

File: `backend/src/app/content/router.py`

- [ ] **Step 3: 提交**

```bash
git add backend/src/app/content/
git commit -m "feat: 添加 Content 领域——service 和 router"
```

---

## Task 11: Admin 领域（骨架）

**Files:**
- Create: `backend/src/app/admin/__init__.py`
- Create: `backend/src/app/admin/schemas.py`
- Create: `backend/src/app/admin/service.py`
- Create: `backend/src/app/admin/router.py`

- [ ] **Step 1: 创建 admin 包和骨架文件**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/admin
touch d:/Code/mudasky/backend/src/app/admin/__init__.py
```

- [ ] **Step 2: 编写 admin/schemas.py**

```python
"""Admin Pydantic schemas。"""

from app.user.schemas import UserResponse, UserUpdate


# 管理员使用的 schemas 复用 User schemas
# 后续根据需要添加管理员专用的 schemas
```

File: `backend/src/app/admin/schemas.py`

- [ ] **Step 3: 编写 admin/service.py**

```python
"""Admin 业务逻辑层。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.user.repository import UserRepository
from app.user.schemas import UserUpdate
from app.user.service import UserService


class AdminService:
    """管理员业务逻辑。"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_service = UserService(session)
        self.user_repo = UserRepository(session)

    async def list_users(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list, int]:
        """分页获取所有用户列表。"""
        return await self.user_repo.list_users(offset=offset, limit=limit)

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate):
        """更新用户信息（含角色、启用状态等）。"""
        return await self.user_service.update_user(user_id, data)
```

File: `backend/src/app/admin/service.py`

- [ ] **Step 4: 编写 admin/router.py**

```python
"""Admin API 路由。"""

import uuid

from fastapi import APIRouter, Depends

from app.admin.service import AdminService
from app.core.dependencies import DbSession, require_role
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.schemas import UserResponse, UserUpdate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def list_users(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserResponse]:
    """管理员获取用户列表。"""
    params = PaginationParams(page=page, page_size=page_size)
    service = AdminService(session)
    users, total = await service.list_users(offset=params.offset, limit=params.page_size)
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    session: DbSession,
) -> UserResponse:
    """管理员更新用户信息。"""
    service = AdminService(session)
    user = await service.update_user(user_id, data)
    return UserResponse.model_validate(user)
```

File: `backend/src/app/admin/router.py`

- [ ] **Step 5: 提交**

```bash
git add backend/src/app/admin/
git commit -m "feat: 添加 Admin 领域骨架"
```

---

## Task 12: Worker 骨架（任务队列 + 消费循环）

**Files:**
- Create: `backend/src/app/worker/__init__.py`
- Create: `backend/src/app/worker/models.py`
- Create: `backend/src/app/worker/queue.py`
- Create: `backend/src/app/worker/main.py`

- [ ] **Step 1: 创建 worker 包**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/worker
touch d:/Code/mudasky/backend/src/app/worker/__init__.py
```

- [ ] **Step 2: 编写 worker/models.py**

```python
"""Worker 任务 ORM 模型。"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Task(Base):
    """任务表。"""

    __tablename__ = "task"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    task_type: Mapped[str] = mapped_column(
        String(50), index=True, comment="任务类型"
    )
    payload: Mapped[str] = mapped_column(
        Text, comment="任务参数（JSON）"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", index=True,
        comment="状态：pending / running / completed / failed",
    )
    result: Mapped[str | None] = mapped_column(
        Text, default=None, comment="执行结果（JSON）"
    )
    error: Mapped[str | None] = mapped_column(
        Text, default=None, comment="错误信息"
    )
    retry_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="重试次数"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间",
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, comment="开始执行时间"
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, comment="完成时间"
    )
```

File: `backend/src/app/worker/models.py`

- [ ] **Step 3: 编写 worker/queue.py**

```python
"""PostgreSQL 任务队列。

基于 SELECT ... FOR UPDATE SKIP LOCKED 实现 FIFO 抢占式队列。
"""

import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.worker.models import Task

logger = logging.getLogger(__name__)


async def enqueue(session: AsyncSession, task_type: str, payload: str) -> Task:
    """任务入队。

    Args:
        session: 数据库会话。
        task_type: 任务类型标识。
        payload: 任务参数（JSON 字符串）。

    Returns:
        创建的任务记录。
    """
    task = Task(task_type=task_type, payload=payload)
    session.add(task)
    await session.flush()
    return task


async def dequeue(session: AsyncSession) -> Task | None:
    """抢占一个待执行任务（FIFO）。

    使用 FOR UPDATE SKIP LOCKED 实现多 Worker 安全抢占。

    Returns:
        抢占到的任务，无可用任务时返回 None。
    """
    stmt = (
        select(Task)
        .where(Task.status == "pending")
        .order_by(Task.created_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    result = await session.execute(stmt)
    task = result.scalar_one_or_none()
    if task:
        task.status = "running"
        task.started_at = datetime.now(timezone.utc)
        await session.flush()
    return task


async def complete(session: AsyncSession, task: Task, result: str) -> None:
    """标记任务完成。"""
    task.status = "completed"
    task.result = result
    task.completed_at = datetime.now(timezone.utc)
    await session.flush()


async def fail(session: AsyncSession, task: Task, error: str) -> None:
    """标记任务失败。"""
    task.status = "failed"
    task.error = error
    task.completed_at = datetime.now(timezone.utc)
    await session.flush()
```

File: `backend/src/app/worker/queue.py`

- [ ] **Step 4: 编写 worker/main.py**

```python
"""Worker 入口。

单线程消费循环，从 PostgreSQL 任务队列抢占任务并执行。
"""

import asyncio
import logging

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.logging import setup_logging
from app.worker import queue

logger = logging.getLogger(__name__)

# 无任务时的轮询间隔（秒）
POLL_INTERVAL = 5


async def process_task(task) -> str:
    """处理单个任务。

    TODO: 后期根据 task.task_type 分发到具体的 Agent 处理逻辑。

    Returns:
        处理结果（JSON 字符串）。
    """
    logger.info("开始处理任务", extra={"task_id": str(task.id), "type": task.task_type})
    # 占位实现
    return '{"status": "done"}'


async def run() -> None:
    """Worker 主循环。"""
    logger.info("Worker 启动")
    while True:
        async with async_session_factory() as session:
            task = await queue.dequeue(session)
            if task is None:
                await session.commit()
                await asyncio.sleep(POLL_INTERVAL)
                continue
            try:
                result = await process_task(task)
                await queue.complete(session, task, result)
                logger.info("任务完成", extra={"task_id": str(task.id)})
            except Exception as e:
                await queue.fail(session, task, str(e))
                logger.error("任务失败", extra={"task_id": str(task.id), "error": str(e)})
            await session.commit()


def main() -> None:
    """入口函数。"""
    setup_logging()
    asyncio.run(run())


if __name__ == "__main__":
    main()
```

File: `backend/src/app/worker/main.py`

- [ ] **Step 5: 提交**

```bash
git add backend/src/app/worker/
git commit -m "feat: 添加 Worker 骨架——任务模型、队列、消费循环"
```

---

## Task 13: FastAPI 入口 + Alembic 迁移

**Files:**
- Create: `backend/src/app/api/__init__.py`
- Create: `backend/src/app/api/main.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/tests/conftest.py`
- Create: `backend/scripts/start.sh`

- [ ] **Step 1: 创建 api 包**

```bash
mkdir -p d:/Code/mudasky/backend/src/app/api
touch d:/Code/mudasky/backend/src/app/api/__init__.py
```

- [ ] **Step 2: 编写 api/main.py**

```python
"""FastAPI 应用入口。

挂载所有领域路由，注册异常处理和中间件。
"""

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.content.router import router as content_router
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.document.router import router as document_router
from app.admin.router import router as admin_router
from app.user.router import router as user_router

setup_logging()

app = FastAPI(title="mudasky", version="0.1.0")

# 注册异常处理
register_exception_handlers(app)

# 挂载路由
app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(document_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health")
async def health_check() -> dict:
    """健康检查端点。"""
    return {"status": "ok"}
```

File: `backend/src/app/api/main.py`

- [ ] **Step 3: 初始化 Alembic**

Run: `cd d:/Code/mudasky/backend && uv run alembic init alembic`
Expected: 创建 `alembic/` 目录和 `alembic.ini`

- [ ] **Step 4: 修改 alembic.ini**

将 `sqlalchemy.url` 行注释掉（改为在 env.py 中动态设置）：

```ini
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

- [ ] **Step 5: 修改 alembic/env.py**

替换为以下内容，支持 async 和自动检测模型：

```python
"""Alembic 迁移环境配置。"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.database import Base

# 导入所有模型，确保 Alembic 能检测到
from app.user.models import User  # noqa: F401
from app.auth.models import SmsCode, RefreshToken  # noqa: F401
from app.content.models import Article, Category  # noqa: F401
from app.document.models import Document  # noqa: F401
from app.worker.models import Task  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式迁移。"""
    context.configure(
        url=settings.database_url.replace("+asyncpg", ""),
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """执行迁移。"""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """异步模式迁移。"""
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    """在线模式迁移。"""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

File: `backend/alembic/env.py`

- [ ] **Step 6: 编写容器启动脚本**

```bash
#!/bin/bash
# 后端容器启动脚本：先执行数据库迁移，再启动应用

set -e

echo "执行数据库迁移..."
alembic upgrade head

echo "启动应用..."
exec uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

File: `backend/scripts/start.sh`

记得设置可执行权限：

Run: `chmod +x d:/Code/mudasky/backend/scripts/start.sh`

- [ ] **Step 7: 编写 tests/conftest.py（骨架）**

```python
"""pytest 全局 fixtures。"""

import pytest
```

File: `backend/tests/conftest.py`

- [ ] **Step 8: 提交**

```bash
git add backend/src/app/api/ backend/alembic.ini backend/alembic/ backend/scripts/ backend/tests/conftest.py
git commit -m "feat: 添加 FastAPI 入口、Alembic 迁移配置、启动脚本"
```

---

## Task 14: Docker 基础设施

**Files:**
- Modify: `docker/backend.Dockerfile`
- Modify: `docker/gateway.Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.override.yml`

- [ ] **Step 1: 编写 backend.Dockerfile**

```dockerfile
FROM python:3.14-slim

WORKDIR /app

# 安装依赖
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# 复制源码
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/start.sh ./

# 设置 Python 路径
ENV PYTHONPATH=/app/src

RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
```

File: `docker/backend.Dockerfile`

- [ ] **Step 2: 编写 gateway.Dockerfile**

```dockerfile
FROM openresty/openresty:alpine

# 安装 lua-resty-jwt
RUN opm get SkyLothar/lua-resty-jwt

# 复制配置
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY lua/ /usr/local/openresty/nginx/lua/

EXPOSE 80

CMD ["openresty", "-g", "daemon off;"]
```

File: `docker/gateway.Dockerfile`

- [ ] **Step 3: 编写 docker-compose.yml（生产环境）**

```yaml
services:
  gateway:
    build:
      context: ./gateway
      dockerfile: ../docker/gateway.Dockerfile
    ports:
      - "80:80"
    volumes:
      - frontend_dist:/usr/local/openresty/nginx/html
    depends_on:
      backend:
        condition: service_healthy
    environment:
      - JWT_SECRET=${JWT_SECRET}

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    env_file: .env
    volumes:
      - uploads:/data/uploads
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  worker:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    command: ["python", "-m", "app.worker.main"]
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    profiles: ["worker"]

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-mudasky}
      POSTGRES_USER: ${DB_USER:-mudasky}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-mudasky}"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  uploads:
```

File: `docker-compose.yml`

- [ ] **Step 4: 编写 docker-compose.override.yml（开发环境）**

```yaml
services:
  gateway:
    ports:
      - "80:80"
    volumes:
      - ./gateway/nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf:ro
      - ./gateway/conf.d/:/etc/nginx/conf.d/:ro
      - ./gateway/lua/:/usr/local/openresty/nginx/lua/:ro

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    command: ["sh", "-c", "alembic upgrade head && uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload"]
    ports:
      - "8000:8000"
    volumes:
      - ./backend/src:/app/src
      - uploads:/data/uploads
    environment:
      - PYTHONPATH=/app/src

  db:
    ports:
      - "5432:5432"

  frontend:
    profiles: ["dev"]
    image: node:22-alpine
    working_dir: /app
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
    command: ["sh", "-c", "pnpm install && pnpm dev --host"]

volumes:
  pgdata:
  uploads:
  frontend_dist:
```

File: `docker-compose.override.yml`

- [ ] **Step 5: 提交**

```bash
git add docker/ docker-compose.yml docker-compose.override.yml
git commit -m "feat: 添加 Docker 基础设施——Dockerfile 和 Compose 配置"
```

---

## Task 15: OpenResty 网关配置

**Files:**
- Modify: `gateway/nginx.conf`
- Create: `gateway/conf.d/upstream.conf`
- Create: `gateway/conf.d/server.conf`
- Create: `gateway/lua/init.lua`
- Create: `gateway/lua/auth.lua`
- Create: `gateway/lua/rate_limit.lua`

- [ ] **Step 1: 编写 nginx.conf**

```nginx
# mudasky OpenResty 主配置

worker_processes auto;
error_log /usr/local/openresty/nginx/logs/error.log warn;

events {
  worker_connections 1024;
}

http {
  include mime.types;
  default_type application/octet-stream;

  # JSON 结构化访问日志
  log_format json_log escape=json
    '{"timestamp":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"method":"$request_method",'
    '"uri":"$request_uri",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"user_id":"$http_x_user_id"}';

  access_log /usr/local/openresty/nginx/logs/access.log json_log;

  sendfile on;
  keepalive_timeout 65;
  client_max_body_size 20m;

  # Lua 模块路径
  lua_package_path "/usr/local/openresty/nginx/lua/?.lua;;";

  # 加载 JWT 密钥到共享内存
  lua_shared_dict config 1m;
  init_by_lua_block {
    local config_dict = ngx.shared.config
    config_dict:set("jwt_secret", os.getenv("JWT_SECRET") or "")
  }

  # 安全头
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-XSS-Protection "1; mode=block" always;

  include /etc/nginx/conf.d/*.conf;
}
```

File: `gateway/nginx.conf`

- [ ] **Step 2: 编写 conf.d/upstream.conf**

```nginx
# 后端服务上游定义

upstream backend {
  server backend:8000;
}
```

File: `gateway/conf.d/upstream.conf`

- [ ] **Step 3: 编写 conf.d/server.conf**

```nginx
# server 块和路由规则

server {
  listen 80;
  server_name _;

  # API 路由 — 走认证和限流
  location /api/ {
    access_by_lua_file /usr/local/openresty/nginx/lua/auth.lua;

    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # 前端静态文件
  location / {
    root /usr/local/openresty/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
}
```

File: `gateway/conf.d/server.conf`

- [ ] **Step 4: 创建 lua 目录**

```bash
mkdir -p d:/Code/mudasky/gateway/conf.d
mkdir -p d:/Code/mudasky/gateway/lua
```

- [ ] **Step 5: 编写 lua/init.lua**

```lua
--- 共享配置模块。
-- 提供 JWT 密钥和公开路由白名单。

local _M = {}

--- 获取 JWT 密钥（从 shared dict 读取，init_by_lua_block 中设置）。
function _M.get_jwt_secret()
  local config_dict = ngx.shared.config
  return config_dict:get("jwt_secret") or ""
end

--- 公开路由白名单（精确匹配）。
_M.public_routes = {
  ["POST:/api/auth/sms-code"] = true,
  ["POST:/api/auth/login"] = true,
  ["POST:/api/auth/refresh"] = true,
  ["GET:/api/health"] = true,
  ["GET:/api/content/categories"] = true,
}

--- 公开路由前缀（前缀匹配，用于动态路由）。
_M.public_prefixes = {
  { method = "GET", prefix = "/api/content/articles" },
}

--- 检查路由是否公开。
function _M.is_public(method, uri)
  -- 精确匹配
  if _M.public_routes[method .. ":" .. uri] then
    return true
  end
  -- 前缀匹配
  for _, rule in ipairs(_M.public_prefixes) do
    if method == rule.method and string.sub(uri, 1, #rule.prefix) == rule.prefix then
      return true
    end
  end
  return false
end

return _M
```

File: `gateway/lua/init.lua`

- [ ] **Step 6: 编写 lua/auth.lua**

```lua
--- JWT 认证模块。
-- 处理 token 验签、CSRF 校验、用户信息注入。

local jwt = require("resty.jwt")
local cjson = require("cjson.safe")
local config = require("init")
local jwt_secret = config.get_jwt_secret()

-- 返回 JSON 错误响应
local function reject(status, code)
  ngx.status = status
  ngx.header["Content-Type"] = "application/json"
  ngx.say(cjson.encode({ code = code }))
  ngx.exit(status)
end

-- 非 /api/ 路由直接放行
local uri = ngx.var.uri
if not string.find(uri, "^/api/") then
  return
end

-- 检查是否在公开路由白名单中
local method = ngx.req.get_method()
if config.is_public(method, uri) then
  return
end

-- CSRF 校验：变更请求必须携带 X-Requested-With 头
if method == "POST" or method == "PUT" or method == "PATCH" or method == "DELETE" then
  local xrw = ngx.req.get_headers()["X-Requested-With"]
  if not xrw then
    reject(403, "CSRF_REJECTED")
  end
end

-- 从 Cookie 读取 access_token
local cookie_header = ngx.var.http_cookie
if not cookie_header then
  reject(401, "TOKEN_MISSING")
end

local access_token
for pair in string.gmatch(cookie_header, "[^;]+") do
  local trimmed = string.gsub(pair, "^%s+", "")
  local k, v = string.match(trimmed, "^(.-)=(.+)$")
  if k == "access_token" then
    access_token = v
    break
  end
end

if not access_token then
  reject(401, "TOKEN_MISSING")
end

-- 验证 JWT
local jwt_obj = jwt:verify(jwt_secret, access_token)
if not jwt_obj.verified then
  -- 区分过期和无效
  if jwt_obj.reason and string.find(jwt_obj.reason, "expired") then
    reject(401, "TOKEN_EXPIRED")
  else
    reject(401, "TOKEN_INVALID")
  end
end

local payload = jwt_obj.payload

-- 检查用户是否启用
if not payload.is_active then
  reject(401, "USER_DISABLED")
end

-- 强制覆盖请求头（防止外部伪造）
ngx.req.set_header("X-User-Id", payload.sub)
ngx.req.set_header("X-User-Role", payload.role)
```

File: `gateway/lua/auth.lua`

- [ ] **Step 7: 编写 lua/rate_limit.lua（骨架）**

```lua
--- 动态限流模块。
-- 基于 OpenResty shared dict 实现请求频率限制。

-- TODO: 实现基于 IP 和用户的动态限流
-- 当前骨架，后续根据需求实现具体限流策略
```

File: `gateway/lua/rate_limit.lua`

- [ ] **Step 8: 提交**

```bash
git add gateway/
git commit -m "feat: 添加 OpenResty 网关配置——认证、路由、限流骨架"
```

---

## Task 16: 生成初始数据库迁移 + 端到端验证

**前提：** 需要 Docker 环境可用。

- [ ] **Step 1: 创建 .env 文件**

```bash
cp d:/Code/mudasky/.env.example d:/Code/mudasky/.env
```

编辑 `.env`，填入必要的值：

```
DB_NAME=mudasky
DB_USER=mudasky
DB_PASSWORD=dev-password-change-me
JWT_SECRET=dev-secret-change-me-in-production
```

- [ ] **Step 2: 启动数据库**

Run: `cd d:/Code/mudasky && docker compose up db -d`
Expected: PostgreSQL 容器启动并通过 healthcheck

- [ ] **Step 3: 生成初始迁移**

Run: `cd d:/Code/mudasky/backend && uv run alembic revision --autogenerate -m "初始化数据库表"`
Expected: 在 `alembic/versions/` 下生成迁移脚本，包含 user、sms_code、refresh_token、document 四张表

- [ ] **Step 4: 检查生成的迁移脚本**

确认迁移脚本包含正确的表结构和字段。

- [ ] **Step 5: 应用迁移**

Run: `cd d:/Code/mudasky/backend && uv run alembic upgrade head`
Expected: 迁移成功执行

- [ ] **Step 6: 启动完整开发环境**

Run: `cd d:/Code/mudasky && docker compose up --build`
Expected: gateway、backend、db 三个服务全部启动

- [ ] **Step 7: 验证健康检查**

Run: `curl http://localhost/api/health`
Expected: `{"status":"ok"}`

- [ ] **Step 8: 验证认证拦截**

Run: `curl http://localhost/api/users/me`
Expected: `401` + `{"code":"TOKEN_MISSING"}`

- [ ] **Step 9: 提交迁移文件**

```bash
git add backend/alembic/
git commit -m "feat: 生成初始数据库迁移"
```

---

## Task 17: 最终验证和清理

- [ ] **Step 1: 运行所有后端测试**

Run: `cd d:/Code/mudasky/backend && uv run pytest -v`
Expected: 所有测试通过

- [ ] **Step 2: 运行 Black 格式化检查**

Run: `cd d:/Code/mudasky/backend && uv run black --check src/ tests/`
Expected: 无格式问题，或执行 `uv run black src/ tests/` 修复

- [ ] **Step 3: 确认 docker compose up 正常工作**

Run: `cd d:/Code/mudasky && docker compose down && docker compose up --build -d`

验证清单：
1. `curl http://localhost/api/health` → `{"status":"ok"}`
2. `curl http://localhost/api/users/me` → `401 TOKEN_MISSING`
3. `curl -X POST http://localhost/api/auth/sms-code -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -d '{"phone":"13800138000"}'` → `{"message":"验证码已发送"}`

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "chore: 项目骨架搭建完成"
```
