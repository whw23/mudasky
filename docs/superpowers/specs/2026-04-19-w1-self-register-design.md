# E2E 架构优化：W1 改为自注册账号 + 去掉 SEED_USER_E2E

## 背景

当前 W1 使用后端预设的种子用户 `SEED_USER_E2E` 进行 E2E 测试。该用户由 `seed_user.py` 在容器初始化时创建为 superuser。这导致：

- GitHub Actions 需要额外的 `SEED_USER_E2E_USERNAME` / `SEED_USER_E2E_PASSWORD` secrets
- 后端初始化代码有独立的 E2E 用户创建逻辑
- W1 是唯一一个不自注册的 worker，流程不统一

## 目标

- W1 改为自注册 E2E 账号，与 W2-W7 流程统一
- 删除 `SEED_USER_E2E` 相关的所有代码和配置
- W1-W7 所有 E2E 账号统一清理
- E2E 数据库清理改为 pg 直连 SQL，不依赖 `docker compose exec` 或 API 登录
- 信号文件改 SQLite，级联熔断收窄，W1 任务拆分
- CI/CD 部署后自动跑线上 E2E 验证

## 设计

### 新的 E2E 启动流程

```text
global-setup:
  1. pg 直连数据库，SQL 清理 E2E_239_ 开头的旧数据
  2. 用 SEED_USER_1 密码登录预热页面（确保服务可用）

W1: 注册 E2E 账号（手机号 +86-239${TS}01，用户名 E2E_239_ 前缀），与 W2-W7 流程一致
W7: 用 SEED_USER_1 密码登录 → 给 W1 的 E2E 账号赋权 superuser
W1: 刷新 token → 获得 superuser 权限 → 开始给 W2-W6 赋权
```

### 任务依赖链

```text
w1_register ─────────────────────────┐
w7_login_seed1 (SEED_USER_1 密码登录) ─→ w7_assign_superuser_w1
                                          requires: [w1_register, w7_login_seed1]
                                              ↓
                                      w1_refresh_superuser
                                          requires: [w7_assign_superuser_w1]
                                              ↓
                                      w1_assign_role_w2, w1_assign_role_w3, ...
```

### 数据库清理（global-setup / global-teardown）

改为用 `pg` 库（Node.js PostgreSQL client）直连数据库执行 SQL，不再依赖 `docker compose exec` 或 API 登录。

**连接信息来源**：

- 开发环境：`env/backend.env`，`DB_HOST` 替换为 `localhost`，端口用 `DB_EXTERNAL_PORT`（默认 15432）
- 线上测试：`env/production.env`，直接使用 `DB_HOST`/`DB_PORT`

**清理 SQL**（global-setup 和 global-teardown 共用）：

```sql
DELETE FROM refresh_token WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'E2E\_239\_%');
DELETE FROM sms_code WHERE phone IN (SELECT phone FROM "user" WHERE username LIKE 'E2E\_239\_%');
DELETE FROM document WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'E2E\_239\_%');
DELETE FROM "user" WHERE username LIKE 'E2E\_239\_%';
DELETE FROM role WHERE name LIKE 'E2E\_239%';
DELETE FROM category WHERE slug LIKE 'e2e-239%';
DELETE FROM article WHERE title LIKE 'E2E\_239%';
DELETE FROM success_case WHERE student_name LIKE 'E2E\_239%';
DELETE FROM university WHERE name LIKE 'E2E\_239%';
```

### E2E 数据命名规范

所有 E2E 测试数据统一使用 `E2E_239` 前缀，方便清理：

- **用户名**：`E2E_239_` 前缀
- **手机号**：`+86-239${TS}xx` 格式（W1=01, W2=02, W3=03, W5=05, W6=06, W7=71/72/73）
- **角色名**：`E2E_239_` 前缀
- **分类 slug**：`e2e-239-` 前缀
- **文章标题**：`E2E_239_` 前缀
- **案例姓名**：`E2E_239_` 前缀
- **院校名称**：`E2E_239_` 前缀
- **清理匹配**：统一 `LIKE 'E2E\_239%'` 或 `LIKE 'e2e-239%'`（slug）

### SEED_USER_E2E 引用替换

| 引用位置 | 当前用 SEED_USER_E2E | 改为 |
| -------- | -------------------- | ---- |
| `w1/tasks.ts` w1_login | 密码登录 | 手机号自注册 |
| `w4/tasks.ts` w4_auth_login_success | 测试密码登录 | 改用 SEED_USER_1 |
| `w7/tasks.ts` w7_login_jwt | JWT 测试登录 | 改用 SEED_USER_1 |
| `global-setup.ts` 预热登录 | 密码登录 | 改用 SEED_USER_1 |
| `global-setup.ts` 数据清理 | docker compose exec psql | pg 直连 SQL |
| `global-teardown.ts` 数据清理 | API 登录 + 逐个删除 | pg 直连 SQL |
| `screenshots/capture.ts` | 密码登录 | 改用 SEED_USER_1 |

