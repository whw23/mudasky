# E2E 架构优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去掉 SEED_USER_E2E，W1 改为自注册，数据清理改 pg 直连，信号改 SQLite，CI/CD 构建并行化 + E2E 测试 job。

**Architecture:** 分三个阶段实施。阶段一处理核心数据层（E2E_239 命名规范 + pg 直连清理 + 去掉 SEED_USER_E2E + W1 自注册）。阶段二处理框架层（信号改 SQLite + backupWorkers）。阶段三处理 CI/CD 层（构建并行化 + E2E 测试 job + 单元测试 job）。

**Tech Stack:** TypeScript, Playwright, pg (Node.js), better-sqlite3, GitHub Actions

**设计文档:** `docs/superpowers/specs/2026-04-19-w1-self-register-design.md`

---

## 阶段一：核心数据层（E2E_239 + pg 直连 + W1 自注册）

### Task 1: 安装 pg 依赖 + 创建数据库清理工具模块

**Files:**
- Modify: `frontend/package.json` — 新增 `pg` 依赖
- Create: `frontend/e2e/framework/db-cleanup.ts` — 数据库直连清理工具

- [ ] **Step 1: 安装 pg 依赖**

```bash
cd /home/whw23/code/mudasky/frontend && pnpm add pg
```

- [ ] **Step 2: 创建 db-cleanup.ts**

```typescript
// frontend/e2e/framework/db-cleanup.ts
/**数据库直连清理工具。*/
import pg from "pg"

function getDbConfig(): pg.ClientConfig {
  const isProduction = process.env.TEST_ENV === "production"
  if (isProduction) {
    return {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  }
  const host = "localhost"
  const port = Number(process.env.DB_EXTERNAL_PORT || "15432")
  return {
    host,
    port,
    database: process.env.DB_NAME || "mudasky",
    user: process.env.DB_USER || "mudasky",
    password: process.env.DB_PASSWORD,
  }
}

export async function cleanupE2EData(): Promise<void> {
  const client = new pg.Client(getDbConfig())
  try {
    await client.connect()
    await client.query(`
      DELETE FROM refresh_token WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'E2E\\_239\\_%');
      DELETE FROM sms_code WHERE phone IN (SELECT phone FROM "user" WHERE username LIKE 'E2E\\_239\\_%');
      DELETE FROM document WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'E2E\\_239\\_%');
      DELETE FROM "user" WHERE username LIKE 'E2E\\_239\\_%';
      DELETE FROM role WHERE name LIKE 'E2E\\_239%';
      DELETE FROM category WHERE slug LIKE 'e2e-239%';
      DELETE FROM article WHERE title LIKE 'E2E\\_239%';
      DELETE FROM success_case WHERE student_name LIKE 'E2E\\_239%';
      DELETE FROM university WHERE name LIKE 'E2E\\_239%';
    `)
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/e2e/framework/db-cleanup.ts
git commit -m "feat(e2e): 新增 pg 依赖和数据库直连清理工具"
```

---

### Task 2: 更新 constants.ts — E2E_239 命名规范

**Files:**
- Modify: `frontend/e2e/constants.ts`

- [ ] **Step 1: 更新 PHONES 和新增命名常量**

在 `constants.ts` 中：
1. PHONES 新增 `w1` 条目
2. 所有手机号前缀从 `139` 改为 `239`
3. 新增 `E2E_PREFIX` 常量

```typescript
// 修改 PHONES 对象
export const E2E_PREFIX = "E2E_239_"

export const PHONES = {
  w1: `+86-239${TS}01`,
  w2: `+86-239${TS}02`,
  w3: `+86-239${TS}03`,
  w5: `+86-239${TS}05`,
  w6: `+86-239${TS}06`,
  w7_jwt: `+86-239${TS}71`,
  w7_idor: `+86-239${TS}72`,
  w7_disabled: `+86-239${TS}73`,
} as const
```

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/constants.ts
git commit -m "feat(e2e): E2E_239 命名规范 + W1 手机号"
```

---

### Task 3: 更新 global-setup.ts — pg 直连清理 + SEED_USER_1 登录

**Files:**
- Modify: `frontend/e2e/global-setup.ts`

- [ ] **Step 1: 替换数据库清理逻辑**

将 `docker compose exec -T db psql` 的清理逻辑替换为调用 `cleanupE2EData()`：

```typescript
// 替换 try { const psql = ... } catch { ... } 段落为：
import { cleanupE2EData } from "./framework/db-cleanup"

