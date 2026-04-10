# 通用配置面板 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将国家码和 favicon 配置从网页设置独立为管理后台的"通用配置"面板

**Architecture:** 新增前端页面和路由，复用现有 CountryCodeEditor 和 ConfigEditDialog 组件，从网页设置页面移除对应内容，无后端改动

**Tech Stack:** Next.js / React / TypeScript / next-intl / Tailwind CSS

---

## 文件变更清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 创建 | `frontend/app/[locale]/(admin)/admin/general-settings/page.tsx` | 通用配置页面 |
| 修改 | `frontend/components/layout/AdminSidebar.tsx` | 侧边栏新增菜单项 |
| 修改 | `frontend/app/[locale]/(admin)/admin/web-settings/page.tsx` | 移除通用配置 section 和 favicon_url 字段 |
| 修改 | `frontend/messages/zh.json` | 新增 AdminGeneral + 侧边栏翻译 |
| 修改 | `frontend/messages/en.json` | 新增 AdminGeneral + 侧边栏翻译 |
| 修改 | `frontend/messages/ja.json` | 新增 AdminGeneral + 侧边栏翻译 |
| 修改 | `frontend/messages/de.json` | 新增 AdminGeneral + 侧边栏翻译 |

---

## Task 1: i18n 翻译键

**Files:**
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: zh.json — Admin 中新增 generalSettings 键**

在 `"Admin"` 对象的 `"webSettings"` 之前添加：

```json
"generalSettings": "通用配置",
```

- [ ] **Step 2: zh.json — 新增 AdminGeneral namespace**

在 `"AdminGroups"` 之后添加新的 namespace：

```json
"AdminGeneral": {
  "title": "通用配置",
  "faviconTitle": "网站图标",
  "faviconDesc": "浏览器标签页显示的图标",
  "countryCodeTitle": "国家码管理",
  "countryCodeDesc": "登录和注册时可用的手机号国家码",
  "saveSuccess": "保存成功",
  "saveError": "保存失败"
},
```

- [ ] **Step 3: en.json — 同样新增 Admin.generalSettings 和 AdminGeneral namespace**

Admin:
```json
"generalSettings": "General Settings",
```

AdminGeneral:
```json
"AdminGeneral": {
  "title": "General Settings",
  "faviconTitle": "Favicon",
  "faviconDesc": "Icon displayed in the browser tab",
  "countryCodeTitle": "Country Codes",
  "countryCodeDesc": "Phone country codes available for login and registration",
  "saveSuccess": "Saved successfully",
  "saveError": "Save failed"
},
```

- [ ] **Step 4: ja.json — 同样新增**

Admin:
```json
"generalSettings": "一般設定",
```

AdminGeneral:
```json
"AdminGeneral": {
  "title": "一般設定",
  "faviconTitle": "ファビコン",
  "faviconDesc": "ブラウザタブに表示されるアイコン",
  "countryCodeTitle": "国コード管理",
  "countryCodeDesc": "ログインと登録に使用可能な電話番号の国コード",
  "saveSuccess": "保存しました",
  "saveError": "保存に失敗しました"
},
```

- [ ] **Step 5: de.json — 同样新增**

Admin:
```json
"generalSettings": "Allgemeine Einstellungen",
```

AdminGeneral:
```json
"AdminGeneral": {
  "title": "Allgemeine Einstellungen",
  "faviconTitle": "Favicon",
  "faviconDesc": "Symbol in der Browser-Registerkarte",
  "countryCodeTitle": "Ländercodes",
  "countryCodeDesc": "Verfügbare Telefon-Ländercodes für Anmeldung und Registrierung",
  "saveSuccess": "Erfolgreich gespeichert",
  "saveError": "Speichern fehlgeschlagen"
},
```

- [ ] **Step 6: 提交**

```bash
git add frontend/messages/
git commit -m "feat: 通用配置面板 i18n 翻译键"
```

---

## Task 2: 侧边栏新增菜单项

**Files:**
- Modify: `frontend/components/layout/AdminSidebar.tsx:1-34`

- [ ] **Step 1: 添加 Wrench 图标导入**

在 import 中将 `Settings` 之后添加 `Wrench`：

```typescript
import {
  LayoutDashboard,
  Users,
  Shield,
  Wrench,
  Settings,
  ArrowLeft,
} from "lucide-react"
```

- [ ] **Step 2: MENU_KEYS 中新增 generalSettings**

在 `roleManagement` 和 `webSettings` 之间插入：

```typescript
{ key: "generalSettings", href: "/admin/general-settings", icon: Wrench, permissions: ["admin.settings.*"] },
```

完整的 MENU_KEYS：

```typescript
const MENU_KEYS: MenuItem[] = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "userManagement", href: "/admin/users", icon: Users, permissions: ["admin.user.*"] },
  { key: "roleManagement", href: "/admin/roles", icon: Shield, permissions: ["admin.role.*"] },
  { key: "generalSettings", href: "/admin/general-settings", icon: Wrench, permissions: ["admin.settings.*"] },
  { key: "webSettings", href: "/admin/web-settings", icon: Settings, permissions: ["admin.settings.*"] },
]
```

