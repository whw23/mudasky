# ContactInfo Block 条目选择 + 自定义 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ContactInfo Block 支持从全局 contactItems 中选择性引用 + 添加自定义条目，全局条目可就地编辑并同步更新。

**Architecture:** 全局 contactItems 加 `id` 字段作为稳定引用键。ContactInfo Block 的 `data` 从 null 改为 `{ items: [{ type: "global", id } | { type: "custom", ...fields }] }`。渲染时 global 类型从 ConfigContext 实时取值，custom 直接用自身数据。data 为 null 时向后兼容显示全部。

**Tech Stack:** Python (后端种子数据/service), TypeScript/React (前端类型/组件), shadcn/ui (DropdownMenu/Dialog)

**Spec:** `docs/superpowers/specs/2026-04-26-contact-info-block-items-design.md`

---

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `backend/scripts/init/seed_config.py` | 种子数据每项加 `id` |
| 修改 | `backend/api/api/admin/config/service.py` | 保存 contact_items 时自动补 `id` |
| 修改 | `frontend/types/config.ts` | ContactItem 加 `id` 字段 |
| 修改 | `frontend/types/block.ts` | 新增 ContactInfoBlockItem 类型 |
| 修改 | `frontend/components/blocks/ContactInfoBlock.tsx` | 解析 block.data.items，区分 global/custom |
| 修改 | `frontend/components/about/ContactInfoSection.tsx` | 接收 items prop，支持删除按钮 |
| 修改 | `frontend/components/admin/web-settings/UnifiedBlockEditor.tsx` | contact_info 不再特殊加载全局数据 |
| 修改 | `frontend/components/admin/web-settings/BlockContentTab.tsx` | contact_info 改为专用编辑模式 |
| 修改 | `frontend/components/admin/web-settings/PageBlocksPreview.tsx` | contact_info 默认 data 改为 null |
| 修改 | `frontend/app/[locale]/[panel]/web-settings/page.tsx` | handleEditConfig 区分 global/custom |

---

## Task 1: 后端 — 种子数据加 id

**Files:**
- Modify: `backend/scripts/init/seed_config.py:144-184`

- [ ] **Step 1: 修改种子数据，每项加 uuid**

```python
# seed_config.py 顶部添加 import
from uuid import uuid4
```

每个 contact_items 条目加 `"id": str(uuid4())`：

```python
    (
        "contact_items",
        "联系信息列表",
        lambda: [
            {
                "id": str(uuid4()),
                "icon": "phone",
                "label": {"zh": "服务热线", "en": "Hotline"},
                "content": {"zh": "189-1268-6656"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": str(uuid4()),
                "icon": "mail",
                "label": {"zh": "邮箱", "en": "Email"},
                "content": {"zh": "info@mudasky.com"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": str(uuid4()),
                "icon": "message-circle",
                "label": {"zh": "微信咨询", "en": "WeChat"},
                "content": {"zh": "扫码添加客服微信"},
                "image_id": None,
                "hover_zoom": True,
            },
            {
                "id": str(uuid4()),
                "icon": "map-pin",
                "label": {"zh": "公司地址", "en": "Address"},
                "content": {"zh": "苏州市工业园区"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": str(uuid4()),
                "icon": "building",
                "label": {"zh": "注册地址", "en": "Registered Address"},
                "content": {"zh": "苏州市工业园区"},
                "image_id": None,
                "hover_zoom": False,
            },
        ],
    ),
```

- [ ] **Step 2: 提交**

```bash
git add backend/scripts/init/seed_config.py
git commit -m "feat: 种子数据 contact_items 每项加 id 字段"
```

---

## Task 2: 后端 — 保存时自动补 id

**Files:**
- Modify: `backend/api/api/admin/config/service.py:45-62`

- [ ] **Step 1: 在 update_value 中对 contact_items 自动补 id**

在 `ConfigService.update_value` 方法中，validator 校验之后、`repository.update_value` 之前，对 `contact_items` 类型的 value 遍历补 id：

