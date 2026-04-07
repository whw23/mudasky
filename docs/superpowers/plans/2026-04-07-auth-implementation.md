# 登录注册 + OpenResty JWT 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的登录注册流程——OpenResty JWT Cookie
生成、后端适配、前端登录 Modal + 注册页、AuthContext 改造，
端到端跑通。

**Architecture:** OpenResty 拦截 auth 响应生成 JWT +
Set-Cookie，后端只返回用户信息不碰 JWT，前端通过 AuthContext
管理登录状态（请求 /api/users/me 获取用户信息，不用
localStorage）。

**Tech Stack:** OpenResty (lua-resty-jwt), FastAPI, Next.js,
shadcn/ui, axios

**Spec:**
`docs/superpowers/specs/2026-04-07-auth-implementation-design.md`

---

## 文件结构总览

### 网关（修改）

| 文件路径 | 操作 | 职责 |
| --- | --- | --- |
| `gateway/lua/jwt_cookie.lua` | 重写 | JWT 生成 + Set-Cookie |
| `gateway/conf.d/server.conf` | 修改 | 拆分 header_filter + body_filter |

### 后端（修改）

| 文件路径 | 操作 | 职责 |
| --- | --- | --- |
| `backend/shared/src/app/user/models.py` | 修改 | 添加 is_superuser 字段，phone 改为 nullable |
| `backend/shared/src/app/user/schemas.py` | 修改 | UserResponse 添加 group_ids，去掉 role |
| `backend/shared/src/app/auth/router.py` | 修改 | refresh 改为从请求头读 token_hash |
| `backend/shared/src/app/auth/schemas.py` | 修改 | 去掉 RefreshRequest |
| `backend/api/scripts/init_superuser.py` | 创建 | Superuser 自动创建脚本 |
| `backend/api/scripts/start.sh` | 修改 | 迁移后调用 init_superuser |

### 前端（修改/创建）

| 文件路径 | 操作 | 职责 |
| --- | --- | --- |
| `frontend/types/index.ts` | 重写 | 修正类型定义匹配后端 |
| `frontend/contexts/AuthContext.tsx` | 重写 | 去掉 localStorage，改为请求后端 |
| `frontend/hooks/use-auth.ts` | 修改 | 适配新 AuthContext |
| `frontend/components/auth/LoginModal.tsx` | 创建 | 登录弹窗（三种方式 + 2FA） |
| `frontend/components/auth/SmsCodeButton.tsx` | 创建 | 发送验证码按钮（60 秒倒计时） |
| `frontend/app/(auth)/register/page.tsx` | 重写 | 注册表单 |
| `frontend/app/layout.tsx` | 修改 | 挂载 LoginModal |
| `frontend/components/layout/Header.tsx` | 修改 | 登录按钮触发 Modal |
| `frontend/lib/api.ts` | 修改 | 添加 X-Keep-Login 支持 |

---

## Task 1: 后端 User 模型 + Schema 适配

**Files:**

- Modify: `backend/shared/src/app/user/models.py`
- Modify: `backend/shared/src/app/user/schemas.py`

- [ ] **Step 1: User 模型添加 is_superuser，phone 改为 nullable**

在 `models.py` 中：

- 添加 `is_superuser: Mapped[bool]` 字段（default=False）
- `phone` 改为 `nullable=True`（superuser 没有手机号）

- [ ] **Step 2: UserResponse 添加 group_ids + is_superuser**

在 `schemas.py` 的 `UserResponse` 中：

- 添加 `is_superuser: bool`
- 添加 `group_ids: list[str] = []`（权限组表未实现，先空数组）
- 保留 `role` 字段（暂时兼容）

- [ ] **Step 3: 生成数据库迁移**

```bash
cd d:/Code/mudasky/backend/api
DB_HOST=localhost DB_PASSWORD=dev-password-change-me \
  uv run alembic revision --autogenerate \
  -m "user 添加 is_superuser, phone 改为 nullable"
DB_HOST=localhost DB_PASSWORD=dev-password-change-me \
  uv run alembic upgrade head
```

- [ ] **Step 4: 提交**

```bash
cd d:/Code/mudasky
git add backend/shared/src/app/user/ backend/api/alembic/
git commit -m "feat: User 模型添加 is_superuser，phone 改为 nullable"
```

---

## Task 2: 后端 refresh 接口适配 + superuser 初始化

**Files:**

- Modify: `backend/shared/src/app/auth/router.py`
- Modify: `backend/shared/src/app/auth/schemas.py`
- Create: `backend/api/scripts/init_superuser.py`
- Modify: `backend/api/scripts/start.sh`

