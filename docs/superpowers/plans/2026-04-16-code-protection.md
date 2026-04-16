# 代码混淆 + 镜像压缩 + GitHub Secrets + 阿里云短信 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保护源码（混淆编译）、压缩镜像（多阶段构建）、迁移密钥到 GitHub Secrets、对接阿里云短信、清理 git 历史和服务器。

**Architecture:** 五阶段执行：1）阿里云短信对接 2）种子数据环境变量化 3）Dockerfile 多阶段构建（混淆+压缩）4）GitHub Secrets + CI 改造 5）git 历史清理 + 服务器清理。

**Tech Stack:** pyarmor/compileall, luajit -b, Next.js standalone, git-filter-repo, alibabacloud-dysmsapi20170525

---

## File Map

| 操作 | 文件 | 职责 |
|------|------|------|
| 重写 | `backend/shared/app/sms/__init__.py` | 阿里云短信 SDK 对接 |
| 修改 | `backend/shared/app/core/config.py` | 添加 SMS_REGION |
| 修改 | `backend/shared/pyproject.toml` | 添加阿里云 SDK 依赖 |
| 重写 | `backend/scripts/init/seed_user.py` | 从环境变量读取用户名/密码/手机号 |
| 修改 | `backend/scripts/init/seed_config.py` | 联系方式从环境变量读取 |
| 重写 | `frontend/Dockerfile` | 多阶段 + standalone |
| 修改 | `frontend/next.config.ts` | output: standalone |
| 重写 | `backend/api/Dockerfile` | 多阶段 + compileall |
| 重写 | `gateway/Dockerfile` | 多阶段 + luajit -b |
| 修改 | `gateway/nginx.conf` | lua_file 路径 .lua → .luac |
| 修改 | `gateway/conf.d/server.conf` | lua_file 路径 .lua → .luac |
| 新建 | `backend/.dockerignore` | 排除 tests/docs |
| 新建 | `env/backend.env.example` | 模板 |
| 新建 | `env/gateway.env.example` | 模板 |
| 新建 | `env/db.env.example` | 模板 |
| 修改 | `.github/workflows/build.yml` | Secrets 注入 + scp env |
| 清理 | git 历史 | filter-repo 删除敏感数据 |
| 清理 | 服务器 | 旧镜像/env/数据全部清除 |

---

## 阶段 1：阿里云短信对接

### Task 1: 添加 SDK 依赖

**Files:**
- Modify: `backend/shared/pyproject.toml`

- [ ] **Step 1: 添加阿里云短信 SDK 依赖**

在 `dependencies` 列表末尾添加：
```toml
    "alibabacloud-dysmsapi20170525>=3.0",
    "alibabacloud-tea-openapi>=0.3",
```

- [ ] **Step 2: 添加 SMS_REGION 到 config.py**

在 `backend/shared/app/core/config.py` 的 Settings 类中，SMS 配置块后添加：
```python
    SMS_REGION: str = "cn-hangzhou"
```

- [ ] **Step 3: Commit**

```bash
git add backend/shared/pyproject.toml backend/shared/app/core/config.py
git commit -m "chore: 添加阿里云短信 SDK 依赖 + SMS_REGION 配置"
```

---

### Task 2: 实现短信发送

**Files:**
- Rewrite: `backend/shared/app/sms/__init__.py`

- [ ] **Step 1: 重写短信模块**

用设计文档 8.3 节的完整实现替换存根代码。关键逻辑：
- DEBUG 模式打日志不发送
- 懒加载阿里云客户端
- 去掉 +86 前缀
- 异常捕获不抛出（返回 False）

- [ ] **Step 2: 本地验证（DEBUG 模式）**

```bash
uv run --project backend/api python -c "
import asyncio
from app.sms import send_sms_code
print(asyncio.run(send_sms_code('+8613800138000', '123456')))
"
```
Expected: `True`（DEBUG 模式，只打日志）

- [ ] **Step 3: Commit**

```bash
git add backend/shared/app/sms/__init__.py
git commit -m "feat: 对接阿里云短信 SDK（DEBUG 模式保留日志不发送）"
```

---

## 阶段 2：种子数据环境变量化

### Task 3: seed_user.py 改为环境变量

**Files:**
- Rewrite: `backend/scripts/init/seed_user.py`

- [ ] **Step 1: 重写 seed_user.py**

