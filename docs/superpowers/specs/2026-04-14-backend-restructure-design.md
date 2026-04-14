# 后端架构重构：shared → api 分层设计

## 目标

将 router、service、schemas 从 `backend/shared/` 移到 `backend/api/`，使 shared 只保留纯数据层（models + repository）和基础设施（core + 接口），api 按面板层级组织业务逻辑。同时去掉 `src/` 中间层，将 alembic 和 init scripts 从 api 中独立出来。

## 重构前结构

```text
backend/
├── shared/src/app/              # 包名 app
│   ├── core/                    # 全部基础设施
│   ├── {domain}/                # models + repository + schemas + service + router 混在一起
│   └── worker/
├── api/src/api/                 # 包名 api
│   ├── main.py                  # FastAPI 入口，导入所有 router
│   ├── tests/
│   ├── scripts/init/            # 种子数据
│   └── alembic/                 # 数据库迁移
└── worker/src/worker_runner/     # 包名 worker_runner
```

问题：shared 包含了不该共享的业务层代码（router/service/schemas），api 几乎是空壳。

## 重构后结构

### shared（按基础设施类型组织）

```text
backend/shared/app/              # 去掉 src/，包名仍为 app
├── db/                          # 数据库基础设施
│   ├── __init__.py              # engine, session, Base, get_db
│   ├── model_utils.py           # ORM 工具函数
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   ├── case/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   ├── content/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   ├── document/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   ├── rbac/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── repository.py
│   │   └── tables.py            # 多对多关联表
│   ├── university/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   ├── user/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── repository.py
│   └── worker/
│       ├── __init__.py
│       ├── models.py
│       └── queue.py
├── sms/                         # 短信基础设施
│   └── __init__.py              # send_sms_code（当前存根，后期对接阿里云）
├── core/                            # 应用基础设施（不可替换）
│   ├── __init__.py
│   ├── config.py                    # 应用配置（Settings）
│   ├── exceptions.py                # 异常体系
│   └── logging.py                   # 结构化日志
└── utils/                           # 辅助工具（可替换）
    ├── __init__.py
    ├── crypto.py                    # RSA 非对称加密
    └── security.py                  # 密码哈希/验证
```

### api（业务逻辑 + 路由，按面板层级组织）

```text
backend/api/api/                 # 去掉 src/，包名仍为 api
├── core/                        # API 专用基础设施（从 shared/core 迁入）
│   ├── __init__.py
│   ├── cache.py                 # HTTP 缓存工具
│   ├── dependencies.py          # FastAPI 依赖注入（CurrentUserId, DbSession）
│   └── pagination.py            # 分页
├── auth/                        # /auth（独立挂载，不属于任何面板）
│   ├── __init__.py              # 导出 router
│   ├── router.py
│   ├── service.py
│   └── schemas.py
├── public/                      # /public 前缀
│   ├── __init__.py              # 组装 public router，挂载所有子路由
│   ├── config/
│   │   ├── __init__.py          # 导出 config router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── content/
│   │   ├── __init__.py          # 导出 content router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── case/
│   │   ├── __init__.py          # 导出 case router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   └── university/
│       ├── __init__.py          # 导出 university router
│       ├── router.py
│       ├── service.py
│       └── schemas.py
├── admin/                       # /admin 前缀
│   ├── __init__.py              # 组装 admin router
│   ├── user/                    # 用户管理（原 admin domain）
│   │   ├── __init__.py          # 导出 user router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── rbac/
│   │   ├── __init__.py          # 导出 rbac router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── config/
│   │   ├── __init__.py          # 导出 config router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── content/
│   │   ├── __init__.py          # 导出 content router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── case/
│   │   ├── __init__.py          # 导出 case router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   └── university/
│       ├── __init__.py          # 导出 university router
│       ├── router.py
│       ├── service.py
│       └── schemas.py
├── portal/                      # /portal 前缀
│   ├── __init__.py              # 组装 portal router
│   ├── user/
│   │   ├── __init__.py          # 导出 user router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   ├── document/
│   │   ├── __init__.py          # 导出 document router
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   └── content/
│       ├── __init__.py          # 导出 content router
│       ├── router.py
│       ├── service.py
│       └── schemas.py
└── main.py                      # FastAPI 入口
```

