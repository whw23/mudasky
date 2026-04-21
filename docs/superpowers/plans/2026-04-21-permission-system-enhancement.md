# 权限系统增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强权限管理系统：后端权限树去重全中文、网关和前端 module 级重定向、前端 Miller Columns 权限选择器。

**Architecture:** 后端通过 `router.label` 和 router 树遍历构建无重复的全中文权限树。网关 `page_guard.lua` 和前端 `PanelGuard` 同时做 module 级权限校验。前端 PermissionTree 替换为 Miller Columns 无限层级分栏布局，支持通配符自动折叠/展开。

**Tech Stack:** Python/FastAPI, Lua/OpenResty, React/TypeScript, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-21-permission-system-enhancement-design.md`

---

## File Structure

### 后端

| 文件 | 操作 | 职责 |
|------|------|------|
| `backend/api/api/admin/user/router.py` | 修改 | 加 `router.label = "用户管理"` |
| `backend/api/api/admin/rbac/router.py` | 修改 | 加 `router.label = "角色管理"` |
| `backend/api/api/admin/contacts/router.py` | 修改 | 加 `router.label = "访客联系"` |
| `backend/api/api/admin/students/router.py` | 修改 | 加 `router.label = "学生管理"` |
| `backend/api/api/admin/config/router.py` | 修改 | general_settings_router/web_settings_router 加 label |
| `backend/api/api/admin/config/web_settings/articles/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/categories/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/universities/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/cases/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/nav/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/disciplines/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/banners/router.py` | 修改 | 加 label |
| `backend/api/api/admin/config/web_settings/images/router.py` | 修改 | 加 label |
| `backend/api/api/portal/document/router.py` | 修改 | 加 label |
| `backend/api/api/portal/profile/router.py` | 修改 | 加 label |
| `backend/api/api/portal/profile/sessions/router.py` | 修改 | 加 label |
| `backend/api/api/portal/profile/two_factor/router.py` | 修改 | 加 label |
| `backend/api/api/admin/__init__.py` | 修改 | 加 `router.label = "管理后台"` |
| `backend/api/api/portal/__init__.py` | 修改 | 加 `router.label = "用户面板"` |
| `backend/api/api/portal/profile/__init__.py` | 修改 | 加 `router.label = "个人资料"` |
| `backend/api/api/admin/config/__init__.py` | 修改 | 加 `router.label = "系统设置"` |
| `backend/api/api/core/permission_tree.py` | 重写 | 遍历 router 树构建权限树 |

### 网关

| 文件 | 操作 | 职责 |
|------|------|------|
| `gateway/lua/page_guard.lua` | 修改 | 增加 module 级权限校验和重定向 |

### 前端

| 文件 | 操作 | 职责 |
|------|------|------|
| `frontend/components/layout/PanelGuard.tsx` | 修改 | MODULE_PERMISSIONS 替代 PANEL_ROUTES |
| `frontend/components/admin/PermissionTree.tsx` | 重写 | Miller Columns 无限层级分栏 |
| `frontend/components/admin/RoleDialog.tsx` | 修改 | 通配符折叠逻辑 |

---

### Task 1: 为所有 admin/portal router 添加 label

**Files:**
- Modify: `backend/api/api/admin/user/router.py:22-25`
- Modify: `backend/api/api/admin/rbac/router.py:20`
- Modify: `backend/api/api/admin/contacts/router.py:21`
- Modify: `backend/api/api/admin/students/router.py:22`
- Modify: `backend/api/api/admin/config/router.py:21-29`
- Modify: `backend/api/api/admin/config/web_settings/articles/router.py`
- Modify: `backend/api/api/admin/config/web_settings/categories/router.py`
- Modify: `backend/api/api/admin/config/web_settings/universities/router.py`
- Modify: `backend/api/api/admin/config/web_settings/cases/router.py`
- Modify: `backend/api/api/admin/config/web_settings/nav/router.py`
- Modify: `backend/api/api/admin/config/web_settings/disciplines/router.py`
- Modify: `backend/api/api/admin/config/web_settings/banners/router.py`
- Modify: `backend/api/api/admin/config/web_settings/images/router.py`
- Modify: `backend/api/api/portal/document/router.py`
- Modify: `backend/api/api/portal/profile/router.py`
- Modify: `backend/api/api/portal/profile/sessions/router.py`
- Modify: `backend/api/api/portal/profile/two_factor/router.py`
- Modify: `backend/api/api/admin/__init__.py:13`
- Modify: `backend/api/api/portal/__init__.py:10`
- Modify: `backend/api/api/portal/profile/__init__.py:11`
- Modify: `backend/api/api/admin/config/__init__.py`

- [ ] **Step 1: 为 admin 面板主 router 和子 router 添加 label**

在每个 router 定义后紧跟一行 `router.label = "中文名"`。

`backend/api/api/admin/__init__.py` — 在 `router = APIRouter(prefix="/admin")` 之后加：
```python
router.label = "管理后台"
```

`backend/api/api/admin/user/router.py` — 在 router 定义后加：
```python
router.label = "用户管理"
```

`backend/api/api/admin/rbac/router.py` — 在 router 定义后加：
```python
router.label = "角色管理"
```

`backend/api/api/admin/contacts/router.py` — 在 router 定义后加：
```python
router.label = "访客联系"
```

`backend/api/api/admin/students/router.py` — 在 router 定义后加：
```python
router.label = "学生管理"
```

`backend/api/api/admin/config/__init__.py` — 在 `from .router import router` 之后加：
```python
router.label = "系统设置"
```

`backend/api/api/admin/config/router.py` — 在 `router = APIRouter(...)` 之后不加 label（`router` 无 prefix，是纯挂载点）。在 `general_settings_router` 和 `web_settings_router` 定义后加：
```python
general_settings_router.label = "通用配置"
```
```python
web_settings_router.label = "网站设置"
```

`backend/api/api/admin/config/web_settings/articles/router.py` — 加 `router.label = "文章管理"`
`backend/api/api/admin/config/web_settings/categories/router.py` — 加 `router.label = "分类管理"`
`backend/api/api/admin/config/web_settings/universities/router.py` — 加 `router.label = "院校管理"`
`backend/api/api/admin/config/web_settings/cases/router.py` — 加 `router.label = "案例管理"`
`backend/api/api/admin/config/web_settings/nav/router.py` — 加 `router.label = "导航栏配置"`
`backend/api/api/admin/config/web_settings/disciplines/router.py` — 加 `router.label = "学科分类管理"`
`backend/api/api/admin/config/web_settings/banners/router.py` — 加 `router.label = "Banner 管理"`
`backend/api/api/admin/config/web_settings/images/router.py` — 加 `router.label = "图片上传"`

- [ ] **Step 2: 为 portal 面板主 router 和子 router 添加 label**

`backend/api/api/portal/__init__.py` — 在 `router = APIRouter(prefix="/portal")` 之后加：
```python
router.label = "用户面板"
```

`backend/api/api/portal/profile/__init__.py` — 在 `router = APIRouter(prefix="/profile")` 之后加：
```python
router.label = "个人资料"
```

`backend/api/api/portal/profile/router.py` — 该 router 无 prefix（是 profile 下的直接路由），不需要 label。

`backend/api/api/portal/document/router.py` — 加 `router.label = "文档管理"`
`backend/api/api/portal/profile/sessions/router.py` — 加 `router.label = "会话管理"`
`backend/api/api/portal/profile/two_factor/router.py` — 加 `router.label = "双因素认证"`

- [ ] **Step 3: 验证 label 添加无语法错误**

```bash
cd /home/whw23/code/mudasky && uv run --project backend/api python -c "from api.main import app; print('OK')"
```

Expected: `OK`（无 ImportError）

- [ ] **Step 4: Commit**

```bash
git add backend/api/api/
git commit -m "feat: 为 admin/portal router 添加 label 属性"
```

---

### Task 2: 重写 permission_tree.py

**Files:**
- Rewrite: `backend/api/api/core/permission_tree.py`

- [ ] **Step 1: 重写 permission_tree.py**

```python
"""权限树生成模块。

遍历 FastAPI router 树，结合 router.label 和端点 summary 构建权限树。
只包含 admin 和 portal 面板。
"""

