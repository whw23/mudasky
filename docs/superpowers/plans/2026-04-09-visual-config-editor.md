# 可视化配置编辑器 + 多语言配置 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理后台设置页面改为可视化预览（复用前台 Header/Footer/首页/关于我们组件）+ 点击弹窗编辑 + 多语言配置支持。

**Architecture:** 配置字段从纯字符串改为多语言对象（`{zh: "", en: "", ...}`），前端通过 `getLocalizedValue()` 取值并 fallback 到中文。设置页面复用前台组件渲染预览，用 `EditableOverlay` 包裹可编辑区域提供 hover 高亮，点击弹出 `ConfigEditDialog` 显示多语言表单。网关从 Cookie 注入 `X-User-Locale` header。

**Tech Stack:** Next.js + React + TypeScript (前端), OpenResty Lua (网关)

**Spec:** `docs/superpowers/specs/2026-04-09-visual-config-editor-design.md`

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `frontend/lib/i18n-config.ts` | `getLocalizedValue()` 工具函数 + 支持的语言列表 |
| 新建 | `frontend/components/admin/EditableOverlay.tsx` | 可编辑区域包装器（hover 高亮 + 点击回调） |
| 新建 | `frontend/components/admin/ConfigEditDialog.tsx` | 多语言弹窗编辑器 |
| 新建 | `frontend/components/admin/LocalizedInput.tsx` | 单个多语言字段输入组件 |
| 修改 | `frontend/contexts/ConfigContext.tsx` | 用 `getLocalizedValue()` 处理多语言数据 |
| 修改 | `frontend/components/layout/Header.tsx` | 加 `editable` prop + EditableOverlay |
| 修改 | `frontend/components/layout/Footer.tsx` | 加 `editable` prop + EditableOverlay |
| 修改 | `frontend/components/home/StatsSection.tsx` | 加 `editable` prop |
| 修改 | `frontend/components/about/AboutContent.tsx` | 加 `editable` prop |
| 重写 | `frontend/app/[locale]/(admin)/admin/settings/page.tsx` | 可视化预览布局 |
| 删除 | `frontend/components/admin/SiteInfoEditor.tsx` | 功能合并到可视化编辑 |
| 删除 | `frontend/components/admin/ContactInfoEditor.tsx` | 同上 |
| 删除 | `frontend/components/admin/HomepageStatsEditor.tsx` | 同上 |
| 删除 | `frontend/components/admin/AboutInfoEditor.tsx` | 同上 |
| 修改 | `frontend/types/config.ts` | 类型定义支持多语言字段 |
| 修改 | `gateway/lua/auth.lua` | 注入 X-User-Locale header |

---

### Task 1: 多语言工具函数 + 类型定义

**目标：** 创建多语言取值工具和更新类型定义。

**Files:**
- Create: `frontend/lib/i18n-config.ts`
- Modify: `frontend/types/config.ts`

- [ ] **Step 1: 创建 `frontend/lib/i18n-config.ts`**

```typescript
/**
 * 配置多语言工具。
 * 处理配置字段的多语言取值，fallback 到中文。
 */

/** 支持的语言列表 */
export const CONFIG_LOCALES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "de", label: "Deutsch" },
] as const

export type ConfigLocale = (typeof CONFIG_LOCALES)[number]["code"]

/** 多语言字段类型 */
export type LocalizedField = string | Record<string, string>

/**
 * 从多语言字段中取当前语言的值。
 * fallback 链：当前语言 → 中文（中文必填）。
 * 兼容旧的纯字符串格式。
 */
export function getLocalizedValue(
  field: LocalizedField | undefined,
  locale: string
): string {
  if (!field) return ""
  if (typeof field === "string") return field
  return field[locale] || field["zh"]
}

/**
 * 创建空的多语言字段对象。
 */
export function createLocalizedField(zhValue: string = ""): Record<string, string> {
  return { zh: zhValue, en: "", ja: "", de: "" }
}
```

- [ ] **Step 2: 修改 `frontend/types/config.ts`**

读取文件，将需要多语言的字段类型从 `string` 改为 `string | Record<string, string>`。保持向下兼容。

SiteInfo:
- `brand_name`: `string | Record<string, string>`
- `brand_name_en`: 删除（合并到 brand_name.en）
- `tagline`: `string | Record<string, string>`
- `hotline_contact`: `string | Record<string, string>`

ContactInfo:
- `address`: `string | Record<string, string>`
- `office_hours`: `string | Record<string, string>`

HomepageStat:
- `label`: `string | Record<string, string>`

AboutInfo:
- `history`, `mission`, `vision`, `partnership`: 全部 `string | Record<string, string>`

- [ ] **Step 3: Commit**

```
feat: 多语言配置工具函数 + 类型定义
```

---

### Task 2: ConfigContext 适配多语言

**目标：** ConfigContext 用 `getLocalizedValue()` 处理多语言字段。

**Files:**
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 修改 ConfigContext**