测试目录保持在 `api/tests/`（包外），不在 `api/api/` 内部：

```text
backend/api/
├── api/                         # Python 包
├── tests/                       # 测试（包外）
└── pyproject.toml
```

### 运维脚本（从 api 独立出来）

```text
backend/
├── alembic/                     # 数据库增量迁移（Python/alembic）
├── alembic.ini
└── scripts/
    ├── init/                    # 初始建表 + 种子数据（Python/SQLAlchemy）
    │   ├── __init__.py
    │   ├── __main__.py
    │   ├── seed_config.py
    │   ├── seed_content.py
    │   ├── seed_rbac.py
    │   └── seed_user.py
    └── start-api.sh             # 只启动 uvicorn
```

## 路由组装

每层目录的 `__init__.py` 负责组装并导出该层的 router，形成层层嵌套的链式结构。

### 域级 `__init__.py`（导出域内路由）

```python
# api/public/config/__init__.py
from .router import router

__all__ = ["router"]
```

### 面板级 `__init__.py`（组装面板内所有域路由）

```python
# api/public/__init__.py
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

### main.py（组装所有面板路由）

```python
from .auth import router as auth_router
from .public import router as public_router
from .admin import router as admin_router
from .portal import router as portal_router

api.include_router(auth_router)
api.include_router(public_router)
api.include_router(admin_router)
api.include_router(portal_router)
```

## Import 规则

| 来源文件 | 引用目标 | import 路径 |
| -------- | -------- | ----------- |
| api 的 service | shared 的 repository | `from app.db.{domain} import repository` |
| api 的 service | shared 的基础设施 | `from app.sms import` 等 |
| api 的 router/service/schemas | shared 的 core | `from app.core.exceptions import` / `from app.core.config import` 等 |
| api 的 router/service/schemas | api 自己的 core | `from api.core.xxx import` |
| api 的 router | 同域的 service/schemas | `from .service import` / `from .schemas import` |
| api 内跨面板 | 不允许 | 通过 repository 层共享 |
| tests | 被测的 service/router | `from api.{panel}.{domain}.xxx import` |
| tests | shared 的 models/exceptions | `from app.db.{domain}.models import` / `from app.exceptions import` |
| tests mock patch | — | `"api.{panel}.{domain}.service.repository"` |

## Schemas 设计原则

- 每个接口的 schemas 独立定义，不跨面板共享
- public/admin/portal 同一领域的 schemas 各自定义各自的请求/响应模型
- 不同面板对同一资源的展示字段不同（如 public 只返回已发布文章的展示字段，admin 返回全部管理字段）

## Service 设计原则

- service 按面板各写一份，不跨面板共享
- 共享逻辑下沉到 repository 层（shared）
- service 间不跨面板调用，需要共享数据时通过 repository

### 行级安全策略

每个面板的 service 在调用 repository 时，必须按以下规则约束数据访问范围：

| 面板 | 读权限 | 写权限 | 过滤条件 |
| ------ | ------ | ------ | -------- |
| public | 只读 | 无 | `status = published`（仅已发布/公开的数据） |
| admin | 全部 | 全部 | 无限制 |
| portal | 仅自己 | 仅自己 | `user_id = current_user_id`（仅当前用户的数据） |

- **public service**：所有查询必须附加发布状态过滤，禁止暴露草稿、未审核等内部状态数据
- **portal service**：所有查询和操作必须附加用户 ID 过滤，禁止访问其他用户的数据
- **admin service**：可访问全部数据，但删除/批量操作需记录审计日志

## 文件存储方案变更

文件从本地磁盘存储改为存入 PostgreSQL（`BYTEA` 类型），简化架构：

- 删除 `shared/app/storage/`（抽象接口 + 本地实现）和 `shared/app/core/storage.py`（工具函数）
- 文件二进制数据存入 `document` 表的 `BYTEA` 列
- 文件元数据（文件名、大小、哈希、类型）仍为独立列
- `document` 的 models/repository 在 `app/db/document/` 中统一管理
- Docker Volume（uploads）不再需要，从 `docker-compose.yml` 中移除
- 配额校验逻辑移到 `portal/document/service.py`（api 层业务逻辑）
- 后期迁移 OSS 时，直接从数据库 `SELECT` 读出写入 OSS

## api/core（API 专用基础设施）

原 `shared/app/core/` 中仅 API 层使用的模块，迁入 `api/api/core/`：

| 模块 | 原因 |
| ---- | ---- |
| `cache.py` | HTTP 缓存，仅 API 路由层使用 |
| `dependencies.py` | FastAPI 依赖注入（CurrentUserId, DbSession），仅路由层使用 |
| `pagination.py` | 分页响应，仅 API 层使用 |

## shared 模块分布

原 `core/` 不再作为统一目录，各模块按基础设施归属分布在 `shared/app/` 下：

| 模块 | 位置 | 原因 |
| ---- | ---- | ---- |
| `database.py` → `db/__init__.py` | `app.db` | 数据库引擎，所有域的 models/repository 在其下 |
| `model_utils.py` | `app.db.model_utils` | ORM 工具，与数据库强关联 |
| `sms.py` → `sms/__init__.py` | `app.sms` | 短信基础设施，独立于数据库 |
| `config.py` | `app.core.config` | 应用配置，不可替换 |
| `exceptions.py` | `app.core.exceptions` | 异常体系，不可替换 |
| `logging.py` | `app.core.logging` | 结构化日志，不可替换 |
| `crypto.py` | `app.utils.crypto` | RSA 加密工具，可替换 |
| `security.py` | `app.utils.security` | 密码哈希工具，可替换 |

## pyproject.toml 变更

### shared/pyproject.toml

```toml
[tool.hatch.build.targets.wheel]
packages = ["app"]              # 从 ["src/app"] 改为 ["app"]
```

### api/pyproject.toml

```toml
[tool.hatch.build.targets.wheel]
packages = ["api"]              # 从 ["src/api"] 改为 ["api"]
```

`alembic` 依赖保留，但从 api 的 dependencies 移到 backend 根级 pyproject.toml 或独立管理。

## Dockerfile / env 文件归位

当前 Dockerfile 集中在 `docker/`，env 文件集中在 `env/`，与所属服务分离。重构后各文件移入所属服务目录：

### 重构前

```text
docker/
├── api.Dockerfile
├── worker.Dockerfile
├── frontend.Dockerfile
├── frontend.dev.Dockerfile
├── gateway.Dockerfile
├── db.Dockerfile
└── db/                          # 数据库初始化脚本
env/
├── backend.env / backend.env.example
├── worker.env / worker.env.example
├── gateway.env / gateway.env.example
└── db.env / db.env.example
```

### 重构后

```text
backend/
├── api/
│   ├── Dockerfile
│   └── .env.example
├── worker/
│   ├── Dockerfile
│   └── .env.example
├── shared/
├── scripts/
└── .env.example                 # 原 backend.env.example（shared 的数据库配置等）