from typing import Any

from fastapi import FastAPI
from fastapi.routing import APIRoute, APIRouter


def _get_label(router: APIRouter) -> str | None:
    """获取 router 的 label 属性。"""
    return getattr(router, "label", None)


def _walk_router(
    router: APIRouter,
    prefix: str,
    tree: dict[str, Any],
    openapi_map: dict[str, str],
) -> None:
    """递归遍历 router 树，构建权限树节点。"""
    for route in router.routes:
        if isinstance(route, APIRouter):
            sub_prefix = prefix + route.prefix.rstrip("/")
            label = _get_label(route)
            slug = route.prefix.strip("/")
            if not slug:
                _walk_router(route, prefix, tree, openapi_map)
                continue
            node: dict[str, Any] = {"description": label or slug}
            if slug not in tree:
                tree[slug] = node
            else:
                if label:
                    tree[slug]["description"] = label
                node = tree[slug]
            children = node.setdefault("children", {})
            _walk_router(route, sub_prefix, children, openapi_map)
            if not children:
                del node["children"]
        elif isinstance(route, APIRoute):
            full_path = prefix + route.path
            clean = full_path.lstrip("/")
            summary = openapi_map.get(clean, "")
            segments = route.path.strip("/")
            if segments:
                tree[segments] = {"description": summary or segments}
        else:
            sub_router = getattr(route, "app", None)
            if isinstance(sub_router, APIRouter):
                sub_prefix = prefix + route.path.rstrip("/")
                label = _get_label(sub_router)
                slug = route.path.strip("/")
                if not slug:
                    _walk_router(
                        sub_router, prefix, tree, openapi_map
                    )
                    continue
                node = {"description": label or slug}
                if slug not in tree:
                    tree[slug] = node
                else:
                    if label:
                        tree[slug]["description"] = label
                    node = tree[slug]
                children = node.setdefault("children", {})
                _walk_router(
                    sub_router, sub_prefix, children, openapi_map
                )
                if not children:
                    del node["children"]


