# 后端架构重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将后端从 shared 混合架构重构为分层架构 + 面板化组织，shared 只保留基础设施，api 按面板组织业务逻辑。

**Architecture:** shared 按基础设施类型组织（db/sms/core/utils），api 按访问面板组织（auth/public/admin/portal）。去掉 src/ 中间层，Dockerfile/env 归位到各服务目录，文件存储迁移到 PostgreSQL BYTEA。

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy async, Pydantic, pytest, Docker

**Spec:** `docs/superpowers/specs/2026-04-14-backend-restructure-design.md`

---

## 文件结构总览

### 新建文件

**shared/app/ 骨架：**
- `backend/shared/app/__init__.py`
- `backend/shared/app/db/__init__.py` — engine, session, Base, get_db
- `backend/shared/app/db/model_utils.py`
- `backend/shared/app/db/{domain}/__init__.py` — 每个域一个（auth, case, config, content, document, rbac, university, user, worker）
- `backend/shared/app/sms/__init__.py`
- `backend/shared/app/core/__init__.py`
- `backend/shared/app/core/config.py`
- `backend/shared/app/core/exceptions.py`
- `backend/shared/app/core/logging.py`
- `backend/shared/app/utils/__init__.py`
- `backend/shared/app/utils/crypto.py`
- `backend/shared/app/utils/security.py`

**api/api/ 骨架：**
- `backend/api/api/__init__.py`
- `backend/api/api/main.py`
- `backend/api/api/core/__init__.py`
- `backend/api/api/core/cache.py`
- `backend/api/api/core/dependencies.py`
- `backend/api/api/core/pagination.py`
- `backend/api/api/auth/__init__.py`, `router.py`, `service.py`, `schemas.py`
- `backend/api/api/public/__init__.py`
- `backend/api/api/public/{config,content,case,university}/__init__.py`, `router.py`, `service.py`, `schemas.py`
- `backend/api/api/admin/__init__.py`
- `backend/api/api/admin/{user,rbac,config,content,case,university}/__init__.py`, `router.py`, `service.py`, `schemas.py`
- `backend/api/api/portal/__init__.py`
- `backend/api/api/portal/{user,document,content}/__init__.py`, `router.py`, `service.py`, `schemas.py`

**基础设施文件：**
- `backend/scripts/start-api.sh`
- `backend/scripts/init/__init__.py`, `__main__.py`, `seed_*.py`
- `db/` 目录（Dockerfile, .env.example, init/, cron/）
- 各服务的 Dockerfile、.env.example 归位

### 删除文件

- `backend/shared/src/` — 整个目录（已迁移到 `backend/shared/app/`）
- `backend/api/src/` — 整个目录（已迁移到 `backend/api/api/`）
- `backend/api/scripts/` — 移到 `backend/scripts/`
- `backend/api/alembic/` — 移到 `backend/alembic/`
- `backend/shared/src/app/core/storage.py` — 文件存储改为 BYTEA
- `backend/shared/src/app/document/storage/` — 文件存储改为 BYTEA
- `docker/` — Dockerfile 归位到各服务
- `env/` — .env.example 归位到各服务
- `docs/superpowers/plans/backend-restructure.md` — 旧计划文档

---

## Task 1: 前置准备

**Files:**
- Delete: `docs/superpowers/plans/backend-restructure.md`

- [ ] **Step 1: 创建 feat 分支**

```bash
cd /home/whw23/code/mudasky && git checkout -b feat/backend-restructure
```

- [ ] **Step 2: 删除旧计划文档**

```bash
rm docs/superpowers/plans/backend-restructure.md
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "chore: 删除旧重构计划文档"
```

---

## Task 2: shared 目录重构 — 创建新骨架

**Files:**
- Create: `backend/shared/app/__init__.py`
- Create: `backend/shared/app/db/__init__.py`
- Create: `backend/shared/app/db/model_utils.py`
- Create: `backend/shared/app/db/{domain}/__init__.py` (9 domains)
- Create: `backend/shared/app/sms/__init__.py`
- Create: `backend/shared/app/core/__init__.py`
- Create: `backend/shared/app/core/config.py`
- Create: `backend/shared/app/core/exceptions.py`
- Create: `backend/shared/app/core/logging.py`
- Create: `backend/shared/app/utils/__init__.py`
- Create: `backend/shared/app/utils/crypto.py`
- Create: `backend/shared/app/utils/security.py`

- [ ] **Step 1: 创建 shared/app 目录结构**

```bash
cd /home/whw23/code/mudasky/backend/shared
mkdir -p app/db/{auth,case,config,content,document,rbac,university,user,worker}
mkdir -p app/sms app/core app/utils
```

- [ ] **Step 2: 创建 app/__init__.py**

```python
# backend/shared/app/__init__.py
```

（空文件）

- [ ] **Step 3: 创建 app/db/__init__.py（从 core/database.py 迁移）**

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