### 信号文件改 SQLite

当前跨 worker 协调靠文件读写（`/tmp/e2e-signals/{taskId}.json`），7 worker 每 2 秒轮询。

**改为 SQLite**：

- 单个 SQLite 数据库文件替代 N 个信号文件
- WAL 模式支持并发读，轮询间隔可缩短到 200ms
- 原子事务替代文件 `wx` flag
- 前置条件检查从读 N 个文件变为一条 SQL

**表结构**：

```sql
CREATE TABLE signals (
  task_id TEXT PRIMARY KEY,
  worker TEXT NOT NULL,
  status TEXT NOT NULL,  -- pass / fail
  data TEXT,             -- JSON，任务产出数据
  created_at REAL NOT NULL DEFAULT (unixepoch('subsec'))
);
```

### backupWorkers 分配 + 权限调整

#### 预设角色权限调整

| 角色 | 变更 |
| ---- | ---- |
| content_admin | 去掉冗余子路径（articles/categories/cases/universities），保留 `admin/web-settings/*` |
| student | 从 overview+profile+documents 合并为 `portal/*` |

#### backupWorkers 分配原则

备份 worker 用**自己的 auth state** 执行任务，因此必须满足：
1. 备份 worker 的权限足以完成操作
2. 任务不依赖特定角色的 UI 表现（如侧边栏菜单项）

#### 可以加 backupWorkers 的任务（功能操作类）

| 任务类型 | 主 worker | backupWorkers | 说明 |
| ---- | ---- | ---- | ---- |
| CRUD 内容（web-settings） | W1 | W5 | 都有 web-settings 权限 |
| general-settings 操作 | W1 | W5 | 都有 general-settings 权限 |
| W5 内容 CRUD | W5 | W1 | superuser 覆盖 |
| 学生管理操作 | W3 | W1 | superuser 覆盖 |
| 联系人操作（W3） | W3 | W1, W6 | 都有 contacts 权限 |
| 联系人操作（W6） | W6 | W1, W3 | 都有 contacts 权限 |
| portal 文档操作 | W2 | W1 | superuser 有 portal 权限 |
| 公开页面访问 | W4 | W1, W2, W3, W5, W6 | 公开页面无权限限制 |

#### 共享数据修改约束

涉及修改共享数据（general-settings、web-settings、种子数据）的任务，必须在**同一任务内**完成备份→修改→还原，不能留下脏数据影响其他 worker。

#### 不能加 backupWorkers 的任务

- **身份初始化**：注册、登录、set_cookie、reload_auth、赋权、refresh_token
- **UI 验证**：sidebar_verify、dashboard_verify、menu_highlight、navigation_test（验证特定角色看到的 UI）
- **反向权限测试**：denied 类任务（验证特定角色不能访问）
- **W7 破坏性测试**：使用临时账号，状态不可共享
- **W1↔W7 协调**：disable_temp、enable_temp、verify_disabled、verify_enabled

### CI/CD 构建并行化

当前 4 个镜像在同一个 job 里串行构建。拆为独立 job 并行：

```text
detect-changes
  ├→ build-gateway        (if gateway changed)
  ├→ build-frontend       (if frontend changed)
  ├→ build-api            (if api changed)
  ├→ build-db             (if db changed)
  ├→ test-backend-unit    (独立，不阻止部署)
  └→ test-frontend-unit   (独立，不阻止部署)
       ↓ (all builds done)
     deploy
       ├→ e2e-test        (if ENABLE_E2E == '1')
       └→ cleanup-registry
```

每个 build job：checkout → login registry → build-push。

`deploy` 的 `needs` 改为 `[detect-changes, build-gateway, build-frontend, build-api, build-db]`（不包含 test jobs），条件判断各 build job 为 success 或 skipped。

单元测试 job 与构建并行运行，仅报告结果，不阻止部署：

- `test-backend-unit`：checkout → 安装 uv → `uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e`
- `test-frontend-unit`：checkout → 安装 Node.js + pnpm → `pnpm --prefix frontend install` → `pnpm --prefix frontend test`

### CI/CD E2E 测试

在 GitHub Actions 部署成功后，新增 `e2e-test` job 跑线上 E2E 验证。