def _build_openapi_map(app: FastAPI) -> dict[str, str]:
    """从 OpenAPI spec 构建 路径 → summary 映射。"""
    openapi = app.openapi()
    result: dict[str, str] = {}
    for path, methods in (openapi.get("paths") or {}).items():
        clean = path.lstrip("/")
        for method_info in methods.values():
            summary = method_info.get("summary", "")
            if summary:
                result[clean] = summary
    return result


def build_permission_tree(app: FastAPI) -> dict:
    """构建完整权限树。"""
    openapi_map = _build_openapi_map(app)
    tree: dict[str, Any] = {}

    for route in app.routes:
        sub_router = getattr(route, "app", None)
        if not isinstance(sub_router, APIRouter):
            continue
        slug = route.path.strip("/")
        if slug not in ("admin", "portal"):
            continue
        label = _get_label(sub_router)
        node: dict[str, Any] = {
            "description": label or slug,
            "children": {},
        }
        _walk_router(
            sub_router,
            "/" + slug,
            node["children"],
            openapi_map,
        )
        tree[slug] = node

    return tree
```

- [ ] **Step 2: 验证权限树生成**

```bash
cd /home/whw23/code/mudasky && uv run --project backend/api python -c "
from api.main import api
from api.core.permission_tree import build_permission_tree
import json
tree = build_permission_tree(api)
print(json.dumps(tree, ensure_ascii=False, indent=2)[:2000])
"
```

Expected: 输出 JSON 权限树，admin 和 portal 下所有节点都有中文 description，不再有重复节点。

- [ ] **Step 3: 检查无英文裸路径段**

目视检查输出中是否还有 `"description": "meta"` 或 `"description": "list"` 等英文路径段作为中间节点。如果有，说明遍历逻辑需要调整。

- [ ] **Step 4: Commit**

```bash
git add backend/api/api/core/permission_tree.py
git commit -m "feat: 重写权限树生成，遍历 router 树 + router.label"
```

---

### Task 3: 网关 page_guard.lua module 级 302

**Files:**
- Modify: `gateway/lua/page_guard.lua`

- [ ] **Step 1: 添加 has_permission 函数和 module 级校验**

在 `page_guard.lua` 中增加 `has_permission` 函数（与 `auth.lua` 中的相同逻辑），以及从 URI 提取 module 并做权限校验的逻辑。

完整替换 `page_guard.lua`：

```lua
--- 前端面板路由权限守卫。
-- 对 /admin/* 和 /portal/* 页面请求做 JWT 校验和权限检查。
-- 未登录 → 302 重定向首页；无面板权限 → 302 首页。
-- 有面板权限但无 module 权限 → 302 默认页；默认页也无权限 → 302 首页。

local jwt = require("resty.jwt")
local config = require("init")

local VALID_LOCALES = { zh = true, en = true, ja = true, de = true }

--- 从 Cookie 中提取指定 key 的值。
local function get_cookie(name)
  local cookie_header = ngx.var.http_cookie
  if not cookie_header then return nil end
  for pair in string.gmatch(cookie_header, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == name then return v end
  end
  return nil
end

--- 从 URI 中提取 locale 和面板类型。
-- /zh/admin/dashboard → "zh", "admin"
-- /admin/dashboard → "zh", "admin"（无 locale 时默认 zh）
local function extract_locale_and_panel(uri)
  local loc, panel = string.match(uri, "^/([a-z][a-z])/(admin)")
  if not loc then
    loc, panel = string.match(uri, "^/([a-z][a-z])/(portal)")
  end
  if not panel then
    panel = string.match(uri, "^/(admin)") or string.match(uri, "^/(portal)")
  end
  if loc and not VALID_LOCALES[loc] then loc = nil end
  return loc or "zh", panel
end

--- 从 URI 中提取 module 名（面板下的第一级子路由）。
-- /zh/admin/users → "users"
-- /zh/admin/users/detail → "users"
-- /zh/portal/profile → "profile"
local function extract_module(uri, locale, panel)
  local pattern
  if locale then
    pattern = "^/" .. locale .. "/" .. panel .. "/([^/]+)"
  else
    pattern = "^/" .. panel .. "/([^/]+)"
  end
  return string.match(uri, pattern)
end

--- 检查用户权限列表中是否有面板访问权。
local function has_panel_access(perms, panel)
  for _, p in ipairs(perms) do
    if p == "*" then return true end
    if p == panel .. "/*" then return true end
    if string.find(p, panel .. "/", 1, true) == 1 then return true end
  end
  return false
end

--- 检查用户是否拥有指定权限。
-- 支持通配符（path/*）和精确匹配，两者都包含祖先路径。
local function has_permission(user_perms, required)
  for _, p in ipairs(user_perms) do
    if p == "*" then return true end

    if string.sub(p, -2) == "/*" then
      local prefix = string.sub(p, 1, -2)
      if string.find(required, prefix, 1, true) == 1 then
        return true
      end
      if string.find(prefix, required .. "/", 1, true) == 1 then
        return true
      end
    else
      local target = p
      if string.sub(target, -1) == "/" then
        target = string.sub(target, 1, -2)
      end
      if required == target then
        return true
      end
      if string.find(target, required .. "/", 1, true) == 1 then
        return true
      end
    end
  end
  return false
end

--- 302 重定向。
local function redirect_to(path)
  ngx.redirect(path, 302)
end

-- 主逻辑
local uri = ngx.var.uri
local locale, panel = extract_locale_and_panel(uri)
if not panel then return end

local home = "/" .. locale

-- 读取 access_token
local access_token = get_cookie("access_token")
if not access_token then
  if get_cookie("refresh_token") then
    return
  end
  return redirect_to(home)
end

-- 验证 JWT（过期时放行，让前端 JS 通过 API 触发 refresh）
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, access_token)
if not jwt_obj.verified then
  local reason = jwt_obj.reason or ""
  if string.find(reason, "expired") then
    return
  end
  return redirect_to(home)
end

local payload = jwt_obj.payload

-- 用户未启用
if not payload.is_active then
  return redirect_to(home)
end

-- 面板级权限检查
local perms = payload.permissions or {}
if not has_panel_access(perms, panel) then
  return redirect_to(home)
end

-- module 级权限检查
local mod = extract_module(uri, locale, panel)
if mod then
  local required_perm = panel .. "/" .. mod
  if not has_permission(perms, required_perm) then
    local default_mod = (panel == "admin") and "dashboard" or "profile"
    local default_perm = panel .. "/" .. default_mod
    if mod ~= default_mod and has_permission(perms, default_perm) then
      return redirect_to("/" .. locale .. "/" .. panel .. "/" .. default_mod)
    else
      return redirect_to(home)
    end
  end
end
```

- [ ] **Step 2: 重启网关验证**

```bash
docker compose exec gateway openresty -t && docker compose exec gateway openresty -s reload
```

Expected: `nginx: the configuration file /usr/local/openresty/nginx/conf/nginx.conf syntax is ok`

- [ ] **Step 3: Commit**

```bash
git add gateway/lua/page_guard.lua
git commit -m "feat: 网关 page_guard module 级权限校验和重定向"
```

---

### Task 4: 前端 PanelGuard module 级重定向

**Files:**
- Modify: `frontend/components/layout/PanelGuard.tsx`

- [ ] **Step 1: 替换 PANEL_ROUTES 为 MODULE_PERMISSIONS，增加 module 级权限检查**

完整替换 `PanelGuard.tsx`：

```tsx
"use client"

/**
 * 面板权限守卫。
 * 未登录 → 重定向首页；无面板权限 → 重定向首页。
 * 非法路由或无 module 权限 → 重定向默认页；默认页也无权限 → 重定向首页。
 */

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "@/i18n/navigation"
import { usePermissions } from "@/hooks/use-permissions"