```python
from uuid import uuid4

async def update_value(self, key: str, value: Any) -> ConfigResponse:
    """更新配置值，按 key 查找对应验证器校验。"""
    config = await repository.get_by_key(self.session, key)
    if not config:
        raise NotFoundException(message=f"配置项 {key} 不存在", code="CONFIG_NOT_FOUND")

    validator = CONFIG_VALIDATORS.get(key)
    if validator:
        try:
            validated = validator.model_validate(value)
            if hasattr(validated, "to_list"):
                value = validated.to_list()
        except ValidationError as e:
            raise BadRequestException(message=str(e))

    if key == "contact_items" and isinstance(value, list):
        for item in value:
            if isinstance(item, dict) and not item.get("id"):
                item["id"] = str(uuid4())

    await repository.update_value(self.session, config, value)
    await self.session.commit()
    return ConfigResponse.model_validate(config)
```

- [ ] **Step 2: 提交**

```bash
git add backend/api/api/admin/config/service.py
git commit -m "feat: 保存 contact_items 时自动补 id"
```

---

## Task 3: 前端类型定义

**Files:**
- Modify: `frontend/types/config.ts:17-23`
- Modify: `frontend/types/block.ts`

- [ ] **Step 1: ContactItem 加 id**

`frontend/types/config.ts` 中 ContactItem 接口加 `id` 字段：

```typescript
/** 联系信息条目 */
export interface ContactItem {
  id: string
  icon: string
  label: LocalizedField
  content: LocalizedField
  image_id: string | null
  hover_zoom: boolean
}
```

- [ ] **Step 2: 新增 ContactInfoBlockItem 类型**

在 `frontend/types/block.ts` 末尾添加：

```typescript
/** ContactInfo Block 条目引用（全局引用或自定义） */
export type ContactInfoBlockItem =
  | { type: "global"; id: string }
  | {
      type: "custom"
      icon: string
      label: LocalizedField
      content: LocalizedField
      image_id: string | null
      hover_zoom: boolean
    }
```

- [ ] **Step 3: 提交**

```bash
git add frontend/types/config.ts frontend/types/block.ts
git commit -m "feat: ContactItem 加 id，新增 ContactInfoBlockItem 类型"
```

---

## Task 4: ContactInfoSection — 接收 items prop

**Files:**
- Modify: `frontend/components/about/ContactInfoSection.tsx`

当前 ContactInfoSection 直接从 `useLocalizedConfig()` 读取 `contactItems`。改为接收可选的 `items` prop，有则用 prop，没有则从全局读取（向后兼容）。

同时新增 `onDelete` 回调和删除按钮（编辑模式下可见）。

- [ ] **Step 1: 修改组件接口和渲染逻辑**

```typescript
import type { ContactItem } from "@/types/config"

interface ContactInfoSectionProps {
  editable?: boolean
  onEditField?: (field: string) => void
  onDelete?: (index: number) => void
  maxColumns?: number
  /** 外部传入的条目列表（优先使用），未传则从全局读取 */
  items?: Array<{ icon: string; label: string; content: string; image_id: string | null; hover_zoom: boolean }>
}

export function ContactInfoSection({
  editable,
  onEditField,
  onDelete,
  maxColumns = 3,
  items: externalItems,
}: ContactInfoSectionProps) {
  const { contactItems } = useLocalizedConfig()
  const displayItems = externalItems ?? contactItems

  return (
    <section id="contact-info" className="py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className={`grid gap-6 sm:grid-cols-2 ${maxColumns >= 3 ? "lg:grid-cols-3" : ""}`}>
          {displayItems.map((item, index) => {
            const Icon = resolveIcon(item.icon, icons.Info)!
            const imageUrl = item.image_id ? `/api/public/images/detail?id=${item.image_id}` : ""

            const content = (
              <div className="flex items-start gap-3 rounded-lg bg-white p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    {item.content}
                  </div>
                </div>
                {imageUrl && item.hover_zoom && <QrPopover url={imageUrl} alt={item.label} />}
                {imageUrl && !item.hover_zoom && (
                  <img src={imageUrl} alt={item.label} className="size-16 rounded border object-contain" />
                )}
              </div>
            )

            if (editable) {
              return (
                <div key={index} className="group relative">
                  <EditableOverlay
                    onClick={() => onEditField?.(String(index))}
                    label={`编辑${item.label}`}
                  >
                    {content}
                  </EditableOverlay>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(index) }}
                      className="absolute top-2 left-2 z-10 rounded bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                      title="移除条目"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              )
            }
            return <div key={index}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
```