// 在 globalSetup 函数内：
try {
  await cleanupE2EData()
  console.log("[Setup] E2E 数据清理完成（pg 直连）")
} catch (e) {
  console.warn("[Setup] E2E 数据清理失败（继续执行）:", e)
}
```

- [ ] **Step 2: 预热登录改用 SEED_USER_1**

将 `process.env.SEED_USER_E2E_USERNAME` 和 `process.env.SEED_USER_E2E_PASSWORD` 替换为：

```typescript
const username = process.env.SEED_USER_1_USERNAME || "admin"
const password = process.env.SEED_USER_1_PASSWORD || "Admin123!"
```

- [ ] **Step 3: 去掉保存 W1 auth state 的逻辑**

预热登录后不再调用 `context.storageState({ path: getAuthFile("w1") })`，只做页面预热。

- [ ] **Step 4: 提交**

```bash
git add frontend/e2e/global-setup.ts
git commit -m "refactor(e2e): global-setup 改用 pg 直连清理 + SEED_USER_1 预热"
```

---

### Task 4: 更新 global-teardown.ts — pg 直连清理

**Files:**
- Modify: `frontend/e2e/global-teardown.ts`

- [ ] **Step 1: 替换清理逻辑**

删除整个 `cleanupE2EData()` 函数（通过 API 登录 + 逐个删除的旧逻辑），替换为调用 `db-cleanup.ts`：

```typescript
import { cleanupE2EData } from "./framework/db-cleanup"

// 在 globalTeardown 中，替换旧的 cleanupE2EData 调用：
try {
  await cleanupE2EData()
  console.log("[Teardown] E2E 数据清理完成（pg 直连）")
} catch (e) {
  console.warn("[Teardown] E2E 数据清理失败:", e)
}
```

- [ ] **Step 2: 删除不再需要的 Playwright 登录清理代码**

teardown 不再需要启动浏览器、登录 SEED_USER_E2E、调 admin API 清理。只保留：结果汇总 + 覆盖率 + pg 直连清理 + 信号文件清理。

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/global-teardown.ts
git commit -m "refactor(e2e): global-teardown 改用 pg 直连清理"
```

---

### Task 5: 更新 W1 任务 — 自注册 + refresh_superuser

**Files:**
- Modify: `frontend/e2e/w1/tasks.ts`

- [ ] **Step 1: 将 w1_login 改为 w1_register**

```typescript
// 旧的 w1_login 任务
{
  id: "w1_login",
  worker: "w1",
  name: "超级管理员登录",
  requires: ["w1_set_cookie"],
  fn: login,
  fnArgs: {
    username: process.env.SEED_USER_E2E_USERNAME || "admin",
    password: process.env.SEED_USER_E2E_PASSWORD || "Admin123!",
    worker: "w1",
  },
  ...
}

// 改为 w1_register
{
  id: "w1_register",
  worker: "w1",
  name: "W1 注册 E2E 账号",
  requires: ["w1_set_cookie"],
  fn: register,
  fnArgs: {
    phone: PHONES.w1,
    worker: "w1",
  },
  coverage: {
    routes: ["/"],
    api: ["/api/auth/sms-code", "/api/auth/register"],
    components: ["RegisterForm"],
    security: ["sms-registration"],
  },
},
```

- [ ] **Step 2: 新增 w1_refresh_superuser 任务**

在 w1_register 之后，w1_assign_role_w2 之前插入：

```typescript
{
  id: "w1_refresh_superuser",
  worker: "w1",
  name: "W1 刷新 token 获取 superuser 权限",
  requires: ["w7_assign_superuser_w1"],
  fn: reloadAuth,
  fnArgs: { phone: PHONES.w1, worker: "w1" },
  coverage: {
    routes: [],
    api: ["/api/auth/sms-code", "/api/auth/login"],
    components: [],
    security: ["role-upgrade-refresh"],
  },
},
```

- [ ] **Step 3: 更新所有 w1_login 引用为 w1_register 或 w1_refresh_superuser**

所有 `requires: ["w1_login", ...]` 中，需要 superuser 权限的改为 `requires: ["w1_refresh_superuser", ...]`，不需要权限的保持依赖 `w1_register`。

