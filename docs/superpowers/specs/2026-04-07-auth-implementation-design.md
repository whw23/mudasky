# 登录注册 + OpenResty JWT 实现设计

## 背景

后端 auth 骨架代码（service/router/models）和网关 JWT 验签（auth.lua）已实现。需要补全：

1. OpenResty jwt_cookie.lua — 拦截登录/注册/续签响应，生成 JWT，设置 Cookie
2. 前端登录/注册页面 — 三种登录方式 + 2FA + 注册表单
3. 后端 refresh 接口适配 — 从 Cookie 读取 refresh token

## 实现范围

### 不含（已完成）

- 后端 auth service/router/models — 已实现
- 网关 auth.lua JWT 验签 — 已实现
- 前端 API 封装（axios 拦截器）— 已实现
- 前端 AuthContext — 已实现

### 需实现

- gateway/lua/jwt_cookie.lua — JWT 生成 + Set-Cookie
- 前端登录页（三种方式 + 2FA）
- 前端注册页
- 后端 refresh 接口适配
- 端到端联调验证

---

## 1. OpenResty jwt_cookie.lua

### 1.1 职责

拦截 `/api/auth/(login|register|refresh)` 的**成功响应**（200），解析后端返回的用户信息，生成 JWT 并设置 Cookie。

### 1.2 流程

```text
1. 后端返回 200 + {"user": {...}, "step": null}
2. body_filter 阶段收集完整响应体
3. 解析 JSON
4. 如果 step = "2fa_required" → 直接透传，不设 Cookie
5. 提取 user 信息
6. 生成 access_token JWT:
   - claims: {sub: user_id, group_ids: [], is_active: true, type: "access"}
   - 过期: ACCESS_TOKEN_EXPIRE_MINUTES（默认 15 分钟）
7. 生成 refresh_token JWT:
   - claims: {sub: user_id, type: "refresh"}
   - 过期: REFRESH_TOKEN_EXPIRE_DAYS（默认 30 天）
8. 读取请求头 X-Keep-Login
9. 设置 Set-Cookie:
   - access_token: HttpOnly, SameSite=Strict, Path=/, max-age=15*60
   - refresh_token: HttpOnly, SameSite=Strict, Path=/api/auth/refresh
     - X-Keep-Login=true → max-age=30*86400
     - X-Keep-Login=false → 不设 max-age（会话级）
10. 响应体保持不变（前端可用于即时显示）
```

### 1.3 实现方式

需要拆分为两个阶段：

- **header_filter_by_lua**: 清除 Content-Length（因为不修改响应体大小，但需要缓冲完整响应体）
- **body_filter_by_lua**: 收集响应体分块，完整后解析 JSON、生成 JWT、设置 Cookie

### 1.4 JWT Claims 结构

**access_token:**

```json
{
  "sub": "user-uuid",
  "group_ids": ["group-uuid-1", "group-uuid-2"],
  "is_active": true,
  "type": "access",
  "iat": 1712000000,
  "exp": 1712000900
}
```

注意：当前权限组表尚未实现，`group_ids` 暂时返回空数组 `[]`。

**refresh_token:**

```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1712000000,
  "exp": 1714592000
}
```

### 1.5 Cookie 属性

- `access_token`: Path=`/`, HttpOnly, SameSite=Strict, max-age=15\*60
- `refresh_token`: Path=`/api/auth/refresh`, HttpOnly,
  SameSite=Strict, max-age 取决于 X-Keep-Login
- Secure: 生产环境 true，开发环境 false（HTTP 下浏览器不设置 Secure Cookie）

开发环境（HTTP）下 Secure=false，否则浏览器不会设置 Cookie。通过环境变量或检测 scheme 判断。

---

## 2. 后端适配

### 2.1 refresh 接口

当前 `POST /api/auth/refresh` 接收 `token_hash` 参数。需要改为：

- OpenResty 从 Cookie 读取 refresh_token JWT
- OpenResty 验证 refresh_token JWT 签名和过期时间
- OpenResty 计算 token 的 SHA-256 哈希
- OpenResty 将哈希通过请求头 `X-Refresh-Token-Hash` 传给后端
- 后端根据哈希查库验证、轮换

### 2.2 登录响应中的 group_ids

后端返回的 user 信息需要包含 `group_ids` 字段（用于 JWT claims）。当前权限组表未实现，先返回空数组。

在 `UserResponse` schema 中添加 `group_ids: list[str] = []`。

### 2.3 Superuser 自动创建

API 服务启动时（`start.sh` 中，Alembic 迁移之后、uvicorn 启动之前）自动检查并创建 superuser：

- 查库检查是否已存在 `is_superuser=True` 的用户
- 不存在 → 创建 superuser 账号：
  - username: `mudasky`
  - password: `mudasky@12321.`（bcrypt 哈希存储）
  - is_superuser: True
  - is_active: True
  - phone: 不设置（superuser 通过用户名+密码登录）
- 已存在 → 跳过

初始密码硬编码在脚本中，首次登录后应立即修改。

实现为独立脚本 `backend/api/scripts/init_superuser.py`，由 `start.sh` 调用。

在 `UserResponse` schema 中添加 `group_ids: list[str] = []`。

---

## 3. 前端注册页

### 3.1 表单字段