需要在顶部 import 中添加 `Trash2`：

```typescript
import { Trash2 } from "lucide-react"
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/about/ContactInfoSection.tsx
git commit -m "refactor: ContactInfoSection 支持外部 items prop 和删除按钮"
```

---

## Task 5: ContactInfoBlock — 解析 block.data.items

**Files:**
- Modify: `frontend/components/blocks/ContactInfoBlock.tsx`

ContactInfoBlock 负责解析 `block.data`，将 global/custom 混合列表解析为统一的展示条目列表，传给 ContactInfoSection。

- [ ] **Step 1: 重写 ContactInfoBlock**

```typescript
"use client"

/**
 * 联系信息区块。
 * 支持从全局 contactItems 引用条目 + 自定义条目。
 * data 为 null 时向后兼容展示所有全局条目。
 */

import { useCallback, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { useConfig, useLocalizedConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import { useLocale } from "next-intl"
import { AddContactItemMenu } from "./AddContactItemMenu"
import type { Block, ContactInfoBlockItem } from "@/types/block"
import type { ReactNode } from "react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onEditConfig?: (section: string) => void
}

/** 联系信息区块 */
export function ContactInfoBlock({ block, header, bg, editable, onEdit, onEditConfig }: BlockProps) {
  const { contactItems: rawContactItems } = useConfig()
  const locale = useLocale()
  const items: ContactInfoBlockItem[] | null = block.data?.items ?? null

  /** 解析条目列表为展示用数据 */
  const displayItems = resolveItems(items, rawContactItems, locale)

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑联系信息">
        <div className={bg}>
          {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
          <ContactInfoSection
            editable={editable}
            maxColumns={block.options?.maxColumns}
            items={displayItems}
            onEditField={onEditConfig
              ? (index) => {
                  const itemDef = items?.[Number(index)]
                  if (!itemDef || itemDef.type === "global") {
                    onEditConfig(`contact_item_global_${itemDef?.id ?? index}`)
                  } else {
                    onEditConfig(`contact_item_custom_${block.id}_${index}`)
                  }
                }
              : undefined}
            onDelete={onEditConfig
              ? (index) => onEditConfig(`contact_item_delete_${block.id}_${index}`)
              : undefined}
          />
          {/* 添加条目按钮 */}
          <div className="mx-auto max-w-7xl px-4 pb-6" data-editable>
            <AddContactItemMenu
              block={block}
              items={items}
              globalItems={rawContactItems}
              onEditConfig={onEditConfig!}
            />
          </div>
        </div>
      </SpotlightOverlay>
    )
  }

  return (
    <div className={bg}>
      {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
      <ContactInfoSection
        maxColumns={block.options?.maxColumns}
        items={displayItems}
      />
    </div>
  )
}

/** 解析 items 列表为展示用数据 */
function resolveItems(
  items: ContactInfoBlockItem[] | null,
  globalItems: Array<{ id: string; icon: string; label: any; content: any; image_id: string | null; hover_zoom: boolean }>,
  locale: string,
): Array<{ icon: string; label: string; content: string; image_id: string | null; hover_zoom: boolean }> {
  if (!items) {
    return globalItems.map((g) => ({
      icon: g.icon,
      label: getLocalizedValue(g.label, locale),
      content: getLocalizedValue(g.content, locale),
      image_id: g.image_id,
      hover_zoom: g.hover_zoom,
    }))
  }

  const result: Array<{ icon: string; label: string; content: string; image_id: string | null; hover_zoom: boolean }> = []
  for (const item of items) {
    if (item.type === "global") {
      const g = globalItems.find((gi) => gi.id === item.id)
      if (!g) continue
      result.push({
        icon: g.icon,
        label: getLocalizedValue(g.label, locale),
        content: getLocalizedValue(g.content, locale),
        image_id: g.image_id,
        hover_zoom: g.hover_zoom,
      })
    } else {
      result.push({
        icon: item.icon,
        label: getLocalizedValue(item.label, locale),
        content: getLocalizedValue(item.content, locale),
        image_id: item.image_id,
        hover_zoom: item.hover_zoom,
      })
    }
  }
  return result
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/blocks/ContactInfoBlock.tsx
git commit -m "feat: ContactInfoBlock 解析 block.data.items 区分 global/custom"
```