从环境变量读取种子用户配置。环境变量格式：
```
SEED_USER_1_USERNAME=mudasky
SEED_USER_1_PASSWORD=mudasky@12321.
SEED_USER_2_USERNAME=whw23
SEED_USER_2_PASSWORD=whw23@12321.
SEED_USER_2_PHONE=+8613654080516
SEED_USER_3_USERNAME=nyx
SEED_USER_3_PASSWORD=nyx@12321.
SEED_USER_3_PHONE=+8613056988265
SEED_USER_E2E_USERNAME=e2e_test_superuser
SEED_USER_E2E_PASSWORD=e2e_test_superuser@12321.
```

实现：用 `os.environ.get` 读取，循环 1-3 + E2E，无值则跳过。

```python
"""初始化种子用户。"""

import logging
import os

from sqlalchemy import select

from app.utils.security import hash_password
from app.db.rbac.models import Role
from app.db.user.models import User

logger = logging.getLogger(__name__)


def _get_seed_users() -> list[dict]:
    """从环境变量读取种子用户配置。"""
    users = []
    # 编号用户 1-3
    for i in range(1, 4):
        username = os.environ.get(f"SEED_USER_{i}_USERNAME")
        password = os.environ.get(f"SEED_USER_{i}_PASSWORD")
        if not username or not password:
            continue
        users.append({
            "username": username,
            "password": password,
            "phone": os.environ.get(f"SEED_USER_{i}_PHONE"),
            "role": "superuser",
        })
    # E2E 测试用户
    e2e_user = os.environ.get("SEED_USER_E2E_USERNAME")
    e2e_pass = os.environ.get("SEED_USER_E2E_PASSWORD")
    if e2e_user and e2e_pass:
        users.append({
            "username": e2e_user,
            "password": e2e_pass,
            "role": "superuser",
        })
    return users


async def init_superuser(session) -> None:
    """检查并创建种子用户，分配对应角色。"""
    seed_users = _get_seed_users()
    if not seed_users:
        logger.warning("未配置种子用户环境变量，跳过用户初始化")
        return

    role_stmt = select(Role)
    role_result = await session.execute(role_stmt)
    role_map = {r.name: r.id for r in role_result.scalars()}

    for user_data in seed_users:
        username = user_data["username"]
        password = user_data["password"]
        phone = user_data.get("phone")
        role_name = user_data["role"]

        stmt = select(User).where(User.username == username)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.password_hash = hash_password(password)
            if phone and not existing.phone:
                existing.phone = phone
            if role_map.get(role_name) and existing.role_id != role_map[role_name]:
                existing.role_id = role_map[role_name]
            await session.flush()
            logger.info("种子用户已存在，已同步: %s", username)
            continue

        user = User(
            username=username,
            password_hash=hash_password(password),
            phone=phone,
            is_active=True,
            role_id=role_map.get(role_name),
        )
        session.add(user)
        await session.flush()
        logger.info("种子用户创建成功: %s (角色: %s)", username, role_name)
```

- [ ] **Step 2: 更新 env/backend.env 添加种子用户变量**

在 `env/backend.env` 末尾添加：
```
SEED_USER_1_USERNAME=mudasky
SEED_USER_1_PASSWORD=mudasky@12321.
SEED_USER_2_USERNAME=whw23
SEED_USER_2_PASSWORD=whw23@12321.
SEED_USER_2_PHONE=+8613654080516
SEED_USER_3_USERNAME=nyx
SEED_USER_3_PASSWORD=nyx@12321.
SEED_USER_3_PHONE=+8613056988265
SEED_USER_E2E_USERNAME=e2e_test_superuser
SEED_USER_E2E_PASSWORD=e2e_test_superuser@12321.
```

- [ ] **Step 3: 本地验证**

```bash
docker compose down -v && docker compose up -d
# 等 20s 后检查日志
docker compose logs api | grep seed_user
```
Expected: 4 个种子用户创建/同步成功

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/init/seed_user.py env/backend.env
git commit -m "refactor: seed_user.py 从环境变量读取用户名/密码/手机号"
```

---

### Task 4: seed_config.py 联系方式环境变量化

**Files:**
- Modify: `backend/scripts/init/seed_config.py`

- [ ] **Step 1: 修改 contact_info 从环境变量读取**

在 `seed_config.py` 的 `init_system_config` 函数中，`contact_info` 配置项改为：
```python
        {
            "key": "contact_info",
            "value": {
                "address": os.environ.get("CONTACT_ADDRESS", "请配置联系地址"),
                "phone": os.environ.get("CONTACT_PHONE", "请配置联系电话"),
                "email": os.environ.get("CONTACT_EMAIL", "请配置联系邮箱"),
                "wechat": os.environ.get("CONTACT_WECHAT", ""),
                "office_hours": os.environ.get("CONTACT_OFFICE_HOURS", "周一至周五 9:00-18:00"),
            },
            "description": "联系方式配置",
        },