frontend/
├── Dockerfile
├── Dockerfile.dev
└── .env.example

gateway/
├── Dockerfile
└── .env.example

db/
├── Dockerfile
├── .env.example
├── init/                        # 首次初始化 SQL 脚本（容器首次启动时执行）
└── cron/                        # pg_cron 定时任务 SQL
    └── cleanup.sql              # 清理过期 refresh token 等
```

- `.env` 文件加入 `.gitignore`，只提交 `.env.example`
- `docker-compose.yml` 中 `build.context` 和 `env_file` 路径相应调整

## 启动脚本变更

### start-api.sh（只启动 uvicorn）

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

### 数据库迁移和初始化

通过手动执行或 CI/CD 触发，不再在 API 启动时自动运行：

```bash
# 迁移
cd backend && alembic upgrade head

# 种子数据
cd backend && python -m scripts.init
```

### api.Dockerfile

- 包路径变更由 pyproject.toml 控制，COPY 和 pip install 逻辑不变
- `start-api.sh` 从 `api/scripts/start.sh` 移到 `backend/scripts/start-api.sh`，Dockerfile 中的 `CMD` 路径需相应更新
- `scripts/init/` 移到 `backend/scripts/init/`，不再由 Dockerfile 触发

### 定时清理任务

当前 `main.py` 中的 `_cleanup_expired_data`（清理过期 refresh token）属于运维任务，从 API 进程中移除。改用 pg_cron 在数据库层定时执行，docker-compose 已配置 `pg_cron` 扩展。

pg_cron 的 SQL 脚本放在数据库目录下：

```text
db/
├── Dockerfile
├── .env.example
├── init/                            # 数据库初始化脚本（容器首次启动时执行）
└── cron/                            # pg_cron 定时任务 SQL
    └── cleanup.sql                  # 清理过期 refresh token 等
