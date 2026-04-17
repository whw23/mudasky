# E2E 测试框架重构设计

## 背景

当前 E2E 框架存在以下问题：

1. **线性等待**：worker 之间通过文件信号死等，前置没完成就阻塞，不能先做别的
2. **信号机制脆弱**：文件轮询无原子写入，超时就全挂，失败不传播
3. **熔断过于粗暴**：单个 401 熔断整个 project，不按依赖链传播
4. **角色覆盖不全**：只覆盖 4 个角色（superuser/student/advisor/visitor），缺少 content_admin 和 support
5. **破坏性测试影响正式账号**：禁用/改密码等操作破坏 worker 的 auth state
6. **`--last-failed` 不可用**：前置任务（注册/赋权）跳过后没有 auth state
7. **API 直接调用**：部分测试绕过 UI 直接调 API，不是真实用户操作

## 设计方案

### 核心模型：任务队列 + 前置条件非阻塞调度

每个 worker 维护有序任务列表，循环遍历找到前置条件已满足的任务执行。前置没完成则跳过做下一个，不死等。

### 7 个 Worker

| Worker | 角色 | 职责 |
|--------|------|------|
| W1 | superuser | 管理操作（赋权、CRUD、创建/禁用/启用临时账号） |
| W2 | student | 学生功能（资料、文档、会话） |
| W3 | advisor | 顾问功能（学生管理、联系人） |
| W4 | visitor | 访客/公开页面 |
| W5 | content_admin | 内容运营（文章、分类、案例、院校、设置） |
| W6 | support | 客服（联系人、仪表盘） |
| W7 | 无固定角色 | 破坏性测试（禁用/启用、改密码、踢会话、JWT 篡改、IDOR） |

W1-W6 各自注册/登录后保持 auth state 不变。W7 反复注册临时账号、测试、登出、注册下一个。

### 正向 + 反向测试

每个 worker 同时做正向和反向测试：

- **正向**：自己有权限的功能正常使用（CRUD、页面访问、表单提交）
- **反向**：自己没权限的功能被正确拒绝（访问 admin 页面重定向、API 返回 401/403）

示例：

| Worker | 正向 | 反向 |
|--------|------|------|
| W1 superuser | 所有管理功能 | 无（超级管理员有全部权限） |
| W2 student | portal 资料/文档/会话 | admin 页面被拒、其他用户数据不可访问 |
| W3 advisor | admin 学生/联系人 | admin 角色/用户/设置页面被拒 |
| W4 visitor | 公开页面、portal 资料 | admin 页面被拒、portal 文档被拒 |
| W5 content_admin | admin 文章/分类/案例/院校/设置 | admin 用户/角色页面被拒 |
| W6 support | admin 联系人/仪表盘 | admin 文章/用户/角色/设置页面被拒 |
| W7 临时账号 | 注册/登录功能 | 禁用后被拒、篡改 token 被拒、IDOR 被拒 |

### 任务定义

```typescript
interface Task {
  id: string                         // 唯一标识
  name: string                       // 描述
  worker: string                     // 主 worker
  backupWorkers?: string[]           // 备选 worker（空 = 不可被偷）
  requires: string[]                 // 前置条件（信号 ID 列表）
  fn: (page: Page) => Promise<void>  // 执行函数
  coverage?: {
    routes?: string[]                // 预期访问的路由
    api?: string[]                   // 预期触发的 API
    components?: [string, string][]  // [组件名, 元素名]
    security?: [string, string][]    // [类别, 场景]
  }
}
```

### 任务文件组织

```
frontend/e2e/
├── framework/
│   ├── types.ts          # Task, Signal 等类型定义
│   ├── runner.ts         # 任务队列调度器
│   ├── signal.ts         # 信号文件读写（原子写入）
│   └── coverage.ts       # 覆盖率计算脚本
├── fns/                  # fn 实现，每个功能一个文件
│   ├── register.ts       # 注册（UI 操作，W2-W7 共用）
│   ├── login.ts          # 登录（UI 操作）
│   ├── logout.ts         # 登出（UI 操作）
│   ├── assign-role.ts    # 赋权（UI 操作）
│   ├── admin-crud.ts     # 管理后台 CRUD
│   ├── profile.ts        # 个人资料
│   ├── documents.ts      # 文档管理
│   ├── contacts.ts       # 联系人管理
│   ├── students.ts       # 学生管理
│   ├── settings.ts       # 设置页面
│   ├── public-pages.ts   # 公开页面
│   ├── security.ts       # 安全测试（JWT/IDOR/注入）
│   ├── disabled.ts       # 禁用/启用验证
│   └── ...
├── w1/tasks.ts           # W1 任务声明，引用 fns/*
├── w2/tasks.ts
├── w3/tasks.ts
├── w4/tasks.ts
├── w5/tasks.ts
├── w6/tasks.ts
├── w7/tasks.ts
├── runner.spec.ts        # 通用 spec，7 个 project 共享
├── global-setup.ts
├── global-teardown.ts
└── playwright.config.ts
```