---

## Task 6: AddContactItemMenu — 添加条目下拉菜单

**Files:**
- Create: `frontend/components/blocks/AddContactItemMenu.tsx`

- [ ] **Step 1: 创建添加条目下拉菜单组件**

```typescript
"use client"

/**
 * ContactInfo Block 添加条目下拉菜单。
 * 列出未被引用的全局条目 + 自定义新建选项。
 */

import { Plus, Globe, PenLine } from "lucide-react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getLocalizedValue } from "@/lib/i18n-config"
import { resolveIcon } from "@/lib/icon-utils"
import { icons } from "lucide-react"
import type { Block, ContactInfoBlockItem } from "@/types/block"
import type { ContactItem } from "@/types/config"

interface AddContactItemMenuProps {
  block: Block
  items: ContactInfoBlockItem[] | null
  globalItems: ContactItem[]
  onEditConfig: (section: string) => void
}

/** 添加条目下拉菜单 */
export function AddContactItemMenu({ block, items, globalItems, onEditConfig }: AddContactItemMenuProps) {
  const locale = useLocale()

  const referencedIds = new Set(
    (items ?? []).filter((i) => i.type === "global").map((i) => i.id),
  )
  const availableGlobal = globalItems.filter((g) => !referencedIds.has(g.id))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full border-dashed">
          <Plus className="mr-1 size-4" />
          添加条目
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {availableGlobal.map((g) => {
          const Icon = resolveIcon(g.icon, icons.Info)!
          return (
            <DropdownMenuItem
              key={g.id}
              onClick={() => onEditConfig(`contact_item_add_global_${block.id}_${g.id}`)}
            >
              <Icon className="mr-2 size-4 text-muted-foreground" />
              {getLocalizedValue(g.label, locale)}
            </DropdownMenuItem>
          )
        })}
        {availableGlobal.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => onEditConfig(`contact_item_add_custom_${block.id}`)}>
          <PenLine className="mr-2 size-4 text-muted-foreground" />
          自定义条目
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/blocks/AddContactItemMenu.tsx
git commit -m "feat: 添加 AddContactItemMenu 组件"
```

---

## Task 7: web-settings page.tsx — 处理新的编辑/添加/删除命令