```

### scripts/init 执行环境

`scripts/init/` 依赖 `app` 包（shared）。在容器内执行时，shared 已通过 pip install 安装，可直接 `python -m scripts.init`。本地开发时需先 `uv pip install -e shared`。

init scripts 的 import 路径同步更新：

```python
# 重构前
from app.core.database import Base, async_session_factory
from app.rbac.models import Permission, Role
from app.utils.security import hash_password

# 重构后
from app.db import Base, async_session_factory
from app.db.rbac.models import Permission, Role
from app.utils.security import hash_password
```

### worker 的 src/ 层

worker 当前为 `worker/src/worker_runner/`，本次重构不涉及 worker，保持不变。后续可单独对齐去掉 `src/`。

## 测试规范

### 测试目录结构

测试目录按面板/域组织，与源码结构对应：

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
│   └── university/
├── portal/
│   ├── user/
│   ├── document/
│   └── content/
└── e2e/                         # E2E 测试保持按功能组织
```

### Import 与 Mock

```python
# 导入被测模块
from api.admin.content.service import ContentService

# mock patch 路径需匹配被测模块内的引用
REPO = "api.admin.content.service.repository"
```

### 测试执行环境

- 所有测试在**容器外**运行（宿主机）
- 单元测试：mock 依赖，不需要容器
- 后端接口测试（httpx）：直连 API 容器 `http://localhost:8000/api`（开发环境已暴露 8000 端口），不走网关
- 前端 E2E 测试（Playwright）：通过网关 `http://localhost` 走完整链路

### 测试文件命名

- 按模块命名：`test_router.py`、`test_service.py`
- 目录层级已区分面板和域，文件名无需再加前缀

### 测试覆盖要求

- 代码测试覆盖率必须达到 **90% 以上**
- **接口测试覆盖率 100%**：每个 API 接口必须有正向测试 + 反向测试（异常/边界/权限拒绝等）
- 每个 service 方法必须有对应的单元测试
- 重构完成后，所有现有测试必须重写以适配新的目录结构和 import 路径
- 使用 `pytest-cov` 检查覆盖率：`uv run --project backend/api python -m pytest --cov=api --cov-report=term-missing`

## 实施策略

### 前置任务（重构前完成）

1. 创建 `feat/backend-restructure` 分支
2. 删除原计划文档 `docs/superpowers/plans/backend-restructure.md`，避免与 spec 冲突
3. `model_utils.py` 从 `app/db/` 移到 `app/utils/`（工具函数，不属于数据库基础设施）

### 主体重构

一次性批量迁移：将所有域的 router/service/schemas 统一移到 api 对应的面板目录下，然后统一修改所有 import 路径。

### 收尾任务（重构后完成）

1. 更新 `.claude/rules/architecture.md` — 反映新的分层结构和 import 规则
2. 更新 `.claude/rules/code-style.md` — 更新路径引用示例
3. 重写所有后端测试，适配新目录结构和 import 路径
4. 后端接口测试通过手动设置请求头（`X-User-Id` 等）直连 API 测试，不依赖网关
5. 后端测试全部通过后，根据已实现的后端接口逐步修改网关配置
6. 验证 API URL 不变，前端无需改动

## 影响范围

- 移动文件：~30 个（9 域 × router/service/schemas + admin_router × 2 + core × 3）
- 新增文件：面板 `__init__.py` × 3、各域 `__init__.py`
- Import 修改：~100+ 处（源码 + 测试）
- 配置修改：pyproject.toml × 2、start.sh、docker-compose.yml、alembic.ini
- 删除文件：shared 中被移走的 router/service/schemas
- schemas 拆分：原共享 schemas 按面板拆分为独立定义