**开关控制**：通过 GitHub Variable `ENABLE_E2E`（默认 `0`）控制。设为 `1` 时启用。

**依赖关系**：`deploy` → `e2e-test`

**条件**：`if: vars.ENABLE_E2E == '1' && needs.deploy.result == 'success'`

**job 定义**：

```yaml
e2e-test:
  needs: deploy
  if: always() && vars.ENABLE_E2E == '1' && needs.deploy.result == 'success'
  runs-on: ubuntu-latest
  steps:
    - name: 检出代码
      uses: actions/checkout@v5

    - name: 安装 Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 24

    - name: 安装 pnpm
      uses: pnpm/action-setup@v4
      with:
        version: latest

    - name: 安装依赖
      run: pnpm --prefix frontend install

    - name: 安装 Playwright 浏览器
      run: pnpm --prefix frontend exec playwright install --with-deps chromium

    - name: 生成 production.env
      run: |
        mkdir -p env
        cat > env/production.env << 'ENVEOF'
        BASE_URL=http://${{ secrets.SERVER_HOST }}
        INTERNAL_SECRET=${{ secrets.INTERNAL_SECRET }}
        SEED_USER_1_USERNAME=${{ secrets.SEED_USER_1_USERNAME }}
        SEED_USER_1_PASSWORD=${{ secrets.SEED_USER_1_PASSWORD }}
        DB_HOST=${{ secrets.SERVER_HOST }}
        DB_PORT=${{ secrets.DB_EXTERNAL_PORT }}
        DB_NAME=${{ secrets.DB_NAME }}
        DB_USER=${{ secrets.DB_USER }}
        DB_PASSWORD=${{ secrets.DB_PASSWORD }}
        ENVEOF
        sed -i 's/^[[:space:]]*//' env/production.env

    - name: 运行 E2E 测试
      run: |
        TEST_ENV=production pnpm --prefix frontend exec \
          playwright test --config e2e/playwright.config.ts

    - name: 上传测试报告
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: e2e-report
        path: frontend/test-results/
        retention-days: 7
```

不需要新增 GitHub Secrets，全部复用现有的。

## 文件改动清单

### 前端 E2E

| 文件 | 改动 |
| ---- | ---- |
| `frontend/e2e/constants.ts` | PHONES 新增 `w1`，所有 worker 手机号前缀从 139 改为 239，用户名前缀改为 `E2E_239_` |
| `frontend/e2e/global-setup.ts` | 登录改用 SEED_USER_1；数据清理改为 pg 直连 SQL |
| `frontend/e2e/global-teardown.ts` | 数据清理改为 pg 直连 SQL，不再依赖 API 登录 |
| `frontend/e2e/w1/tasks.ts` | `w1_login` → `w1_register`（手机号注册）；新增 `w1_refresh_superuser` 任务（依赖 W7 赋权） |
| `frontend/e2e/w7/tasks.ts` | 新增 `w7_login_seed1`（SEED_USER_1 密码登录）+ `w7_assign_superuser_w1`（给 W1 赋权 superuser） |
| `frontend/e2e/w4/tasks.ts` | `w4_auth_login_success` 改用 SEED_USER_1 凭证 |
| `frontend/e2e/screenshots/capture.ts` | 改用 SEED_USER_1 凭证 |
| `frontend/e2e/framework/signal.ts` | 文件读写改为 better-sqlite3 操作 |
| `frontend/e2e/framework/runner.ts` | 轮询间隔 2s → 200ms，前置条件查 SQL；级联熔断改为只传播直接依赖 |
| `frontend/package.json` | 新增 `pg`、`better-sqlite3` 依赖 |

### 后端

| 文件 | 改动 |
| ---- | ---- |
| `backend/scripts/init/seed_user.py` | 删除 SEED_USER_E2E 读取和创建代码（行 32-39） |

### CI/CD 和配置

| 文件 | 改动 |
| ---- | ---- |
| `.github/workflows/build.yml` | 删除 SEED_USER_E2E 两行；部署后新增 E2E 测试 job |
| `env/backend.env.example` | 删除 SEED_USER_E2E 两行，新增 `DB_EXTERNAL_PORT=15432` |
| `env/production.env.example` | 删除 SEED_USER_E2E 两行，新增 SEED_USER_1 + DB 连接变量 |

## 不变的部分

- SEED_USER_1/2/3 的种子用户机制不变
- W2-W7 的自注册流程不变（仅手机号前缀从 139 改为 239）
- 后端 E2E 测试（pytest）已经用 SEED_USER_1，不受影响
- admin 用户删除的 superuser 保护逻辑已存在（SQL 直连清理绕过此限制）