赋权类任务（assign_role_w2/w3/w5/w6）的 requires 从 `["w1_login", ...]` 改为 `["w1_refresh_superuser", ...]`。

- [ ] **Step 4: 导入 register 和 reloadAuth**

```typescript
import register from "../fns/register"
import reloadAuth from "../fns/reload-auth"
```

- [ ] **Step 5: 提交**

```bash
git add frontend/e2e/w1/tasks.ts
git commit -m "feat(e2e): W1 改为自注册 + refresh_superuser 依赖链"
```

---

### Task 6: 更新 W7 任务 — 新增 SEED_USER_1 登录 + 给 W1 赋权

**Files:**
- Modify: `frontend/e2e/w7/tasks.ts`

- [ ] **Step 1: 新增 w7_login_seed1 任务**

在 w7_set_cookie 之后插入：

```typescript
{
  id: "w7_login_seed1",
  worker: "w7",
  name: "W7 用 SEED_USER_1 登录",
  requires: ["w7_set_cookie"],
  fn: login,
  fnArgs: {
    username: process.env.SEED_USER_1_USERNAME || "admin",
    password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
    worker: "w7",
  },
  coverage: {
    routes: ["/"],
    api: ["/api/auth/login"],
    components: ["LoginDialog", "LoginForm"],
    security: [],
  },
},
```

- [ ] **Step 2: 新增 w7_assign_superuser_w1 任务**

```typescript
{
  id: "w7_assign_superuser_w1",
  worker: "w7",
  name: "W7 给 W1 赋权 superuser",
  requires: ["w7_login_seed1", "w1_register"],
  fn: assignRole,
  fnArgs: {
    phone: PHONES.w1,
    roleName: "superuser",
  },
  coverage: {
    routes: ["/admin/users"],
    api: ["/api/admin/users/list", "/api/admin/users/list/detail/assign-role"],
    components: ["UserList", "UserDetail"],
    security: ["role-assignment"],
  },
},
```

- [ ] **Step 3: 更新 w7_auth_login 和 w7_login_jwt 引用**

将所有使用 `SEED_USER_E2E` 的地方改为 `SEED_USER_1`：

```typescript
// w7_auth_login
fnArgs: {
  username: process.env.SEED_USER_1_USERNAME || "admin",
  password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
  worker: "w7",
}

// w7_login_jwt
fnArgs: {
  username: process.env.SEED_USER_1_USERNAME || "admin",
  password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
  worker: "w7",
}
```

- [ ] **Step 4: 导入依赖**

```typescript
import { PHONES } from "../constants"
import login from "../fns/login"
import assignRole from "../fns/assign-role"
```

- [ ] **Step 5: 提交**

```bash
git add frontend/e2e/w7/tasks.ts
git commit -m "feat(e2e): W7 新增 SEED_USER_1 登录 + 给 W1 赋权 superuser"
```

---

### Task 7: 更新 W4 任务 + screenshots — 改用 SEED_USER_1

**Files:**
- Modify: `frontend/e2e/w4/tasks.ts`
- Modify: `frontend/e2e/screenshots/capture.ts`

- [ ] **Step 1: W4 的 w4_auth_login_success 改用 SEED_USER_1**

```typescript
fnArgs: {
  username: process.env.SEED_USER_1_USERNAME || "admin",
  password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
},
```

- [ ] **Step 2: screenshots/capture.ts 改用 SEED_USER_1**

```typescript
await inputs.first().fill(process.env.SEED_USER_1_USERNAME!)
await inputs.nth(1).fill(process.env.SEED_USER_1_PASSWORD!)
```

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/w4/tasks.ts frontend/e2e/screenshots/capture.ts
git commit -m "refactor(e2e): W4/screenshots 改用 SEED_USER_1 凭证"
```

---

### Task 8: 更新所有 E2E 测试数据前缀为 E2E_239

**Files:**
- Modify: `frontend/e2e/w1/tasks.ts` — CRUD 数据前缀
- Modify: `frontend/e2e/w5/tasks.ts` — CRUD 数据前缀
- Modify: `frontend/e2e/fns/` 下相关 fn — 数据前缀

- [ ] **Step 1: 搜索所有 E2E 前缀的测试数据**

```bash
cd /home/whw23/code/mudasky && grep -rn '"E2E' frontend/e2e/ --include="*.ts" | grep -v node_modules
```

- [ ] **Step 2: 将所有 E2E 测试数据前缀改为 E2E_239**

所有任务中创建的角色名、分类 slug、文章标题、案例姓名、院校名称，从 `E2E` 或 `E2E_` 前缀改为 `E2E_239_`。分类 slug 从 `e2e-` 改为 `e2e-239-`。

引用 `constants.ts` 中的 `E2E_PREFIX` 常量。

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/
git commit -m "refactor(e2e): 所有测试数据前缀改为 E2E_239"
```

