# 权限管理器三栏级联重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将角色编辑对话框的权限选择器从平铺复选框改为三栏级联面板，第三栏 API 接口从 OpenAPI spec 动态获取。

**Architecture:** 后端新增一个端点返回 OpenAPI spec，前端新建可复用的三栏权限选择器组件替换现有实现。前两栏数据从前端路由/菜单配置提取，第三栏数据从后端 OpenAPI 接口实时获取。基础设施调整包括开发环境端口映射和 volume 命名。

**Tech Stack:** FastAPI, React, TypeScript, shadcn/ui, Tailwind CSS, Docker Compose

---

## File Structure

| 文件 | 操作 | 职责 |
| --- | --- | --- |
| `backend/shared/src/app/rbac/router.py` | 修改 | 新增 openapi.json 端点 |
| `backend/api/tests/test_rbac_router.py` | 修改 | 新增 openapi 端点测试 |
| `frontend/lib/permission-config.ts` | 新建 | Panel 和页面配置数据（从 sidebar 提取的共享配置） |
| `frontend/lib/openapi.ts` | 新建 | OpenAPI spec 解析工具函数 |
| `frontend/components/admin/PermissionTree.tsx` | 新建 | 三栏权限选择器组件 |
| `frontend/components/admin/RoleDialog.tsx` | 修改 | 替换旧权限树为新组件 |
| `docker-compose.override.yml` | 修改 | api 端口映射 + volume 命名 |
| `docker-compose.yml` | 修改 | db 生产端口映射 |

---

### Task 1: 基础设施改动（Docker Compose）

**Files:**
- Modify: `docker-compose.yml:50-59`
- Modify: `docker-compose.override.yml`

- [ ] **Step 1: 给生产环境 db 添加端口映射**

在 `docker-compose.yml` 的 db service 中添加 ports：

```yaml
  db:
    image: postgres:17-alpine
    env_file: env/db.env
    ports:
      - "47293:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mudasky"]
      interval: 5s
      timeout: 3s
      retries: 5
```

- [ ] **Step 2: 给开发环境 api 添加端口映射，frontend volume 改为 named volume**

将 `docker-compose.override.yml` 修改为：

```yaml
services:
  api:
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app

  frontend:
    build:
      dockerfile: ../docker/frontend.dev.Dockerfile
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules
      - frontend_next:/app/.next

  gateway:
    entrypoint: ["sh", "/usr/local/openresty/nginx/dev-entrypoint.sh"]
    environment:
      - RATE_LIMIT_MULTIPLIER=10
    volumes:
      - ./gateway/lua:/usr/local/openresty/nginx/lua
      - ./gateway/conf.d:/etc/nginx/conf.d
      - ./gateway/nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf
      - ./gateway/dev-entrypoint.sh:/usr/local/openresty/nginx/dev-entrypoint.sh

  db:
    ports:
      - "15432:5432"

volumes:
  frontend_node_modules:
  frontend_next:
```

- [ ] **Step 3: 验证 docker compose 配置有效**

Run: `docker compose config --quiet && echo "OK"`
Expected: OK（无错误输出）

- [ ] **Step 4: 重建容器，确认端口映射生效**

Run: `docker compose down && docker compose up -d && sleep 5 && ss -tlnp | grep -E ':(8000|15432|80)\b'`
Expected: 80、8000、15432 三个端口都在监听

- [ ] **Step 5: 验证开发环境 Swagger UI 可直接访问**

