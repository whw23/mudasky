# 代码混淆与知识产权保护 + 镜像压缩 + GitHub Secrets 设计

## 背景

mudasky 面向客户交付 Docker 镜像（SaaS + 私有部署）。当前所有容器的源码完全可读（`docker exec` 进容器即可查看），env/ 目录的密钥硬编码在版本控制中。需要：

1. 代码混淆（防小人级别）：编译 + 变量名混淆，大幅增加反编译难度
2. 密钥保护：迁移到 GitHub Secrets，不在代码中暴露
3. 为后续 GitHub 转公开仓库做准备

## 当前暴露情况

| 容器 | 暴露内容 | 风险 |
|------|----------|------|
| Frontend | 所有 .ts/.tsx 源码 | 中 |
| API | 所有 .py 源码 + alembic 迁移 | 高 |
| Gateway | 所有 .lua 源码（auth/限流/权限逻辑） | 严重 |
| env/ | DB 密码、JWT Secret、INTERNAL_SECRET 硬编码 | 严重 |

## 设计方案

### 1. Frontend 混淆 + 压缩

**当前**：182MB（生产）/ 1.44GB（dev）

Next.js 生产构建自带 minify 和 tree-shaking。额外措施：

- `next.config.ts` 中启用 `output: "standalone"` + 确认 `productionBrowserSourceMaps: false`
- Dockerfile 多阶段构建：builder 阶段 `pnpm build`，runner 阶段只拷贝 standalone 产物
- 最终镜像不含 `.ts`/`.tsx` 源码、node_modules、源码目录

```dockerfile
# ── builder ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
ARG BUILD_VERSION=dev
ENV NEXT_PUBLIC_BUILD_VERSION=${BUILD_VERSION}
COPY . .
RUN pnpm build

# ── runner ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone 只包含运行时必需的文件（~30MB vs 原 182MB）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**压缩效果**：182MB → ~50MB（standalone 不含 node_modules，只含必要依赖）

### 2. Backend API 混淆 + 压缩

**当前**：261MB

Python 代码编译为 .pyc 字节码 + pyarmor 混淆：

- Dockerfile 多阶段构建：builder 阶段安装依赖 + 混淆，runner 阶段只拷贝混淆后的产物
- pyarmor 对 .py 文件做字节码混淆（变量名替换 + 控制流扁平化）
- 最终镜像不含 .py 源文件、tests、docs、alembic 迁移文件
- 使用 `python:3.14-slim`（已在用）减小基础镜像

```dockerfile
# ── builder ──
FROM python:3.14-slim AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY api/ ./api/
COPY scripts/ ./scripts/
COPY pyproject.toml ./
RUN pip install --no-cache-dir ./shared ./api
RUN pip install pyarmor
# 混淆业务代码
RUN pyarmor gen --output /obfuscated/shared/app shared/app/
RUN pyarmor gen --output /obfuscated/api/api api/api/

