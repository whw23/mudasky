# E2E 多 Worker 协作测试设计

## 背景

当前 E2E 测试用单一 admin 账号（mudasky）跑所有用例，无法测试多用户协作场景和并发竞态。需要改为 4 个 worker 各自使用不同角色，通过文件信号协调，模拟真实多用户系统。

## 原则

- `mudasky`/`whw23`/`nyx` 是真实账号，测试**绝不触碰**
- 所有测试操作只使用 `e2e_test_superuser` 和自注册的 E2E 账号
- Worker 间通过文件信号通信，实现协作测试
- 覆盖率六维度 100%，0 failed / 0 skipped / 0 flaky

## 角色分配

| Worker | 账号 | 初始角色 | 最终角色 | 职责 |
|--------|------|----------|----------|------|
| W1 | e2e_test_superuser | superuser | superuser | 管理操作：赋权、创建数据、禁用/删除 |
| W2 | 自注册 E2E-student-{ts} | visitor | student | 学生场景：上传文档、查看资料、portal 操作 |
| W3 | 自注册 E2E-advisor-{ts} | visitor | advisor | 顾问场景：查看学生、管理联系人 |
| W4 | 自注册 E2E-visitor-{ts} | visitor | visitor | 游客场景：公开页面、权限被拒验证 |

## global-setup

用 `e2e_test_superuser`（密码 `e2e_test_superuser@12321.`）账号密码登录，保存 `w1.json`。**不使用 mudasky。**

- 预热页面（SSR 编译）
- 清理上次残留的信号文件
- 不创建种子数据（由 W1 在测试中创建）

## 信号机制

### 文件结构

```text
/tmp/e2e-signals/
├── w2_registered.json    # W2 注册完成，内容: { phone, username, userId }
├── w3_registered.json    # W3 注册完成
├── w4_registered.json    # W4 注册完成
├── w2_student.json       # W1 已把 W2 提升为 student
├── w3_advisor.json       # W1 已把 W3 提升为 advisor
├── roles_assigned.json   # 所有角色分配完成
├── article_created.json  # W1 创建了文章，内容: { articleId }
├── doc_uploaded.json     # W2 上传了文档，内容: { docId }
├── w4_disabled.json      # W1 禁用了 W4
└── ...
```

### API

```typescript
// frontend/e2e/helpers/signal.ts

const SIGNAL_DIR = "/tmp/e2e-signals"

/** 发送信号（写文件） */
function emit(name: string, data?: unknown): void

/** 等待信号（轮询文件，默认超时 30s） */
async function waitFor(name: string, timeout?: number): Promise<unknown>

/** 清理所有信号（global-setup / global-teardown 调用） */
function cleanup(): void
```

- `emit` 是同步写文件，立即可见
- `waitFor` 每 200ms 轮询一次，超时抛错
- 信号名全局唯一，不同 Phase 用不同前缀

## 执行流程

### Phase 1: 注册（W2/W3/W4 并行，W1 等待）

```text
W1: 等待 w2_registered + w3_registered + w4_registered
W2: 打开首页 → 注册（SMS 验证码）→ emit("w2_registered", { phone, username, userId })
W3: 打开首页 → 注册 → emit("w3_registered", { ... })
W4: 打开首页 → 注册 → emit("w4_registered", { ... })
```

### Phase 2: 赋权（W1 操作，W2/W3/W4 等待）

```text
W1: waitFor("w2_registered") → 在 admin/users 中找到 W2 → 提升为 student → emit("w2_student")
W1: waitFor("w3_registered") → 找到 W3 → 提升为 advisor → emit("w3_advisor")
W1: emit("roles_assigned")

W2: waitFor("w2_student") → refresh token → 验证角色变化 → 开始 student 测试
W3: waitFor("w3_advisor") → refresh token → 验证角色变化 → 开始 advisor 测试
W4: waitFor("roles_assigned") → 开始 visitor 测试（验证权限被拒）
```

### Phase 3: 协作测试（4 worker 并行）

**内容管理协作：**

```text
W1: 创建文章（发布）→ emit("article_created", { articleId })
W2: waitFor("article_created") → 公开页面能看到文章
W4: waitFor("article_created") → 公开页面也能看到（公开内容）
W1: 创建案例 → emit("case_created", { caseId })
W1: 创建院校 → emit("university_created", { universityId })
```

**文档协作：**

```text
W2: 上传文档 → emit("doc_uploaded", { docId })
W3: waitFor("doc_uploaded") → 在 admin/students 中查看 W2 的文档列表
W1: waitFor("doc_uploaded") → 在 admin/students 中也能查看
```

**权限验证（正例/反例自然产生）：**

