# 修复热更新失效

## Context

当前项目运行在 Docker Desktop + WSL2 环境下，前端源码在 Windows 文件系统（`D:\Code\mudasky`）通过 bind mount 挂载到容器。Windows NTFS → WSL2 Linux 容器的跨文件系统挂载无法可靠传递 inotify 事件，导致 Turbopack 的文件监听器间歇性失效，热更新（HMR）不稳定。

现有的 `frontend/dev-watch.sh` 轮询脚本尝试用 `touch` 触发 inotify 通知来补偿，但不够稳定。

## 方案

将项目迁移到 WSL2 内部 Linux 文件系统（如 `~/code/mudasky`），从根本上消除跨文件系统事件传递问题。同时删除不再需要的轮询脚本。

## 代码变更

### 1. 删除 `frontend/dev-watch.sh`

WSL2 原生文件系统上 inotify 正常工作，不再需要轮询补偿机制。

### 2. 简化 `frontend/dev-entrypoint.sh`

移除 `dev-watch.sh` 的后台启动逻辑，直接执行 `pnpm dev`：

```bash
#!/bin/sh
exec pnpm dev
```

### 涉及文件

- `frontend/dev-watch.sh` — 删除
- `frontend/dev-entrypoint.sh` — 简化

## 环境迁移（用户自行操作）

1. 在 WSL2 中 `git clone` 项目到 Linux 文件系统
2. 复制 `.claude/settings.local.json` 和 `.env` 等 gitignore 文件
3. 在 WSL2 中重新安装和配置 Claude Code CLI 及 plugins
4. 从 WSL2 内部运行 `docker compose up`

## 验证

1. 在 WSL2 中启动 `docker compose up`
2. 修改一个前端组件文件（如 `.tsx`）
3. 确认浏览器在 1-2 秒内自动热更新，无需手动刷新
4. 检查 docker logs 中不再有 `[dev-watch]` 相关日志