**Files:**
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx:361-388`

当前 `handleEditConfig` 中的 `contact_item_N` 分支需要扩展，支持以下新 section 前缀：

| 前缀 | 含义 |
|------|------|
| `contact_item_global_{id}` | 编辑全局条目 |
| `contact_item_custom_{blockId}_{index}` | 编辑自定义条目 |
| `contact_item_delete_{blockId}_{index}` | 删除条目 |
| `contact_item_add_global_{blockId}_{globalId}` | 添加全局引用 |
| `contact_item_add_custom_{blockId}` | 添加自定义条目弹窗 |

- [ ] **Step 1: 重写 handleEditConfig 中的 contact_item 分支**

替换 `page.tsx` 中 `default:` 分支里 `contact_item_` 的处理逻辑：

```typescript
default:
  if (section.startsWith('contact_item_global_')) {
    // 编辑全局条目
    const globalId = section.replace('contact_item_global_', '')
    const idx = rawConfig.contactItems.findIndex((i: any) => i.id === globalId)
    const item = rawConfig.contactItems[idx]
    if (item) {
      setDialogState({
        open: true,
        title: '编辑联系信息',
        fields: [
          { key: 'label', label: '标签', type: 'text' as const, localized: true },
          { key: 'content', label: '内容', type: 'text' as const, localized: true },
        ],
        configKey: 'contact_items',
        data: item,
        customSave: async (data) => {
          const updated = [...rawConfig.contactItems]
          updated[idx] = { ...item, ...data }
          await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
          toast.success('保存成功')
          await fetchAllConfigs(true)
          refreshConfig()
        },
      })
    }
  } else if (section.startsWith('contact_item_custom_')) {
    // 编辑自定义条目
    const rest = section.replace('contact_item_custom_', '')
    const sepIdx = rest.lastIndexOf('_')
    const blockId = rest.substring(0, sepIdx)
    const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
    const currentPageBlocks = pageBlocks[currentPage] ?? []
    const block = currentPageBlocks.find((b: any) => b.id === blockId)
    if (block?.data?.items?.[itemIndex]?.type === 'custom') {
      const customItem = block.data.items[itemIndex]
      setDialogState({
        open: true,
        title: '编辑自定义条目',
        fields: [
          { key: 'icon', label: '图标名称', type: 'text' as const, localized: false },
          { key: 'label', label: '标签', type: 'text' as const, localized: true },
          { key: 'content', label: '内容', type: 'text' as const, localized: true },
        ],
        configKey: 'page_blocks',
        data: customItem,
        customSave: async (data) => {
          const updatedItems = [...block.data.items]
          updatedItems[itemIndex] = { ...customItem, ...data }
          const updatedBlock = { ...block, data: { items: updatedItems } }
          const updatedBlocks = currentPageBlocks.map((b: any) => b.id === blockId ? updatedBlock : b)
          const allPageBlocks = { ...pageBlocks, [currentPage]: updatedBlocks }
          await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
          toast.success('保存成功')
          await fetchAllConfigs(true)
          refreshConfig()
        },
      })
    }
  } else if (section.startsWith('contact_item_delete_')) {
    // 删除条目
    const rest = section.replace('contact_item_delete_', '')
    const sepIdx = rest.lastIndexOf('_')
    const blockId = rest.substring(0, sepIdx)
    const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
    const currentPageBlocks = pageBlocks[currentPage] ?? []
    const block = currentPageBlocks.find((b: any) => b.id === blockId)
    if (block?.data?.items) {
      const updatedItems = block.data.items.filter((_: any, i: number) => i !== itemIndex)
      const updatedBlock = { ...block, data: { items: updatedItems } }
      const updatedBlocks = currentPageBlocks.map((b: any) => b.id === blockId ? updatedBlock : b)
      const allPageBlocks = { ...pageBlocks, [currentPage]: updatedBlocks }
      await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
      toast.success('已移除条目')
      await fetchAllConfigs(true)
      refreshConfig()
    }
  } else if (section.startsWith('contact_item_add_global_')) {
    // 添加全局引用
    const rest = section.replace('contact_item_add_global_', '')
    const sepIdx = rest.indexOf('_')
    const blockId = rest.substring(0, sepIdx)
    const globalId = rest.substring(sepIdx + 1)
    const currentPageBlocks = pageBlocks[currentPage] ?? []
    const block = currentPageBlocks.find((b: any) => b.id === blockId)
    if (block) {
      const currentItems: any[] = block.data?.items ?? rawConfig.contactItems.map((g: any) => ({ type: "global", id: g.id }))
      const updatedItems = [...currentItems, { type: "global", id: globalId }]
      const updatedBlock = { ...block, data: { items: updatedItems } }
      const updatedBlocks = currentPageBlocks.map((b: any) => b.id === blockId ? updatedBlock : b)
      const allPageBlocks = { ...pageBlocks, [currentPage]: updatedBlocks }
      await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
      toast.success('已添加条目')
      await fetchAllConfigs(true)
      refreshConfig()
    }
  } else if (section.startsWith('contact_item_add_custom_')) {
    // 添加自定义条目
    const blockId = section.replace('contact_item_add_custom_', '')
    setDialogState({
      open: true,
      title: '添加自定义条目',
      fields: [
        { key: 'icon', label: '图标名称', type: 'text' as const, localized: false },
        { key: 'label', label: '标签', type: 'text' as const, localized: true },
        { key: 'content', label: '内容', type: 'text' as const, localized: true },
      ],
      configKey: 'page_blocks',
      data: { icon: '', label: '', content: '', image_id: null, hover_zoom: false },
      customSave: async (data) => {
        const currentPageBlocks = pageBlocks[currentPage] ?? []
        const block = currentPageBlocks.find((b: any) => b.id === blockId)
        if (!block) return
        const currentItems: any[] = block.data?.items ?? rawConfig.contactItems.map((g: any) => ({ type: "global", id: g.id }))
        const newItem = { type: "custom" as const, icon: data.icon || 'info', ...data }
        const updatedItems = [...currentItems, newItem]
        const updatedBlock = { ...block, data: { items: updatedItems } }
        const updatedBlocks = currentPageBlocks.map((b: any) => b.id === blockId ? updatedBlock : b)
        const allPageBlocks = { ...pageBlocks, [currentPage]: updatedBlocks }
        await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
        toast.success('已添加自定义条目')
        await fetchAllConfigs(true)
        refreshConfig()
      },
    })
  }
  break
