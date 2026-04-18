# 首页性能优化 + 水合可见性 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页 API 请求从 6 个减为 1 个，交互元素水合前不可见（替代 networkidle），E2E 测试全量通过。

**Architecture:** 后端新增 `/api/public/config/all` 合并接口；前端 ConfigProvider 改为单请求 + countryCodes/panelConfig 按需加载；Header 交互元素用 `useHydrated` hook 控制可见性；E2E 移除所有 `networkidle`。

**Tech Stack:** FastAPI, Next.js, React, Playwright

---

### Task 1: 后端 `/api/public/config/all` 接口

**Files:**
- Modify: `backend/api/api/public/config/service.py`
- Modify: `backend/api/api/public/config/router.py`

- [ ] **Step 1: 在 ConfigService 中添加 `get_all_homepage_config` 方法**

```python
# backend/api/api/public/config/service.py — 在 class ConfigService 末尾添加

    async def get_all_homepage_config(
        self,
    ) -> tuple[dict, datetime]:
        """获取首页所需的全部配置，返回 (数据, 最大更新时间)。"""
        keys = ["contact_info", "site_info", "homepage_stats", "about_info"]
        result = {}
        max_updated = datetime.min
        for key in keys:
            config = await repository.get_by_key(self.session, key)
            if config:
                result[key] = config.value
                if config.updated_at and config.updated_at > max_updated:
                    max_updated = config.updated_at
            else:
                result[key] = {}
        return result, max_updated
```

- [ ] **Step 2: 在 router 中添加 `/config/all` 端点**

```python
# backend/api/api/public/config/router.py — 在 get_config 函数前添加

@router.get("/config/all", summary="获取首页全部配置")
async def get_all_config(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
):
    """一次返回首页所需的全部配置（contact_info, site_info, homepage_stats, about_info）。"""
    svc = ConfigService(session)
    data, max_updated = await svc.get_all_homepage_config()

    if set_cache_headers(
        response, f"all_config:{max_updated.isoformat()}", 3600, if_none_match
    ):
        return response  # type: ignore[return-value]

    return data
```

- [ ] **Step 3: 提交**

```bash
git add backend/api/api/public/config/service.py backend/api/api/public/config/router.py
git commit -m "feat: 新增 /api/public/config/all 合并配置接口"
```

---

### Task 2: 前端 `useHydrated` hook

**Files:**
- Create: `frontend/hooks/useHydrated.ts`

- [ ] **Step 1: 创建 hook**

```typescript
// frontend/hooks/useHydrated.ts
"use client"

/**
 * 检测 React 水合是否完成。
 * SSR 时返回 false，客户端水合完成后返回 true。
 */

import { useState, useEffect } from "react"

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return hydrated
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/hooks/useHydrated.ts
git commit -m "feat: 新增 useHydrated hook"
```

---

### Task 3: ConfigProvider 改造（6 请求 → 1 请求）

**Files:**
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 移除 countryCodes 和 panelConfig 相关代码**

从 ConfigContext.tsx 中移除：
- `countryCodes` state（第 102 行）
- `panelConfig` state（第 107 行）
- `phone_country_codes` 请求（第 110-120 行）
- `panel-config` 请求（第 154 行）
- `ConfigContextType` 中的 `countryCodes` 和 `panelConfig` 字段
- context 默认值中的 `countryCodes` 和 `panelConfig`
- context value 中的 `countryCodes` 和 `panelConfig`
- `LocalizedConfigType` 中的 `countryCodes` 和 `panelConfig`
- `useLocalizedConfig` 返回值中的 `countryCodes` 和 `panelConfig`
- `PanelConfig`、`PanelPage` 接口定义（移到面板 layout 中）
- `DEFAULT_PANEL_CONFIG` 常量（移到面板 layout 中）
- `DEFAULT_COUNTRY_CODES` 常量（移到 PhoneInput 中）

保留 `CountryCode` 类型的 import（仍在类型定义中使用）— 实际上不再使用了，也一并移除。

- [ ] **Step 2: 将 4 个请求改为 1 个 `/public/config/all`**

```typescript
// ConfigProvider 中的 useEffect 改为：
useEffect(() => {
  api.get('/public/config/all')
    .then((res) => {
      const data = res.data
      if (data.contact_info) setContactInfo({ ...DEFAULT_CONTACT_INFO, ...data.contact_info })
      if (data.site_info) setSiteInfo({ ...DEFAULT_SITE_INFO, ...data.site_info })
      if (Array.isArray(data.homepage_stats)) setHomepageStats(data.homepage_stats)
      if (data.about_info) setAboutInfo({ ...DEFAULT_ABOUT_INFO, ...data.about_info })
    })
    .catch((err) => console.warn('[ConfigProvider] 配置加载失败:', err.message))
}, [])
```

- [ ] **Step 3: 提交**

```bash
git add frontend/contexts/ConfigContext.tsx
git commit -m "refactor: ConfigProvider 6 请求合并为 1 个 /config/all"
```