interface PanelGuardProps {
  panel: string
  children: React.ReactNode
}

/** 各面板 module → 权限码映射 */
const MODULE_PERMISSIONS: Record<string, Record<string, string>> = {
  admin: {
    dashboard: "admin/dashboard",
    users: "admin/users",
    roles: "admin/roles",
    "general-settings": "admin/general-settings",
    "web-settings": "admin/web-settings",
    students: "admin/students",
    contacts: "admin/contacts",
  },
  portal: {
    overview: "portal/overview",
    profile: "portal/profile",
    documents: "portal/documents",
  },
}

const DEFAULT_MODULE: Record<string, string> = {
  admin: "dashboard",
  portal: "profile",
}

/** 检查用户是否拥有指定面板的任意权限 */
function hasPanelAccess(permissions: string[], panel: string): boolean {
  return permissions.some(
    (code) =>
      code === "*" ||
      code === `${panel}/*` ||
      code.startsWith(`${panel}/`),
  )
}

/** 从路径中提取面板下的子路由名 */
function getSubRoute(pathname: string, panel: string): string | null {
  const prefix = `/${panel}/`
  const idx = pathname.indexOf(prefix)
  if (idx === -1) return null
  const rest = pathname.slice(idx + prefix.length)
  return rest.split("/")[0] || null
}