```

注意：`handleEditConfig` 需要变为 `async` 函数（delete 和 add_global 分支直接调用 API）。

- [ ] **Step 2: 确保 handleEditConfig 为 async**

在 `page.tsx` 中将 `function handleEditConfig(section: string)` 改为 `async function handleEditConfig(section: string)`。

- [ ] **Step 3: 确保 pageBlocks 和 activePage 在 handleEditConfig 作用域内可访问**

`pageBlocks` 来自 `useConfig()`（已在 page.tsx 中解构）。`activePage` 是 `useState('home')` 的状态变量（page.tsx:85）。两者都在组件作用域内，`handleEditConfig` 作为同一组件内的函数可以直接访问。代码中引用 `pageBlocks[activePage]` 获取当前页面的 block 列表。

- [ ] **Step 4: 提交**

```bash
git add frontend/app/[locale]/[panel]/web-settings/page.tsx
git commit -m "feat: handleEditConfig 支持 contact_item 的 global/custom/delete/add 操作"
```

---

## Task 8: UnifiedBlockEditor — 适配新 data 结构

**Files:**
- Modify: `frontend/components/admin/web-settings/UnifiedBlockEditor.tsx:82-88`
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx:27-31, 68-75`

contact_info Block 不再从 API 加载全局 contact_items，而是直接使用 `block.data`。

- [ ] **Step 1: UnifiedBlockEditor 去掉 contact_info 的特殊加载**

在 `UnifiedBlockEditor.tsx` 的 `useEffect` 中，删除 `block.type === "contact_info"` 分支，让它走默认的 `block.data` 路径：

```typescript
useEffect(() => {
  if (!block || !open) return
  setShowTitle(block.showTitle)
  setSectionTag(block.sectionTag)
  setSectionTitle(normalizeLocalized(block.sectionTitle))
  setBgColor(block.bgColor)
  setOptions({ ...block.options })
  setData(JSON.parse(JSON.stringify(block.data ?? null)))
  setLocale("zh")

  const editType = getBlockEditType(block.type)
  if (defaultTab) {
    setActiveTab(defaultTab)
  } else {
    setActiveTab(editType === "api" ? "config" : "content")
  }
}, [block, open, defaultTab])
```

