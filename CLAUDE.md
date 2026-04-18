# mudasky — Project Instructions

## Tech Stack

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Gateway     | OpenResty (Lua)                          |
| Frontend    | Next.js + React + TypeScript             |
| UI          | shadcn/ui + Tailwind CSS                 |
| Backend     | Python                                   |
| Database    | PostgreSQL                               |
| ORM         | SQLAlchemy                               |
| HTTP Client | httpx (后端) / axios (前端)              |
| Validation  | Pydantic                                 |
| State Mgmt  | React Context                            |
| Testing     | pytest (后端) / Vitest (前端)            |
| Infra       | Docker                                   |

## Branch Strategy

| Branch   | Purpose                        |
|----------|--------------------------------|
| `main`   | Production — CI/CD runs here   |
| `dev`    | Integration branch             |
| `feat/*` | Feature branches               |

Merge order: `feat/*` → `dev` → `main`

新功能必须在 `feat/*` 分支上开发，完成后合并回 `dev` 分支，禁止直接在 `dev` 上开发功能。

## Directory Structure

```text
mudasky/
├── frontend/          # React app (pnpm)
├── backend/           # Python app
│   ├── shared/        # 基础设施层（app 包：db/sms/core/utils）
│   ├── api/           # 业务层（api 包：auth/public/admin/portal）
│   ├── worker/        # 任务队列
│   ├── alembic/       # 数据库迁移
│   └── scripts/       # 运维脚本（init/start-api.sh）
├── gateway/           # OpenResty / Lua config
├── db/                # 数据库（Dockerfile, init, cron）
├── scripts/           # 运维脚本（dev.sh, test.sh）
├── test-results/      # 测试结果（按时间戳，gitignore）
├── legacy/            # Code migrated from old system
├── .github/workflows/ # CI/CD (main branch only)
├── docker-compose.yml
└── docker-compose.override.yml  # dev overrides
```

## Tooling

| Tool   | Scope                              |
|--------|------------------------------------|
| pnpm   | Frontend package manager (Next.js) |
| uv     | Backend local dev (IDE + LSP)      |
| Docker | Container runtime              |

- Backend container uses `python:3.14` image directly, no uv inside container
- Database runs in Docker Compose (named volume for data persistence)

## Development

```bash
./scripts/dev.sh start   # 启动开发环境
./scripts/dev.sh --prod  # 构建并启动生产容器（E2E 用）
./scripts/dev.sh --clean # 清理数据卷重建
./scripts/dev.sh --down  # 停止容器
```

## Testing

```bash
./scripts/test.sh unit         # 后端单元测试 + 覆盖率
./scripts/test.sh vitest       # 前端单元测试
./scripts/test.sh gateway      # 网关集成测试
./scripts/test.sh e2e          # 本地 E2E（需生产容器）
./scripts/test.sh e2e:prod     # 线上 E2E
./scripts/test.sh all          # 本地全部
```

测试结果保存在 `test-results/<时间戳>/`，`test-results/latest` 指向最新。

## Project Context

See `.claude/rules/project-context.md`

## Architecture

See `.claude/rules/architecture.md`

## Constraints

See `.claude/rules/constraints.md`

## Code Style

See `.claude/rules/code-style.md`

## Frontend Design

See `.claude/rules/frontend-design.md`

## Workflow

See `.claude/rules/workflow.md`

## Logging

See `.claude/rules/logging.md`

## Git

See `.claude/rules/git.md`

## Testing Rules

See `.claude/rules/testing.md`

## LSP

See `.claude/rules/lsp.md`

## Superpowers

始终使用 superpowers 插件的 skill。开始任何任务前，先检查是否有匹配的 skill（brainstorming、writing-plans、test-driven-development、systematic-debugging 等），有则必须使用。

## Design Docs

已完成功能的设计文档和实施计划在实施完成后删除，架构决策整合到 `.claude/rules/architecture.md`。