export function PanelGuard({ panel, children }: PanelGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { hasPermission } = usePermissions()

  const subRoute = getSubRoute(pathname, panel)
  const moduleMap = MODULE_PERMISSIONS[panel]
  const isValidRoute = moduleMap ? subRoute !== null && subRoute in moduleMap : true

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/")
      return
    }

    if (!hasPanelAccess(user.permissions, panel)) {
      router.replace("/")
      return
    }

    if (!isValidRoute || (subRoute && moduleMap && !hasPermission(moduleMap[subRoute]))) {
      const defaultMod = DEFAULT_MODULE[panel]
      const defaultPerm = moduleMap?.[defaultMod]
      if (defaultMod && defaultPerm && hasPermission(defaultPerm) && subRoute !== defaultMod) {
        router.replace(`/${panel}/${defaultMod}`)
      } else {
        router.replace("/")
      }
    }
  }, [user, loading, panel, router, isValidRoute, subRoute, moduleMap, hasPermission])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!user || !hasPanelAccess(user.permissions, panel)) {
    return null
  }

  if (!isValidRoute || (subRoute && moduleMap && !hasPermission(moduleMap[subRoute]))) {
    return null
  }

  return <>{children}</>
}
```

- [ ] **Step 2: 验证前端编译**

```bash
pnpm --prefix frontend build 2>&1 | tail -5
```

Expected: 编译成功，无类型错误。

- [ ] **Step 3: Commit**

```bash
git add frontend/components/layout/PanelGuard.tsx
git commit -m "feat: PanelGuard module 级权限校验和重定向"
```

---

### Task 5: 前端 PermissionTree Miller Columns

**Files:**
- Rewrite: `frontend/components/admin/PermissionTree.tsx`

- [ ] **Step 1: 重写 PermissionTree.tsx 为 Miller Columns 布局**

完整替换 `frontend/components/admin/PermissionTree.tsx`：

```tsx
"use client"

/**
 * Miller Columns 权限选择器。
 * 无限层级分栏布局，支持通配符自动折叠/展开。
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import api from "@/lib/api"

/** 权限树节点 */
interface TreeNode {
  description: string
  children?: Record<string, TreeNode>
}

type PermissionTree = Record<string, TreeNode>

export interface PermissionTreeProps {
  selectedCodes: Set<string>
  onSelectionChange: (codes: Set<string>) => void
  readonly?: boolean
}

/** 将下划线 key 转为连字符 URL 路径段 */
function keyToSlug(key: string): string {
  return key.replace(/_/g, "-")
}

/** 收集节点下所有叶子路径 */
function collectLeaves(node: TreeNode, prefix: string): string[] {
  if (!node.children) return [prefix]
  const leaves: string[] = []
  for (const [key, child] of Object.entries(node.children)) {
    const path = prefix ? `${prefix}/${keyToSlug(key)}` : keyToSlug(key)
    leaves.push(...collectLeaves(child, path))
  }
  return leaves
}

/** 从整棵树收集所有叶子路径 */
export function collectAllLeaves(tree: PermissionTree): string[] {
  const leaves: string[] = []
  for (const [key, node] of Object.entries(tree)) {
    leaves.push(...collectLeaves(node, keyToSlug(key)))
  }
  return leaves
}