- 手机号（必填）：11 位手机号
- 验证码（必填）：6 位数字
- 用户名（可选）：3-20 位
- 密码（可选）：6-20 位
- 确认密码（可选）：填了密码才显示

### 3.2 交互流程

1. 输入手机号 → 点击"发送验证码"按钮
2. 按钮变为 60 秒倒计时，倒计时结束恢复
3. 填写验证码 + 可选用户名密码
4. 点击注册 → POST /api/auth/register
5. 成功 → AuthContext.setUser(response.user) → 跳转首页
6. 失败 → 显示错误信息（如"手机号已注册"）

### 3.3 组件

- 使用 shadcn/ui: Card, Input, Button, Label
- 底部"已有账号？去登录" Link

---

## 4. 前端登录（全局 Modal）

登录使用全局 Modal（shadcn Dialog），不离开当前页面。

### 4.1 组件结构

- `components/auth/LoginModal.tsx` — 登录弹窗组件
- 由 Header 的"登录"按钮触发，或 401 被拦截时自动弹出
- 使用 AuthContext 中的 `showLoginModal` / `hideLoginModal` 控制显示

### 4.2 三种方式 Tab 切换

使用 shadcn/ui Tabs 组件，三个 Tab：

#### Tab 1: 手机号 + 验证码

- 手机号输入框
- 验证码输入框 + 发送验证码按钮（60 秒倒计时）
- 登录按钮

#### Tab 2: 用户名 + 密码

- 用户名输入框
- 密码输入框（带显示/隐藏切换）
- 登录按钮

#### Tab 3: 手机号 + 密码

- 手机号输入框
- 密码输入框（带显示/隐藏切换）
- 登录按钮

### 4.3 保持登录

- 底部 Checkbox："保持登录"（默认勾选）
- 发送请求时添加请求头 `X-Keep-Login: true/false`

### 4.4 2FA 流程

当后端返回 `{"step": "2fa_required"}` 时：

1. Modal 内容切换为 2FA 验证界面
2. 选择验证方式：短信验证码 / Authenticator
3. 输入验证码
4. 点击确认 → 重新提交 login 请求（原参数 + totp 或 sms_code_2fa）
5. 成功 → 关闭 Modal → 存用户信息 → 页面刷新数据

### 4.5 其他

- 底部"没有账号？去注册" Link（跳转到 /register 独立页面，关闭 Modal）
- 登录成功后不跳转，关闭 Modal 即可（用户停留在当前页面）
- LoginModal 挂载在根布局（app/layout.tsx）中，所有页面可用

---

## 5. AuthContext 改造

现有 AuthContext 使用 localStorage 持久化用户信息，需要改为：

- 初始化时调用 `GET /api/users/me` 获取当前用户信息
- 有 Cookie → 网关验签通过 → 后端返回用户信息 → 已登录
- 无 Cookie 或 401 → 未登录
- 不再使用 localStorage 存储用户信息
- 登录/注册成功后调用 `fetchUser()` 刷新用户信息
- 新增 `showLoginModal` / `hideLoginModal` 方法控制登录弹窗
- 提供 `isLoggedIn`、`user`、`loading` 状态

---

## 6. 端到端流程验证

### 注册流程

```text
浏览器 → POST /api/auth/sms-code {phone} → 网关透传 → 后端发短信 → 返回成功
浏览器 → POST /api/auth/register {phone, code, username?, password?}
  → 网关透传 → 后端验证码校验 + 创建用户 → 返回 {user, step: null}
  → jwt_cookie.lua 拦截 → 生成 JWT → Set-Cookie
  → 浏览器收到用户信息 + Cookie 自动设置
  → 前端 AuthContext 设置用户信息 → 跳转首页
```

### 登录流程（手机号+验证码）

```text
浏览器 → POST /api/auth/sms-code {phone} → 发验证码
浏览器 → POST /api/auth/login {phone, code}
  → 后端验证 → 返回 {user, step: null}
  → jwt_cookie.lua 生成 JWT + Set-Cookie
  → 前端存用户信息 → 跳转
```

### 登录流程（用户名+密码，开启 2FA）

```text
浏览器 → POST /api/auth/login {username, password}
  → 后端验密码 → 用户开启了 2FA → 自动发短信 → 返回 {user, step: "2fa_required"}
  → jwt_cookie.lua 检测到 step 不为 null → 不设 Cookie，直接透传
  → 前端弹出 2FA Dialog
浏览器 → POST /api/auth/login {username, password, sms_code_2fa: "123456"}
  → 后端验证 2FA → 返回 {user, step: null}
  → jwt_cookie.lua 生成 JWT + Set-Cookie
  → 前端关闭 Dialog → 存用户信息 → 跳转
```

### 续签流程

```text
浏览器发请求 → 网关验 JWT → access_token 过期 → 返回 401 TOKEN_EXPIRED
前端 axios 拦截器 → 自动 POST /api/auth/refresh
  → 网关从 Cookie 读 refresh_token → 验签 → 算哈希 → X-Refresh-Token-Hash 头传后端
  → 后端验哈希 + 轮换 + 查用户状态 → 返回 {user}
  → jwt_cookie.lua 生成新 JWT + Set-Cookie
  → 前端 AuthContext 更新用户信息 → 重试原请求
```