---

### Task 9: 删除后端 SEED_USER_E2E 代码

**Files:**
- Modify: `backend/scripts/init/seed_user.py`

- [ ] **Step 1: 删除 E2E 用户读取代码**

删除 `seed_user.py` 中 `_get_seed_users()` 函数的 E2E 专用段落（约行 32-39）：

```python
# 删除以下代码：
e2e_user = os.environ.get("SEED_USER_E2E_USERNAME")
e2e_pass = os.environ.get("SEED_USER_E2E_PASSWORD")
if e2e_user and e2e_pass:
    users.append({
        "username": e2e_user,
        "password": e2e_pass,
        "phone": None,
    })
```

- [ ] **Step 2: 提交**

```bash
git add backend/scripts/init/seed_user.py
git commit -m "refactor: 删除 SEED_USER_E2E 初始化代码"
```

---

### Task 10: 更新 env 和 CI 配置

**Files:**
- Modify: `.github/workflows/build.yml` — 已完成（SEED_USER_E2E 已删除）
- Modify: `env/backend.env.example` — 已完成
- Modify: `env/production.env.example` — 已完成

- [ ] **Step 1: 验证 env 文件已更新**

确认以下文件已在之前的提交中更新：
- `env/backend.env.example`：无 SEED_USER_E2E，有 DB_EXTERNAL_PORT=15432
- `env/production.env.example`：无 SEED_USER_E2E，有 SEED_USER_1 + DB 连接变量
- `.github/workflows/build.yml`：无 SEED_USER_E2E 行

- [ ] **Step 2: 提交（如有遗漏改动）**

```bash
git add .github/workflows/build.yml env/backend.env.example env/production.env.example
git commit -m "chore: 清理 SEED_USER_E2E 配置"
```

---

### Task 11: 阶段一验收 — 本地 E2E 测试

- [ ] **Step 1: 重建数据库（因 seed_rbac.py 已改权限）**

```bash
cd /home/whw23/code/mudasky && docker compose down -v && ./scripts/dev.sh start
```

- [ ] **Step 2: 运行本地 E2E**

```bash
./scripts/test.sh e2e
```

- [ ] **Step 3: 验证结果**

期望：所有任务 pass，0 fail / 0 breaker / 0 timeout。

- [ ] **Step 4: 提交修复（如有）**

---

## 阶段二：框架层（信号改 SQLite + backupWorkers）

### Task 12: 安装 better-sqlite3 依赖

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装 better-sqlite3**

```bash
cd /home/whw23/code/mudasky/frontend && pnpm add better-sqlite3 && pnpm add -D @types/better-sqlite3
```

- [ ] **Step 2: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat(e2e): 新增 better-sqlite3 依赖"
```

---

### Task 13: 重写 signal.ts — 文件改 SQLite

**Files:**
- Modify: `frontend/e2e/framework/signal.ts`

- [ ] **Step 1: 重写 signal.ts**

将文件读写操作全部替换为 better-sqlite3 操作：

```typescript
// frontend/e2e/framework/signal.ts
/**跨 worker 信号协调（SQLite）。*/
import Database from "better-sqlite3"
import path from "node:path"
import fs from "node:fs"

const E2E_RUNTIME_DIR = process.env.E2E_RUNTIME_DIR
  || path.join(process.cwd(), "test-results", "e2e-runtime")

const DB_PATH = path.join(E2E_RUNTIME_DIR, "signals.db")

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma("journal_mode = WAL")
    _db.exec(`
      CREATE TABLE IF NOT EXISTS signals (
        task_id TEXT PRIMARY KEY,
        worker TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT,
        error TEXT,
        cause TEXT,
        timestamp REAL NOT NULL DEFAULT (unixepoch('subsec'))
      )
    `)
  }
  return _db
}

export function initSignalDb(): void {
  const db = getDb()
  db.exec("DELETE FROM signals")
}