/** 将选中的叶子集合折叠为通配符 */
function collapseToWildcards(
  selected: Set<string>,
  tree: PermissionTree,
): Set<string> {
  const result = new Set<string>()

  function process(node: TreeNode, prefix: string): boolean {
    if (!node.children) {
      if (selected.has(prefix)) {
        result.add(prefix)
        return true
      }
      return false
    }

    const entries = Object.entries(node.children)
    let allSelected = true

    for (const [key, child] of entries) {
      const path = prefix ? `${prefix}/${keyToSlug(key)}` : keyToSlug(key)
      if (!process(child, path)) {
        allSelected = false
      }
    }

    if (allSelected && entries.length > 0) {
      for (const [key, child] of entries) {
        const path = prefix ? `${prefix}/${keyToSlug(key)}` : keyToSlug(key)
        removeSubPaths(result, path, child)
      }
      result.add(`${prefix}/*`)
      return true
    }
    return false
  }

  function removeSubPaths(
    set: Set<string>,
    prefix: string,
    node: TreeNode,
  ): void {
    if (!node.children) {
      set.delete(prefix)
      return
    }
    set.delete(`${prefix}/*`)
    for (const [key, child] of Object.entries(node.children)) {
      const path = prefix ? `${prefix}/${keyToSlug(key)}` : keyToSlug(key)
      removeSubPaths(set, path, child)
    }
  }

  for (const [key, node] of Object.entries(tree)) {
    process(node, keyToSlug(key))
  }

  return result
}

/** 展开通配符为叶子路径 */
export function expandWildcards(
  codes: Set<string>,
  tree: PermissionTree,
): Set<string> {
  const result = new Set<string>()
  const allLeaves = collectAllLeaves(tree)

  for (const code of codes) {
    if (code === "*") {
      for (const l of allLeaves) result.add(l)
    } else if (code.endsWith("/*")) {
      const prefix = code.slice(0, -1)
      for (const l of allLeaves) {
        if (l.startsWith(prefix)) result.add(l)
      }
    } else {
      result.add(code)
    }
  }
  return result
}

/** 搜索过滤 */
function nodeMatches(node: TreeNode, query: string): boolean {
  if (node.description.toLowerCase().includes(query)) return true
  if (!node.children) return false
  return Object.values(node.children).some((child) => nodeMatches(child, query))
}

/** 根据 activePath 获取对应节点 */
function getNodeAtPath(
  tree: PermissionTree,
  path: string[],
): TreeNode | null {
  let current: Record<string, TreeNode> = tree
  for (const segment of path) {
    const node = current[segment]
    if (!node) return null
    if (path.indexOf(segment) === path.length - 1) return node
    if (!node.children) return null
    current = node.children
  }
  return null
}

