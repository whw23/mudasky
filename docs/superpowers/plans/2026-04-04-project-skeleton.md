# mudasky 项目骨架搭建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 mudasky 项目骨架——三包分离架构（backend 共享库 + api 服务 + worker 服务）、OpenResty 网关、Docker Compose 编排、数据库模型和迁移。

**Architecture:** backend（共享库）+ api（FastAPI 服务）+ worker（消费循环），通过 uv workspace 管理。OpenResty 厚网关处理 JWT 生成/验签。

**Tech Stack:** FastAPI, Python 3.14, SQLAlchemy (async), Alembic, Pydantic, PostgreSQL, OpenResty (Lua), Docker, Next.js 16+

**Spec:** `docs/superpowers/specs/2026-04-04-project-skeleton-design.md`

**Code Style Rules:**

- Python: 4 spaces, snake_case, async/await, Pydantic BaseModel, Black formatter
- Lua: 2 spaces, snake_case
- 所有注释使用中文，所有函数/类/文件头部必须有文档注释
- 函数必须有参数和返回值类型标注
- 单文件最大 300 行，单函数最大 50 行
- Git commit: Conventional Commits, 中文描述

---

## 文件结构总览

### 共享库（backend/shared/）

| 文件路径 | 职责 |
| -------- | ---- |
| `backend/shared/pyproject.toml` | 共享包声明和依赖 |
| `backend/shared/src/app/core/config.py` | Pydantic Settings 环境变量管理 |
| `backend/shared/src/app/core/database.py` | async engine / session factory |
| `backend/shared/src/app/core/security.py` | 密码哈希（bcrypt） |
| `backend/shared/src/app/core/dependencies.py` | 公共依赖注入 |
| `backend/shared/src/app/core/exceptions.py` | 自定义异常 + 全局异常处理器 |
| `backend/shared/src/app/core/pagination.py` | 通用分页模型 |
| `backend/shared/src/app/core/logging.py` | JSON 结构化日志配置 |
| `backend/shared/src/app/user/models.py` | User ORM 模型 |
| `backend/shared/src/app/user/schemas.py` | User Pydantic schemas |
| `backend/shared/src/app/user/repository.py` | User 数据访问层 |
| `backend/shared/src/app/user/service.py` | User 业务逻辑 |
| `backend/shared/src/app/user/router.py` | User API 路由 |
| `backend/shared/src/app/auth/models.py` | SmsCode, RefreshToken ORM 模型 |
| `backend/shared/src/app/auth/schemas.py` | Auth Pydantic schemas |
| `backend/shared/src/app/auth/repository.py` | 验证码、refresh token 数据访问层 |
| `backend/shared/src/app/auth/service.py` | 认证业务逻辑 |
| `backend/shared/src/app/auth/router.py` | Auth API 路由 |
| `backend/shared/src/app/auth/sms.py` | 阿里云短信 SDK 封装 |
| `backend/shared/src/app/document/models.py` | Document ORM 模型 |
| `backend/shared/src/app/document/schemas.py` | Document Pydantic schemas |
| `backend/shared/src/app/document/repository.py` | Document 数据访问层 |
| `backend/shared/src/app/document/service.py` | Document 业务逻辑 |
| `backend/shared/src/app/document/router.py` | Document API 路由 |
| `backend/shared/src/app/document/storage/base.py` | StorageBackend 抽象接口 |
| `backend/shared/src/app/document/storage/local.py` | 本地磁盘存储实现 |
| `backend/shared/src/app/content/models.py` | Article, Category ORM 模型 |
| `backend/shared/src/app/content/schemas.py` | Content Pydantic schemas |
| `backend/shared/src/app/content/repository.py` | Content 数据访问层 |
| `backend/shared/src/app/content/service.py` | Content 业务逻辑 |
| `backend/shared/src/app/content/router.py` | Content API 路由 |
| `backend/shared/src/app/admin/schemas.py` | Admin Pydantic schemas |
| `backend/shared/src/app/admin/service.py` | Admin 业务逻辑 |
| `backend/shared/src/app/admin/router.py` | Admin API 路由 |
| `backend/shared/src/app/worker/models.py` | Task ORM 模型 |
| `backend/shared/src/app/worker/queue.py` | PostgreSQL 任务队列 |