Run: `curl -s http://localhost:8000/api/docs | head -5`
Expected: 包含 HTML 内容（Swagger UI 页面）

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml docker-compose.override.yml
git commit -m "chore: 基础设施调整（端口映射 + named volume）"
```

---

### Task 2: 后端 — OpenAPI 端点

**Files:**
- Modify: `backend/shared/src/app/rbac/router.py`
- Modify: `backend/api/tests/test_rbac_router.py`

- [ ] **Step 1: 编写 openapi 端点的路由测试**

在 `backend/api/tests/test_rbac_router.py` 末尾添加：

```python
class TestOpenApiSpec:
    """OpenAPI spec 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_app(self):
        """模拟 request.app.openapi()。"""
        self.mock_schema = {
            "openapi": "3.1.0",
            "info": {"title": "test", "version": "0.1.0"},
            "paths": {
                "/admin/users/list": {
                    "get": {"summary": "查询用户列表"}
                },
                "/auth/login": {
                    "post": {"summary": "登录"}
                },
            },
        }

    @pytest.mark.anyio
    async def test_returns_openapi_spec(self, client):
        """应返回 OpenAPI spec JSON。"""
        with patch(
            "app.rbac.router.get_openapi_spec"
        ) as mock_fn:
            mock_fn.return_value = self.mock_schema
            resp = await client.get(
                "/admin/roles/list/openapi.json"
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "paths" in data
        assert "/admin/users/list" in data["paths"]
```

- [ ] **Step 2: 运行测试确认失败**

Run: `docker compose exec api python -m pytest tests/test_rbac_router.py::TestOpenApiSpec -v`
Expected: FAIL — `get_openapi_spec` 不存在

- [ ] **Step 3: 实现 openapi 端点**

在 `backend/shared/src/app/rbac/router.py` 中：

1. 添加导入：

```python
from fastapi import APIRouter, Request
from pydantic import BaseModel
```

2. 添加获取 spec 的辅助函数和端点（在文件末尾）：

```python
def get_openapi_spec(app: Any) -> dict:
    """从 FastAPI 应用获取 OpenAPI spec。"""
    if hasattr(app, "openapi"):
        return app.openapi()
    from fastapi.openapi.utils import get_openapi

    return get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )


@router.get("/list/openapi.json")
async def get_openapi_json(request: Request) -> dict:
    """返回 OpenAPI spec（权限码复用 admin/roles/list）。"""
    return get_openapi_spec(request.app)
```

3. 在文件顶部添加 `from typing import Any` 导入。

- [ ] **Step 4: 运行测试确认通过**

Run: `docker compose exec api python -m pytest tests/test_rbac_router.py::TestOpenApiSpec -v`
Expected: PASS

- [ ] **Step 5: 运行全部 rbac 测试确认无回归**

Run: `docker compose exec api python -m pytest tests/test_rbac_router.py -v`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/shared/src/app/rbac/router.py backend/api/tests/test_rbac_router.py
git commit -m "feat: 新增 OpenAPI spec 端点 GET /admin/roles/list/openapi.json"
```

---

### Task 3: 前端 — Panel 和页面配置数据

**Files:**
- Create: `frontend/lib/permission-config.ts`

- [ ] **Step 1: 创建共享的 panel 和页面配置**

创建 `frontend/lib/permission-config.ts`：

```typescript
/**
 * 权限管理器的 Panel 和页面配置数据。
 * 从 AdminSidebar / UserSidebar 的 MENU_KEYS 提取，供 PermissionTree 组件使用。
 */

/** 页面配置项 */
export interface PageConfig {
  /** 页面唯一键 */
  key: string
  /** 页面路径（如 /admin/users），用于匹配 API 路由前缀 */
  href: string
  /** 页面关联的 API 路径前缀（从 href 提取，如 /admin/users → admin/users） */
  apiPrefix: string
}

/** Panel 配置项 */
export interface PanelConfig {
  /** Panel 唯一键 */
  key: string
  /** Panel 路径前缀（如 admin、portal） */
  prefix: string
  /** Panel 下的页面列表 */
  pages: PageConfig[]
}

/** 管理后台页面 */
const ADMIN_PAGES: PageConfig[] = [
  { key: "dashboard", href: "/admin/dashboard", apiPrefix: "admin/dashboard" },
  { key: "userManagement", href: "/admin/users", apiPrefix: "admin/users" },
  { key: "roleManagement", href: "/admin/roles", apiPrefix: "admin/roles" },
  { key: "generalSettings", href: "/admin/general-settings", apiPrefix: "admin/general-settings" },
  { key: "webSettings", href: "/admin/web-settings", apiPrefix: "admin/web-settings" },
]

/** 用户中心页面 */
const PORTAL_PAGES: PageConfig[] = [
  { key: "overview", href: "/portal/overview", apiPrefix: "portal/overview" },
  { key: "profile", href: "/portal/profile", apiPrefix: "portal/profile" },
  { key: "documents", href: "/portal/documents", apiPrefix: "portal/documents" },
]

/** 所有 Panel 配置 */
export const PANEL_CONFIG: PanelConfig[] = [
  { key: "admin", prefix: "admin", pages: ADMIN_PAGES },
  { key: "portal", prefix: "portal", pages: PORTAL_PAGES },
]
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/permission-config.ts
git commit -m "feat: 新增权限管理器 Panel 和页面配置数据"
```

---

### Task 4: 前端 — OpenAPI 解析工具

**Files:**
- Create: `frontend/lib/openapi.ts`

- [ ] **Step 1: 创建 OpenAPI spec 解析工具**

创建 `frontend/lib/openapi.ts`：

```typescript
/**
 * OpenAPI spec 解析工具。
 * 从 OpenAPI JSON 中提取 API 路由信息，供权限管理器第三栏使用。
 */

import api from "@/lib/api"

/** 解析后的 API 路由信息 */
export interface ApiRoute {
  /** API 路径（如 /admin/users/list） */
  path: string
  /** HTTP 方法（大写，如 GET、POST） */
  method: string
  /** API 描述（取自 docstring） */
  summary: string
}

/** 需要过滤的路径前缀 */
const EXCLUDED_PREFIXES = ["/auth/", "/public/", "/health"]

/**
 * 从 OpenAPI spec 中提取路由列表。
 * 只保留 /admin/* 和 /portal/* 路由。
 */
export function parseRoutes(spec: Record<string, unknown>): ApiRoute[] {
  const paths = spec.paths as Record<string, Record<string, Record<string, string>>> | undefined
  if (!paths) return []

  const routes: ApiRoute[] = []
  for (const [path, methods] of Object.entries(paths)) {
    if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) continue
    if (!path.startsWith("/admin/") && !path.startsWith("/portal/")) continue

    for (const [method, detail] of Object.entries(methods)) {
      if (method === "parameters") continue
      routes.push({
        path,
        method: method.toUpperCase(),
        summary: detail.summary || detail.description || path,
      })
    }
  }
  return routes
}

/**
 * 按路径前缀过滤路由。
 * 例如 prefix="admin/users" 会匹配 /admin/users/list、/admin/users/edit/{id} 等。
 */
export function filterRoutesByPrefix(routes: ApiRoute[], prefix: string): ApiRoute[] {
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`
  return routes.filter((r) => r.path.startsWith(normalized + "/") || r.path === normalized)
}

/** 从后端获取 OpenAPI spec。 */
export async function fetchOpenApiSpec(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>("/admin/roles/list/openapi.json")
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/openapi.ts
git commit -m "feat: 新增 OpenAPI spec 解析工具函数"
```

---

### Task 5: 前端 — 三栏权限选择器组件

**Files:**
- Create: `frontend/components/admin/PermissionTree.tsx`

这是最核心的组件，包含三栏布局、级联勾选、搜索过滤。由于文件较大（约 280 行），按职责拆分为几个内部子组件。

- [ ] **Step 1: 创建 PermissionTree 组件**

创建 `frontend/components/admin/PermissionTree.tsx`，完整代码如下：

```typescript
"use client"

/**
 * 三栏级联权限选择器组件。
 * 第一栏：Panel（admin/portal），第二栏：页面/模块，第三栏：API 接口。
 * 支持搜索、级联勾选、全选/反选。
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { PANEL_CONFIG, type PanelConfig, type PageConfig } from "@/lib/permission-config"
import {
  type ApiRoute,
  fetchOpenApiSpec,
  parseRoutes,
  filterRoutesByPrefix,
} from "@/lib/openapi"

interface PermissionTreeProps {
  /** 已选中的权限码集合（如 "admin/users/list"） */
  selectedCodes: Set<string>
  /** 选中变更回调 */
  onSelectionChange: (codes: Set<string>) => void
  /** 只读模式 */
  readonly?: boolean
}

/** 将 API 路由转为权限码（路径去掉开头的 /） */
function routeToCode(route: ApiRoute): string {
  return route.path.startsWith("/") ? route.path.slice(1) : route.path
}

/** 三栏权限选择器 */
export function PermissionTree({
  selectedCodes,
  onSelectionChange,
  readonly = false,
}: PermissionTreeProps) {
  const t = useTranslations("AdminGroups")
  const tNav = useTranslations("Admin")
  const tPortal = useTranslations("UserSidebar")

  const [allRoutes, setAllRoutes] = useState<ApiRoute[]>([])
  const [activePanel, setActivePanel] = useState<string>("admin")
  const [activePage, setActivePage] = useState<string>("")
  const [search, setSearch] = useState("")

  /** 获取 OpenAPI 路由 */
  useEffect(() => {
    fetchOpenApiSpec()
      .then((spec) => setAllRoutes(parseRoutes(spec)))
      .catch(() => setAllRoutes([]))
  }, [])

  /** 默认选中第一个页面 */
  useEffect(() => {
    const panel = PANEL_CONFIG.find((p) => p.key === activePanel)
    if (panel && panel.pages.length > 0 && !activePage) {
      setActivePage(panel.pages[0].key)
    }
  }, [activePanel, activePage])

  /** 当前 panel 配置 */
  const currentPanel = useMemo(
    () => PANEL_CONFIG.find((p) => p.key === activePanel),
    [activePanel],
  )

  /** 当前页面配置 */
  const currentPage = useMemo(
    () => currentPanel?.pages.find((p) => p.key === activePage),
    [currentPanel, activePage],
  )

  /** 当前页面的 API 路由 */
  const pageRoutes = useMemo(() => {
    if (!currentPage) return []
    return filterRoutesByPrefix(allRoutes, currentPage.apiPrefix)
  }, [allRoutes, currentPage])

  /** 搜索过滤后的路由 */
  const filteredRoutes = useMemo(() => {
    if (!search.trim()) return pageRoutes
    const q = search.toLowerCase()
    return pageRoutes.filter(
      (r) =>
        r.summary.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q),
    )
  }, [pageRoutes, search])

  /** 获取某个页面下所有路由的权限码 */
  const getPageCodes = useCallback(
    (page: PageConfig): string[] =>
      filterRoutesByPrefix(allRoutes, page.apiPrefix).map(routeToCode),
    [allRoutes],
  )

  /** 获取某个 panel 下所有路由的权限码 */
  const getPanelCodes = useCallback(
    (panel: PanelConfig): string[] =>
      panel.pages.flatMap((page) => getPageCodes(page)),
    [getPageCodes],
  )

  /** 切换单个 API 路由的选中状态 */
  const toggleRoute = (route: ApiRoute) => {
    if (readonly) return
    const code = routeToCode(route)
    const next = new Set(selectedCodes)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    onSelectionChange(next)
  }

  /** 切换页面级别的选中状态（级联） */
  const togglePage = (page: PageConfig) => {
    if (readonly) return
    const codes = getPageCodes(page)
    const allChecked = codes.length > 0 && codes.every((c) => selectedCodes.has(c))
    const next = new Set(selectedCodes)
    for (const c of codes) {
      if (allChecked) next.delete(c)
      else next.add(c)
    }
    onSelectionChange(next)
  }

  /** 切换 panel 级别的选中状态（级联） */
  const togglePanel = (panel: PanelConfig) => {
    if (readonly) return
    const codes = getPanelCodes(panel)
    const allChecked = codes.length > 0 && codes.every((c) => selectedCodes.has(c))
    const next = new Set(selectedCodes)
    for (const c of codes) {
      if (allChecked) next.delete(c)
      else next.add(c)
    }
    onSelectionChange(next)
  }

  /** 第三栏全选 */
  const selectAllPageRoutes = () => {
    if (readonly || !currentPage) return
    const codes = getPageCodes(currentPage)
    const next = new Set(selectedCodes)
    for (const c of codes) next.add(c)
    onSelectionChange(next)
  }

  /** 翻译页面标签 */
  const translatePage = (panelKey: string, pageKey: string): string => {
    if (panelKey === "admin") return tNav(pageKey)
    return tPortal(pageKey)
  }

  /** checkbox 状态计算 */
  const getCheckState = (codes: string[]): "checked" | "indeterminate" | "unchecked" => {
    if (codes.length === 0) return "unchecked"
    const count = codes.filter((c) => selectedCodes.has(c)).length
    if (count === 0) return "unchecked"
    if (count === codes.length) return "checked"
    return "indeterminate"
  }

  const totalSelected = selectedCodes.size
  const totalRoutes = allRoutes.length

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b">
        <Input
          className="h-7 text-sm"
          placeholder={t("searchPermissions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {totalSelected}/{totalRoutes}
        </span>
      </div>

      {/* 三栏 */}
      <div className="flex" style={{ height: 280 }}>
        {/* 第一栏：Panel */}
        <div className="w-[22%] border-r overflow-y-auto bg-muted/30">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium border-b bg-muted/50 flex justify-between items-center">
            <span>{t("panel")}</span>
            <span className="text-[10px] bg-muted px-1.5 rounded">{t("auto")}</span>
          </div>
          {PANEL_CONFIG.map((panel) => {
            const codes = getPanelCodes(panel)
            const state = getCheckState(codes)
            return (
              <div
                key={panel.key}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-transparent text-sm transition-colors ${
                  activePanel === panel.key
                    ? "bg-muted border-l-2 border-l-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  setActivePanel(panel.key)
                  setActivePage("")
                }}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={state === "checked"}
                    indeterminate={state === "indeterminate"}
                    onCheckedChange={() => togglePanel(panel)}
                    disabled={readonly}
                  />
                  <span className={activePanel === panel.key ? "font-medium" : ""}>
                    {t(panel.key)}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">›</span>
              </div>
            )
          })}
        </div>

        {/* 第二栏：页面 */}
        <div className="w-[30%] border-r overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium border-b bg-muted/50 flex justify-between items-center sticky top-0">
            <span>{t(activePanel)} · {t("pages")}</span>
            <span className="text-[10px] bg-muted px-1.5 rounded">{t("auto")}</span>
          </div>
          {currentPanel?.pages.map((page) => {
            const codes = getPageCodes(page)
            const state = getCheckState(codes)
            const checkedCount = codes.filter((c) => selectedCodes.has(c)).length
            return (
              <div
                key={page.key}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-muted/30 text-sm transition-colors ${
                  activePage === page.key
                    ? "bg-muted border-l-2 border-l-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setActivePage(page.key)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={state === "checked"}
                    indeterminate={state === "indeterminate"}
                    onCheckedChange={() => togglePage(page)}
                    disabled={readonly}
                  />
                  <span className={activePage === page.key ? "font-medium" : ""}>
                    {translatePage(activePanel, page.key)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {codes.length > 0 && (
                    <span className="text-[10px] bg-muted px-1.5 rounded-full">
                      {checkedCount}/{codes.length}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">›</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 第三栏：API 接口 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium border-b bg-muted/50 flex justify-between items-center sticky top-0">
            <span>
              {currentPage ? translatePage(activePanel, currentPage.key) : ""} · API
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 rounded font-semibold">
                OpenAPI
              </span>
              {!readonly && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={selectAllPageRoutes}
                >
                  {t("selectAll")}
                </Button>
              )}
            </div>
          </div>
          {filteredRoutes.map((route) => {
            const code = routeToCode(route)
            const isChecked = selectedCodes.has(code)
            return (
              <label
                key={`${route.method}-${route.path}`}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-muted/30 text-sm transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleRoute(route)}
                  disabled={readonly}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{route.summary}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                    <span
                      className={`text-[10px] font-semibold px-1 rounded ${
                        route.method === "GET"
                          ? "bg-green-50 text-green-600"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {route.method}
                    </span>
                    {route.path}
                  </div>
                </div>
              </label>
            )
          })}
          {filteredRoutes.length === 0 && (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              {search ? t("noSearchResults") : t("noApis")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 编译无错误**

Run: `docker compose exec frontend npx tsc --noEmit 2>&1 | head -20`
Expected: 无 PermissionTree 相关错误（可能需要先添加 i18n 翻译键，下一步处理）

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/PermissionTree.tsx
git commit -m "feat: 新建三栏权限选择器组件 PermissionTree"
```

---

### Task 6: 前端 — 添加 i18n 翻译键

**Files:**
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: 添加新的翻译键**

在每个语言文件的 `"AdminGroups"` 对象中添加以下键（以 zh.json 为例）：

```json
{
  "AdminGroups": {
    "...existing keys...",
    "panel": "面板",
    "pages": "页面",
    "auto": "自动",
    "admin": "管理后台",
    "portal": "用户中心",
    "searchPermissions": "搜索权限...",
    "selectAll": "全选",
    "noSearchResults": "无匹配结果",
    "noApis": "无 API 接口"
  }
}
```

en.json：

```json
{
  "AdminGroups": {
    "...existing keys...",
    "panel": "Panel",
    "pages": "Pages",
    "auto": "Auto",
    "admin": "Admin",
    "portal": "User Center",
    "searchPermissions": "Search permissions...",
    "selectAll": "Select all",
    "noSearchResults": "No results",
    "noApis": "No APIs"
  }
}
```

对 ja.json 和 de.json 做同样处理（使用对应语言翻译）。

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/*.json
git commit -m "feat: 新增权限管理器 i18n 翻译键"
```

---

### Task 7: 前端 — RoleDialog 集成新组件

**Files:**
- Modify: `frontend/components/admin/RoleDialog.tsx`

- [ ] **Step 1: 重写 RoleDialog 使用 PermissionTree**

将 `frontend/components/admin/RoleDialog.tsx` 的内容替换为：

```typescript
"use client"

/**
 * 角色创建/编辑对话框组件。
 * 使用三栏级联权限选择器（PermissionTree）。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogBody,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { Permission, Role } from "@/types"
import { PermissionTree } from "./PermissionTree"

interface RoleDialogProps {
  role: Role | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 角色创建/编辑对话框 */
export function RoleDialog({
  role,
  open,
  onClose,
  onSave,
}: RoleDialogProps) {
  const t = useTranslations("AdminGroups")
  const isEdit = !!role

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  /** 获取所有权限列表（用于 ID 映射） */
  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await api.get<Permission[]>("/admin/roles/permissions")
      setPermissions(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  /**
   * 将角色权限（Permission 对象）转为权限码集合。
   * 处理通配符展开：admin.* → 所有以 admin/ 开头的叶子权限码。
   */
  const expandToCodeSet = useCallback(
    (rolePerms: Permission[], allPerms: Permission[]): Set<string> => {
      const codes = new Set<string>()
      const leafPerms = allPerms.filter(
        (p) => !p.code.endsWith(".*") && p.code !== "*",
      )
      for (const rp of rolePerms) {
        if (rp.code === "*") {
          for (const lp of leafPerms) codes.add(lp.code.replaceAll(".", "/"))
        } else if (rp.code.endsWith(".*")) {
          const prefix = rp.code.slice(0, -2).replaceAll(".", "/") + "/"
          for (const lp of leafPerms) {
            const lpCode = lp.code.replaceAll(".", "/")
            if (lpCode.startsWith(prefix)) codes.add(lpCode)
          }
        } else {
          codes.add(rp.code.replaceAll(".", "/"))
        }
      }
      return codes
    },
    [],
  )

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    fetchPermissions()
    if (role) {
      setName(role.name)
      setDescription(role.description)
    } else {
      setName("")
      setDescription("")
      setSelectedCodes(new Set())
    }
  }, [open, role, fetchPermissions])

  /** 权限列表加载后，展开角色的通配符权限 */
  useEffect(() => {
    if (!open || !role || permissions.length === 0) return
    setSelectedCodes(expandToCodeSet(role.permissions, permissions))
  }, [open, role, permissions, expandToCodeSet])

  /**
   * 将选中的权限码转为权限 ID 列表（用于保存）。
   * 权限码格式：admin/users/list → 匹配 permission.code = admin.user.list
   */
  const codesToPermissionIds = (): string[] => {
    const ids: string[] = []
    for (const code of selectedCodes) {
      const dotCode = code.replaceAll("/", ".")
      const perm = permissions.find((p) => p.code === dotCode)
      if (perm) ids.push(perm.id)
    }
    return ids
  }

  /** 保存角色 */
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        permission_ids: codesToPermissionIds(),
      }
      if (isEdit) {
        await api.post(`/admin/roles/edit/${role.id}`, payload)
      } else {
        await api.post("/admin/roles/create", payload)
      }
      toast.success(t(isEdit ? "updateSuccess" : "createSuccess"))
      onSave()
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {t(isEdit ? "editTitle" : "createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(isEdit ? "editDesc" : "createDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* 名称 + 描述 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
          </div>

          {/* 权限选择器 */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("permissions")}</Label>
            <PermissionTree
              selectedCodes={selectedCodes}
              onSelectionChange={setSelectedCodes}
            />
          </div>
        </DialogBody>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

关键改动点：
- 移除了旧的 `TreeNode`、`buildTree`、`collectLeafIds`、`resolvePermLabel`、`PermissionTree`（旧版）、`BranchNode` 等所有代码
- 用 `selectedCodes`（权限码如 `admin/users/list`）替代 `selectedIds`（权限 UUID）
- 新增 `expandToCodeSet` 处理通配符权限 → 权限码的展开
- 新增 `codesToPermissionIds` 将选中的权限码反向映射回权限 ID（保存时用）
- 对话框宽度从默认改为 `max-w-4xl` 以容纳三栏
- 权限码用 `/` 分隔（与 URL 路径一致），permission.code 用 `.` 分隔，保存时需要转换

- [ ] **Step 2: 确认 TypeScript 编译无错误**

Run: `docker compose exec frontend npx tsc --noEmit 2>&1 | grep -i error | head -10`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/RoleDialog.tsx
git commit -m "refactor: RoleDialog 集成三栏权限选择器"
```

---

### Task 8: 集成验证

- [ ] **Step 1: 重启开发环境**

Run: `docker compose down && docker compose up -d`

- [ ] **Step 2: 验证后端 OpenAPI 端点**

Run: `curl -s http://localhost:8000/api/admin/roles/list/openapi.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('paths',{})), 'routes found')"`
Expected: 输出路由数量（如 "25 routes found"）

- [ ] **Step 3: 验证通过网关访问（需要认证）**

登录管理后台，打开角色编辑对话框，确认：
1. 三栏面板正常显示
2. 第一栏显示「管理后台」和「用户中心」
3. 点击「管理后台」→ 第二栏显示页面列表
4. 点击页面 → 第三栏显示 API 接口（方法、路径、描述）
5. 勾选/取消权限后保存，重新打开确认状态保持

- [ ] **Step 4: 运行后端全量测试**

Run: `docker compose exec api python -m pytest -v`
Expected: 全部 PASS

- [ ] **Step 5: Commit（如有修复）**

如果验证中发现问题并修复，提交修复：

```bash
git add -A
git commit -m "fix: 权限管理器集成修复"
```