- [ ] **Step 2: BlockContentTab 中 contact_info 改为 config-only 类型**

在 `BlockContentTab.tsx` 中，将 `contact_info` 从 `"array"` 改为 `"api"`（因为条目管理已在预览中通过下拉菜单/删除按钮完成，不需要弹窗内的数组编辑）：

```typescript
export function getBlockEditType(type: BlockType): BlockEditType {
  if (type === "intro" || type === "cta") return "simple"
  if (type === "card_grid" || type === "step_list" || type === "doc_list" || type === "gallery") return "array"
  return "api"
}
```

并删除 `ARRAY_FIELDS` 中的 `contact_info` 条目。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/UnifiedBlockEditor.tsx frontend/components/admin/web-settings/BlockContentTab.tsx
git commit -m "refactor: contact_info Block 编辑改为 config-only，去掉弹窗内数组编辑"
```

---

## Task 9: PageBlocksPreview — contact_info 默认 data

**Files:**
- Modify: `frontend/components/admin/web-settings/PageBlocksPreview.tsx:288-299`

- [ ] **Step 1: getDefaultData 中 contact_info 返回 null**

确认 `getDefaultData` 中 `contact_info` 走 `default: return null`。当前已经是 null（走 default 分支），无需修改。如果需要确认，检查 `createDefaultBlock` 函数即可。

此步骤无代码变更，仅确认。

---

## Task 10: 数据迁移 — 现有数据补 id

**Files:**
- 无新文件，通过重建数据库完成

- [ ] **Step 1: 重建数据库**

因为是开发环境，直接 `docker compose down -v` 重建，种子数据会自动带 `id`：

```bash
cd /home/whw23/code/mudasky
docker compose down -v && docker compose up -d
```

等待容器启动完毕后，验证 contact_items 每项都有 `id`：

```bash
docker compose exec db psql -U postgres -d mudasky -c "SELECT value FROM system_config WHERE key='contact_items';" | head -20
```

期望：每个条目都有 `"id": "uuid..."` 字段。

---

## Task 11: 浏览器验证

- [ ] **Step 1: 启动开发环境**

```bash
./scripts/dev.sh start
```

- [ ] **Step 2: 浏览器验证 — 向后兼容**

导航到网页设置页面，切换到"关于我们"预览。ContactInfo Block 的 `data` 为 null，应显示所有全局联系条目（5 条），与之前行为一致。

- [ ] **Step 3: 浏览器验证 — 添加全局条目**

1. 先删除一些条目（使不是全部显示）
2. 点击"添加条目"按钮，下拉菜单应列出未引用的全局条目
3. 选择一个全局条目，确认它出现在 Block 中

- [ ] **Step 4: 浏览器验证 — 添加自定义条目**

1. 点击"添加条目" → "自定义条目"
2. 填写 icon（如 `qq`）、标签、内容
3. 确认自定义条目出现在 Block 中

- [ ] **Step 5: 浏览器验证 — 编辑全局条目**

1. 点击全局条目的铅笔按钮
2. 修改标签或内容
3. 确认修改同步到 Footer 和其他使用该联系信息的地方

- [ ] **Step 6: 浏览器验证 — 编辑自定义条目**

1. 点击自定义条目的铅笔按钮
2. 修改内容
3. 确认修改仅影响该 Block

- [ ] **Step 7: 浏览器验证 — 删除条目**

1. 悬停条目，点击左上角红色删除按钮
2. 全局条目：确认仅从 Block 移除引用（全局数据仍在）
3. 自定义条目：确认直接删除

- [ ] **Step 8: 浏览器验证 — 公开页面**

导航到公开的"关于我们"页面，确认联系信息按 Block 配置展示。