```text
W1: 访问 admin/users → 200（正例：superuser 有权限）
W2: 访问 admin/users → 403（反例：student 无权限）
W4: 访问 portal/documents → 重定向（反例：visitor 无 portal 权限）

W2: 访问 portal/documents → 200（正例：student 有 portal 权限）
W3: 访问 admin/students → 200（正例：advisor 有学生管理权限）
W4: 访问公开页面 → 200（正例：visitor 能看公开内容）
```

**禁用用户：**

```text
W1: 禁用 W4 → emit("w4_disabled")
W4: waitFor("w4_disabled") → 验证 API 返回 401 USER_DISABLED
W1: 重新启用 W4 → emit("w4_enabled")
W4: waitFor("w4_enabled") → 验证恢复访问
```

## storageState 管理

| Worker | 文件 | 来源 |
|--------|------|------|
| W1 | `e2e/.auth/w1.json` | global-setup 密码登录 |
| W2 | `e2e/.auth/w2.json` | 测试中自注册后保存 |
| W3 | `e2e/.auth/w3.json` | 测试中自注册后保存 |
| W4 | `e2e/.auth/w4.json` | 测试中自注册后保存 |

每个 worker 通过 `TEST_WORKER_INDEX`（0-3）确定身份，加载对应的 storageState。

## Playwright 配置

```typescript
// playwright.config.ts
workers: 4,
projects: [
  { name: "w1-superuser", use: { storageState: "e2e/.auth/w1.json" }, testMatch: "e2e/w1/**/*.spec.ts" },
  { name: "w2-student", use: { storageState: "e2e/.auth/w2.json" }, testMatch: "e2e/w2/**/*.spec.ts" },
  { name: "w3-advisor", use: { storageState: "e2e/.auth/w3.json" }, testMatch: "e2e/w3/**/*.spec.ts" },
  { name: "w4-visitor", use: { storageState: "e2e/.auth/w4.json" }, testMatch: "e2e/w4/**/*.spec.ts" },
]
```

## 测试目录结构

```text
frontend/e2e/
├── w1/                          # superuser 测试
│   ├── admin-crud.spec.ts       # 文章/案例/院校 CRUD
│   ├── user-management.spec.ts  # 赋权/禁用/删除
│   └── security.spec.ts         # JWT/CSRF/安全
├── w2/                          # student 测试
│   ├── register.spec.ts         # 自注册流程
│   ├── portal.spec.ts           # portal 功能
│   ├── documents.spec.ts        # 文档上传
│   └── permission.spec.ts       # 权限正例/反例
├── w3/                          # advisor 测试
│   ├── register.spec.ts         # 自注册流程
│   ├── student-view.spec.ts     # 查看学生信息
│   └── permission.spec.ts       # 权限正例/反例
├── w4/                          # visitor 测试
│   ├── register.spec.ts         # 自注册流程
│   ├── public-pages.spec.ts     # 公开页面全覆盖
│   ├── permission.spec.ts       # 权限反例
│   └── disabled.spec.ts         # 被禁用后的验证
├── shared/                      # 不分 worker 的共享测试
│   ├── navigation.spec.ts       # 导航/i18n/语言切换
│   └── auth-flow.spec.ts        # 登录/登出/token
├── helpers/
│   ├── signal.ts                # Worker 间信号通信
│   ├── sms.ts                   # SMS 验证码
│   ├── seed.ts                  # 数据创建
│   ├── api-endpoints.json       # API 端点清单
│   └── page-routes.json         # 页面路由清单
├── fixtures/
│   └── base.ts                  # 覆盖率收集 + 辅助函数
├── global-setup.ts              # e2e_test_superuser 登录 + 预热
└── global-teardown.ts           # 清理 E2E 数据 + 信号 + 覆盖率
```

## global-teardown 清理

- 删除所有 `E2E-` 开头的用户和数据（用 W1 的 storageState）
- 清理信号文件 `/tmp/e2e-signals/`
- 输出覆盖率报告

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `frontend/e2e/helpers/signal.ts` |
| 新建 | `frontend/e2e/w1/*.spec.ts`（3 个） |
| 新建 | `frontend/e2e/w2/*.spec.ts`（4 个） |
| 新建 | `frontend/e2e/w3/*.spec.ts`（3 个） |
| 新建 | `frontend/e2e/w4/*.spec.ts`（4 个） |
| 新建 | `frontend/e2e/shared/*.spec.ts`（2 个） |
| 重写 | `frontend/e2e/global-setup.ts` |
| 重写 | `frontend/e2e/global-teardown.ts` |
| 重写 | `frontend/e2e/playwright.config.ts` |
| 修改 | `backend/scripts/init/seed_user.py` |
| 删除 | `frontend/e2e/admin/*.spec.ts`（旧测试迁移到 w1/） |
| 删除 | `frontend/e2e/portal/*.spec.ts`（旧测试迁移到 w2/） |
| 删除 | `frontend/e2e/public/*.spec.ts`（旧测试迁移到 w4/shared/） |
