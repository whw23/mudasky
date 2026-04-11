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
├── backend/           # Python app (uv for local dev, Python 3.14)
├── gateway/           # OpenResty / Lua config
├── legacy/            # Code migrated from old system
├── scripts/           # Dev/ops scripts
├── docker/            # Dockerfiles
├── .github/workflows/ # CI/CD (main branch only)
├── docker-compose.yml
└── docker-compose.override.yml  # dev overrides
```

## Tooling

| Tool   | Scope                          |
|--------|--------------------------------|
| pnpm   | Frontend package manager (Next.js) |
| uv     | Backend local dev (IDE + LSP)  |
| Docker | Container runtime              |

- Backend container uses `python:3.14` image directly, no uv inside container
- Database runs in Docker Compose (named volume for data persistence)

## Development

```bash
# Start dev environment (auto-loads override)
docker compose up

# Build for production
docker compose -f docker-compose.yml build
```

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

## LSP

See `.claude/rules/lsp.md`

## Superpowers

始终使用 superpowers 插件的 skill。开始任何任务前，先检查是否有匹配的 skill（brainstorming、writing-plans、test-driven-development、systematic-debugging 等），有则必须使用。

## Design Docs

- RBAC 权限重构：`docs/rbac-redesign.md`
