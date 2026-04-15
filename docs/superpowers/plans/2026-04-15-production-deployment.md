# 生产环境部署实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阿里云服务器上部署 mudasky 全栈应用，通过 GitHub Actions 实现 main 分支自动构建和部署。

**Architecture:** GitHub Actions 构建 Docker 镜像推送到 ghcr.io，SSH 到服务器拉取并启动。生产环境使用独立的 `docker-compose.prod.yml`（image 模式），不使用 build 和 override。

**Tech Stack:** Docker, GitHub Actions, GitHub Container Registry, SSH

---

### Task 1: docker-compose.yml 加生产内存限制

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: 给所有服务加内存限制**

修改 `docker-compose.yml`，给 api、db、gateway 加 `deploy.resources.limits.memory`（frontend 已加）：

```yaml
  gateway:
    build:
      context: ./gateway
      dockerfile: Dockerfile
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 64M
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
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
    depends_on:
      api:
        condition: service_healthy

  api:
    build:
      context: ./backend
      dockerfile: api/Dockerfile
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
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

  db:
    build:
      context: ./db
      dockerfile: Dockerfile
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
    env_file: env/db.env
    command: postgres -c shared_preload_libraries=pg_cron -c cron.database_name=mudasky
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

注意：去掉 db 的 `ports: - "47293:5432"`（生产环境不暴露数据库端口，开发用 override 暴露）。

- [ ] **Step 2: 把 db 端口移到 override**

在 `docker-compose.override.yml` 的 db 部分确认已有：

```yaml
  db:
    ports:
      - "15432:5432"
```

- [ ] **Step 3: 验证本地 docker compose 正常**

Run: `docker compose config --quiet && echo "valid"`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.override.yml
git commit -m "chore: 生产内存限制 + db 端口移到 override"
```

---

### Task 2: 创建生产 docker-compose.prod.yml

**Files:**
- Create: `docker-compose.prod.yml`

- [ ] **Step 1: 创建生产 compose 文件**

```yaml
# docker-compose.prod.yml
# 生产环境：使用预构建镜像，不使用 build

services:
  gateway:
    image: ghcr.io/whw23/mudasky-gateway:latest
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 64M
    ports:
      - "80:80"
    env_file: env/gateway.env
    depends_on:
      api:
        condition: service_healthy
      frontend:
        condition: service_started

  frontend:
    image: ghcr.io/whw23/mudasky-frontend:latest
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
    depends_on:
      api:
        condition: service_healthy

  api:
    image: ghcr.io/whw23/mudasky-api:latest
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
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

  db:
    image: ghcr.io/whw23/mudasky-db:latest
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
    env_file: env/db.env
    command: postgres -c shared_preload_libraries=pg_cron -c cron.database_name=mudasky
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mudasky"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat: 生产 docker-compose.prod.yml — 镜像模式"
```

---

### Task 3: GitHub Actions CI/CD

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: 编写 CI/CD workflow**