```

需要在文件顶部添加 `import os`。

- [ ] **Step 2: 更新 env/backend.env**

添加：
```
CONTACT_ADDRESS=苏州独墅湖大学城林泉街377号公共学院5号楼7楼
CONTACT_PHONE=189-1268-6656
CONTACT_EMAIL=haoranxuexing@163.com
CONTACT_WECHAT=mutu_edu
CONTACT_OFFICE_HOURS=周一至周五 9:00-18:00
```

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/init/seed_config.py env/backend.env
git commit -m "refactor: seed_config.py 联系方式从环境变量读取"
```

---

## 阶段 3：Dockerfile 多阶段构建（混淆 + 压缩）

### Task 5: Frontend Dockerfile（standalone）

**Files:**
- Modify: `frontend/next.config.ts`
- Rewrite: `frontend/Dockerfile`

- [ ] **Step 1: next.config.ts 启用 standalone**

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*"],
}
```

- [ ] **Step 2: 重写 Dockerfile**

用设计文档中的多阶段 Dockerfile 替换。

- [ ] **Step 3: 本地构建验证**

```bash
docker build -t mudasky-frontend-test -f frontend/Dockerfile frontend/
docker run --rm mudasky-frontend-test ls /app/
# 应只有 server.js, .next/, public/ 等，无 .ts/.tsx
docker run --rm mudasky-frontend-test find /app -name "*.tsx" | wc -l
# Expected: 0
docker images mudasky-frontend-test --format '{{.Size}}'
# Expected: < 100MB
```

- [ ] **Step 4: Commit**

```bash
git add frontend/next.config.ts frontend/Dockerfile
git commit -m "feat: Frontend 多阶段构建 + standalone（无源码，~50MB）"
```

---

### Task 6: Backend Dockerfile（compileall）

**Files:**
- Rewrite: `backend/api/Dockerfile`
- Create: `backend/.dockerignore`

先用 `compileall`（免费）而不是 pyarmor（需要许可证）。后续可升级。

- [ ] **Step 1: 创建 backend/.dockerignore**

```
api/tests/
**/__pycache__/
*.pyc
.coverage
*.md
```

- [ ] **Step 2: 重写 Dockerfile**

```dockerfile
# ── builder ──
FROM python:3.14-slim AS builder
WORKDIR /app

COPY shared/ ./shared/
COPY api/ ./api/
COPY scripts/ ./scripts/
RUN pip install --no-cache-dir ./shared ./api

# 编译为 .pyc 并删除 .py 源文件
RUN python -m compileall -b shared/app/ api/api/ && \
    find shared/app/ api/api/ -name "*.py" -delete

# ── runner ──
FROM python:3.14-slim AS runner
WORKDIR /app

COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/api/ ./api/
COPY scripts/start-api.sh ./scripts/
RUN chmod +x scripts/start-api.sh