---

### Task 4: PhoneInput 按需加载 countryCodes

**Files:**
- Modify: `frontend/components/auth/PhoneInput.tsx`
- Modify: `frontend/components/auth/SmsCodeButton.tsx`

- [ ] **Step 1: PhoneInput 自行加载国家码**

将 PhoneInput 从 `useConfig()` 读取 countryCodes 改为内部 `useState` + `useEffect` 按需加载：

```typescript
// frontend/components/auth/PhoneInput.tsx
// 移除: import { useConfig } from '@/contexts/ConfigContext'
// 新增:
import { useState, useEffect } from 'react'
import api from '@/lib/api'

const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { code: '+86', country: '\u{1F1E8}\u{1F1F3}', label: '中国', digits: 11, enabled: true },
]

// 在 PhoneInput 组件内：
// 移除: const { countryCodes } = useConfig()
// 新增:
const [countryCodes, setCountryCodes] = useState<CountryCode[]>(DEFAULT_COUNTRY_CODES)

useEffect(() => {
  api.get('/public/config/phone_country_codes')
    .then((res) => {
      if (Array.isArray(res.data.value)) {
        const enabled = res.data.value.filter((c: CountryCode) => c.enabled)
        if (enabled.length > 0) setCountryCodes(enabled)
      }
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 2: SmsCodeButton 改为通过 props 接收 countryCodes**

```typescript
// frontend/components/auth/SmsCodeButton.tsx
// 移除: import { useConfig } from '@/contexts/ConfigContext'
// 移除: const { countryCodes } = useConfig()
// 新增 props: countryCodes: CountryCode[]

interface SmsCodeButtonProps {
  phone: string
  countryCodes: CountryCode[]  // 新增
  // ... 其他 props
}

// 内部使用 props.countryCodes 替代 useConfig().countryCodes
```

所有调用 SmsCodeButton 的父组件需要传入 countryCodes prop。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/auth/PhoneInput.tsx frontend/components/auth/SmsCodeButton.tsx
git commit -m "refactor: countryCodes 从 ConfigContext 移到 PhoneInput 按需加载"
```

---

### Task 5: panelConfig 移到面板 layout

**Files:**
- Create: `frontend/contexts/PanelConfigContext.tsx`
- Modify: `frontend/app/[locale]/[panel]/layout.tsx`

- [ ] **Step 1: 创建 PanelConfigContext**

```typescript
// frontend/contexts/PanelConfigContext.tsx
'use client'

/**
 * 面板配置 Context。
 * 仅在 admin/portal 面板中加载，首页不加载。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/api'

interface PanelPage {
  key: string
  icon: string
  permissions?: string[]
}

interface PanelConfig {
  admin: PanelPage[]
  portal: PanelPage[]
}

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  admin: [],
  portal: [],
}

const PanelConfigContext = createContext<PanelConfig>(DEFAULT_PANEL_CONFIG)

export function PanelConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PanelConfig>(DEFAULT_PANEL_CONFIG)

  useEffect(() => {
    api.get('/public/panel-config')
      .then((res) => setConfig({ ...DEFAULT_PANEL_CONFIG, ...res.data.value }))
      .catch(() => {})
  }, [])

  return (
    <PanelConfigContext value={config}>
      {children}
    </PanelConfigContext>
  )
}

export function usePanelConfig(): PanelConfig {
  return useContext(PanelConfigContext)
}
```

- [ ] **Step 2: 在面板 layout 中使用 PanelConfigProvider**

在 `frontend/app/[locale]/[panel]/layout.tsx` 中用 `PanelConfigProvider` 包裹 children。

- [ ] **Step 3: 更新所有引用 panelConfig 的组件**

将 `useConfig().panelConfig` 或 `useLocalizedConfig().panelConfig` 替换为 `usePanelConfig()`。

- [ ] **Step 4: 提交**

```bash
git add frontend/contexts/PanelConfigContext.tsx frontend/app/[locale]/[panel]/layout.tsx
git commit -m "refactor: panelConfig 移到面板 layout 按需加载"
```

---

### Task 6: Header 水合可见性

**Files:**
- Modify: `frontend/components/layout/Header.tsx`

- [ ] **Step 1: 引入 useHydrated 并包裹交互元素**

```typescript
// frontend/components/layout/Header.tsx
import { useHydrated } from "@/hooks/useHydrated"

// 在 Header 函数体内：
const hydrated = useHydrated()
```

桌面端（第 149-185 行）：用 `hydrated &&` 包裹 LocaleSwitcher 和用户区域（登录/退出/管理后台）：

```tsx
{/* 原来的 div className={editable ? "pointer-events-none" : ""} 包裹的 LocaleSwitcher */}
{hydrated && (
  <div className={editable ? "pointer-events-none" : ""}>
    <LocaleSwitcher />
  </div>
)}

{/* 原来的用户区域 div */}
{hydrated && (
  <div className={editable ? "pointer-events-none" : ""}>
    {user ? (
      // ... 退出按钮、管理后台入口
    ) : (
      // ... 登录/注册按钮
    )}
  </div>
)}
```