在 ConfigContext 中：
- import `getLocalizedValue` from `@/lib/i18n-config`
- 获取当前 locale（用 next-intl 的 `useLocale()`）
- 导出两个版本：
  - `useConfig()` — 返回原始数据（多语言对象），编辑时使用
  - `useLocalizedConfig()` — 返回已解析为当前语言的数据，展示时使用

```typescript
export function useLocalizedConfig() {
  const config = useConfig()
  const locale = useLocale()
  
  return {
    ...config,
    siteInfo: {
      ...config.siteInfo,
      brand_name: getLocalizedValue(config.siteInfo.brand_name, locale),
      tagline: getLocalizedValue(config.siteInfo.tagline, locale),
      hotline_contact: getLocalizedValue(config.siteInfo.hotline_contact, locale),
    },
    contactInfo: {
      ...config.contactInfo,
      address: getLocalizedValue(config.contactInfo.address, locale),
      office_hours: getLocalizedValue(config.contactInfo.office_hours, locale),
    },
    homepageStats: config.homepageStats.map((s) => ({
      ...s,
      label: getLocalizedValue(s.label, locale),
    })),
    aboutInfo: {
      history: getLocalizedValue(config.aboutInfo.history, locale),
      mission: getLocalizedValue(config.aboutInfo.mission, locale),
      vision: getLocalizedValue(config.aboutInfo.vision, locale),
      partnership: getLocalizedValue(config.aboutInfo.partnership, locale),
    },
  }
}
```

- [ ] **Step 2: 更新所有前台组件的 useConfig → useLocalizedConfig**

Header、Footer、StatsSection、AboutContent 等前台展示组件改用 `useLocalizedConfig()`。

- [ ] **Step 3: Commit**

```
feat: ConfigContext 支持多语言取值
```

---

### Task 3: 可编辑区域组件（EditableOverlay + LocalizedInput + ConfigEditDialog）

**目标：** 创建可视化编辑所需的 3 个新组件。

**Files:**
- Create: `frontend/components/admin/EditableOverlay.tsx`
- Create: `frontend/components/admin/LocalizedInput.tsx`
- Create: `frontend/components/admin/ConfigEditDialog.tsx`

- [ ] **Step 1: 创建 EditableOverlay**

```tsx
/**
 * 可编辑区域包装器。
 * hover 时显示蓝色虚线边框 + 铅笔图标，点击触发编辑。
 */
interface EditableOverlayProps {
  children: React.ReactNode
  onClick: () => void
  label?: string  // tooltip 提示（如"点击编辑品牌名称"）
}
```

- hover 态：`ring-2 ring-dashed ring-blue-400` + 右上角铅笔图标
- 点击态：调用 `onClick`
- 使用 `position: relative` 包裹子组件

- [ ] **Step 2: 创建 LocalizedInput**

```tsx
/**
 * 多语言字段输入组件。
 * 渲染 4 个语言的 input 或 textarea，中文必填。
 */
interface LocalizedInputProps {
  value: string | Record<string, string>
  onChange: (value: Record<string, string>) => void
  label: string
  multiline?: boolean  // true 用 textarea
  rows?: number
}
```

渲染 4 行，每行：`[语言标签] [输入框]`，中文行加 `required`。

- [ ] **Step 3: 创建 ConfigEditDialog**

```tsx
/**
 * 配置编辑弹窗。
 * 接收字段定义列表，渲染多语言表单。
 */
interface FieldDefinition {
  key: string
  label: string
  type: "text" | "textarea" | "image"
  localized: boolean  // 是否多语言
  rows?: number
}

interface ConfigEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: FieldDefinition[]
  data: Record<string, any>
  onSave: (data: Record<string, any>) => Promise<void>
}
```

- 多语言字段用 `LocalizedInput`
- 非多语言字段用普通 `Input`
- 图片字段显示预览 + 上传按钮
- 底部保存/取消按钮
- 保存时中文必填验证

- [ ] **Step 4: Commit**

```
feat: 可编辑区域组件（EditableOverlay + LocalizedInput + ConfigEditDialog）
```

---

### Task 4: Header/Footer 支持编辑模式

**目标：** 给 Header 和 Footer 加 `editable` prop，启用时包裹 EditableOverlay。

**Files:**
- Modify: `frontend/components/layout/Header.tsx`
- Modify: `frontend/components/layout/Footer.tsx`

- [ ] **Step 1: 修改 Header**

加 `editable?: boolean` 和 `onEdit?: (section: string) => void` props。

当 `editable` 为 true 时：
- 品牌名称区域包裹 `EditableOverlay`，点击触发 `onEdit("brand")`
- 标语区域包裹 `EditableOverlay`，点击触发 `onEdit("tagline")`
- 热线区域包裹 `EditableOverlay`，点击触发 `onEdit("hotline")`

非编辑态行为不变。

- [ ] **Step 2: 修改 Footer**