- [ ] **Step 1: auth router 的 refresh 改为从请求头读 hash**

```python
@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    session: DbSession,
    x_refresh_token_hash: str = Header(...),
) -> AuthResponse:
    """刷新令牌续签（token hash 由网关注入）。"""
    svc = AuthService(session)
    user = await svc.refresh(x_refresh_token_hash)
    return AuthResponse(
        user=UserResponse.model_validate(user)
    )
```

从 `fastapi` 导入 `Header`。去掉 `RefreshRequest` 的 import
和使用。

- [ ] **Step 2: auth schemas 中去掉 RefreshRequest**

删除 `RefreshRequest` 类（不再需要请求体）。

- [ ] **Step 3: 创建 init_superuser.py**

```python
"""初始化超级管理员账号。

首次启动时自动创建，如已存在则跳过。
"""

import asyncio
import logging

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.user.models import User

logger = logging.getLogger(__name__)

SUPERUSER_USERNAME = "mudasky"
SUPERUSER_PASSWORD = "mudasky@12321."


async def init_superuser() -> None:
    """检查并创建超级管理员。"""
    async with async_session_factory() as session:
        from sqlalchemy import select

        stmt = select(User).where(User.is_superuser.is_(True))
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("超级管理员已存在，跳过创建")
            return

        superuser = User(
            username=SUPERUSER_USERNAME,
            password_hash=hash_password(SUPERUSER_PASSWORD),
            is_superuser=True,
            is_active=True,
        )
        session.add(superuser)
        await session.commit()
        logger.info("超级管理员创建成功: %s", SUPERUSER_USERNAME)


if __name__ == "__main__":
    from app.core.logging import setup_logging

    setup_logging()
    asyncio.run(init_superuser())
```

File: `backend/api/scripts/init_superuser.py`

- [ ] **Step 4: 修改 start.sh 调用 init_superuser**

```bash
#!/bin/bash
set -e
echo "执行数据库迁移..."
alembic upgrade head
echo "初始化超级管理员..."
python -m scripts.init_superuser
echo "启动应用..."
exec uvicorn api.main:app --host 0.0.0.0 --port 8000
```

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky
git add backend/shared/src/app/auth/ backend/api/scripts/
git commit -m "feat: refresh 改为请求头传递 + superuser 自动创建"
```

---

## Task 3: OpenResty jwt_cookie.lua 实现

**Files:**

- Rewrite: `gateway/lua/jwt_cookie.lua`
- Modify: `gateway/conf.d/server.conf`

- [ ] **Step 1: 重写 jwt_cookie.lua**

需要拆为两个文件（header_filter 和 body_filter 需要分开）。
或者用 nginx 变量在两个阶段之间传递状态。

实际上 server.conf 当前用 `header_filter_by_lua_file` 指向
jwt_cookie.lua。需要改为使用 `body_filter_by_lua_file` 来
处理响应体，以及 `header_filter_by_lua_block` 来清除
Content-Length。

修改 `server.conf` 的 auth location：

```nginx
location ~ ^/api/auth/(login|register|refresh)$ {
  access_by_lua_file /usr/local/openresty/nginx/lua/auth.lua;

  proxy_pass http://backend;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;

  # 缓冲完整响应体
  proxy_buffering on;

  # 清除 Content-Length 以便缓冲
  header_filter_by_lua_block {
    if ngx.status == 200 then
      ngx.header.content_length = nil
    end
  }

  # 拦截响应体，生成 JWT，设置 Cookie
  body_filter_by_lua_file /usr/local/openresty/nginx/lua/jwt_cookie.lua;
}
```

- [ ] **Step 2: 实现 jwt_cookie.lua（body_filter 阶段）**

```lua
--- JWT Cookie 生成模块。
-- 在 body_filter 阶段拦截登录/注册/续签的响应体，
-- 解析用户信息，生成 JWT 并设置 Set-Cookie。

local jwt = require("resty.jwt")
local cjson = require("cjson.safe")
local config = require("init")

-- 只处理 200 响应
if ngx.status ~= 200 then
  return
end

-- 收集响应体分块
local ctx = ngx.ctx
if not ctx.response_body then
  ctx.response_body = {}
end

local chunk = ngx.arg[1]
if chunk and chunk ~= "" then
  table.insert(ctx.response_body, chunk)
end

-- 如果不是最后一块，继续收集
if not ngx.arg[2] then
  ngx.arg[1] = nil
  return
end

-- 最后一块，拼接完整响应体
local body = table.concat(ctx.response_body)
ngx.arg[1] = body