替换 `.github/workflows/build.yml` 全部内容：

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}/mudasky

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: 登录 GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 构建并推送 gateway 镜像
        uses: docker/build-push-action@v6
        with:
          context: ./gateway
          push: true
          tags: ${{ env.IMAGE_PREFIX }}-gateway:latest,${{ env.IMAGE_PREFIX }}-gateway:${{ github.sha }}

      - name: 构建并推送 frontend 镜像
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: true
          tags: ${{ env.IMAGE_PREFIX }}-frontend:latest,${{ env.IMAGE_PREFIX }}-frontend:${{ github.sha }}

      - name: 构建并推送 api 镜像
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          file: ./backend/api/Dockerfile
          push: true
          tags: ${{ env.IMAGE_PREFIX }}-api:latest,${{ env.IMAGE_PREFIX }}-api:${{ github.sha }}

      - name: 构建并推送 db 镜像
        uses: docker/build-push-action@v6
        with:
          context: ./db
          push: true
          tags: ${{ env.IMAGE_PREFIX }}-db:latest,${{ env.IMAGE_PREFIX }}-db:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: 部署到服务器
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          port: ${{ secrets.SERVER_PORT }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd ~/mudasky

            # 登录 ghcr.io
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # 拉取最新镜像
            docker compose -f docker-compose.prod.yml pull

            # 滚动更新（db 不重启，保留数据卷）
            docker compose -f docker-compose.prod.yml up -d --remove-orphans

            # 健康检查
            sleep 10
            curl -sf http://localhost/api/health || exit 1
            echo "部署成功"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "feat: GitHub Actions CI/CD — 构建镜像 + SSH 部署"
```

---

### Task 4: 服务器初始化

**在服务器上手动执行（通过 SSH）。**

- [ ] **Step 1: 创建项目目录和 env 文件**

```bash
ssh mudasky << 'EOF'
mkdir -p ~/mudasky/env

# 生产数据库密码（替换为强密码）
cat > ~/mudasky/env/db.env << 'ENVEOF'
POSTGRES_DB=mudasky
POSTGRES_USER=mudasky
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
ENVEOF

# 生产后端配置
cat > ~/mudasky/env/backend.env << 'ENVEOF'
DEBUG=false
DB_HOST=db
DB_PORT=5432
DB_NAME=mudasky
DB_USER=mudasky
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
INTERNAL_SECRET=CHANGE_ME_RANDOM_STRING_32_CHARS
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=
SMS_TEMPLATE_CODE=
MAX_UPLOAD_SIZE_MB=10
DEFAULT_STORAGE_QUOTA_MB=100
ENVEOF

# 生产网关配置
cat > ~/mudasky/env/gateway.env << 'ENVEOF'
JWT_SECRET=CHANGE_ME_RANDOM_STRING_40_CHARS
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
INTERNAL_SECRET=CHANGE_ME_RANDOM_STRING_32_CHARS
ENVEOF

echo "env 文件已创建，请修改密码和密钥！"
EOF
```

- [ ] **Step 2: 复制生产 compose 文件到服务器**

```bash
scp docker-compose.prod.yml mudasky:~/mudasky/docker-compose.prod.yml
```

- [ ] **Step 3: 在服务器上登录 ghcr.io**

需要先在 GitHub 创建 Personal Access Token（Settings → Developer settings → Personal access tokens → Tokens (classic) → 勾选 `read:packages`）。

```bash
ssh mudasky << 'EOF'
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u whw23 --password-stdin
EOF
```

- [ ] **Step 4: 首次拉取并启动**

```bash
ssh mudasky << 'EOF'
cd ~/mudasky
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
sleep 15
docker compose -f docker-compose.prod.yml ps
curl -sf http://localhost/api/health && echo "API 健康" || echo "API 不可用"
curl -sf http://localhost/ > /dev/null && echo "前端正常" || echo "前端不可用"
EOF
```

- [ ] **Step 5: 验证**

```bash
ssh mudasky "docker compose -f ~/mudasky/docker-compose.prod.yml ps && curl -s http://localhost/"
```

---

### Task 5: 配置 GitHub Secrets

**在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：**

- [ ] **Step 1: 添加以下 Secrets**

| Secret | 值 |
|--------|---|
| `SERVER_HOST` | `REDACTED_HOST` |
| `SERVER_PORT` | `REDACTED_PORT` |
| `SERVER_USER` | `whw23` |
| `SERVER_SSH_KEY` | 服务器 SSH 私钥内容（`cat ~/.ssh/id_ed25519`） |

注意：`GITHUB_TOKEN` 是 Actions 自动提供的，不需要手动添加。但服务器上需要单独的 PAT 来拉取镜像。

- [ ] **Step 2: 在服务器上配置 ghcr.io 登录持久化**

```bash
ssh mudasky "docker login ghcr.io -u whw23 --password-stdin <<< 'YOUR_GITHUB_PAT'"
```

Docker 会保存凭据到 `~/.docker/config.json`，后续 `docker compose pull` 不需要重新登录。

---

### Task 6: 首次部署测试

- [ ] **Step 1: 合并到 main 触发 CI/CD**

将当前分支合并到 dev，再合并到 main：

```bash
git checkout dev
git merge feat/frontend-details-and-e2e
git checkout main
git merge dev
git push origin main
```

- [ ] **Step 2: 观察 GitHub Actions 运行**

在 GitHub 仓库的 Actions tab 查看构建和部署日志。

- [ ] **Step 3: 验证服务器部署**

```bash
ssh mudasky "docker compose -f ~/mudasky/docker-compose.prod.yml ps"
ssh mudasky "curl -s http://localhost/api/health"
ssh mudasky "curl -s -o /dev/null -w '%{http_code}' http://localhost/"
```

Expected: 所有容器 running，API 返回 200，前端返回 200。

---

## 部署后检查清单

- [ ] 服务器防火墙开放 80 端口
- [ ] env 文件中的密码已替换为强密码
- [ ] `INTERNAL_SECRET` 在 backend.env 和 gateway.env 中一致
- [ ] `DB_PASSWORD` 和 `POSTGRES_PASSWORD` 一致
- [ ] SMS 密钥配置（如需短信功能）
- [ ] DNS 解析配置（域名商控制台）
