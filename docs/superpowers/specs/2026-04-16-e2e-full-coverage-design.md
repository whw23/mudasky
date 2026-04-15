# E2E 测试全覆盖补全设计

## 背景

线上首次完整 E2E 跑通（197 passed, 2 failed, 16 flaky），基础设施问题（限流、超时、gzip）已修复。现在需要补全缺失的页面和交互覆盖，达到 100%。

## 当前覆盖状态

- 页面覆盖：30/35（86%）
- 展开面板交互：14/28（50%）
- ConfigEditDialog：0%

## 需要补全的测试

### A. 文章详情页（4 个路由，1 个 spec）

`/study-abroad/[id]`、`/visa/[id]`、`/life/[id]`、`/requirements/[id]` 共用 `ArticleDetailPage` 组件，和已测试的 `/news/[id]` 相同。

**新建文件**：`frontend/e2e/public/article-detail.spec.ts`

测试点：
- 每个栏目详情页可达并展示文章内容
- 详情页 API 正常响应
- 返回列表链接正确（指向对应栏目）

### B. 管理员文档页（1 个路由，1 个 spec）

`/admin/documents` 页面有上传区域 + 分类 tab 筛选。

**新建文件**：`frontend/e2e/admin/documents.spec.ts`

测试点：
- 页面加载显示文档管理标题
- 分类 tab 可见且可切换
- 上传按钮可见

### C. UserExpandPanel 补全（2 个缺失交互）

在现有 `frontend/e2e/admin/user-actions.spec.ts` 中追加：

| 缺失交互 | 测试描述 |
|----------|----------|
| 状态切换操作 | 点击状态按钮触发 API |
| 删除用户 + 确认弹窗 | 点击删除 → 确认弹窗 → 取消（不真删 superuser） |

### D. StudentExpandPanel 补全（4 个缺失交互）

在现有 `frontend/e2e/admin/students.spec.ts` 中追加：

| 缺失交互 | 测试描述 |
|----------|----------|
| Active 状态 checkbox | 切换 checkbox 状态 |
| 顾问分配 | 输入顾问 ID + 点击分配 |
| 文档下载按钮 | 下载按钮可见（不真下载） |
| 降级 + 确认弹窗 | 点击降级 → 确认弹窗 → 取消 |

### E. ContactExpandPanel 补全（1 个缺失交互）

在现有 `frontend/e2e/admin/contacts.spec.ts` 中追加：

| 缺失交互 | 测试描述 |
|----------|----------|
| 升级学生 + 确认弹窗 | 点击升级 → 确认弹窗 → 取消 |

### F. ConfigEditDialog（web-settings 中使用）

在现有 `frontend/e2e/admin/web-settings-full.spec.ts` 中追加：

测试点：
- 点击预览区域弹出编辑弹窗
- 弹窗显示文本输入框
- 修改文本后保存
- 弹窗关闭并预览更新

## 不需要补的

| 组件 | 原因 |
|------|------|
| ChangePhone | 组件不存在 |
| ContactForm | disabled 状态，按钮不可点 |
| MarkdownEditor/TiptapEditor | 已在 article-crud CRUD 流程中覆盖 |
| CasesPreview/NewsPreview | 只读展示，无交互 |
| `/api/version` | 基础设施接口，非用户功能 |

## 测试约定

- 遵循项目 E2E 测试规范（`.claude/rules/testing.md`）
- **每个测试目标至少 2 个正例 + 2 个反例**
- 覆盖率目标 **100%**（API 端点、页面路由、交互组件）
- 数据以 `E2E` 开头，global-teardown 清理
- 禁止 `waitForTimeout`，用条件等待
- 不修改/删除种子数据
- 确认弹窗测试选择"取消"而非"确认"，避免破坏测试数据

## 覆盖率统计机制

### G0. 前端单元测试覆盖率（Vitest）

`@vitest/coverage-v8` 已安装但未配置。在 `vitest.config.ts` 中启用。

**修改文件**：`frontend/vitest.config.ts`