移动端（第 259-297 行）：用 `hydrated &&` 包裹用户区域和汉堡按钮：

```tsx
{hydrated && (
  <>
    {user ? (/* portal 入口 */) : (/* 登录按钮 */)}
    <button onClick={() => setMenuOpen(!menuOpen)}>
      {menuOpen ? <X /> : <Menu />}
    </button>
  </>
)}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/layout/Header.tsx
git commit -m "feat: Header 交互元素水合前不可见"
```

---

### Task 7: E2E 测试 — 移除 networkidle，改用元素等待

**Files:**
- Modify: `frontend/e2e/fns/reload-auth.ts`
- Modify: `frontend/e2e/fns/auth-flow.ts`
- Modify: `frontend/e2e/fns/register.ts`
- Modify: `frontend/e2e/fns/logout.ts`
- Modify: `frontend/e2e/fns/login.ts`
- Modify: `frontend/e2e/fns/disabled-verify.ts`
- Modify: `frontend/e2e/fns/public-pages.ts`
- Modify: `frontend/e2e/fns/search-filter.ts`
- Modify: `frontend/e2e/fns/idor.ts`
- Modify: `frontend/e2e/fns/jwt-security.ts`

- [ ] **Step 1: 批量移除所有 fn 文件中的 `networkidle`**

对所有文件执行：
```bash
sed -i '/waitForLoadState.*networkidle/d' \
  frontend/e2e/fns/reload-auth.ts \
  frontend/e2e/fns/auth-flow.ts \
  frontend/e2e/fns/register.ts \
  frontend/e2e/fns/logout.ts \
  frontend/e2e/fns/login.ts \
  frontend/e2e/fns/disabled-verify.ts \
  frontend/e2e/fns/public-pages.ts \
  frontend/e2e/fns/search-filter.ts \
  frontend/e2e/fns/idor.ts \
  frontend/e2e/fns/jwt-security.ts
```

每个 fn 在 `goto("/")` 后已有具体的元素等待（`loginBtn.waitFor()`、`logoutBtn.or(loginBtn).first().waitFor()` 等），水合完成后按钮出现，不需要 networkidle。

- [ ] **Step 2: 更新 documents.ts 的 deleteDocument fn**

当前 `deleteDocument` 使用 `page.once("dialog")` 处理浏览器 confirm。改为操作 AlertDialog UI 组件：

```typescript
// frontend/e2e/fns/documents.ts — deleteDocument 函数
// 移除: page.once("dialog", (d) => d.accept())
// 改为:
await rows.first().getByRole("button", { name: /删除/ }).click()

// 等待 AlertDialog 出现
const alertDialog = page.getByRole("alertdialog")
await alertDialog.waitFor({ state: "visible" })

// 点击确认按钮
const deleteResponse = page.waitForResponse(
  (r) => r.url().includes("/portal/documents/list/detail/delete") && r.request().method() === "POST",
  { timeout: 15_000 },
)
await alertDialog.getByRole("button", { name: /删除/ }).click()
```

- [ ] **Step 3: 更新 assign-role.ts 适配 shadcn Select**

当前使用 native setter 操作原生 `<select>`。改为操作 shadcn Select 组件：

```typescript
// frontend/e2e/fns/assign-role.ts
// 找到角色分配区域
const roleSection = page.getByRole("heading", { name: "分配角色" }).locator("..")

// 点击 Select trigger 打开下拉
const trigger = roleSection.getByRole("combobox")
await trigger.click()

// 等待下拉列表出现，点击目标角色
const option = page.getByRole("option", { name: roleName })
await option.waitFor({ state: "visible" })
await option.click()

// 验证选中
const selectedText = await trigger.textContent()
if (!selectedText?.includes(roleName)) {
  throw new Error(`角色选择失败: 期望包含 "${roleName}", 实际 "${selectedText}"`)
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/e2e/fns/
git commit -m "refactor: E2E 移除 networkidle，适配 AlertDialog 和 shadcn Select"
```

---

### Task 8: 全量 E2E 测试验证

- [ ] **Step 1: 构建生产容器**

```bash
docker compose -f docker-compose.yml up -d --build
```

- [ ] **Step 2: 运行全量 E2E 测试**

```bash
pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
```

预期：184 pass / 0 fail / 0 breaker / 0 timeout

- [ ] **Step 3: 验证覆盖率**

预期四维度 100%：
- API 92/92
- Route 22/22
- Component 166/166
- Security 77/77

- [ ] **Step 4: 如有失败，诊断修复后重跑**

LAST_NOT_PASS 重跑确认修复：
```bash
LAST_NOT_PASS=1 pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
```

- [ ] **Step 5: 提交最终修复（如有）**