### API 服务（backend/api/）

| 文件路径 | 职责 |
| -------- | ---- |
| `backend/api/pyproject.toml` | API 包声明，依赖 backend |
| `backend/api/src/api/main.py` | FastAPI 入口 |
| `backend/api/alembic.ini` | Alembic 配置 |
| `backend/api/alembic/env.py` | Alembic 迁移环境 |
| `backend/api/scripts/start.sh` | 容器启动脚本 |
| `backend/api/tests/conftest.py` | pytest fixtures |

### Worker 服务（backend/worker/）

| 文件路径 | 职责 |
| -------- | ---- |
| `backend/worker/pyproject.toml` | Worker 包声明，依赖 backend |
| `backend/worker/src/worker_runner/main.py` | 消费循环入口 |

### 网关（gateway/）

| 文件路径 | 职责 |
| -------- | ---- |
| `gateway/nginx.conf` | OpenResty 主配置 |
| `gateway/conf.d/upstream.conf` | 后端 + 前端上游定义 |
| `gateway/conf.d/server.conf` | server 块和 location 路由 |
| `gateway/lua/init.lua` | JWT 密钥加载、公开路由白名单 |
| `gateway/lua/auth.lua` | JWT 验签 + CSRF + 请求头注入 |
| `gateway/lua/jwt_cookie.lua` | 登录/注册/续签响应拦截，生成 JWT + Set-Cookie |
| `gateway/lua/rate_limit.lua` | 动态限流 |

### 基础设施

| 文件路径 | 职责 |
| -------- | ---- |
| `backend/pyproject.toml` | uv workspace 根配置 |
| `docker/api.Dockerfile` | API 镜像 |
| `docker/worker.Dockerfile` | Worker 镜像 |
| `docker/gateway.Dockerfile` | 网关镜像 |
| `docker-compose.yml` | 生产环境服务编排 |
| `docker-compose.override.yml` | 开发环境覆盖 |
| `env/*.env.example` | 各服务环境变量模板 |

---

## Task 1: uv workspace 初始化 + 三包结构

**Files:**
- Create: `backend/pyproject.toml`（workspace 根）
- Modify: `backend/shared/pyproject.toml`
- Create: `backend/api/pyproject.toml`
- Create: `backend/worker/pyproject.toml`
- Create: 各包 `__init__.py`
- Create: `env/*.env.example`

- [ ] **Step 1: 创建 workspace 根 pyproject.toml**

```toml
[tool.uv.workspace]
members = ["shared", "api", "worker"]
```

File: `pyproject.toml`

- [ ] **Step 2: 编写 backend/pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.backends"

[project]
name = "mudasky-backend"
version = "0.1.0"
description = "mudasky 共享库——core + 领域模块"
requires-python = ">=3.14"
dependencies = [
    "fastapi>=0.115",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.30",
    "pydantic>=2.11",
    "pydantic-settings>=2.9",
    "httpx>=0.28",
    "python-multipart>=0.0.20",
    "aiofiles>=24.1",
    "bcrypt>=4.2",
    "pyotp>=2.9",
    "qrcode[pil]>=8.0",
]

[tool.hatch.build.targets.wheel]
packages = ["src/app"]

[tool.black]
line-length = 88
```

- [ ] **Step 3: 编写 api/pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.backends"

[project]
name = "mudasky-api"
version = "0.1.0"
description = "mudasky API 服务"
requires-python = ">=3.14"
dependencies = [
    "mudasky-backend",
    "uvicorn[standard]>=0.34",
    "alembic>=1.15",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.26",
    "httpx>=0.28",
    "black>=25.1",
]

[tool.hatch.build.targets.wheel]
packages = ["src/api"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.black]
line-length = 88
```