```typescript
coverage: {
  provider: "v8",
  include: ["components/**", "lib/**", "hooks/**", "contexts/**"],
  exclude: ["**/*.test.*", "**/*.spec.*", "e2e/**"],
  reporter: ["text", "html"],
  reportsDirectory: "./coverage",
}
```

运行：`pnpm --prefix frontend test --coverage`

### E2E 覆盖率

三种覆盖率指标，每次跑完 E2E 自动生成报告。

### G1. API 端点覆盖率

后端共 73 个端点。在测试中收集所有 API 请求，与后端端点清单对比。

**实现方式**：

1. 新建 `frontend/e2e/fixtures/coverage.ts`，扩展 test fixture：
   - `beforeEach`：监听 `page.on("response")`，记录 `METHOD /api/path`
   - `afterAll`：收集所有 worker 的 API 调用，写入 `/tmp/e2e-api-calls.json`
2. 新建 `frontend/e2e/helpers/api-endpoints.ts`，列出后端全量端点（从 router 提取）
3. 在 `global-teardown.ts` 中对比已调用 vs 全量，输出未覆盖端点

**输出格式**：

```text
[API Coverage] 68/73 endpoints covered (93.2%)
Uncovered:
  - POST /api/portal/profile/two-factor/enable-totp
  - POST /api/portal/profile/two-factor/verify-totp
  ...
```

### G2. 页面路由覆盖率

前端共 35 个路由。收集测试中访问的所有页面 URL，与 Next.js 路由表对比。

**实现方式**：

1. 在 `coverage.ts` fixture 中监听 `page.on("framenavigated")`，记录 URL path
2. 路由表定义在 `frontend/e2e/helpers/page-routes.ts`，列出所有 `[locale]` 下的路由模式
3. URL 按模式匹配（`/zh/cases/xxx` 匹配 `/cases/[id]`）
4. `global-teardown` 输出未访问路由

**输出格式**：

```text
[Route Coverage] 33/35 routes visited (94.3%)
Unvisited:
  - /admin/documents
  - /life/[id]
```

### G3. 前端代码覆盖率（V8 Coverage）

使用 Playwright Chromium 内置 V8 Coverage API 收集 JS 执行覆盖率。

**实现方式**：

1. 在 `coverage.ts` fixture 中：
   - `beforeEach`：`page.coverage.startJSCoverage({ resetOnNavigation: false })`
   - `afterEach`：`page.coverage.stopJSCoverage()`，合并写入临时文件
2. `global-teardown` 合并所有覆盖数据，通过 `v8-to-istanbul` 转换格式
3. 用 `istanbul` / `c8` 生成 HTML 报告到 `frontend/e2e/coverage/`

**输出格式**：

```text
[Code Coverage] Statements: 82.3% | Branches: 71.5% | Functions: 78.9% | Lines: 83.1%
Report: frontend/e2e/coverage/index.html
```

**注意**：V8 覆盖率只覆盖浏览器端执行的代码，不含 SSR 服务端代码。覆盖率数据量大，默认只在 `E2E_COVERAGE=1` 时启用。

### 覆盖率收集架构

```text
test fixture (coverage.ts)
  ├── beforeEach: start JS coverage + attach listeners
  ├── afterEach: stop JS coverage + flush data
  └── 写入 /tmp/e2e-coverage-*.json

global-teardown.ts
  ├── 读取所有 coverage 临时文件
  ├── API 覆盖率对比 → 输出未覆盖端点
  ├── 路由覆盖率对比 → 输出未访问路由
  └── JS 覆盖率合并 → 生成 istanbul 报告（可选）
```

## 安全测试补全

### H. JWT 安全测试

在现有 `frontend/e2e/admin/security.spec.ts` 或新建 spec 中补充：

| 测试 | 正例 | 反例 |
|------|------|------|
| 篡改 JWT | 有效 token 正常访问 | 修改 payload 后返回 401 |
| 过期 JWT | 未过期 token 正常访问 | 过期 token 返回 401 `ACCESS_TOKEN_EXPIRED` |
| 缺失 JWT | — | 无 cookie 返回 401 `ACCESS_TOKEN_MISSING` |
| 无效格式 JWT | — | 随机字符串 token 返回 401 `TOKEN_INVALID` |