/** 单栏组件 */
function Column({
  title,
  entries,
  activePath,
  activeKey,
  selectedCodes,
  onSelect,
  onToggle,
  readonly,
  searchQuery,
}: {
  title: string
  entries: [string, TreeNode][]
  activePath: string
  activeKey: string | null
  selectedCodes: Set<string>
  onSelect: (key: string) => void
  onToggle: (leaves: string[], key: string, node: TreeNode) => void
  readonly: boolean
  searchQuery: string
}) {
  const t = useTranslations("AdminGroups")

  const filteredEntries = searchQuery
    ? entries.filter(([, node]) => nodeMatches(node, searchQuery))
    : entries

  return (
    <div className="min-w-[140px] w-[140px] border-r border-border flex-shrink-0 flex flex-col">
      <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="truncate">{title}</span>
        {!readonly && (
          <button
            type="button"
            className="text-[10px] text-primary normal-case tracking-normal"
            onClick={() => {
              const allLeaves = filteredEntries.flatMap(([key, node]) => {
                const path = activePath ? `${activePath}/${keyToSlug(key)}` : keyToSlug(key)
                return collectLeaves(node, path)
              })
              const allOn = allLeaves.every((l) => selectedCodes.has(l))
              onToggle(allLeaves, "", {} as TreeNode)
              const next = new Set(selectedCodes)
              for (const l of allLeaves) allOn ? next.delete(l) : next.add(l)
            }}
          >
            {t("toggleAll")}
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {filteredEntries.map(([key, node]) => {
          const path = activePath ? `${activePath}/${keyToSlug(key)}` : keyToSlug(key)
          const isLeaf = !node.children
          const leaves = collectLeaves(node, path)
          const checkedCount = leaves.filter((l) => selectedCodes.has(l)).length
          const allChecked = leaves.length > 0 && checkedCount === leaves.length
          const indeterminate = checkedCount > 0 && !allChecked
          const isActive = keyToSlug(key) === activeKey

          return (
            <div
              key={key}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                isActive ? "bg-primary/10 font-medium" : "hover:bg-muted/40"
              }`}
              onClick={() => {
                if (!isLeaf) onSelect(keyToSlug(key))
              }}
            >
              {!readonly && (
                <Checkbox
                  checked={allChecked}
                  indeterminate={indeterminate}
                  onCheckedChange={() => {
                    const allOn = leaves.every((l) => selectedCodes.has(l))
                    onToggle(leaves, key, node)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="size-3.5"
                />
              )}
              <span className="flex-1 truncate">{node.description}</span>
              {!isLeaf && (
                <>
                  <span className="text-[9px] text-muted-foreground">
                    {checkedCount}/{leaves.length}
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground flex-shrink-0" />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Miller Columns 权限选择器 */
export function PermissionTree({
  selectedCodes,
  onSelectionChange,
  readonly = false,
}: PermissionTreeProps) {
  const t = useTranslations("AdminGroups")
  const [tree, setTree] = useState<PermissionTree | null>(null)
  const [activePath, setActivePath] = useState<string[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    api.get<{ permission_tree: PermissionTree }>("/admin/roles/meta")
      .then(({ data }) => setTree(data.permission_tree))
      .catch(() => setTree(null))
  }, [])

  const allLeaves = useMemo(() => (tree ? collectAllLeaves(tree) : []), [tree])
  const totalChecked = useMemo(
    () => allLeaves.filter((l) => selectedCodes.has(l)).length,
    [allLeaves, selectedCodes],
  )

  const handleToggle = useCallback(
    (leaves: string[]) => {
      if (readonly) return
      const allOn = leaves.every((l) => selectedCodes.has(l))
      const next = new Set(selectedCodes)
      for (const l of leaves) allOn ? next.delete(l) : next.add(l)
      onSelectionChange(next)
    },
    [readonly, selectedCodes, onSelectionChange],
  )

  /** 构建各栏数据 */
  const columns = useMemo(() => {
    if (!tree) return []
    const cols: {
      title: string
      entries: [string, TreeNode][]
      basePath: string
      activeKey: string | null
    }[] = []

    cols.push({
      title: t("panels"),
      entries: Object.entries(tree),
      basePath: "",
      activeKey: activePath[0] || null,
    })

    let current: Record<string, TreeNode> = tree
    for (let i = 0; i < activePath.length; i++) {
      const seg = activePath[i]
      const originalKey = Object.keys(current).find(
        (k) => keyToSlug(k) === seg,
      )
      if (!originalKey) break
      const node = current[originalKey]
      if (!node.children) break
      const basePath = activePath.slice(0, i + 1).join("/")
      cols.push({
        title: node.description,
        entries: Object.entries(node.children),
        basePath,
        activeKey: activePath[i + 1] || null,
      })
      current = node.children
    }

    return cols
  }, [tree, activePath, t])

  const searchQuery = search.trim().toLowerCase()

  if (!tree) return null

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <Input
          className="h-7 text-xs flex-1"
          placeholder={t("searchPermissions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {totalChecked}/{allLeaves.length}
        </span>
      </div>

      {activePath.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground border-b bg-muted/20">
          {activePath.map((seg, i) => {
            let current: Record<string, TreeNode> = tree
            let desc = seg
            for (let j = 0; j <= i; j++) {
              const origKey = Object.keys(current).find(
                (k) => keyToSlug(k) === activePath[j],
              )
              if (!origKey) break
              if (j === i) desc = current[origKey].description
              else if (current[origKey].children) current = current[origKey].children!
            }
            return (
              <span key={seg} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/50">›</span>}
                <button
                  type="button"
                  className={`hover:text-foreground ${i === activePath.length - 1 ? "text-foreground font-medium" : ""}`}
                  onClick={() => setActivePath(activePath.slice(0, i + 1))}
                >
                  {desc}
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="flex overflow-x-auto" style={{ maxHeight: 360 }}>
        {columns.map((col, i) => (
          <Column
            key={`${col.basePath}-${i}`}
            title={col.title}
            entries={col.entries}
            activePath={col.basePath}
            activeKey={col.activeKey}
            selectedCodes={selectedCodes}
            onSelect={(key) => {
              setActivePath([...activePath.slice(0, i), key])
            }}
            onToggle={(leaves) => handleToggle(leaves)}
            readonly={readonly}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证前端编译**

```bash
pnpm --prefix frontend build 2>&1 | tail -5
```

Expected: 编译成功。

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/PermissionTree.tsx
git commit -m "feat: PermissionTree Miller Columns 无限层级分栏"
```

---

### Task 6: RoleDialog 通配符折叠

**Files:**
- Modify: `frontend/components/admin/RoleDialog.tsx`

- [ ] **Step 1: 修改 RoleDialog 的 codesToPermissions 使用通配符折叠**

在 `RoleDialog.tsx` 中：

1. 导入 `expandWildcards` 和 `collapseToWildcards`（已从 PermissionTree 导出）
2. 修改 `expandToCodeSet` 使用 `expandWildcards`
3. 修改 `codesToPermissions` 使用 `collapseToWildcards`

修改导入行：

```tsx
import { PermissionTree, collectAllLeaves, expandWildcards, collapseToWildcards } from "./PermissionTree"
```

替换 `expandToCodeSet` 方法：

```tsx
const expandToCodeSet = useCallback(
  async (rolePerms: string[]): Promise<Set<string>> => {
    try {
      const { data } = await api.get<{ permission_tree: Record<string, unknown> }>("/admin/roles/meta")
      const tree = data.permission_tree as Parameters<typeof expandWildcards>[1]
      return expandWildcards(new Set(rolePerms), tree)
    } catch {
      return new Set<string>()
    }
  },
  [],
)
```

替换 `codesToPermissions` 方法。需要缓存 tree 数据。添加一个 state：

```tsx
const [permTree, setPermTree] = useState<Record<string, unknown> | null>(null)
```

修改 `expandToCodeSet` 同时缓存 tree：

```tsx
const expandToCodeSet = useCallback(
  async (rolePerms: string[]): Promise<Set<string>> => {
    try {
      const { data } = await api.get<{ permission_tree: Record<string, unknown> }>("/admin/roles/meta")
      setPermTree(data.permission_tree)
      const tree = data.permission_tree as Parameters<typeof expandWildcards>[1]
      return expandWildcards(new Set(rolePerms), tree)
    } catch {
      return new Set<string>()
    }
  },
  [],
)
```

替换 `codesToPermissions`：

```tsx
const codesToPermissions = (): string[] => {
  if (!permTree) return [...selectedCodes]
  const tree = permTree as Parameters<typeof collapseToWildcards>[1]
  return [...collapseToWildcards(selectedCodes, tree)]
}
```

- [ ] **Step 2: 验证前端编译**

```bash
pnpm --prefix frontend build 2>&1 | tail -5
```

Expected: 编译成功。

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/RoleDialog.tsx
git commit -m "feat: RoleDialog 通配符自动折叠/展开"
```

---

### Task 7: 集成验证

- [ ] **Step 1: 启动开发环境**

```bash
./scripts/dev.sh start
```

- [ ] **Step 2: 浏览器验证权限树**

1. 用 superuser 登录
2. 进入 `/admin/roles`
3. 编辑 `content_admin` 角色
4. 确认权限树显示为 Miller Columns 分栏，全中文，无重复节点
5. 展开到深层（网站设置 → 文章管理），确认分栏正常横向滚动
6. 全选一个 module，保存，重新打开，确认显示为通配符（`*` 状态）

- [ ] **Step 3: 验证 module 级重定向**

1. 用 content_admin 角色用户登录（无 users 权限）
2. 手动访问 `/zh/admin/users` → 应重定向到 `/zh/admin/dashboard`
3. 手动访问 `/zh/admin/xxx` → 应重定向到 `/zh/admin/dashboard`（非法路由）
4. 手动访问 `/zh/admin/profile` → 应重定向到 `/zh/admin/dashboard`（错误拼接）

- [ ] **Step 4: Commit 最终状态**

如有调整，提交修复。

- [ ] **Step 5: 更新 E2E 覆盖率清单**

更新 `frontend/e2e/helpers/page-routes.json` 和相关 E2E 测试中对 `PANEL_ROUTES` 的引用（`frontend/e2e/framework/scan-totals.ts` 中扫描 `PANEL_ROUTES` 的正则需要改为扫描 `MODULE_PERMISSIONS`）。

```bash
git add -A
git commit -m "fix: E2E 扫描适配 MODULE_PERMISSIONS"
```

---

### Task 8: 添加翻译 key

**Files:**
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`

- [ ] **Step 1: 检查新增的翻译 key**

PermissionTree 中使用了 `t("panels")` 和 `t("toggleAll")`，需要在 `AdminGroups` 命名空间中添加。

在 `frontend/messages/zh.json` 的 `AdminGroups` 中加：
```json
"panels": "面板",
"toggleAll": "切换"
```

在 `frontend/messages/en.json` 的 `AdminGroups` 中加：
```json
"panels": "Panels",
"toggleAll": "Toggle"
```

其他语言文件（ja.json、de.json）同步添加。

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/
git commit -m "feat: 添加权限树翻译 key"
```