- [ ] **Step 3: 提交**

```bash
git add frontend/components/layout/AdminSidebar.tsx
git commit -m "feat: 侧边栏新增通用配置菜单项"
```

---

## Task 3: 创建通用配置页面

**Files:**
- Create: `frontend/app/[locale]/(admin)/admin/general-settings/page.tsx`

- [ ] **Step 1: 创建页面文件**

```tsx
"use client"

/**
 * 通用配置页面。
 * 管理非可视化的系统配置：网站图标(favicon)和手机号国家码。
 */

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import api from "@/lib/api"
import { CountryCodeEditor } from "@/components/admin/CountryCodeEditor"
import { ConfigEditDialog } from "@/components/admin/ConfigEditDialog"
import type { SiteInfo } from "@/types/config"

/** favicon 编辑字段定义 */
const FAVICON_FIELDS = [
  { key: "favicon_url", label: "Favicon", type: "image" as const, localized: false },
]

export default function GeneralSettingsPage() {
  const t = useTranslations("AdminGeneral")

  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  /** 获取 site_info 配置 */
  const fetchSiteInfo = useCallback(async () => {
    try {
      const res = await api.get("/admin/config")
      const configs = res.data as Array<{ key: string; value: any }>
      const value = configs.find((c) => c.key === "site_info")?.value
      if (value) setSiteInfo(value)
    } catch {
      toast.error(t("saveError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSiteInfo()
  }, [fetchSiteInfo])

  /** 保存 favicon */
  async function handleSaveFavicon(data: Record<string, any>): Promise<void> {
    const updated = { ...siteInfo, ...data }
    await api.put("/admin/config/site_info", { value: updated })
    toast.success(t("saveSuccess"))
    await fetchSiteInfo()
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* 网站图标 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("faviconTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("faviconDesc")}</p>
        <div className="mt-2">
          {siteInfo?.favicon_url ? (
            <img
              src={siteInfo.favicon_url}
              alt="favicon"
              className="size-16 cursor-pointer rounded border object-contain p-1"
              onClick={() => setDialogOpen(true)}
            />
          ) : (
            <button
              className="flex size-16 items-center justify-center rounded border border-dashed text-sm text-muted-foreground hover:bg-muted/30"
              onClick={() => setDialogOpen(true)}
            >
              上传
            </button>
          )}
        </div>
      </section>

      {/* 国家码管理 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("countryCodeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("countryCodeDesc")}</p>
        <CountryCodeEditor />
      </section>

      {/* Favicon 编辑弹窗 */}
      {dialogOpen && siteInfo && (
        <ConfigEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={t("faviconTitle")}
          fields={FAVICON_FIELDS}
          data={siteInfo}
          onSave={handleSaveFavicon}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/app/[locale]/(admin)/admin/general-settings/page.tsx
git commit -m "feat: 通用配置页面 — favicon 上传 + 国家码管理"
```

---

## Task 4: 网页设置页面移除通用配置

**Files:**
- Modify: `frontend/app/[locale]/(admin)/admin/web-settings/page.tsx`

- [ ] **Step 1: 移除 CountryCodeEditor 导入**

删除这一行：

```typescript
import { CountryCodeEditor } from '@/components/admin/CountryCodeEditor'
```

- [ ] **Step 2: SITE_INFO_FIELDS 中移除 favicon_url**

将 SITE_INFO_FIELDS 改为（删除最后一项 favicon_url）：

```typescript
const SITE_INFO_FIELDS = [
  { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
  { key: 'tagline', label: '品牌标语', type: 'text' as const, localized: true },
  { key: 'hotline', label: '服务热线', type: 'text' as const, localized: false },
  { key: 'hotline_contact', label: '热线联系人', type: 'text' as const, localized: true },
  { key: 'logo_url', label: 'Logo', type: 'image' as const, localized: false },
]
```

- [ ] **Step 3: 移除"通用配置"section 的 JSX**

删除 `{/* 通用配置 */}` 这整个块（第 254-258 行）：

```tsx
      {/* 通用配置 */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">通用配置</h2>
        <CountryCodeEditor />
      </div>
```

- [ ] **Step 4: 提交**

```bash
git add frontend/app/[locale]/(admin)/admin/web-settings/page.tsx
git commit -m "refactor: 网页设置移除通用配置 section 和 favicon 字段"
```

---

## Task 5: 验证

- [ ] **Step 1: 重启前端容器**

```bash
docker compose restart frontend
```

- [ ] **Step 2: 浏览器验证通用配置页面**

打开管理后台，验证：
1. 侧边栏出现"通用配置"菜单项，位于角色管理和网页设置之间
2. 点击进入 `/admin/general-settings`，页面正常渲染
3. 网站图标 section 显示上传按钮（或已有图标）
4. 国家码管理 section 正常显示

- [ ] **Step 3: 浏览器验证网页设置页面**

打开 `/admin/web-settings`，验证：
1. 底部不再有"通用配置"section
2. 编辑网站信息弹窗中不再有 Favicon 字段
3. 其他编辑功能正常