同理加 `editable` + `onEdit` props：
- 品牌名/联系方式区域 → `onEdit("contact")`
- 微信二维码区域 → `onEdit("wechat_qr")`
- 备案号区域 → `onEdit("icp")`

- [ ] **Step 3: Commit**

```
feat: Header/Footer 支持可编辑模式
```

---

### Task 5: 首页统计 + 关于我们支持编辑模式

**目标：** StatsSection 和 AboutContent 加编辑模式。

**Files:**
- Modify: `frontend/components/home/StatsSection.tsx`
- Modify: `frontend/components/about/AboutContent.tsx`

- [ ] **Step 1: 修改 StatsSection**

加 `editable` prop。编辑态时：
- 每个统计项包裹 `EditableOverlay`，点击弹窗编辑该项的 value + 多语言 label
- 底部加"添加统计项"和"删除"按钮

- [ ] **Step 2: 修改 AboutContent 的子组件**

HistorySection、MissionVisionSection、PartnershipSection 加 `editable` prop。
编辑态时各段文字包裹 `EditableOverlay`，点击弹窗编辑多语言内容。

- [ ] **Step 3: Commit**

```
feat: StatsSection/AboutContent 支持可编辑模式
```

---

### Task 6: 设置页面重写

**目标：** 重写管理后台设置页面为可视化预览布局。

**Files:**
- Rewrite: `frontend/app/[locale]/(admin)/admin/settings/page.tsx`
- Delete: `frontend/components/admin/SiteInfoEditor.tsx`
- Delete: `frontend/components/admin/ContactInfoEditor.tsx`
- Delete: `frontend/components/admin/HomepageStatsEditor.tsx`
- Delete: `frontend/components/admin/AboutInfoEditor.tsx`

- [ ] **Step 1: 重写设置页面**

```tsx
// 页面结构
export default function SettingsPage() {
  // 状态管理
  const config = useConfig()  // 原始多语言数据
  const [editDialog, setEditDialog] = useState<DialogState>(null)
  
  // 保存回调
  async function handleSave(key: string, data: any) {
    await api.put(`/admin/config/${key}`, { value: data })
    // 刷新 config
  }

  return (
    <div className="space-y-8">
      {/* Header 预览 */}
      <section>
        <h2>页头设置</h2>
        <div className="border rounded-lg overflow-hidden">
          <Header editable onEdit={(section) => openDialog("site_info", section)} />
        </div>
      </section>

      {/* 首页统计预览 */}
      <section>
        <h2>首页统计</h2>
        <StatsSection editable onEdit={...} />
      </section>

      {/* 关于我们预览 */}
      <section>
        <h2>关于我们</h2>
        <AboutContent editable onEdit={...} />
      </section>

      {/* Footer 预览 */}
      <section>
        <h2>页脚设置</h2>
        <div className="border rounded-lg overflow-hidden">
          <Footer editable onEdit={(section) => openDialog("contact_info", section)} />
        </div>
      </section>

      {/* 国家码（保持表格形式） */}
      <CountryCodeEditor />

      {/* 编辑弹窗 */}
      <ConfigEditDialog ... />
    </div>
  )
}
```

- [ ] **Step 2: 删除旧编辑器组件**

删除 SiteInfoEditor、ContactInfoEditor、HomepageStatsEditor、AboutInfoEditor。

- [ ] **Step 3: Commit**

```
feat: 管理后台设置页面改为可视化预览编辑
```

---

### Task 7: 网关注入 X-User-Locale

**目标：** 网关从 Cookie 读取语言偏好并注入 header。

**Files:**
- Modify: `gateway/lua/auth.lua`

- [ ] **Step 1: 修改 auth.lua**

在 header 注入部分，从 Cookie 读取 `NEXT_INTL_LOCALE` 并注入：

```lua
-- 从 Cookie 读取语言偏好
local locale = "zh"
if cookie_header then
  for pair in string.gmatch(cookie_header, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == "NEXT_INTL_LOCALE" then
      locale = v
      break
    end
  end
end
ngx.req.set_header("X-User-Locale", locale)
```

注意：这段代码要在公开路由放行之后、Cookie 解析部分执行。对于未认证请求也需要注入 locale（公开 API 也可能需要语言信息）。

- [ ] **Step 2: Commit**

```
feat: 网关注入 X-User-Locale header
```

---

### Task 8: 集成验证

- [ ] **Step 1: 运行前端测试**

```bash
cd frontend && pnpm test -- --run
```

- [ ] **Step 2: 启动容器验证**

1. 浏览器打开管理后台 → 系统设置
2. 确认看到 Header/Footer/首页/关于我们的真实预览
3. 点击可编辑区域，弹窗显示多语言表单
4. 编辑中文和英文内容，保存
5. 切换语言验证 fallback 逻辑
6. 确认前台页面显示更新后的内容

- [ ] **Step 3: Commit（如有修复）**

```
fix: 可视化配置编辑器集成修复
```