ARG BUILD_VERSION=dev
ENV BUILD_VERSION=${BUILD_VERSION}
EXPOSE 8000
CMD ["sh", "scripts/start-api.sh"]
```

- [ ] **Step 3: 本地构建验证**

```bash
docker build -t mudasky-api-test -f backend/api/Dockerfile backend/
docker run --rm mudasky-api-test find /app -name "*.py" | wc -l
# Expected: 0
docker run --rm mudasky-api-test find /app -name "*.pyc" | head -5
# Expected: 有 .pyc 文件
```

- [ ] **Step 4: Commit**

```bash
git add backend/api/Dockerfile backend/.dockerignore
git commit -m "feat: Backend 多阶段构建 + compileall（无 .py 源码）"
```

---

### Task 7: Gateway Dockerfile（luajit -b）

**Files:**
- Rewrite: `gateway/Dockerfile`
- Modify: `gateway/nginx.conf`
- Modify: `gateway/conf.d/server.conf`

- [ ] **Step 1: 重写 Dockerfile**

用设计文档中的多阶段 Dockerfile。注意用 `luajit -b` 不是 `luac`。

- [ ] **Step 2: nginx.conf 和 server.conf 中 .lua → .luac**

搜索所有 `lua_file` 和 `lua_block` 引用，将 `.lua` 后缀改为 `.luac`：
- `access_by_lua_file` 路径
- `content_by_lua_file` 路径
- `lua_package_path` 中的 `?.lua` 改为 `?.luac`

注意：`lua_block` 中内联的 Lua 代码不需要改（它不从文件加载）。

- [ ] **Step 3: 本地构建验证**

```bash
docker build -t mudasky-gateway-test gateway/
docker run --rm mudasky-gateway-test ls /usr/local/openresty/nginx/lua/
# Expected: 只有 .luac 文件，无 .lua
docker run --rm mudasky-gateway-test find / -name "*.lua" -path "*/nginx/*" | wc -l
# Expected: 0（自定义 lua 目录无 .lua 文件）
```

- [ ] **Step 4: Commit**

```bash
git add gateway/Dockerfile gateway/nginx.conf gateway/conf.d/server.conf
git commit -m "feat: Gateway 多阶段构建 + LuaJIT 字节码编译（无 .lua 源码）"
```

---

## 阶段 4：GitHub Secrets + CI 改造

### Task 8: .env.example 模板 + git 清理

**Files:**
- Create: `env/backend.env.example`
- Create: `env/gateway.env.example`
- Create: `env/db.env.example`

- [ ] **Step 1: 创建 .env.example 模板文件**

`env/backend.env.example`:
```env
DEBUG=true
DB_HOST=db
DB_PORT=5432
DB_NAME=mudasky
DB_USER=mudasky
DB_PASSWORD=<your-db-password>
INTERNAL_SECRET=<your-internal-secret>
SMS_ACCESS_KEY_ID=<aliyun-access-key-id>
SMS_ACCESS_KEY_SECRET=<aliyun-access-key-secret>
SMS_SIGN_NAME=<sms-sign-name>
SMS_TEMPLATE_CODE=<sms-template-code>
SMS_REGION=cn-hangzhou
MAX_UPLOAD_SIZE_MB=10
DEFAULT_STORAGE_QUOTA_MB=100
SEED_USER_1_USERNAME=<admin-username>
SEED_USER_1_PASSWORD=<admin-password>
CONTACT_ADDRESS=<company-address>
CONTACT_PHONE=<company-phone>
CONTACT_EMAIL=<company-email>
```

`env/gateway.env.example`:
```env
JWT_SECRET=<your-jwt-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
INTERNAL_SECRET=<your-internal-secret>
```

`env/db.env.example`:
```env
POSTGRES_DB=mudasky
POSTGRES_USER=mudasky
POSTGRES_PASSWORD=<your-db-password>
```

- [ ] **Step 2: 从 git 跟踪中移除 env 文件**

```bash
git rm --cached env/backend.env env/gateway.env env/db.env env/worker.env
# .gitignore 已经包含 env/*.env 和 !env/*.env.example
```

- [ ] **Step 3: Commit**

```bash
git add env/*.env.example
git commit -m "feat: .env.example 模板 + 移除 env 文件的 git 跟踪"
```

---

### Task 9: CI/CD 改造（Secrets 注入）

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: 在 deploy step 中添加 Secrets 注入**

在 `deploy` job 的 `部署到服务器` step 之前，添加生成 env 文件的 step：

```yaml
    - name: 生成环境变量文件
      run: |
        mkdir -p env
        cat > env/backend.env << 'ENVEOF'
        DEBUG=false
        DB_HOST=db
        DB_PORT=5432
        DB_NAME=mudasky
        DB_USER=mudasky
        DB_PASSWORD=${{ secrets.DB_PASSWORD }}
        INTERNAL_SECRET=${{ secrets.INTERNAL_SECRET }}
        SMS_ACCESS_KEY_ID=${{ secrets.SMS_ACCESS_KEY_ID }}
        SMS_ACCESS_KEY_SECRET=${{ secrets.SMS_ACCESS_KEY_SECRET }}
        SMS_SIGN_NAME=${{ secrets.SMS_SIGN_NAME }}
        SMS_TEMPLATE_CODE=${{ secrets.SMS_TEMPLATE_CODE }}
        SMS_REGION=cn-hangzhou
        SEED_USER_1_USERNAME=${{ secrets.SEED_USER_1_USERNAME }}
        SEED_USER_1_PASSWORD=${{ secrets.SEED_USER_1_PASSWORD }}
        SEED_USER_2_USERNAME=${{ secrets.SEED_USER_2_USERNAME }}
        SEED_USER_2_PASSWORD=${{ secrets.SEED_USER_2_PASSWORD }}
        SEED_USER_2_PHONE=${{ secrets.SEED_USER_2_PHONE }}
        SEED_USER_3_USERNAME=${{ secrets.SEED_USER_3_USERNAME }}
        SEED_USER_3_PASSWORD=${{ secrets.SEED_USER_3_PASSWORD }}
        SEED_USER_3_PHONE=${{ secrets.SEED_USER_3_PHONE }}
        SEED_USER_E2E_USERNAME=${{ secrets.SEED_USER_E2E_USERNAME }}
        SEED_USER_E2E_PASSWORD=${{ secrets.SEED_USER_E2E_PASSWORD }}
        CONTACT_ADDRESS=${{ secrets.CONTACT_ADDRESS }}
        CONTACT_PHONE=${{ secrets.CONTACT_PHONE }}
        CONTACT_EMAIL=${{ secrets.CONTACT_EMAIL }}
        ENVEOF

        cat > env/gateway.env << 'ENVEOF'
        JWT_SECRET=${{ secrets.JWT_SECRET }}
        ACCESS_TOKEN_EXPIRE_MINUTES=15
        REFRESH_TOKEN_EXPIRE_DAYS=30
        INTERNAL_SECRET=${{ secrets.INTERNAL_SECRET }}
        ENVEOF

        cat > env/db.env << 'ENVEOF'
        POSTGRES_DB=mudasky
        POSTGRES_USER=mudasky
        POSTGRES_PASSWORD=${{ secrets.DB_PASSWORD }}
        ENVEOF
```

并在 scp step 的 `source` 中添加 `env/`。

- [ ] **Step 2: 在 GitHub 仓库中配置 Secrets**

手动在 GitHub Settings → Secrets and variables → Actions 中添加所有 22 个 Secrets。这一步需要用户手动操作。

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "feat: CI/CD 从 GitHub Secrets 注入环境变量"
```

---

## 阶段 5：git 历史清理 + 服务器清理 + 部署

### Task 10: git 历史清理

⚠️ **此操作不可逆，需要用户确认后执行。**

- [ ] **Step 1: 备份仓库**

```bash
cp -r /home/whw23/code/mudasky /home/whw23/code/mudasky-backup-$(date +%Y%m%d)
```

- [ ] **Step 2: 执行 filter-repo**

```bash
pip install git-filter-repo
cd /home/whw23/code/mudasky

# 删除 env/ 目录的所有历史
git filter-repo --path env/backend.env --path env/gateway.env --path env/db.env --path env/worker.env --invert-paths --force
```

注意：不删除 seed_user.py 和 seed_config.py 的历史（它们改为环境变量后，旧版本中的硬编码值已经不在 env 文件中了，风险可控）。

- [ ] **Step 3: force push**

```bash
git remote add origin https://github.com/whw23/mudasky.git  # filter-repo 会移除 remote
git push --force --all
```

- [ ] **Step 4: 验证**

```bash
git log --all -- env/backend.env | wc -l
# Expected: 0
```

---

### Task 11: 服务器清理 + 重新部署

⚠️ **此操作会清空线上数据库，需要用户确认。**

- [ ] **Step 1: 清理服务器**

```bash
ssh mudasky << 'EOF'
cd ~/mudasky
docker compose down -v
docker image prune -af
docker system prune -af --volumes
rm -f env/*.env
EOF
```

- [ ] **Step 2: 触发 CI/CD 重新部署**

合并 dev → main，push 触发 CI/CD：
- CI 生成 env 文件（从 Secrets）
- CI 构建混淆后的镜像
- CI scp env + docker-compose.yml 到服务器
- CI ssh 部署

- [ ] **Step 3: 验证**

```bash
# 镜像内容
ssh mudasky "docker exec mudasky-frontend-1 find /app -name '*.tsx' | wc -l"
# Expected: 0

ssh mudasky "docker exec mudasky-api-1 find /app -name '*.py' | wc -l"
# Expected: 0

ssh mudasky "docker exec mudasky-gateway-1 ls /usr/local/openresty/nginx/lua/"
# Expected: 只有 .luac

# 功能验证
curl -s http://REDACTED_HOST/api/health
# Expected: 200
```