### 信号机制

每个任务执行完后写信号文件到 `/tmp/e2e-signals/{taskId}.json`：

```json
{ "status": "pass", "data": { "userId": "xxx" }, "timestamp": 1713340800 }
```

```json
{ "status": "fail", "error": "expect failed", "timestamp": 1713340800 }
```

前置条件检查逻辑：

1. 检查 requires 中所有信号文件是否存在
2. 任一文件 `status === "fail"` → 当前任务熔断（标记 fail，写信号文件）
3. 全部 `status === "pass"` → 执行任务
4. 文件不存在 → 跳过，做下一个任务

信号文件 + API 验证双保险：文件存在后可选调用 API 确认（如 refresh token 验证角色是否真的赋上了）。

### 调度器逻辑

```
Worker 启动 → 加载自己的任务队列 → 循环：

  phase 1: 遍历自己绑定的任务
    找到前置条件满足的 → 执行 → 写信号文件 → 从头遍历
    找到前置失败的 → 熔断 → 写信号文件 → 继续
    都不满足 → 进入 phase 2

  phase 2: 自己的任务都做完了，查看其他 worker 的任务
    找 backupWorkers 包含自己 且未被执行的任务 → 加锁 → 执行
    没有 → 进入 phase 3

  phase 3: 没有能做的任务
    如果所有任务都完成/熔断 → 退出
    否则 → sleep(2000) → 回到 phase 1
    
  总超时保护: 10 分钟，超时后所有 pending 任务标记 timeout
```

### 备选 Worker（任务偷取）

每个任务可声明 `backupWorkers`，当主 worker 做完自己所有任务后，可以执行 backupWorkers 包含自己的其他任务。

约束：
- 登录/注册任务 `backupWorkers` 为空，不可被偷
- 只有权限匹配的 worker 才放入 backupWorkers

#### 任务抢占锁

防止两个 backup worker 同时拿同一个任务。使用 `wx`（`O_CREAT | O_EXCL`）标志原子创建信号文件：

```typescript
function claimTask(taskId: string, worker: string): boolean {
  try {
    fs.writeFileSync(
      `/tmp/e2e-signals/${taskId}.json`,
      JSON.stringify({ status: "running", worker }),
      { flag: "wx" }  // 文件已存在则抛异常，操作系统级原子操作
    )
    return true   // 抢到了
  } catch {
    return false  // 别人已经抢到了
  }
}
```

流程：
1. 检查 `{taskId}.json` 是否存在 → 存在说明已完成或被抢，跳过
2. 用 `wx` 尝试创建 → 成功则执行任务，完成后覆写为 pass/fail
3. 创建失败 → 别的 worker 抢到了，跳过

崩溃保护：worker 执行中崩溃，信号文件停留在 `status: "running"`，其他 worker 看到已存在就跳过，最终由总超时标记为 timeout。

### W7 破坏性测试协调

W7 注册临时账号，W1 做管理操作，W7 验证结果。每组测试串行（通过 requires 链保证）：

```
W7 注册临时账号 → W1 禁用该账号 → W7 验证禁用 → W1 启用 → W7 验证启用 → W7 登出
W7 注册下一个临时账号 → W7 改密码 → W7 验证旧 token 失效 → W7 登出
...
```

W7 的临时账号在 global-teardown 统一清理。

### 熔断机制

按前置条件链传播：
- 任务失败 → 写信号文件（status: fail）
- 依赖该任务的后续任务检查到前置失败 → 自己也标记 fail → 写信号文件
- 级联传播直到所有依赖链上的任务都标记 fail
- 熔断的任务不重试，直接算 failed

### UI 操作原则

所有测试通过 UI 操作触发，不直接调 API：
- 登录 → 点击登录按钮、填表、提交
- 注册 → 手机号输入、验证码、提交
- 创建文章 → 点击新建按钮、填表单、保存
- 赋权 → 在用户管理页面操作下拉框
- 上传文档 → 通过上传组件
- 登出 → 点击登出按钮

### `--last-not-pass` 机制

通过环境变量触发：`LAST_NOT_PASS=1`

#### 运行结果持久化

每次跑完，global-teardown 汇总所有信号文件写入 `e2e/.last-run.json`：

