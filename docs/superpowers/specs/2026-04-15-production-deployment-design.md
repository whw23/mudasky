# 生产环境部署设计

## 目标

在阿里云服务器（2 核 / 3.4GB / 40GB）上部署 mudasky 全栈应用，通过 GitHub Actions 实现 CI/CD。

## 约束

- 服务器：`REDACTED_HOST`，端口 `REDACTED_PORT`，用户 `whw23`
- 域名：`mudaguoji.com`（DNS 尚未解析到服务器）
- 第一阶段只做 HTTP 80 端口，HTTPS 等域名解析后再加
- 镜像仓库：GitHub Container Registry (ghcr.io)

---

## 1. Docker 生产配置

### 资源分配

| 容器 | 内存限制 | 说明 |
|------|---------|------|
| db | 512MB | PostgreSQL + pg_cron |
| api | 512MB | FastAPI + uvicorn |
| frontend | 512MB | `next start` 生产模式 |
| gateway | 64MB | OpenResty/Nginx |
| **总计** | **~1.6GB** | 余 ~1.8GB 给系统 |

### docker-compose.yml 改动

- 所有服务加 `deploy.resources.limits.memory`
- `restart: unless-stopped` 已加（当前分支已完成）
- 生产环境不使用 `docker-compose.override.yml`

### 镜像标签

- `ghcr.io/whw23/mudasky-frontend:latest`
- `ghcr.io/whw23/mudasky-api:latest`
- `ghcr.io/whw23/mudasky-gateway:latest`
- `ghcr.io/whw23/mudasky-db:latest`

生产 `docker-compose.yml` 中用 `image:` 指定镜像地址，而不是 `build:`。

---

## 2. 服务器目录结构

```
/home/whw23/mudasky/
├── docker-compose.yml      # 生产用（从仓库同步或 CI 推送）
├── env/                    # 生产环境变量（手动维护，不进 git）
│   ├── backend.env
│   ├── gateway.env
│   └── db.env
└── data/                   # 预留（未来 HTTPS 证书等）
```

### 环境变量

生产 env 文件需要修改的关键值：
- `backend.env`：`DATABASE_URL`（生产密码）、`SMS_ACCESS_KEY`（真实密钥）、`JWT_SECRET`、`DEBUG=false`
- `gateway.env`：`UPSTREAM_FRONTEND`、`UPSTREAM_API`
- `db.env`：`POSTGRES_PASSWORD`（生产密码）

---

## 3. CI/CD（GitHub Actions）

### 触发条件

```yaml
on:
  push:
    branches: [main]
```

### 流程

```
push to main
  → checkout 代码
  → 登录 ghcr.io
  → 构建 4 个镜像（并行）
  → 推送到 ghcr.io
  → SSH 到服务器
    → docker compose pull
    → docker compose up -d
    → 健康检查（curl /api/health）
```

### GitHub Secrets

| Secret | 说明 |
|--------|------|
| `SERVER_HOST` | `REDACTED_HOST` |
| `SERVER_PORT` | `REDACTED_PORT` |
| `SERVER_USER` | `whw23` |
| `SERVER_SSH_KEY` | 私钥内容 |
| `GHCR_TOKEN` | GitHub Personal Access Token（packages:write） |

### 生产 docker-compose

服务器上的 `docker-compose.yml` 使用 `image:` 而非 `build:`：

```yaml
services:
  frontend:
    image: ghcr.io/whw23/mudasky-frontend:latest
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## 4. DNS（手动步骤）

域名商控制台添加：
- `mudaguoji.com` → A 记录 → `REDACTED_HOST`
- `www.mudaguoji.com` → A 记录 → `REDACTED_HOST`

---

## 5. HTTPS（第二阶段，DNS 解析后）

预留方案：
- 新增 certbot 容器申请 Let's Encrypt 证书
- gateway nginx 配置 443 端口 + SSL
- cron 自动续签（每天检查，过期前 30 天续签）
- 续签后 `docker compose exec gateway nginx -s reload`

---

## 不在本次范围

- 监控/告警（可后续加 Grafana）
- 日志收集（可后续加 Loki）
- 数据库备份自动化
- CDN 加速