- [ ] **Step 4: 复制 model_utils.py 到 app/db/**

```bash
cp src/app/core/model_utils.py app/db/model_utils.py
```

更新 `app/db/model_utils.py` 内的 import（如果有引用 `app.core.*` 需改为 `app.core.*` 或 `app.db.*`）。

- [ ] **Step 5: 复制各域的 models.py 和 repository.py 到 app/db/{domain}/**

```bash
# 每个域只复制 models.py 和 repository.py
for domain in auth case config content document rbac university user; do
  cp src/app/$domain/models.py app/db/$domain/models.py
  cp src/app/$domain/repository.py app/db/$domain/repository.py
  touch app/db/$domain/__init__.py
done

# rbac 还有 tables.py
cp src/app/rbac/tables.py app/db/rbac/tables.py

# worker 有 models.py 和 queue.py
cp src/app/worker/models.py app/db/worker/models.py
cp src/app/worker/queue.py app/db/worker/queue.py
touch app/db/worker/__init__.py
```

- [ ] **Step 6: 创建 app/sms/__init__.py（从 auth/sms.py 迁移）**

```python
"""短信发送模块。

当前为开发环境存根实现，生产环境需对接阿里云短信服务。
"""

import logging

logger = logging.getLogger(__name__)


async def send_sms_code(phone: str, code: str) -> bool:
    """发送短信验证码。

    TODO: 对接阿里云短信
    SECURITY: 仅开发环境使用
    """
    logger.info("发送短信验证码（开发模式）phone=%s code=%s", phone, code)
    return True
```

- [ ] **Step 7: 复制 core 模块到 app/core/**

```bash
cp src/app/core/config.py app/core/config.py
cp src/app/core/exceptions.py app/core/exceptions.py
cp src/app/core/logging.py app/core/logging.py
touch app/core/__init__.py
```

- [ ] **Step 8: 复制 utils 模块到 app/utils/**

```bash
cp src/app/core/crypto.py app/utils/crypto.py
cp src/app/core/security.py app/utils/security.py
touch app/utils/__init__.py
```

- [ ] **Step 9: 更新所有 app/db/ 下文件的 import 路径**

所有 `app/db/` 下的 models.py 和 repository.py 的 import 需要更新：

| 旧路径 | 新路径 |
|--------|--------|
| `from app.core.database import Base` | `from app.db import Base` |
| `from app.core.database import ...` | `from app.db import ...` |
| `from app.core.config import settings` | `from app.core.config import settings` |
| `from app.core.exceptions import ...` | `from app.core.exceptions import ...` |
| `from app.core.model_utils import ...` | `from app.db.model_utils import ...` |
| `from app.core.security import ...` | `from app.utils.security import ...` |
| `from app.core.crypto import ...` | `from app.utils.crypto import ...` |
| `from app.core.storage import ...` | 删除（文件存储改为 BYTEA） |
| `from app.{domain}.models import ...` | `from app.db.{domain}.models import ...` |
| `from app.{domain} import repository` | `from app.db.{domain} import repository` |
| `from app.auth.sms import ...` | `from app.sms import ...` |

逐文件检查并替换。

- [ ] **Step 10: 更新 app/utils/ 下文件的 import 路径**

`app/utils/crypto.py`:
```python
# 旧: from app.core.exceptions import UnauthorizedException
# 新: from app.core.exceptions import UnauthorizedException  （不变）
```

`app/utils/security.py`:
```python
# import 路径检查，不引用 core.database 即无需修改
```

- [ ] **Step 11: 更新 shared/pyproject.toml**

```toml
[tool.hatch.build.targets.wheel]
packages = ["app"]              # 从 ["src/app"] 改为 ["app"]
```

- [ ] **Step 12: 验证 shared 包结构正确**

```bash
cd /home/whw23/code/mudasky
python -c "import app.db; import app.core.config; import app.utils.crypto; import app.sms; print('shared OK')"
```

Expected: `shared OK`

- [ ] **Step 13: 提交**

```bash
git add -A && git commit -m "refactor: shared 按基础设施类型重组目录结构"
```

---

## Task 3: api 目录重构 — 创建面板骨架 + core

**Files:**
- Create: `backend/api/api/__init__.py`
- Create: `backend/api/api/core/__init__.py`
- Create: `backend/api/api/core/cache.py`
- Create: `backend/api/api/core/dependencies.py`
- Create: `backend/api/api/core/pagination.py`
- Create: `backend/api/api/auth/__init__.py`
- Create: `backend/api/api/public/__init__.py`
- Create: `backend/api/api/admin/__init__.py`
- Create: `backend/api/api/portal/__init__.py`

- [ ] **Step 1: 创建 api/api 目录结构**

```bash
cd /home/whw23/code/mudasky/backend/api
mkdir -p api/core
mkdir -p api/auth
mkdir -p api/public/{config,content,case,university}
mkdir -p api/admin/{user,rbac,config,content,case,university}
mkdir -p api/portal/{user,document,content}
touch api/__init__.py
```

- [ ] **Step 2: 创建 api/core/cache.py**

从 `backend/shared/src/app/core/cache.py` 复制，无需修改 import（不依赖 `app.core.*` 的其他模块）：

```bash
cp ../shared/src/app/core/cache.py api/core/cache.py
touch api/core/__init__.py
```

- [ ] **Step 3: 创建 api/core/dependencies.py**

从 `backend/shared/src/app/core/dependencies.py` 复制，更新 import：

```python
"""公共依赖注入。

用户信息从 OpenResty 网关注入的请求头中获取。
"""

from typing import Annotated

from fastapi import Depends, Header

from app.db import AsyncSession, get_db
from app.core.exceptions import ForbiddenException


async def get_current_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """从网关注入的请求头获取当前用户 ID。"""
    if not x_user_id:
        raise ForbiddenException(message="未获取到用户信息", code="USER_INFO_MISSING")
    return x_user_id


# 类型别名
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
```

- [ ] **Step 4: 创建 api/core/pagination.py**

从 `backend/shared/src/app/core/pagination.py` 复制，无需修改 import。

```bash
cp ../shared/src/app/core/pagination.py api/core/pagination.py
```

- [ ] **Step 5: 更新 api/pyproject.toml**

```toml
[tool.hatch.build.targets.wheel]
packages = ["api"]              # 从 ["src/api"] 改为 ["api"]
```

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "refactor: api 创建面板骨架和 core 模块"
```

---

## Task 4: 迁移 auth 域（独立挂载，不属于面板）

**Files:**
- Create: `backend/api/api/auth/__init__.py`
- Create: `backend/api/api/auth/router.py`
- Create: `backend/api/api/auth/service.py`
- Create: `backend/api/api/auth/schemas.py`

- [ ] **Step 1: 复制 auth 的 router/service/schemas**

```bash
cd /home/whw23/code/mudasky/backend/api
cp ../shared/src/app/auth/router.py api/auth/router.py
cp ../shared/src/app/auth/service.py api/auth/service.py
cp ../shared/src/app/auth/schemas.py api/auth/schemas.py
```

- [ ] **Step 2: 创建 api/auth/__init__.py**

```python
"""认证模块（独立挂载）。"""

from .router import router

__all__ = ["router"]
```

- [ ] **Step 3: 更新 api/auth/router.py 的 import**

| 旧路径 | 新路径 |
|--------|--------|
| `from app.core.crypto import ...` | `from app.utils.crypto import ...` |
| `from app.core.dependencies import DbSession` | `from api.core.dependencies import DbSession` |
| `from app.core.config import settings` | `from app.core.config import settings` |
| `from app.core.exceptions import ...` | `from app.core.exceptions import ...` |
| `from app.auth.schemas import ...` | `from .schemas import ...` |
| `from app.auth.service import ...` | `from .service import ...` |

- [ ] **Step 4: 更新 api/auth/service.py 的 import**

| 旧路径 | 新路径 |
|--------|--------|
| `from app.auth import repository` | `from app.db.auth import repository` |
| `from app.auth.models import ...` | 删除（service 不引用 models） |
| `from app.auth.schemas import ...` | 删除（service 不引用 schemas） |
| `from app.auth.sms import ...` | `from app.sms import ...` |
| `from app.core.crypto import ...` | `from app.utils.crypto import ...` |
| `from app.core.security import ...` | `from app.utils.security import ...` |
| `from app.core.exceptions import ...` | `from app.core.exceptions import ...` |
| `from app.core.config import settings` | `from app.core.config import settings` |
| `from app.user import repository as user_repo` | `from app.db.user import repository as user_repo` |
| `from app.rbac import repository as rbac_repo` | `from app.db.rbac import repository as rbac_repo` |

注意：service 不再引用 schemas（service 接收/返回原始数据，router 负责 schemas 转换）。如果当前 service 方法的参数或返回值类型使用了 schemas，需要改为使用 dict 或基本类型。

- [ ] **Step 5: 更新 api/auth/schemas.py 的 import**

schemas 应该是自包含的 Pydantic 模型，通常不需要引用其他模块。检查并移除对 `app.*` 的引用。

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "refactor: 迁移 auth 域到 api 层"
```

---

## Task 5: 迁移 public 面板（config, content, case, university）

**Files:**
- Create: `backend/api/api/public/__init__.py`
- Create: `backend/api/api/public/{config,content,case,university}/{__init__.py,router.py,service.py,schemas.py}`

- [ ] **Step 1: 复制 public 域文件**

```bash
cd /home/whw23/code/mudasky/backend/api

# public/config — 从 config domain 的 public 部分提取
cp ../shared/src/app/config/router.py api/public/config/router.py
cp ../shared/src/app/config/service.py api/public/config/service.py
cp ../shared/src/app/config/schemas.py api/public/config/schemas.py

# public/content — 从 content domain 的 public 部分提取
cp ../shared/src/app/content/router.py api/public/content/router.py
cp ../shared/src/app/content/service.py api/public/content/service.py
cp ../shared/src/app/content/schemas.py api/public/content/schemas.py

# public/case
cp ../shared/src/app/case/router.py api/public/case/router.py
cp ../shared/src/app/case/service.py api/public/case/service.py
cp ../shared/src/app/case/schemas.py api/public/case/schemas.py

# public/university
cp ../shared/src/app/university/router.py api/public/university/router.py
cp ../shared/src/app/university/service.py api/public/university/service.py
cp ../shared/src/app/university/schemas.py api/public/university/schemas.py
```

**重要**：这些文件复制后需要大幅修改。当前每个域的 router.py 同时包含 public 和 admin 的端点。需要**拆分**——public 面板只保留公开只读的端点，admin 面板的端点在 Task 6 中处理。

- [ ] **Step 2: 创建各域 __init__.py**

每个域的 `__init__.py` 格式相同：

```python
# api/public/config/__init__.py
from .router import router

__all__ = ["router"]
```

对 content、case、university 重复相同操作。

- [ ] **Step 3: 创建 public/__init__.py（面板路由组装）**

```python
"""Public 面板路由组装。"""

from fastapi import APIRouter

from .config import router as config_router
from .content import router as content_router
from .case import router as case_router
from .university import router as university_router

router = APIRouter(prefix="/public")
router.include_router(config_router)
router.include_router(content_router)
router.include_router(case_router)
router.include_router(university_router)
```

- [ ] **Step 4: 拆分 public 面板的 router/service/schemas**

对每个域（config, content, case, university）：

1. **router.py** — 只保留 public（只读）端点，删除 admin 端点
2. **service.py** — 只保留 public 读取逻辑，所有查询附加 `status=published` 过滤
3. **schemas.py** — 只保留 public 响应模型（不包含 draft/admin 字段）

更新所有 import 路径（参照 Task 4 的 import 替换规则）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "refactor: 迁移 public 面板到 api 层"
```

---

## Task 6: 迁移 admin 面板（user, rbac, config, content, case, university）

**Files:**
- Create: `backend/api/api/admin/__init__.py`
- Create: `backend/api/api/admin/{user,rbac,config,content,case,university}/{__init__.py,router.py,service.py,schemas.py}`

- [ ] **Step 1: 复制 admin 域文件**

```bash
cd /home/whw23/code/mudasky/backend/api

# admin/user — 原 admin domain
cp ../shared/src/app/admin/router.py api/admin/user/router.py
cp ../shared/src/app/admin/service.py api/admin/user/service.py
cp ../shared/src/app/admin/schemas.py api/admin/user/schemas.py

# admin/rbac
cp ../shared/src/app/rbac/router.py api/admin/rbac/router.py
cp ../shared/src/app/rbac/service.py api/admin/rbac/service.py
cp ../shared/src/app/rbac/schemas.py api/admin/rbac/schemas.py

# admin/config — 从 config domain 的 admin 部分提取
cp ../shared/src/app/config/router.py api/admin/config/router.py
cp ../shared/src/app/config/service.py api/admin/config/service.py
cp ../shared/src/app/config/schemas.py api/admin/config/schemas.py

# admin/content — 从 content domain 的 admin 部分提取（admin_router.py）
cp ../shared/src/app/content/admin_router.py api/admin/content/router.py
cp ../shared/src/app/content/service.py api/admin/content/service.py
cp ../shared/src/app/content/schemas.py api/admin/content/schemas.py

# admin/case — 从 case domain 的 admin 部分提取（admin_router.py）
cp ../shared/src/app/case/admin_router.py api/admin/case/router.py
cp ../shared/src/app/case/service.py api/admin/case/service.py
cp ../shared/src/app/case/schemas.py api/admin/case/schemas.py

# admin/university
cp ../shared/src/app/university/router.py api/admin/university/router.py
cp ../shared/src/app/university/service.py api/admin/university/service.py
cp ../shared/src/app/university/schemas.py api/admin/university/schemas.py
```

- [ ] **Step 2: 创建各域 __init__.py**

每个域的 `__init__.py` 格式同 Task 5。

- [ ] **Step 3: 创建 admin/__init__.py（面板路由组装）**

```python
"""Admin 面板路由组装。"""

from fastapi import APIRouter

from .user import router as user_router
from .rbac import router as rbac_router
from .config import router as config_router
from .content import router as content_router
from .case import router as case_router
from .university import router as university_router

router = APIRouter(prefix="/admin")
router.include_router(user_router)
router.include_router(rbac_router)
router.include_router(config_router)
router.include_router(content_router)
router.include_router(case_router)
router.include_router(university_router)
```

- [ ] **Step 4: 拆分 admin 面板的 router/service/schemas**

对每个域：

1. **router.py** — 只保留 admin 端点
2. **service.py** — admin 业务逻辑，可访问全部数据，无过滤限制
3. **schemas.py** — admin 专用的请求/响应模型（含全部字段）

更新所有 import 路径。

注意 `admin/config` 当前 router.py 包含 `admin_general_settings_router` 和 `admin_web_settings_router` 两个子路由，需要在 `admin/config/router.py` 中合并或分别挂载。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "refactor: 迁移 admin 面板到 api 层"
```

---

## Task 7: 迁移 portal 面板（user, document, content）

**Files:**
- Create: `backend/api/api/portal/__init__.py`
- Create: `backend/api/api/portal/{user,document,content}/{__init__.py,router.py,service.py,schemas.py}`

- [ ] **Step 1: 复制 portal 域文件**

```bash
cd /home/whw23/code/mudasky/backend/api

# portal/user
cp ../shared/src/app/user/router.py api/portal/user/router.py
cp ../shared/src/app/user/service.py api/portal/user/service.py
cp ../shared/src/app/user/schemas.py api/portal/user/schemas.py

# portal/document
cp ../shared/src/app/document/router.py api/portal/document/router.py
cp ../shared/src/app/document/service.py api/portal/document/service.py
cp ../shared/src/app/document/schemas.py api/portal/document/schemas.py

# portal/content — 从 content domain 的 portal 部分提取
cp ../shared/src/app/content/router.py api/portal/content/router.py
cp ../shared/src/app/content/service.py api/portal/content/service.py
cp ../shared/src/app/content/schemas.py api/portal/content/schemas.py
```

- [ ] **Step 2: 创建各域 __init__.py**

每个域的 `__init__.py` 格式同 Task 5。

- [ ] **Step 3: 创建 portal/__init__.py（面板路由组装）**

```python
"""Portal 面板路由组装。"""

from fastapi import APIRouter

from .user import router as user_router
from .document import router as document_router
from .content import router as content_router

router = APIRouter(prefix="/portal")
router.include_router(user_router)
router.include_router(document_router)
router.include_router(content_router)
```

- [ ] **Step 4: 拆分 portal 面板的 router/service/schemas**

对每个域：

1. **router.py** — 只保留用户自己的端点
2. **service.py** — 所有查询附加 `user_id = current_user_id` 过滤
3. **schemas.py** — portal 专用的请求/响应模型

更新所有 import 路径。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "refactor: 迁移 portal 面板到 api 层"
```

---

## Task 8: 重写 main.py

**Files:**
- Create: `backend/api/api/main.py`

- [ ] **Step 1: 编写新的 main.py**

```python
"""FastAPI 应用入口。

根应用挂载 API 子应用到 /api 前缀。
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from app.db.rbac.models import Permission, Role  # noqa: F401
import app.db.config.models  # noqa: F401
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging

from .auth import router as auth_router
from .public import router as public_router
from .admin import router as admin_router
from .portal import router as portal_router

setup_logging()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """应用生命周期管理。"""
    yield


# 根应用
app = FastAPI(title="mudasky", version="0.1.0", docs_url=None, lifespan=lifespan)

# API 子应用（生产环境关闭 docs）
api = FastAPI(
    title="mudasky API",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
register_exception_handlers(api)

if settings.DEBUG:

    def custom_openapi() -> dict[str, Any]:
        """自定义 OpenAPI schema，添加网关请求头认证方案。"""
        if api.openapi_schema:
            return api.openapi_schema
        from fastapi.openapi.utils import get_openapi

        schema = get_openapi(
            title=api.title,
            version=api.version,
            routes=api.routes,
        )
        schema["components"]["securitySchemes"] = {
            "X-User-Id": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Id",
                "description": "用户 ID（网关注入，开发调试用）",
            },
            "X-User-Permissions": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Permissions",
                "description": "用户权限列表，逗号分隔（网关注入，开发调试用）",
            },
            "X-User-Type": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Type",
                "description": "用户类型：student / staff（网关注入，开发调试用）",
            },
            "X-Is-Superuser": {
                "type": "apiKey",
                "in": "header",
                "name": "X-Is-Superuser",
                "description": "是否超级管理员：true / false（网关注入，开发调试用）",
            },
        }
        schema["security"] = [
            {
                "X-User-Id": [],
                "X-User-Permissions": [],
                "X-User-Type": [],
                "X-Is-Superuser": [],
            }
        ]
        api.openapi_schema = schema
        return schema

    api.openapi = custom_openapi

# 挂载面板路由
api.include_router(auth_router)
api.include_router(public_router)
api.include_router(admin_router)
api.include_router(portal_router)


@api.get("/health", summary="健康检查")
async def api_health_check() -> dict:
    """API 健康检查端点。"""
    return {"status": "ok"}


# 挂载子应用
app.mount("/api", api)
```

注意：`_cleanup_expired_data` 后台任务已移除（改用 pg_cron）。

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "refactor: 重写 main.py 使用面板路由组装"
```

---

## Task 9: 删除 shared/src 旧目录

- [ ] **Step 1: 确认 shared/app 完整后删除旧目录**

```bash
cd /home/whw23/code/mudasky/backend/shared
rm -rf src/
```

- [ ] **Step 2: 删除 api/src 旧目录**

```bash
cd /home/whw23/code/mudasky/backend/api
rm -rf src/
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "refactor: 删除旧 src/ 目录"
```

---

## Task 10: Dockerfile / env 文件归位

**Files:**
- Move: `docker/api.Dockerfile` → `backend/api/Dockerfile`
- Move: `docker/worker.Dockerfile` → `backend/worker/Dockerfile`
- Move: `docker/frontend.Dockerfile` → `frontend/Dockerfile`
- Move: `docker/frontend.dev.Dockerfile` → `frontend/Dockerfile.dev`
- Move: `docker/gateway.Dockerfile` → `gateway/Dockerfile`
- Move: `docker/db.Dockerfile` → `db/Dockerfile`
- Move: `docker/db/` → `db/init/`
- Move: `env/*.env.example` → 各服务目录
- Create: `db/cron/cleanup.sql`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.override.yml`

- [ ] **Step 1: 移动 Dockerfile**

```bash
cd /home/whw23/code/mudasky

# backend
mv docker/api.Dockerfile backend/api/Dockerfile
mv docker/worker.Dockerfile backend/worker/Dockerfile

# frontend
mv docker/frontend.Dockerfile frontend/Dockerfile
mv docker/frontend.dev.Dockerfile frontend/Dockerfile.dev

# gateway
mv docker/gateway.Dockerfile gateway/Dockerfile

# db
mkdir -p db
mv docker/db.Dockerfile db/Dockerfile
mv docker/db db/init
```

- [ ] **Step 2: 移动 env.example 文件**

```bash
mv env/backend.env.example backend/.env.example
mv env/worker.env.example backend/worker/.env.example
mv env/gateway.env.example gateway/.env.example
mv env/db.env.example db/.env.example

# .env 文件保留在 env/ 不动（已在 .gitignore 中或手动处理）
```

- [ ] **Step 3: 创建 db/cron/cleanup.sql**

```sql
-- 定时清理过期的刷新令牌（每小时执行）
SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 * * * *',
    $$DELETE FROM refresh_token WHERE expires_at < NOW()$$
);
```

- [ ] **Step 4: 更新 docker-compose.yml**

更新所有 `build.context`、`dockerfile`、`env_file` 路径：

```yaml
services:
  api:
    build:
      context: ./backend
      dockerfile: api/Dockerfile
    env_file: env/backend.env
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
      dockerfile: worker/Dockerfile
    env_file: env/worker.env
    depends_on:
      db:
        condition: service_healthy
    profiles: ["worker"]

  gateway:
    build:
      context: ./gateway
      dockerfile: Dockerfile
    ports:
      - "80:80"
    env_file: env/gateway.env
    depends_on:
      api:
        condition: service_healthy
      frontend:
        condition: service_started

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    depends_on:
      api:
        condition: service_healthy

  db:
    build:
      context: ./db
      dockerfile: Dockerfile
    env_file: env/db.env
    command: postgres -c shared_preload_libraries=pg_cron -c cron.database_name=mudasky
    ports:
      - "47293:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mudasky"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

注意：`uploads` volume 已移除（文件存储改为 BYTEA）。

- [ ] **Step 5: 更新 docker-compose.override.yml**

```yaml
services:
  api:
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app

  frontend:
    build:
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app

  gateway:
    entrypoint: ["sh", "/usr/local/openresty/nginx/dev-entrypoint.sh"]
    environment:
      - RATE_LIMIT_MULTIPLIER=10
    volumes:
      - ./gateway/lua:/usr/local/openresty/nginx/lua
      - ./gateway/conf.d:/etc/nginx/conf.d
      - ./gateway/nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf
      - ./gateway/dev-entrypoint.sh:/usr/local/openresty/nginx/dev-entrypoint.sh

  db:
    ports:
      - "15432:5432"
```

- [ ] **Step 6: 更新 Dockerfile 内路径**

`backend/api/Dockerfile`:
```dockerfile
FROM python:3.14-slim

WORKDIR /app

COPY shared/ ./shared/
COPY api/ ./api/
COPY scripts/ ./scripts/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY pyproject.toml ./

RUN pip install --no-cache-dir ./shared ./api

WORKDIR /app

RUN chmod +x scripts/start-api.sh

EXPOSE 8000
CMD ["./scripts/start-api.sh"]
```

- [ ] **Step 7: 删除旧 docker/ 和 env/ 目录中已迁移的文件**

```bash
rm -rf docker/
# env/ 保留 .env 文件（不提交），删除 .env.example（已迁移）
rm -f env/*.env.example
```

- [ ] **Step 8: 提交**

```bash
git add -A && git commit -m "refactor: Dockerfile 和 env 文件归位到各服务目录"
```

---

## Task 11: 启动脚本、alembic、init scripts 迁移

**Files:**
- Move: `backend/api/scripts/init/` → `backend/scripts/init/`
- Move: `backend/api/scripts/start.sh` → `backend/scripts/start-api.sh`
- Move: `backend/api/alembic/` → `backend/alembic/`
- Move: `backend/api/alembic.ini` → `backend/alembic.ini`

- [ ] **Step 1: 迁移脚本和 alembic**

```bash
cd /home/whw23/code/mudasky/backend
mkdir -p scripts
mv api/scripts/init scripts/init
mv api/scripts/start.sh scripts/start-api.sh
mv api/alembic alembic
mv api/alembic.ini alembic.ini
rm -rf api/scripts
```

- [ ] **Step 2: 重写 start-api.sh（只启动 uvicorn）**

```bash
#!/bin/bash
set -e

if [ "$DEBUG" = "true" ]; then
  pip install --no-deps -e /app/shared -e /app/api > /dev/null 2>&1
fi

UVICORN_ARGS="--host 0.0.0.0 --port 8000"
if [ "$DEBUG" = "true" ]; then
  UVICORN_ARGS="$UVICORN_ARGS --reload --reload-dir /app/shared/app --reload-dir /app/api/api"
fi
exec uvicorn api.main:app $UVICORN_ARGS
```

- [ ] **Step 3: 更新 scripts/init/ 的 import 路径**

所有 seed 文件的 import 更新：

| 旧路径 | 新路径 |
|--------|--------|
| `from app.core.database import Base, async_session_factory, engine` | `from app.db import Base, async_session_factory, engine` |
| `from app.core.logging import setup_logging` | `from app.core.logging import setup_logging` |
| `from app.core.security import hash_password` | `from app.utils.security import hash_password` |
| `from app.rbac.models import ...` | `from app.db.rbac.models import ...` |
| `from app.user.models import ...` | `from app.db.user.models import ...` |
| `from app.content.models import ...` | `from app.db.content.models import ...` |
| `from app.config.models import ...` | `from app.db.config.models import ...` |
| `from app.rbac.tables import ...` | `from app.db.rbac.tables import ...` |

- [ ] **Step 4: 更新 alembic/env.py 的 import 路径**

```python
from app.core.config import settings
from app.db import Base

from app.db.rbac.models import Permission, Role  # noqa: F401
from app.db.user.models import User  # noqa: F401
from app.db.auth.models import SmsCode, RefreshToken  # noqa: F401
from app.db.case.models import SuccessCase  # noqa: F401
from app.db.content.models import Article, Category  # noqa: F401
from app.db.document.models import Document  # noqa: F401
from app.db.worker.models import Task  # noqa: F401
from app.db.config.models import SystemConfig  # noqa: F401
from app.db.university.models import University  # noqa: F401
```

- [ ] **Step 5: 更新 alembic.ini 的 script_location**

```ini
script_location = alembic
```

（从 `api/alembic` 改为 `alembic`，因为 alembic.ini 现在在 backend/ 根目录）

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "refactor: 启动脚本、alembic、init scripts 独立到 backend 根目录"
```

---

## Task 12: 文件存储迁移（磁盘 → PostgreSQL BYTEA）

**Files:**
- Modify: `backend/shared/app/db/document/models.py`
- Modify: `backend/shared/app/db/document/repository.py`
- Modify: `backend/api/api/portal/document/service.py`
- Modify: `backend/api/api/portal/document/router.py`
- Delete: `backend/shared/app/db/document/storage/` (如果已复制)
- Create: alembic migration

- [ ] **Step 1: 修改 Document model，添加 BYTEA 列**

```python
# backend/shared/app/db/document/models.py
from sqlalchemy import Column, LargeBinary
# 在现有 Document 模型中添加：
file_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
```

删除 `file_path` 列（或标记为 deprecated），保留 `file_name`、`file_size`、`file_hash`、`content_type` 等元数据列。

- [ ] **Step 2: 更新 document repository**

repository 的 CRUD 方法需要处理 BYTEA 数据的读写。

- [ ] **Step 3: 更新 portal/document/service.py**

将原 `core/storage.py` 的配额校验逻辑移到此处。删除对 `app.core.storage` 和 `app.document.storage` 的引用。

- [ ] **Step 4: 生成 alembic 迁移**

```bash
cd /home/whw23/code/mudasky/backend
alembic revision --autogenerate -m "document: 文件存储迁移到 BYTEA"
```

检查生成的迁移脚本，确认添加 `file_data` 列、数据迁移（如有已存储文件）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "refactor: 文件存储从磁盘迁移到 PostgreSQL BYTEA"
```

---

## Task 13: 测试重写

**Files:**
- Restructure: `backend/api/tests/` 按面板/域重组
- Modify: 所有测试文件的 import 路径

- [ ] **Step 1: 创建新测试目录结构**

```bash
cd /home/whw23/code/mudasky/backend/api/tests
mkdir -p auth
mkdir -p public/{config,content,case,university}
mkdir -p admin/{user,rbac,config,content,case,university}
mkdir -p portal/{user,document,content}
```

- [ ] **Step 2: 移动现有测试到新目录**

按照面板/域映射关系移动：

```bash
# auth
mv test_auth_router.py auth/test_router.py
mv test_auth_service.py auth/test_service.py

# admin/user
mv test_admin_router.py admin/user/test_router.py
mv test_admin_service.py admin/user/test_service.py
mv test_admin_service_extra.py admin/user/test_service_extra.py

# admin/rbac
mv test_rbac_router.py admin/rbac/test_router.py
mv test_rbac_service.py admin/rbac/test_service.py
mv test_rbac_repository.py admin/rbac/test_repository.py

# admin/config
mv test_config_router.py admin/config/test_router.py
mv test_config_service.py admin/config/test_service.py
mv test_config_repository.py admin/config/test_repository.py

# admin/content（或按面板拆分）
mv test_content_router.py admin/content/test_router.py
mv test_content_service.py admin/content/test_service.py

# portal/user
mv test_user_router.py portal/user/test_router.py
mv test_user_service.py portal/user/test_service.py

# portal/document
mv test_document_router.py portal/document/test_router.py
mv test_document_service.py portal/document/test_service.py

# core/utils 测试保留在根目录或移到合适位置
# test_core_config.py, test_core_crypto.py, test_core_security.py, test_core_storage.py
# test_error_codes.py, test_session_router.py
```

- [ ] **Step 3: 更新所有测试的 import 路径**

| 旧路径 | 新路径 |
|--------|--------|
| `from app.{domain}.service import ...` | `from api.{panel}.{domain}.service import ...` |
| `from app.{domain}.router import ...` | `from api.{panel}.{domain}.router import ...` |
| `from app.{domain}.schemas import ...` | `from api.{panel}.{domain}.schemas import ...` |
| `from app.core.exceptions import ...` | `from app.core.exceptions import ...` |
| `from app.{domain}.models import ...` | `from app.db.{domain}.models import ...` |

mock patch 路径：
| 旧路径 | 新路径 |
|--------|--------|
| `"app.{domain}.service.repository"` | `"api.{panel}.{domain}.service.repository"` |

- [ ] **Step 4: 更新 e2e/conftest.py**

```python
E2E_BASE_URL = "http://localhost"  # 网关集成测试仍走网关
```

新增接口测试的 conftest：

```python
# tests/conftest.py 新增
API_BASE_URL = "http://localhost:8000"  # 直连 API

@pytest.fixture
async def api_client():
    """直连 API 的 httpx 客户端。"""
    async with httpx.AsyncClient(base_url=API_BASE_URL) as client:
        yield client

@pytest.fixture
async def admin_api_client():
    """模拟管理员的直连 API 客户端。"""
    headers = {
        "X-User-Id": "test-admin-id",
        "X-User-Permissions": "admin.user.list,admin.user.create,admin.rbac.list",
        "X-User-Type": "staff",
        "X-Is-Superuser": "true",
    }
    async with httpx.AsyncClient(
        base_url=API_BASE_URL,
        headers=headers,
    ) as client:
        yield client
```

- [ ] **Step 5: 运行测试验证**

```bash
cd /home/whw23/code/mudasky
uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e
```

Expected: 所有单元测试通过。

- [ ] **Step 6: 运行覆盖率检查**

```bash
uv run --project backend/api python -m pytest --cov=api --cov-report=term-missing
```

Expected: 覆盖率 >= 90%。

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "refactor: 测试按面板/域重组并更新 import"
```

---

## Task 14: 网关适配

- [ ] **Step 1: 验证 API URL 未变化**

启动容器并检查所有现有接口是否正常响应：

```bash
docker compose up -d
# 等待健康检查通过后
curl http://localhost/api/health
curl http://localhost/api/public/config/site-info
curl http://localhost:8000/api/health
```

- [ ] **Step 2: 检查网关路由规则**

检查 `gateway/conf.d/` 和 `gateway/lua/` 中的路由规则是否与新的 API 路径匹配。由于 API URL 不变，通常不需要修改。

- [ ] **Step 3: 运行网关集成测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
```

- [ ] **Step 4: 提交（如有修改）**

```bash
git add -A && git commit -m "fix: 适配网关配置到重构后的后端"
```

---

## Task 15: Rules 更新 + 清理

**Files:**
- Modify: `.claude/rules/code-style.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 code-style.md 中的路径示例**

将所有 `src/app/rbac/router.py` 类似的路径引用更新为新结构。

- [ ] **Step 2: 更新 CLAUDE.md 的 Directory Structure**

```text
mudasky/
├── frontend/          # React app (pnpm)
├── backend/           # Python app
│   ├── shared/        # 基础设施层（app 包）
│   ├── api/           # 业务层（api 包）
│   ├── worker/        # 任务队列
│   ├── alembic/       # 数据库迁移
│   └── scripts/       # 运维脚本
├── gateway/           # OpenResty / Lua config
├── db/                # 数据库（Dockerfile, init, cron）
├── .github/workflows/ # CI/CD
├── docker-compose.yml
└── docker-compose.override.yml
```

- [ ] **Step 3: 运行前端 Playwright 测试确认无影响**

```bash
pnpm --prefix frontend exec playwright test --workers=1
```

- [ ] **Step 4: 最终提交**

```bash
git add -A && git commit -m "docs: 更新 rules 和 CLAUDE.md 反映重构后结构"
```

- [ ] **Step 5: 合并到 dev**

```bash
git checkout dev
git merge feat/backend-restructure
```