# ── runner ──
FROM python:3.14-slim AS runner
WORKDIR /app
# 只拷贝依赖（不含源码）
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
# 拷贝混淆后的业务代码
COPY --from=builder /obfuscated/ ./
# 启动脚本（非敏感）
COPY scripts/start-api.sh ./scripts/
RUN chmod +x scripts/start-api.sh
ARG BUILD_VERSION=dev
ENV BUILD_VERSION=${BUILD_VERSION}
EXPOSE 8000
CMD ["sh", "scripts/start-api.sh"]
```

注意：pyarmor 免费版有限制（500 个函数），商业项目需要评估是否需要购买许可。备选方案：只用 `python -m compileall` 编译为 .pyc + 删除 .py（免费，保护较弱但足够防普通用户）。

**压缩效果**：261MB → ~200MB（去掉 tests/docs/alembic/源码，pip cache 清理）

### 3. Gateway 混淆 + 压缩

**当前**：197MB

Lua 代码编译为 luac 字节码：

- Dockerfile 多阶段构建：builder 阶段 luac 编译，runner 阶段只拷贝 .luac 文件
- OpenResty 支持加载 luac 字节码
- nginx.conf 中 `access_by_lua_file` 等路径改为 `.luac` 后缀
- OpenResty Alpine 基础镜像已经很小，压缩空间有限

```dockerfile
# ── builder ──
FROM openresty/openresty:alpine AS builder
WORKDIR /build
COPY lua/ ./lua/
# LuaJIT 编译为字节码（OpenResty 用 LuaJIT，不是标准 Lua）
RUN for f in lua/*.lua; do \
      /usr/local/openresty/luajit/bin/luajit -b "$f" "${f%.lua}.luac"; \
    done

# ── runner ──
FROM openresty/openresty:alpine AS runner
ARG BUILD_VERSION=dev
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY --from=builder /build/lua/*.luac /usr/local/openresty/nginx/lua/
```

注意：OpenResty 用 LuaJIT（不是标准 Lua），必须用 `luajit -b` 编译而不是 `luac`。nginx.conf 中 `access_by_lua_file` 等指令路径改为 `.luac`。`require` 加载模块时 Lua 会自动搜索 `.luac` 文件。

**压缩效果**：197MB → ~195MB（gateway 主要是 OpenResty 基础镜像，Lua 文件很小）

### 4. GitHub Secrets 管理

#### 4.1 迁移步骤

1. 将密钥和敏感初始化数据添加为 GitHub Secrets：

**环境变量密钥：**

| Secret Name | 来源 |
|-------------|------|
| `DB_PASSWORD` | `env/db.env` |
| `JWT_SECRET` | `env/gateway.env` |
| `INTERNAL_SECRET` | `env/backend.env` |
| `SMS_ACCESS_KEY_ID` | 阿里云短信（对接后） |
| `SMS_ACCESS_KEY_SECRET` | 阿里云短信（对接后） |

**种子用户（用户名 + 密码 + 手机号）：**

| Secret Name | 说明 |
|-------------|------|
| `SEED_USER_1_USERNAME` | 主管理员用户名 |
| `SEED_USER_1_PASSWORD` | 主管理员密码 |
| `SEED_USER_2_USERNAME` | 管理员 2 用户名 |
| `SEED_USER_2_PASSWORD` | 管理员 2 密码 |
| `SEED_USER_2_PHONE` | 管理员 2 手机号 |
| `SEED_USER_3_USERNAME` | 管理员 3 用户名 |
| `SEED_USER_3_PASSWORD` | 管理员 3 密码 |
| `SEED_USER_3_PHONE` | 管理员 3 手机号 |
| `SEED_USER_E2E_USERNAME` | E2E 测试用户名 |
| `SEED_USER_E2E_PASSWORD` | E2E 测试密码 |

**联系方式（客户可自定义）：**

| Secret Name | 说明 |
|-------------|------|
| `CONTACT_ADDRESS` | 公司地址 |
| `CONTACT_PHONE` | 公司电话 |
| `CONTACT_EMAIL` | 公司邮箱 |

2. CI 中从 Secrets 生成 .env 文件（含种子用户配置）并 scp 到服务器
3. `seed_user.py` 改为从环境变量读取用户名/密码/手机号，不再硬编码
4. 本地开发用 `.env.example` 模板，实际值在 `.env`（已在 .gitignore 中）

#### 4.2 CI 改动

```yaml
# build.yml deploy step
- name: 生成环境变量文件
  run: |
    cat > env/backend.env << EOF
    DB_HOST=db
    DB_PASSWORD=${{ secrets.DB_PASSWORD }}
    JWT_SECRET=${{ secrets.JWT_SECRET }}
    INTERNAL_SECRET=${{ secrets.INTERNAL_SECRET }}
    EOF
    # ... gateway.env, db.env 类似

- name: 同步 env 文件到服务器
  uses: appleboy/scp-action@v0.1.7
  with:
    source: "env/"
    target: "~/mudasky"
```

#### 4.3 .env.example

```env
# backend.env
DB_HOST=db
DB_PORT=5432
DB_USER=mudasky
DB_PASSWORD=<your-password>
DB_NAME=mudasky
INTERNAL_SECRET=<your-secret>
DEBUG=true

# gateway.env
JWT_SECRET=<your-jwt-secret>
INTERNAL_SECRET=<your-secret>
```

#### 4.4 清理版本控制

1. `env/` 加入 `.gitignore`
2. `git rm --cached env/`（从跟踪中移除，保留本地文件）
3. 转公开仓库前用 `git filter-repo` 清除 env/ 的 git 历史

### 5. .dockerignore 补全

为 backend 和 gateway 创建 .dockerignore：

**backend/.dockerignore：**
```
api/tests/
**/__pycache__/
*.pyc
.coverage
*.md
```

**gateway/.dockerignore：**
```
*.md
```

### 6. 多阶段构建后的镜像对比

| 容器 | 构建前大小 | 构建后大小 | 构建前可见 | 构建后可见 |
|------|-----------|-----------|-----------|-----------|
| Frontend | 182MB | ~50MB | .ts/.tsx 源码 | .js bundle（minified，无 source map） |
| API | 261MB | ~200MB | .py 源码 | .pyc 字节码（混淆后） |
| Gateway | 197MB | ~195MB | .lua 源码 | .luac 字节码 |
| env/ | — | — | 明文密钥 | 不在镜像中（运行时注入） |

**总计**：640MB → ~445MB（压缩 30%）。Frontend 压缩最明显（standalone 模式去掉 node_modules）。

### 7. 验证清单

部署后验证：
- `docker exec mudasky-frontend-1 ls /app/` — 无 .ts/.tsx 文件
- `docker exec mudasky-api-1 find /app -name "*.py"` — 无 .py 文件
- `docker exec mudasky-gateway-1 ls /usr/local/openresty/nginx/lua/` — 只有 .luac 文件
- `docker exec mudasky-api-1 cat /app/api/auth/router.py` — 文件不存在

### 8. 不在范围内

- Docker 镜像加密（registry 级别）— 过度保护
- 硬件指纹绑定 — 增加客户部署复杂度
- 代码签名 — 目前不需要
- git 历史清理 — 在"GitHub 转公开仓库"TODO 中做

## 文件清单

| 操作 | 文件 |
|------|------|
| 重写 | `frontend/Dockerfile`（多阶段 + standalone） |
| 重写 | `backend/api/Dockerfile`（多阶段 + pyarmor/compileall） |
| 重写 | `gateway/Dockerfile`（多阶段 + luac） |
| 新建 | `backend/.dockerignore` |
| 修改 | `frontend/.dockerignore`（补全） |
| 修改 | `.gitignore`（添加 env/） |
| 新建 | `env/.env.example`（模板） |
| 修改 | `.github/workflows/build.yml`（Secrets 注入 + scp env） |
| 修改 | `frontend/next.config.ts`（确认 source map 关闭） |
| 修改 | `gateway/nginx.conf`（lua_file 路径改 .luac） |
| 删除 | `env/*.env` 从 git 跟踪（保留本地文件） |