export function claimTask(taskId: string, worker: string): boolean {
  const db = getDb()
  try {
    db.prepare(
      "INSERT INTO signals (task_id, worker, status) VALUES (?, ?, 'running')"
    ).run(taskId, worker)
    return true
  } catch {
    return false
  }
}

export function writeSignal(
  taskId: string,
  worker: string,
  status: string,
  data?: Record<string, unknown>,
  error?: string,
  cause?: string,
): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO signals (task_id, worker, status, data, error, cause)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id) DO UPDATE SET
      status = excluded.status,
      data = excluded.data,
      error = excluded.error,
      cause = excluded.cause,
      timestamp = unixepoch('subsec')
  `).run(
    taskId, worker, status,
    data ? JSON.stringify(data) : null,
    error || null,
    cause || null,
  )
}

export interface SignalData {
  task_id: string
  worker: string
  status: string
  data: Record<string, unknown> | null
  error: string | null
  cause: string | null
}

export function checkRequires(
  requires: string[],
): { result: "all_pass"; data: Record<string, Record<string, unknown>> }
  | { result: "any_fail"; failedId: string; cause: string }
  | { result: "not_ready" } {
  if (requires.length === 0) return { result: "all_pass", data: {} }

  const db = getDb()
  const placeholders = requires.map(() => "?").join(",")
  const rows = db.prepare(
    `SELECT task_id, status, data, error FROM signals WHERE task_id IN (${placeholders})`
  ).all(...requires) as SignalData[]

  const found = new Map(rows.map(r => [r.task_id, r]))

  const collectedData: Record<string, Record<string, unknown>> = {}

  for (const reqId of requires) {
    const signal = found.get(reqId)
    if (!signal) return { result: "not_ready" }
    if (signal.status === "running") return { result: "not_ready" }
    if (signal.status !== "pass") {
      return { result: "any_fail", failedId: reqId, cause: signal.status }
    }
    if (signal.data) {
      collectedData[reqId] = JSON.parse(signal.data as unknown as string)
    }
  }

  return { result: "all_pass", data: collectedData }
}

export function getAllSignals(): Record<string, SignalData> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM signals").all() as SignalData[]
  const result: Record<string, SignalData> = {}
  for (const row of rows) {
    if (row.data) row.data = JSON.parse(row.data as unknown as string)
    result[row.task_id] = row
  }
  return result
}

export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/framework/signal.ts
git commit -m "refactor(e2e): 信号系统从文件改为 SQLite"
```

---

### Task 14: 更新 runner.ts — 轮询间隔 + 适配 SQLite 信号

**Files:**
- Modify: `frontend/e2e/framework/runner.ts`

- [ ] **Step 1: 修改轮询间隔**

```typescript
// 将 POLL_INTERVAL 从 2000 改为 200
const POLL_INTERVAL = 200
```

- [ ] **Step 2: 确认 runner.ts 中的信号调用兼容新 API**

检查 `claimTask`、`writeSignal`、`checkRequires` 的调用签名是否与新 signal.ts 一致。如有不兼容的调用参数，更新 runner.ts。

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/framework/runner.ts
git commit -m "refactor(e2e): runner 轮询间隔 2s→200ms + 适配 SQLite 信号"
```

---

### Task 15: 更新 global-setup.ts / global-teardown.ts — 适配 SQLite 信号

**Files:**
- Modify: `frontend/e2e/global-setup.ts`
- Modify: `frontend/e2e/global-teardown.ts`

- [ ] **Step 1: global-setup 初始化 SQLite**

替换信号目录清理逻辑为：

```typescript
import { initSignalDb } from "./framework/signal"

// 替换原来的 fs.rmSync(SIGNAL_DIR) 逻辑：
initSignalDb()
```

LAST_NOT_PASS 模式中预写信号也改为调用 `writeSignal()`。

- [ ] **Step 2: global-teardown 适配 getAllSignals()**

替换读取信号目录的逻辑为 `getAllSignals()`，并在最后调用 `closeDb()`。

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/global-setup.ts frontend/e2e/global-teardown.ts
git commit -m "refactor(e2e): global-setup/teardown 适配 SQLite 信号"
```

---

### Task 16: 为所有任务添加 backupWorkers