-- 解析 JSON
local data = cjson.decode(body)
if not data or not data.user then
  return
end

-- 2FA 流程：step 不为空时不设 Cookie
if data.step then
  return
end

local user = data.user
local jwt_secret = config.get_jwt_secret()
local now = ngx.time()

-- 生成 access_token
local access_expire = config.get_access_expire_seconds()
local access_payload = {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    group_ids = user.group_ids or {},
    is_active = user.is_active,
    type = "access",
    iat = now,
    exp = now + access_expire,
  },
}
local access_jwt = jwt:sign(jwt_secret, access_payload)

-- 生成 refresh_token
local refresh_expire = config.get_refresh_expire_seconds()
local refresh_payload = {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    type = "refresh",
    iat = now,
    exp = now + refresh_expire,
  },
}
local refresh_jwt = jwt:sign(jwt_secret, refresh_payload)

-- 读取 X-Keep-Login 请求头
local keep_login = ngx.req.get_headers()["X-Keep-Login"]
local keep = (keep_login ~= "false")

-- 设置 Cookie
local cookies = {}

-- access_token Cookie
local access_cookie = "access_token=" .. access_jwt
  .. "; Path=/; HttpOnly; SameSite=Strict"
  .. "; Max-Age=" .. access_expire
table.insert(cookies, access_cookie)

-- refresh_token Cookie
local refresh_cookie = "refresh_token=" .. refresh_jwt
  .. "; Path=/api/auth/refresh; HttpOnly; SameSite=Strict"
if keep then
  refresh_cookie = refresh_cookie
    .. "; Max-Age=" .. refresh_expire
end
table.insert(cookies, refresh_cookie)

ngx.header["Set-Cookie"] = cookies
```

File: `gateway/lua/jwt_cookie.lua`

- [ ] **Step 3: 修改 auth.lua 处理 refresh 路由的 token 转发**

在 `auth.lua` 中，对 `/api/auth/refresh` 路由，需要从 Cookie
读取 refresh_token，验签，算哈希，注入请求头：

在 auth.lua 的公开路由放行之后、普通认证逻辑之前，添加
refresh 特殊处理。

实际上 `/api/auth/refresh` 在白名单里（公开路由），auth.lua
直接放行了。需要在 server.conf 的 auth location 中额外处理。

更好的方案：为 refresh 单独写一个 lua 脚本
`gateway/lua/refresh_handler.lua`，在 access 阶段读取 Cookie
中的 refresh_token，验签，算哈希，注入请求头。

创建 `gateway/lua/refresh_handler.lua`：

```lua
--- Refresh token 处理模块。
-- 从 Cookie 读取 refresh_token JWT，验签，
-- 计算 SHA-256 哈希，注入 X-Refresh-Token-Hash 请求头。

local jwt = require("resty.jwt")
local config = require("init")
local resty_sha256 = require("resty.sha256")
local str = require("resty.string")

-- 只处理 refresh 路由
local uri = ngx.var.uri
if uri ~= "/api/auth/refresh" then
  return
end

-- 从 Cookie 读取 refresh_token
local cookie_header = ngx.var.http_cookie
if not cookie_header then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_MISSING"}')
  ngx.exit(401)
  return
end

local refresh_token
for pair in string.gmatch(cookie_header, "[^;]+") do
  local trimmed = string.gsub(pair, "^%s+", "")
  local k, v = string.match(trimmed, "^(.-)=(.+)$")
  if k == "refresh_token" then
    refresh_token = v
    break
  end
end

if not refresh_token then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_MISSING"}')
  ngx.exit(401)
  return
end

-- 验签
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, refresh_token)
if not jwt_obj.verified then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_INVALID"}')
  ngx.exit(401)
  return
end

if jwt_obj.payload.type ~= "refresh" then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_INVALID"}')
  ngx.exit(401)
  return
end

-- 计算 SHA-256 哈希
local sha256 = resty_sha256:new()
sha256:update(refresh_token)
local digest = sha256:final()
local token_hash = str.to_hex(digest)