- [ ] **Step 4: 编写 worker/pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.backends"

[project]
name = "mudasky-worker"
version = "0.1.0"
description = "mudasky Worker 服务"
requires-python = ">=3.14"
dependencies = [
    "mudasky-backend",
]

[tool.hatch.build.targets.wheel]
packages = ["src/worker_runner"]

[tool.black]
line-length = 88
```

- [ ] **Step 5: 创建所有包的目录和 `__init__.py`**

```bash
# shared（共享库）
mkdir -p backend/shared/src/app/core
mkdir -p backend/shared/src/app/auth
mkdir -p backend/shared/src/app/user
mkdir -p backend/shared/src/app/document/storage
mkdir -p backend/shared/src/app/content
mkdir -p backend/shared/src/app/admin
mkdir -p backend/shared/src/app/worker
touch backend/shared/src/app/__init__.py
touch backend/shared/src/app/core/__init__.py
touch backend/shared/src/app/auth/__init__.py
touch backend/shared/src/app/user/__init__.py
touch backend/shared/src/app/document/__init__.py
touch backend/shared/src/app/document/storage/__init__.py
touch backend/shared/src/app/content/__init__.py
touch backend/shared/src/app/admin/__init__.py
touch backend/shared/src/app/worker/__init__.py

# api（API 服务）
mkdir -p backend/api/src/api
mkdir -p backend/api/scripts
mkdir -p backend/api/alembic/versions
mkdir -p backend/api/tests/auth backend/api/tests/user backend/api/tests/document backend/api/tests/content
touch backend/api/src/api/__init__.py
touch backend/api/tests/__init__.py
touch backend/api/tests/conftest.py