**Files:**
- Modify: `frontend/e2e/w1/tasks.ts`
- Modify: `frontend/e2e/w2/tasks.ts`
- Modify: `frontend/e2e/w3/tasks.ts`
- Modify: `frontend/e2e/w4/tasks.ts`
- Modify: `frontend/e2e/w5/tasks.ts`
- Modify: `frontend/e2e/w6/tasks.ts`

- [ ] **Step 1: W1 任务 — CRUD 类加 backupWorkers: ["w5"]**

W1 的 CRUD 内容任务（crud_category/article/case/university 的 create/edit/delete）和 general-settings/web-settings 操作任务加 `backupWorkers: ["w5"]`。

用户/角色管理、安全测试、UI 验证、赋权、协调任务**不加**。

- [ ] **Step 2: W2 任务 — portal 文档操作加 backupWorkers: ["w1"]**

W2 的文档操作任务（documents_upload/verify_list/tab_switch/storage/delete）加 `backupWorkers: ["w1"]`。

profile/sessions/2fa、权限测试、UI 验证**不加**。

- [ ] **Step 3: W3 任务 — 学生/联系人操作加 backupWorkers**

学生管理操作加 `backupWorkers: ["w1"]`。
联系人操作加 `backupWorkers: ["w1", "w6"]`。
权限测试、UI 验证**不加**。

- [ ] **Step 4: W4 任务 — 公开页面加 backupWorkers**

公开页面访问任务（public_home/about/news/cases/universities/contact、detail 页）加 `backupWorkers: ["w1", "w2", "w3", "w5", "w6"]`。
搜索/筛选功能也加。
认证测试、权限测试、JWT/IDOR 测试**不加**。

- [ ] **Step 5: W5 任务 — CRUD 加 backupWorkers: ["w1"]**

W5 的内容 CRUD 和 settings 操作加 `backupWorkers: ["w1"]`。
权限测试、UI 验证**不加**。

- [ ] **Step 6: W6 任务 — 联系人操作加 backupWorkers**

联系人操作加 `backupWorkers: ["w1", "w3"]`。
权限测试、UI 验证**不加**。

- [ ] **Step 7: 提交**

```bash
git add frontend/e2e/w1/tasks.ts frontend/e2e/w2/tasks.ts frontend/e2e/w3/tasks.ts frontend/e2e/w4/tasks.ts frontend/e2e/w5/tasks.ts frontend/e2e/w6/tasks.ts
git commit -m "feat(e2e): 为功能操作类任务添加 backupWorkers"
```

---

### Task 17: 阶段二验收 — 本地 E2E 测试

- [ ] **Step 1: 运行本地 E2E**

```bash
./scripts/test.sh e2e
```

- [ ] **Step 2: 验证结果**

期望：所有任务 pass，0 fail / 0 breaker / 0 timeout。特别关注：
- W1 自注册 + W7 赋权链是否正常
- SQLite 信号是否正确读写
- backupWorkers 是否被正确触发（观察日志中是否有 worker 偷取任务）

- [ ] **Step 3: 运行 LAST_NOT_PASS 模式验证**

```bash
LAST_NOT_PASS=1 ./scripts/test.sh e2e
```

- [ ] **Step 4: 提交修复（如有）**

---

## 阶段三：CI/CD 层（构建并行化 + E2E + 单元测试）

### Task 18: 重构 build.yml — 构建并行化

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: 拆分 build-and-push 为 4 个独立 job**

将 `build-and-push` job 拆分为 `build-gateway`、`build-frontend`、`build-api`、`build-db` 四个 job，每个独立运行：

```yaml
build-gateway:
  needs: detect-changes
  if: needs.detect-changes.outputs.gateway == 'true'
  runs-on: ubuntu-latest
  permissions:
    contents: read
    packages: write
  steps:
    - uses: actions/checkout@v5
    - name: 生成版本号
      id: version
      run: echo "tag=$(TZ=Asia/Shanghai date +%Y%m%d)-$(echo ${{ github.sha }} | cut -c1-7)" >> $GITHUB_OUTPUT
    - name: 登录 GitHub Container Registry
      uses: docker/login-action@v4
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - name: 构建并推送 gateway 镜像
      uses: docker/build-push-action@v7
      with:
        context: ./gateway
        push: true
        tags: ${{ env.IMAGE_PREFIX }}-gateway:latest
        build-args: BUILD_VERSION=${{ steps.version.outputs.tag }}
        labels: org.opencontainers.image.revision=${{ github.sha }}
```