### I. IDOR（越权访问）测试

新建 `backend/api/tests/e2e/test_idor.py` 或 `frontend/e2e/admin/idor.spec.ts`：

| 测试 | 正例 | 反例 |
|------|------|------|
| 文档访问 | 用户访问自己的文档成功 | 用户 A 访问用户 B 的文档被拒（403/404） |
| 文档删除 | 用户删除自己的文档成功 | 用户 A 删除用户 B 的文档被拒 |
| 个人资料 | 用户读取自己的 profile 成功 | 无法通过 API 读取其他用户的 profile |

### J. 跨角色访问测试

| 测试 | 正例 | 反例 |
|------|------|------|
| student → admin | admin 用户访问 admin 端点成功 | student 用户访问 admin 端点返回 403 |
| visitor → portal | portal 用户访问 portal 端点成功 | visitor 用户访问受限 portal 端点返回 403 |

### K. 禁用用户测试

| 测试 | 正例 | 反例 |
|------|------|------|
| 活跃用户 | is_active=true 正常访问 | is_active=false 返回 401 `USER_DISABLED` |
| 禁用后续签 | — | 禁用用户 refresh token 续签失败 |

### L. 限流边界测试

| 测试 | 正例 | 反例 |
|------|------|------|
| SMS 限流 | 前 5 次请求成功 | 第 6 次同 IP 返回 429 |
| 登录限流 | 前 10 次请求成功 | 第 11 次同 IP 返回 429 |

### M. 文件上传安全测试

| 测试 | 正例 | 反例 |
|------|------|------|
| 合法文件 | 上传 PDF/图片成功 | 上传 exe/sh 被拒 |
| 文件大小 | 上传小文件成功 | 超过 20MB 被拒 |

### N. 2FA 登录验证码测试

| 测试 | 正例 | 反例 |
|------|------|------|
| 正确验证码 | 2FA 验证通过，登录成功 | 错误 TOTP 码返回 401 |
| 正确 SMS 码 | SMS 2FA 验证通过 | 错误 SMS 码返回 401 |

### O. Token 轮换测试

| 测试 | 正例 | 反例 |
|------|------|------|
| refresh 后获新 token | refresh 返回新 access_token | 旧 refresh_token 再次使用被拒 |

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `frontend/e2e/public/article-detail.spec.ts` | 4 个文章详情页 |
| 新建 | `frontend/e2e/admin/documents.spec.ts` | 管理员文档页 |
| 新建 | `frontend/e2e/fixtures/coverage.ts` | 覆盖率收集 fixture |
| 新建 | `frontend/e2e/helpers/api-endpoints.ts` | 后端全量端点清单 |
| 新建 | `frontend/e2e/helpers/page-routes.ts` | 前端全量路由清单 |
| 追加 | `frontend/e2e/admin/user-actions.spec.ts` | 删除用户、状态切换 |
| 追加 | `frontend/e2e/admin/students.spec.ts` | checkbox、顾问、降级 |
| 追加 | `frontend/e2e/admin/contacts.spec.ts` | 升级学生 |
| 追加 | `frontend/e2e/admin/web-settings-full.spec.ts` | ConfigEditDialog |
| 修改 | `frontend/e2e/global-teardown.ts` | 覆盖率报告输出 |
| 修改 | `frontend/e2e/playwright.config.ts` | 引入 coverage fixture |
| 修改 | `frontend/vitest.config.ts` | 启用 V8 覆盖率 |
| 新建 | `frontend/e2e/admin/security-jwt.spec.ts` | JWT 篡改/过期/缺失/无效 |
| 新建 | `backend/api/tests/e2e/test_idor.py` | IDOR 越权访问 |
| 新建 | `backend/api/tests/e2e/test_cross_role.py` | 跨角色访问 |
| 追加 | `frontend/e2e/admin/security.spec.ts` | 禁用用户、限流边界、文件上传安全、2FA 错误码、Token 轮换 |