# worker（Worker 服务）
mkdir -p backend/worker/src/worker_runner
touch backend/worker/src/worker_runner/__init__.py
```

- [ ] **Step 6: 创建 env 模板文件**

`env/gateway.env.example`:

```bash
JWT_SECRET=
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
```

`env/backend.env.example`:

```bash
DB_HOST=db
DB_PORT=5432
DB_NAME=mudasky
DB_USER=mudasky
DB_PASSWORD=
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=
SMS_TEMPLATE_CODE=
MAX_UPLOAD_SIZE_MB=10
DEFAULT_STORAGE_QUOTA_MB=100
```

`env/worker.env.example`:

```bash
DB_HOST=db
DB_PORT=5432
DB_NAME=mudasky
DB_USER=mudasky
DB_PASSWORD=
```

`env/db.env.example`:

```bash
POSTGRES_DB=mudasky
POSTGRES_USER=mudasky
POSTGRES_PASSWORD=
```

- [ ] **Step 7: 更新 .gitignore**

追加：

```
env/*.env
!env/*.env.example
```

- [ ] **Step 8: 安装 workspace 依赖**

Run: `cd d:/Code/mudasky/backend && uv sync`
Expected: 三个包全部安装成功

- [ ] **Step 9: 提交**

```bash
git add backend/pyproject.toml backend/shared/ backend/api/ backend/worker/ env/ .gitignore
git commit -m "chore: 初始化 uv workspace 三包结构（backend + api + worker）"
```

---

## Task 2: 后端核心层——config + database + logging

**Files:**
- Create: `backend/shared/src/app/core/config.py`
- Create: `backend/shared/src/app/core/database.py`
- Create: `backend/shared/src/app/core/logging.py`
- Test: `backend/api/tests/test_core_config.py`

- [ ] **Step 1: 编写测试 → 确认失败 → 实现 → 确认通过**

测试和代码内容与原计划 Task 2 相同。注意 config.py 不包含 JWT_SECRET（仅 Gateway 使用）。

- [ ] **Step 2: 提交**

```bash
git add backend/shared/src/app/core/ backend/api/tests/
git commit -m "feat: 添加后端核心层——配置、数据库、日志"
```

---

## Task 3: 后端核心层——security + exceptions + pagination + dependencies

**Files:**
- Create: `backend/shared/src/app/core/security.py`（密码哈希 bcrypt，不含 JWT）
- Create: `backend/shared/src/app/core/exceptions.py`
- Create: `backend/shared/src/app/core/pagination.py`
- Create: `backend/shared/src/app/core/dependencies.py`
- Test: `backend/api/tests/test_core_security.py`

- [ ] **Step 1: 编写测试 → 确认失败 → 实现 → 确认通过**

代码内容与原计划 Task 3 相同。

- [ ] **Step 2: 提交**

```bash
git add backend/shared/src/app/core/ backend/api/tests/
git commit -m "feat: 添加安全、异常、分页、依赖注入模块"
```

---

## Task 4: User 领域

**Files:**
- Create: `backend/shared/src/app/user/` 全部文件

包含 User 模型（username、password_hash、two_factor_enabled、totp_secret 等字段），schemas（UserCreate、UserUpdate、UserAdminUpdate、PasswordChange、PhoneChange、UserResponse），repository（按 id/phone/username 查询），service（CRUD + 密码 + 手机号 + 2FA 管理），router（/me、/me/password、/me/phone、/me/2fa/enable、/me/2fa/confirm、/me/2fa/disable）。

代码内容与原计划 Task 4 相同。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add backend/shared/src/app/user/
git commit -m "feat: 添加 User 领域——模型、schemas、repository、service、router"
```

---

## Task 5: Auth 领域

**Files:**
- Create: `backend/shared/src/app/auth/` 全部文件

包含 SmsCode/RefreshToken 模型、schemas（RegisterRequest、LoginRequest 三种方式、AuthResponse），repository、service（注册、三种登录、二步验证、续签，Backend 不碰 JWT）、router、sms.py。

代码内容与原计划 Task 5 相同。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add backend/shared/src/app/auth/
git commit -m "feat: 添加 Auth 领域——注册、三种登录、二步验证、续签"
```

---

## Task 6: Document 领域

**Files:**
- Create: `backend/shared/src/app/document/` 全部文件

代码内容与原计划 Task 6 相同。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add backend/shared/src/app/document/
git commit -m "feat: 添加 Document 领域——模型、存储抽象、CRUD"
```

---

## Task 7: Content 领域

**Files:**
- Create: `backend/shared/src/app/content/` 全部文件

代码内容与原计划 Task 7 相同。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add backend/shared/src/app/content/
git commit -m "feat: 添加 Content 领域——文章发布、分类管理、审核流程"
```

---

## Task 8: Admin 领域（骨架）

**Files:**
- Create: `backend/shared/src/app/admin/` 全部文件

代码内容与原计划 Task 8 相同。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add backend/shared/src/app/admin/
git commit -m "feat: 添加 Admin 领域骨架"
```

---

## Task 9: Worker 共享模块（models + queue）

**Files:**
- Create: `backend/shared/src/app/worker/models.py`
- Create: `backend/shared/src/app/worker/queue.py`

Task 模型和 PostgreSQL 队列逻辑放在 backend 共享包中（API 需要入队，Worker 需要消费）。

代码内容与原计划 Task 9 相同（models.py + queue.py 部分）。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add backend/shared/src/app/worker/
git commit -m "feat: 添加 Worker 共享模块——Task 模型、任务队列"
```

---

## Task 10: API 入口 + Alembic 迁移

**Files:**
- Create: `backend/api/src/api/main.py`
- Create: `backend/api/alembic.ini`
- Create: `backend/api/alembic/env.py`
- Create: `backend/api/scripts/start.sh`
- Create: `backend/api/tests/conftest.py`

- [ ] **Step 1: 编写 api/src/api/main.py**

```python
"""FastAPI 应用入口。

挂载所有领域路由，注册异常处理。
"""

from fastapi import FastAPI

from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.content.router import router as content_router
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.document.router import router as document_router
from app.user.router import router as user_router

setup_logging()

app = FastAPI(title="mudasky", version="0.1.0")

register_exception_handlers(app)

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

- [ ] **Step 2: 初始化 Alembic 并配置 env.py**

Run: `cd d:/Code/mudasky/backend/api && uv run alembic init alembic`

修改 `backend/api/alembic/env.py`，导入所有模型：

```python
from app.user.models import User  # noqa: F401
from app.auth.models import SmsCode, RefreshToken  # noqa: F401
from app.content.models import Article, Category  # noqa: F401
from app.document.models import Document  # noqa: F401
from app.worker.models import Task  # noqa: F401
```

- [ ] **Step 3: 编写启动脚本 api/scripts/start.sh**

```bash
#!/bin/bash
set -e
echo "执行数据库迁移..."
alembic upgrade head
echo "启动应用..."
exec uvicorn api.main:app --host 0.0.0.0 --port 8000
```

- [ ] **Step 4: 提交**

```bash
git add backend/api/
git commit -m "feat: 添加 API 入口、Alembic 迁移配置、启动脚本"
```

---

## Task 11: Worker 入口

**Files:**
- Create: `backend/worker/src/worker_runner/main.py`

- [ ] **Step 1: 编写 worker_runner/main.py**

```python
"""Worker 入口。

单线程消费循环，从 PostgreSQL 任务队列抢占任务并执行。
"""

import asyncio
import logging

from app.core.database import async_session_factory
from app.core.logging import setup_logging
from app.worker import queue

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5


async def process_task(task) -> str:
    """处理单个任务。

    TODO: 后期根据 task.task_type 分发到具体的 Agent 处理逻辑。
    """
    logger.info("开始处理任务", extra={
        "task_id": str(task.id), "type": task.task_type
    })
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
                logger.error("任务失败", extra={
                    "task_id": str(task.id), "error": str(e)
                })
            await session.commit()


def main() -> None:
    """入口函数。"""
    setup_logging()
    asyncio.run(run())


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 提交**

```bash
git add backend/worker/
git commit -m "feat: 添加 Worker 消费循环入口"
```

---

## Task 12: Docker 基础设施

**Files:**
- Create: `docker/api.Dockerfile`
- Create: `docker/worker.Dockerfile`
- Modify: `docker/gateway.Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.override.yml`

- [ ] **Step 1: 编写 docker/api.Dockerfile**

```dockerfile
FROM python:3.14-slim

WORKDIR /app

# 复制共享库和 API 包
COPY shared/ ./shared/
COPY api/ ./api/
COPY pyproject.toml ./

# 安装依赖
RUN pip install --no-cache-dir ./shared ./api

# 设置工作目录为 api
WORKDIR /app/api

RUN chmod +x scripts/start.sh

EXPOSE 8000
CMD ["./scripts/start.sh"]
```

- [ ] **Step 2: 编写 docker/worker.Dockerfile**

```dockerfile
FROM python:3.14-slim

WORKDIR /app

# 复制共享库和 Worker 包
COPY shared/ ./shared/
COPY worker/ ./worker/
COPY pyproject.toml ./

# 安装依赖
RUN pip install --no-cache-dir ./shared ./worker

CMD ["python", "-m", "worker_runner.main"]
```

- [ ] **Step 3: 编写 docker-compose.yml**

```yaml
services:
  gateway:
    build:
      context: ./gateway
      dockerfile: ../docker/gateway.Dockerfile
    ports:
      - "80:80"
    env_file: env/gateway.env
    depends_on:
      api:
        condition: service_healthy

  frontend:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    command: ["sh", "-c", "pnpm install && pnpm start"]
    depends_on:
      api:
        condition: service_healthy

  api:
    build:
      context: ./backend
      dockerfile: ../docker/api.Dockerfile
    env_file: env/backend.env
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
      dockerfile: ../docker/worker.Dockerfile
    env_file: env/worker.env
    depends_on:
      db:
        condition: service_healthy
    profiles: ["worker"]

  db:
    image: postgres:17-alpine
    env_file: env/db.env
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mudasky"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  uploads:
```

- [ ] **Step 4: 编写 docker-compose.override.yml**

```yaml
services:
  gateway:
    volumes:
      - ./gateway/nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf:ro
      - ./gateway/conf.d/:/etc/nginx/conf.d/:ro
      - ./gateway/lua/:/usr/local/openresty/nginx/lua/:ro

  frontend:
    ports:
      - "3000:3000"
    command: ["sh", "-c", "pnpm install && pnpm dev"]

  api:
    command: ["sh", "-c", "alembic upgrade head && uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload"]
    ports:
      - "8000:8000"
    volumes:
      - ./backend/shared/src:/app/shared/src
      - ./backend/api/src:/app/api/src

  db:
    ports:
      - "5432:5432"
```

- [ ] **Step 5: 提交**

```bash
git add docker/ docker-compose.yml docker-compose.override.yml
git commit -m "feat: 添加 Docker 基础设施——独立 API 和 Worker 容器"
```

---

## Task 13: OpenResty 网关配置

**Files:**
- Modify: `gateway/nginx.conf`
- Create: `gateway/conf.d/upstream.conf`
- Create: `gateway/conf.d/server.conf`
- Create: `gateway/lua/init.lua`
- Create: `gateway/lua/auth.lua`
- Create: `gateway/lua/jwt_cookie.lua`
- Create: `gateway/lua/rate_limit.lua`
- Modify: `docker/gateway.Dockerfile`

代码内容与原计划 Task 12 相同（nginx.conf、upstream.conf 含 frontend 上游、server.conf 含 jwt_cookie 拦截、init.lua、auth.lua、jwt_cookie.lua、rate_limit.lua、gateway.Dockerfile）。

- [ ] **Step 1: 编写全部文件 → 提交**

```bash
git add gateway/ docker/gateway.Dockerfile
git commit -m "feat: 添加 OpenResty 网关——认证、JWT Cookie 生成、路由"
```

---

## Task 14: 生成初始数据库迁移 + 端到端验证

- [ ] **Step 1: 创建 env 文件**

```bash
cp env/gateway.env.example env/gateway.env
cp env/backend.env.example env/backend.env
cp env/worker.env.example env/worker.env
cp env/db.env.example env/db.env
```

填入 DB_PASSWORD 和 JWT_SECRET。

- [ ] **Step 2: 启动数据库**

Run: `cd d:/Code/mudasky && docker compose up db -d`

- [ ] **Step 3: 生成并应用迁移**

Run: `cd d:/Code/mudasky/backend/api && uv run alembic revision --autogenerate -m "初始化数据库表" && uv run alembic upgrade head`

Expected: user、sms_code、refresh_token、document、article、category、task 七张表

- [ ] **Step 4: 启动完整环境**

Run: `cd d:/Code/mudasky && docker compose up --build`

- [ ] **Step 5: 验证**

```bash
curl http://localhost/api/health
# → {"status":"ok"}

curl http://localhost/api/users/me
# → 401 {"code":"TOKEN_MISSING"}
```

- [ ] **Step 6: 提交**

```bash
git add backend/api/alembic/
git commit -m "feat: 生成初始数据库迁移"
```

---

## Task 15: 最终验证和清理

- [ ] **Step 1: 运行测试**

Run: `cd d:/Code/mudasky/backend/api && uv run pytest -v`

- [ ] **Step 2: 运行 Black 格式化**

Run: `cd d:/Code/mudasky/backend && uv run black --check shared/src/ api/src/ worker/src/ api/tests/`

- [ ] **Step 3: 验证清单**

1. `docker compose up` 所有服务正常
2. 健康检查通过
3. 未认证请求被拦截
4. 公开路由正常放行
5. 所有测试通过

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "chore: 项目骨架搭建完成"
```