其他三个 job 类似（build-frontend、build-api、build-db）。

- [ ] **Step 2: 更新 deploy job 的 needs**

```yaml
deploy:
  needs: [detect-changes, build-gateway, build-frontend, build-api, build-db]
  if: >-
    always()
    && needs.detect-changes.outputs.any == 'true'
    && !contains(needs.*.result, 'failure')
```

- [ ] **Step 3: 更新 cleanup-registry 的 needs**

```yaml
cleanup-registry:
  needs: [build-gateway, build-frontend, build-api, build-db]
  if: >-
    always()
    && (needs.build-gateway.result == 'success'
        || needs.build-frontend.result == 'success'
        || needs.build-api.result == 'success'
        || needs.build-db.result == 'success')
```

- [ ] **Step 4: 提交**

```bash
git add .github/workflows/build.yml
git commit -m "refactor(ci): 镜像构建拆分为 4 个并行 job"
```

---

### Task 19: 新增单元测试 job

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: 新增 test-backend-unit job**

```yaml
test-backend-unit:
  needs: detect-changes
  if: needs.detect-changes.outputs.api == 'true'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - name: 安装 uv
      uses: astral-sh/setup-uv@v6
    - name: 运行后端单元测试
      run: uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e
```

- [ ] **Step 2: 新增 test-frontend-unit job**

```yaml
test-frontend-unit:
  needs: detect-changes
  if: needs.detect-changes.outputs.frontend == 'true'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
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
    - name: 运行前端单元测试
      run: pnpm --prefix frontend test
```

- [ ] **Step 3: 提交**

```bash
git add .github/workflows/build.yml
git commit -m "feat(ci): 新增后端/前端单元测试 job（与构建并行，不阻止部署）"
```

---

### Task 20: 新增 E2E 测试 job

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: 新增 e2e-test job**

按设计文档中的 yaml 定义添加 `e2e-test` job（包含 `ENABLE_E2E` 开关）。

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/build.yml
git commit -m "feat(ci): 新增部署后 E2E 测试 job（ENABLE_E2E 控制）"
```

---

### Task 21: 阶段三验收

- [ ] **Step 1: 本地验证 build.yml 语法**

```bash
cd /home/whw23/code/mudasky && python -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))" && echo "YAML 语法正确"
```

- [ ] **Step 2: 全量本地测试**

```bash
./scripts/test.sh all
```

- [ ] **Step 3: 更新 TODO.md — 标记完成**

将以下 TODO 标记为已完成：
- 网页设置所见即所得：E2E CRUD 选择器调试（如果在此过程中修复了）
- E2E 架构优化：信号文件改 SQLite
- E2E 架构优化：W1 任务拆分到空闲 worker（通过 backupWorkers 实现）
- 新增的 W1 自注册 TODO

---

## 文件变更总览

| 文件 | 操作 | 阶段 |
| ---- | ---- | ---- |
| `frontend/package.json` | 新增 pg, better-sqlite3 | 1+2 |
| `frontend/e2e/framework/db-cleanup.ts` | 新建 | 1 |
| `frontend/e2e/framework/signal.ts` | 重写 | 2 |
| `frontend/e2e/framework/runner.ts` | 修改 | 2 |
| `frontend/e2e/constants.ts` | 修改 | 1 |
| `frontend/e2e/global-setup.ts` | 修改 | 1+2 |
| `frontend/e2e/global-teardown.ts` | 修改 | 1+2 |
| `frontend/e2e/w1/tasks.ts` | 修改 | 1+2 |
| `frontend/e2e/w2/tasks.ts` | 修改 | 2 |
| `frontend/e2e/w3/tasks.ts` | 修改 | 2 |
| `frontend/e2e/w4/tasks.ts` | 修改 | 1+2 |
| `frontend/e2e/w5/tasks.ts` | 修改 | 2 |
| `frontend/e2e/w6/tasks.ts` | 修改 | 2 |
| `frontend/e2e/w7/tasks.ts` | 修改 | 1 |
| `frontend/e2e/screenshots/capture.ts` | 修改 | 1 |
| `backend/scripts/init/seed_user.py` | 修改 | 1 |
| `.github/workflows/build.yml` | 修改 | 3 |
| `env/backend.env.example` | 已完成 | - |
| `env/production.env.example` | 已完成 | - |