```json
{
  "w1_login": "pass",
  "w2_register": "pass",
  "w2_profile": "fail",
  "w2_permission": "fail",
  ...
}
```

#### 重跑逻辑

1. 读取 `.last-run.json`
2. 找出所有 `status !== "pass"` 的任务
3. 递归找出每个未通过任务的整条依赖链
4. 合并去重 → 本次需要跑的任务集合
5. 不在集合里的任务 → 直接写 pass 信号文件，跳过执行

### 覆盖率

#### 收集方式

| 维度 | 方式 |
|------|------|
| API 端点 | 自动：拦截 `page.on("response")` |
| 页面路由 | 自动：拦截 `page.on("framenavigated")` |
| 组件交互 | 手动：任务 coverage 声明 |
| 安全场景 | 手动：任务 coverage 声明 |

#### 路由扫描与无效路由

`[panel]` 动态路由展开时会产生无效组合（如 `/portal/articles`、`/admin/overview`）。处理方式：

- 覆盖率计算时维护一个无效路由排除列表
- 无效路由作为 404 反向测试用例（验证访问后正确返回 404 或重定向）
- 排除列表在 coverage.ts 中维护

#### 计算方式

覆盖率从任务定义的 `coverage` 声明汇总。global-teardown 遍历所有任务：
- 收集所有声明的 routes/api/components/security
- 和实际运行中收集的数据对比
- 只有 pass 的任务才计入覆盖率
- 无效路由从总数中排除，但其 404 反向测试计入安全覆盖率

#### 报告格式

```
[Test Results] 230 pass / 2 fail / 3 breaker / 0 timeout (total: 235)

[API Coverage]       73/73  (100.0%)
[Route Coverage]     35/35  (100.0%)
[Component Coverage] 137/137 (100.0%)
[Security Coverage]  31/31  (100.0%)

Uncovered:
  - ...
```

### 测试规范更新

| 规则 | 说明 |
|------|------|
| 0 failed | 包含熔断和超时的任务（breaker/timeout = failed） |
| 0 skipped | 所有任务必须执行或熔断，不能跳过 |
| 不重试 | 设计上不做 retry，失败直接标记 |
| 首次通过 | 目标是每个任务一次就过 |
| 覆盖率 100% | 四维度全部 100% |

### playwright.config.ts

```typescript
projects: [
  { name: "w1-superuser",     testMatch: "runner.spec.ts" },
  { name: "w2-student",       testMatch: "runner.spec.ts" },
  { name: "w3-advisor",       testMatch: "runner.spec.ts" },
  { name: "w4-visitor",       testMatch: "runner.spec.ts" },
  { name: "w5-content-admin", testMatch: "runner.spec.ts" },
  { name: "w6-support",       testMatch: "runner.spec.ts" },
  { name: "w7-breaker",       testMatch: "runner.spec.ts" },
]
// 无 dependencies，7 个 worker 同时启动，靠前置条件自然协调
// workers: 7
// fullyParallel: false
```

### global-setup.ts

```
1. 清理信号文件目录
2. 清理熔断文件
3. 如果 LAST_NOT_PASS=1，从 .last-run.json 计算本次任务集合
4. 预热页面（可选）
```

### global-teardown.ts

```
1. 汇总所有信号文件 → 写 .last-run.json
2. 从任务定义汇总 coverage 声明 → 和实际数据对比 → 输出覆盖率报告
3. 输出 pass/fail/breaker 统计
4. 清理 E2E 数据（删除 E2E- 开头的记录 + W2-W6 注册的账号 + W7 的临时账号）
5. 清理信号文件和熔断文件
```

## 文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `e2e/framework/types.ts` |
| 新建 | `e2e/framework/runner.ts` |
| 新建 | `e2e/framework/signal.ts` |
| 新建 | `e2e/framework/coverage.ts` |
| 新建 | `e2e/runner.spec.ts` |
| 新建 | `e2e/fns/*.ts`（每个功能一个文件） |
| 新建 | `e2e/w1/tasks.ts` ~ `e2e/w7/tasks.ts` |
| 重写 | `e2e/playwright.config.ts` |
| 重写 | `e2e/global-setup.ts` |
| 重写 | `e2e/global-teardown.ts` |
| 删除 | `e2e/w1/*.spec.ts` ~ `e2e/w4/*.spec.ts`（旧测试文件） |
| 删除 | `e2e/shared/*.spec.ts` |
| 删除 | `e2e/fixtures/base.ts`（逻辑移入 framework/） |
| 删除 | `e2e/helpers/signal.ts`（替换为 framework/signal.ts） |
| 更新 | `.claude/rules/testing.md`（更新 E2E 规范） |