-- 注入请求头
ngx.req.set_header("X-Refresh-Token-Hash", token_hash)
```

File: `gateway/lua/refresh_handler.lua`

- [ ] **Step 4: 更新 server.conf 拆分 refresh 路由**

```nginx
server {
  listen 80;
  server_name _;

  # refresh — 特殊处理（读 Cookie、验签、注入哈希）
  location = /api/auth/refresh {
    access_by_lua_file /usr/local/openresty/nginx/lua/refresh_handler.lua;

    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering on;
    header_filter_by_lua_block {
      if ngx.status == 200 then
        ngx.header.content_length = nil
      end
    }
    body_filter_by_lua_file /usr/local/openresty/nginx/lua/jwt_cookie.lua;
  }

  # 登录/注册 — 拦截响应添加 JWT Cookie
  location ~ ^/api/auth/(login|register)$ {
    access_by_lua_file /usr/local/openresty/nginx/lua/auth.lua;

    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering on;
    header_filter_by_lua_block {
      if ngx.status == 200 then
        ngx.header.content_length = nil
      end
    }
    body_filter_by_lua_file /usr/local/openresty/nginx/lua/jwt_cookie.lua;
  }

  # 其他 API 路由
  location /api/ {
    access_by_lua_file /usr/local/openresty/nginx/lua/auth.lua;
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # 前端
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky
git add gateway/
git commit -m "feat: 实现 jwt_cookie.lua JWT 生成 + refresh_handler.lua"
```

---

## Task 4: 前端类型定义修正 + AuthContext 改造

**Files:**

- Rewrite: `frontend/types/index.ts`
- Rewrite: `frontend/contexts/AuthContext.tsx`
- Modify: `frontend/hooks/use-auth.ts`
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: 修正 types/index.ts 匹配后端**

```typescript
/** 全局类型定义，与后端 schemas 对应。 */

export interface User {
  id: string
  phone: string | null
  username: string | null
  role: string
  is_active: boolean
  is_superuser: boolean
  two_factor_enabled: boolean
  storage_quota: number
  group_ids: string[]
  created_at: string
  updated_at: string | null
}

export interface Article {
  id: string
  title: string
  content: string
  summary: string | null
  cover_image: string | null
  category_id: string
  author_id: string
  status: 'draft' | 'pending' | 'published' | 'rejected'
  published_at: string | null
  created_at: string
  updated_at: string | null
}

export interface Document {
  id: string
  file_name: string
  file_hash: string
  mime_type: string
  file_size: number
  status: string
  created_at: string
  updated_at: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AuthResponse {
  user: User
  step: string | null
}
```

- [ ] **Step 2: 重写 AuthContext（请求后端，不用 localStorage）**

```tsx
'use client'

/**
 * 认证上下文。
 * 通过请求 /api/users/me 获取用户信息，不使用 localStorage。
 * 提供登录弹窗控制方法。
 */

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@/types'
import api from '@/lib/api'

export interface AuthContextType {
  /** 当前用户 */
  user: User | null
  /** 是否加载中 */
  loading: boolean
  /** 是否已登录 */
  isLoggedIn: boolean
  /** 刷新用户信息（登录/注册成功后调用） */
  fetchUser: () => Promise<void>
  /** 登出 */
  logout: () => void
  /** 是否显示登录弹窗 */
  loginModalOpen: boolean
  /** 打开登录弹窗 */
  showLoginModal: () => void
  /** 关闭登录弹窗 */
  hideLoginModal: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  /** 从后端获取当前用户信息 */
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/users/me')
      setUser(res.data)
    } catch {
      setUser(null)
    }
  }, [])

  /** 初始化：尝试获取用户信息 */
  useEffect(() => {
    fetchUser().finally(() => setLoading(false))
  }, [fetchUser])

  /** 登出 */
  const logout = useCallback(() => {
    // TODO: 调后端登出接口清除 Cookie
    setUser(null)
  }, [])

  const showLoginModal = useCallback(() => {
    setLoginModalOpen(true)
  }, [])

  const hideLoginModal = useCallback(() => {
    setLoginModalOpen(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        fetchUser,
        logout,
        loginModalOpen,
        showLoginModal,
        hideLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 3: 更新 use-auth.ts**

```typescript
'use client'

import { useContext } from 'react'
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext'

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }
  return ctx
}
```

- [ ] **Step 4: api.ts 添加 X-Keep-Login 支持**

在 api.ts 中导出一个 `setKeepLogin` 函数，让登录组件可以
动态设置该请求头：

```typescript
/** 设置是否保持登录（影响后续请求的 X-Keep-Login 头） */
let keepLogin = true

export function setKeepLogin(value: boolean) {
  keepLogin = value
}

// 在请求拦截器中添加：
api.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  config.headers['X-Keep-Login'] = keepLogin ? 'true' : 'false'
  return config
})
```

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky
git add frontend/types/ frontend/contexts/ frontend/hooks/ frontend/lib/
git commit -m "feat: 修正类型定义 + AuthContext 改为请求后端"
```

---

## Task 5: 前端验证码按钮组件

**Files:**

- Create: `frontend/components/auth/SmsCodeButton.tsx`

- [ ] **Step 1: 实现 SmsCodeButton**

```tsx
'use client'

/**
 * 发送验证码按钮。
 * 点击后发送短信验证码，按钮变为 60 秒倒计时。
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

interface SmsCodeButtonProps {
  /** 手机号 */
  phone: string
  /** 是否禁用（手机号为空时） */
  disabled?: boolean
}

export function SmsCodeButton({ phone, disabled }: SmsCodeButtonProps) {
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSend = useCallback(async () => {
    if (!phone || sending || countdown > 0) return
    setSending(true)
    try {
      await api.post('/auth/sms-code', { phone })
      setCountdown(60)
    } catch (err: any) {
      const msg = err.response?.data?.message || '发送失败'
      alert(msg)
    } finally {
      setSending(false)
    }
  }, [phone, sending, countdown])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || sending || countdown > 0 || !phone}
      onClick={handleSend}
      className="w-28 shrink-0"
    >
      {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '发送验证码'}
    </Button>
  )
}
```

- [ ] **Step 2: 提交**

```bash
cd d:/Code/mudasky
git add frontend/components/auth/
git commit -m "feat: 添加短信验证码发送按钮组件"
```

---

## Task 6: 前端登录 Modal

**Files:**

- Create: `frontend/components/auth/LoginModal.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/components/layout/Header.tsx`

- [ ] **Step 1: 实现 LoginModal**

使用 shadcn Dialog + Tabs，三种登录方式 + 2FA 流程。
文件放在 `frontend/components/auth/LoginModal.tsx`。

关键点：

- 使用 `useAuth().loginModalOpen` 控制显示
- Tab 切换：手机号+验证码、用户名+密码、手机号+密码
- 保持登录 Checkbox（调用 `setKeepLogin`）
- step="2fa_required" 时切换到 2FA 界面
- 成功后调用 `fetchUser()` + `hideLoginModal()`
- 底部"没有账号？去注册" Link

- [ ] **Step 2: 修改 app/layout.tsx 挂载 LoginModal**

在 `AuthProvider` 内部添加 `<LoginModal />`。

- [ ] **Step 3: 修改 Header.tsx 的登录按钮**

将 Header 中的 `<Link href="/login">` 改为
`onClick={() => showLoginModal()}`。

- [ ] **Step 4: 提交**

```bash
cd d:/Code/mudasky
git add frontend/components/auth/LoginModal.tsx \
  frontend/app/layout.tsx \
  frontend/components/layout/Header.tsx
git commit -m "feat: 实现登录 Modal（三种方式 + 2FA）"
```

---

## Task 7: 前端注册页

**Files:**

- Rewrite: `frontend/app/(auth)/register/page.tsx`

- [ ] **Step 1: 实现注册表单**

使用 shadcn Card + Input + Button + Label。

字段：手机号（必填）、验证码（必填，SmsCodeButton）、
用户名（可选）、密码（可选）、确认密码（填了密码才显示）。

注册成功后调用 `fetchUser()` + `router.push('/')`。

- [ ] **Step 2: 提交**

```bash
cd d:/Code/mudasky
git add frontend/app/\(auth\)/register/
git commit -m "feat: 实现注册页面表单"
```

---

## Task 8: 端到端联调验证

- [ ] **Step 1: 确保数据库服务在运行**

```bash
cd d:/Code/mudasky && docker compose up db -d
```

- [ ] **Step 2: 重新构建并启动所有服务**

```bash
cd d:/Code/mudasky
docker compose down
docker compose up db api gateway frontend --build -d
```

- [ ] **Step 3: 等待服务就绪后验证**

```bash
# 健康检查
curl http://localhost:8000/api/health

# 发送验证码（开发模式会打印到日志）
curl -X POST http://localhost:8000/api/auth/sms-code \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"phone":"13800138000"}'

# 查看日志获取验证码
docker logs mudasky-api-1 2>&1 | grep "验证码"
```

- [ ] **Step 4: 测试注册流程**

打开浏览器 http://localhost:3000/register，填写手机号，
发送验证码（从日志获取），注册。验证 Cookie 是否设置。

- [ ] **Step 5: 测试登录流程**

点击 Header 的登录按钮，验证 Modal 弹出，
用刚注册的手机号+验证码登录。

- [ ] **Step 6: 测试 superuser 登录**

用用户名 `mudasky` + 密码 `mudasky@12321.` 登录。

- [ ] **Step 7: 提交**

```bash
cd d:/Code/mudasky
git add -A
git commit -m "chore: 登录注册功能联调完成"
```
