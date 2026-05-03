# ContactInfo Block 编辑系统改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改造 ContactInfo Block 的编辑系统，建立可复用的数组型 Block 编辑框架，实现 IconPicker、ItemEditDialog、ArrayItemBlock 三层组件体系。

**Architecture:** 底层提取 IconPicker（图标选择器）和 ItemEditDialog（字段定义驱动的通用编辑弹窗），上层封装 ArrayItemBlock（数组型 Block 通用框架）。ContactInfoBlock 作为首个接入 Block，同时修复预览一致性问题、补全四语言种子数据、实现添加区块弹窗分组。

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, Next.js

**Spec:** `docs/superpowers/specs/2026-05-03-contact-info-block-editing-design.md`

---

### Task 1: 种子数据补全四语言

**Files:**
- Modify: `backend/scripts/init/seed_config.py:148-192`

- [ ] **Step 1: 更新 contact_items 种子数据**

将 `seed_config.py` 第 148-192 行的 contact_items 数据替换为四语言完整版本：

```python
    (
        "contact_items",
        "联系信息列表",
        lambda: [
            {
                "id": CONTACT_ITEM_IDS[0],
                "icon": "phone",
                "label": {
                    "zh": "服务热线",
                    "en": "Hotline",
                    "ja": "ホットライン",
                    "de": "Hotline",
                },
                "content": {"zh": "189-1268-6656"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": CONTACT_ITEM_IDS[1],
                "icon": "mail",
                "label": {
                    "zh": "邮箱",
                    "en": "Email",
                    "ja": "メール",
                    "de": "E-Mail",
                },
                "content": {"zh": "haoranxuexing@163.com"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": CONTACT_ITEM_IDS[2],
                "icon": "message-circle",
                "label": {
                    "zh": "微信咨询",
                    "en": "WeChat",
                    "ja": "WeChat",
                    "de": "WeChat",
                },
                "content": {
                    "zh": "扫码添加客服微信",
                    "en": "Scan to add customer service",
                    "ja": "QRコードをスキャンして追加",
                    "de": "QR-Code scannen",
                },
                "image_id": None,
                "hover_zoom": True,
            },
            {
                "id": CONTACT_ITEM_IDS[3],
                "icon": "map-pin",
                "label": {
                    "zh": "办公地址",
                    "en": "Office Address",
                    "ja": "オフィス所在地",
                    "de": "Büroadresse",
                },
                "content": {
                    "zh": "苏州独墅湖大学城林泉街377号公共学院5号楼7楼",
                },
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": CONTACT_ITEM_IDS[4],
                "icon": "building",
                "label": {
                    "zh": "注册地址",
                    "en": "Registered Address",
                    "ja": "登記住所",
                    "de": "Eingetragene Adresse",
                },
                "content": {
                    "zh": "中国(江苏)自由贸易试验区苏州片区苏州工业园区苏州大道东398号太平金融大厦5层5112室",
                },
                "image_id": None,
                "hover_zoom": False,
            },
        ],
    ),
```

- [ ] **Step 2: 验证种子数据格式**

Run: `cd backend && uv run python -c "from scripts.init.seed_config import CONFIGS; print('OK:', len(CONFIGS), 'configs')"`
Expected: `OK: 5 configs`（无语法错误）

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/init/seed_config.py
git commit -m "chore: 补全 contact_items 种子数据四语言翻译和实际地址"
```

---

### Task 2: IconPicker 图标选择器

**Files:**
- Create: `frontend/src/components/admin/IconPicker.tsx`
- Read: `frontend/src/lib/icon-utils.ts`（复用 resolveIcon）

- [ ] **Step 1: 创建 IconPicker 组件**

创建 `frontend/src/components/admin/IconPicker.tsx`。核心功能：Popover 弹出，搜索框 + 当前选中预览 + 6 列图标网格 + 手动文本输入 + Lucide 链接。

```typescript
"use client"

/**
 * 图标选择器。
 * Popover 形式，搜索 + 网格 + 文本输入 + 实时预览。
 */

import { useState, useMemo } from "react"
import { icons, type LucideIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { resolveIcon } from "@/lib/icon-utils"
import { Search } from "lucide-react"

/** 常用图标子集（默认显示） */
const COMMON_ICONS = [
  "Phone", "Mail", "MessageCircle", "MapPin", "Building",
  "Globe", "Clock", "Smartphone", "Link", "FileText",
  "Briefcase", "GraduationCap", "Heart", "Star", "Users",
  "Home", "Calendar", "Camera", "Book", "Award",
  "CheckCircle", "AlertCircle", "Info", "HelpCircle", "Shield",
  "Wifi", "Printer", "Monitor", "Headphones", "Mic",
  "Video", "Image", "Music", "Download", "Upload",
  "Send", "Share", "Bookmark", "Flag", "Tag",
  "Coffee", "Utensils", "Car", "Plane", "Train",
  "Bus", "Bike", "Anchor", "Compass", "Map",
]

interface IconPickerProps {
  /** 当前图标名称 */
  value: string
  /** 选中图标回调 */
  onChange: (name: string) => void
  className?: string
}

/** 图标选择器 */
export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [textInput, setTextInput] = useState(value)

  const CurrentIcon = resolveIcon(value)

  /** 过滤图标列表 */
  const filteredIcons = useMemo(() => {
    if (!search.trim()) return COMMON_ICONS
    const q = search.toLowerCase()
    return Object.keys(icons).filter((name) =>
      name.toLowerCase().includes(q),
    ).slice(0, 60)
  }, [search])

  /** 选择图标 */
  function handleSelect(name: string): void {
    onChange(name)
    setTextInput(name)
    setOpen(false)
    setSearch("")
  }

  /** 手动输入图标名称 */
  function handleTextChange(text: string): void {
    setTextInput(text)
    if (resolveIcon(text) !== resolveIcon("")) {
      onChange(text)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent ${className ?? ""}`}
        >
          {CurrentIcon && <CurrentIcon className="size-5 text-primary" />}
          <span className="text-muted-foreground">
            {value || "选择图标"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索图标名称..."
            className="pl-8"
          />
        </div>

        {/* 当前选中预览 */}
        {value && (
          <div className="mb-3 flex items-center gap-2 rounded bg-primary/5 px-2 py-1.5 text-sm">
            {CurrentIcon && <CurrentIcon className="size-4 text-primary" />}
            <span className="font-medium text-primary">{value}</span>
            <span className="ml-auto text-xs text-muted-foreground">当前选中</span>
          </div>
        )}

        {/* 图标网格 */}
        <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
          {filteredIcons.map((name) => {
            const Icon = icons[name as keyof typeof icons] as LucideIcon | undefined
            if (!Icon) return null
            const isActive = name === value
            return (
              <button
                key={name}
                type="button"
                title={name}
                className={`flex size-9 items-center justify-center rounded transition-colors ${
                  isActive
                    ? "border border-primary bg-primary/10"
                    : "hover:bg-accent"
                }`}
                onClick={() => handleSelect(name)}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-6 py-4 text-center text-xs text-muted-foreground">
              未找到匹配图标
            </div>
          )}
        </div>

        {/* 手动输入 */}
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Input
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="手动输入图标名称"
              className="text-xs"
            />
            <span className="shrink-0 text-xs text-muted-foreground">手动输入</span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            参考{" "}
            <a
              href="https://lucide.dev/icons/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Lucide 图标库
            </a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无与 IconPicker.tsx 相关的错误

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/IconPicker.tsx
git commit -m "feat: 新增 IconPicker 图标选择器组件"
```

---

### Task 3: ItemEditDialog 条目编辑弹窗

**Files:**
- Create: `frontend/src/components/admin/ItemEditDialog.tsx`
- Read: `frontend/src/components/admin/LanguageCapsule.tsx`（复用语言切换）
- Read: `frontend/src/components/admin/ImageUploadField.tsx`（复用图片上传）
- Read: `frontend/src/components/admin/IconPicker.tsx`（Task 2 产物）

- [ ] **Step 1: 定义 FieldDefinition 类型**

创建 `frontend/src/components/admin/ItemEditDialog.tsx`，先写类型定义和导出：

```typescript
"use client"

/**
 * 通用条目编辑弹窗。
 * 字段定义驱动，LanguageCapsule 语言切换。
 */

import { useState, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LanguageCapsule } from "@/components/admin/LanguageCapsule"
import { IconPicker } from "@/components/admin/IconPicker"
import { ImageUploadField } from "@/components/admin/ImageUploadField"
import { CONFIG_LOCALES, type ConfigLocale } from "@/lib/i18n-config"

/** 字段定义 */
export interface FieldDefinition {
  key: string
  label: string
  type: "text" | "textarea" | "icon" | "image" | "switch" | "select" | "number"
  localized: boolean
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  description?: string
  showWhen?: (data: Record<string, unknown>) => boolean
}

interface ItemEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  fields: FieldDefinition[]
  data: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  sourceHint?: string
}
```

- [ ] **Step 2: 实现 ItemEditDialog 组件主体**

在同一文件中继续编写组件：

```typescript
/** 通用条目编辑弹窗 */
export function ItemEditDialog({
  open, onOpenChange, title, subtitle, fields, data, onSave, sourceHint,
}: ItemEditDialogProps) {
  const [locale, setLocale] = useState<ConfigLocale>("zh")
  const [formData, setFormData] = useState<Record<ConfigLocale, Record<string, unknown>>>(() =>
    initFormData(fields, data),
  )
  const [sharedData, setSharedData] = useState<Record<string, unknown>>(() =>
    initSharedData(fields, data),
  )
  const [saving, setSaving] = useState(false)

  /** 获取当前 locale 的字段值 */
  const getLocaleValue = useCallback(
    (key: string) => (formData[locale]?.[key] as string) ?? "",
    [formData, locale],
  )

  /** 设置当前 locale 的字段值 */
  function setLocaleValue(key: string, value: string): void {
    setFormData((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [key]: value },
    }))
  }

  /** 设置共享字段值 */
  function setSharedValue(key: string, value: unknown): void {
    setSharedData((prev) => ({ ...prev, [key]: value }))
  }

  /** 合并所有 locale 数据并提交 */
  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      const merged: Record<string, unknown> = { ...sharedData }
      for (const field of fields) {
        if (field.localized) {
          const localized: Record<string, string> = {}
          for (const loc of CONFIG_LOCALES) {
            const v = formData[loc.value as ConfigLocale]?.[field.key]
            if (v) localized[loc.value] = v as string
          }
          merged[field.key] = localized
        }
      }
      await onSave(merged)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  /** 合并后的数据（用于 showWhen 判断） */
  const mergedForCondition = { ...sharedData, ...formData[locale] }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
            </div>
            <LanguageCapsule value={locale} onChange={setLocale} />
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {sourceHint && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {sourceHint}
            </div>
          )}

          {fields.map((field) => {
            if (field.showWhen && !field.showWhen(mergedForCondition)) return null
            return (
              <div key={field.key}>
                <Label className="mb-1.5 block text-sm font-medium">
                  {field.label}
                  {field.required && locale === "zh" && (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </Label>
                {renderField(field, locale, getLocaleValue, setLocaleValue, sharedData, setSharedValue)}
                {field.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            )
          })}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: 实现字段渲染函数和初始化工具**

在同一文件底部添加：

```typescript
/** 渲染单个字段 */
function renderField(
  field: FieldDefinition,
  locale: ConfigLocale,
  getLocaleValue: (key: string) => string,
  setLocaleValue: (key: string, value: string) => void,
  sharedData: Record<string, unknown>,
  setSharedValue: (key: string, value: unknown) => void,
): React.ReactNode {
  const isOptional = locale !== "zh"
  const placeholder = field.placeholder ?? (isOptional && field.localized ? `${field.label}（可选）` : "")

  switch (field.type) {
    case "text":
      return field.localized ? (
        <Input
          value={getLocaleValue(field.key)}
          onChange={(e) => setLocaleValue(field.key, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          value={(sharedData[field.key] as string) ?? ""}
          onChange={(e) => setSharedValue(field.key, e.target.value)}
          placeholder={placeholder}
        />
      )
    case "textarea":
      return field.localized ? (
        <Textarea
          value={getLocaleValue(field.key)}
          onChange={(e) => setLocaleValue(field.key, e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <Textarea
          value={(sharedData[field.key] as string) ?? ""}
          onChange={(e) => setSharedValue(field.key, e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      )
    case "icon":
      return (
        <IconPicker
          value={(sharedData[field.key] as string) ?? ""}
          onChange={(v) => setSharedValue(field.key, v)}
        />
      )
    case "image":
      return (
        <ImageUploadField
          value={(sharedData[field.key] as string) ?? ""}
          onChange={(v) => setSharedValue(field.key, v)}
        />
      )
    case "switch":
      return (
        <Switch
          checked={!!sharedData[field.key]}
          onCheckedChange={(v) => setSharedValue(field.key, v)}
        />
      )
    default:
      return null
  }
}

/** 初始化多语言表单数据 */
function initFormData(
  fields: FieldDefinition[],
  data: Record<string, unknown>,
): Record<ConfigLocale, Record<string, unknown>> {
  const result = {} as Record<ConfigLocale, Record<string, unknown>>
  for (const loc of CONFIG_LOCALES) {
    const locKey = loc.value as ConfigLocale
    result[locKey] = {}
    for (const field of fields) {
      if (!field.localized) continue
      const val = data[field.key]
      if (typeof val === "object" && val !== null) {
        result[locKey][field.key] = (val as Record<string, string>)[locKey] ?? ""
      } else if (typeof val === "string" && locKey === "zh") {
        result[locKey][field.key] = val
      } else {
        result[locKey][field.key] = ""
      }
    }
  }
  return result
}

/** 初始化非多语言（共享）字段数据 */
function initSharedData(
  fields: FieldDefinition[],
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.localized) continue
    result[field.key] = data[field.key] ?? (field.type === "switch" ? false : "")
  }
  return result
}
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无与 ItemEditDialog.tsx 相关的错误

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/ItemEditDialog.tsx
git commit -m "feat: 新增 ItemEditDialog 通用条目编辑弹窗"
```

---

### Task 4: 添加区块弹窗分组

**Files:**
- Modify: `frontend/src/components/admin/web-settings/AddBlockDialog.tsx`

- [ ] **Step 1: 改造 AddBlockDialog 为分组布局**

将 `AddBlockDialog.tsx` 的 `BLOCK_REGISTRY` 和渲染逻辑改为按分组组织：

```typescript
"use client"

/**
 * 添加区块弹窗。
 * 按类型分组展示所有可用区块，点击选择后触发 onSelect 回调。
 */

import {
  FileText, LayoutGrid, ListOrdered, FileCheck,
  Images, Newspaper, GraduationCap, Trophy, Star, Megaphone, Contact,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody,
} from "@/components/ui/dialog"
import type { BlockType } from "@/types/block"

/** 区块类型注册表 */
interface BlockRegistryItem {
  type: BlockType
  name: string
  desc: string
  icon: LucideIcon
}

/** 分组定义 */
interface BlockGroup {
  label: string
  items: BlockRegistryItem[]
}

const BLOCK_GROUPS: BlockGroup[] = [
  {
    label: "基础内容",
    items: [
      { type: "intro", name: "介绍", desc: "标题 + 描述段落", icon: FileText },
      { type: "cta", name: "行动号召", desc: "标题 + 描述 + 咨询按钮", icon: Megaphone },
    ],
  },
  {
    label: "自定义列表",
    items: [
      { type: "card_grid", name: "卡片网格", desc: "图标卡片 / 时间线 / 城市指南", icon: LayoutGrid },
      { type: "step_list", name: "步骤列表", desc: "编号步骤纵向列表", icon: ListOrdered },
      { type: "doc_list", name: "文档清单", desc: "图标 + 文本列表", icon: FileCheck },
      { type: "contact_info", name: "联系方式", desc: "联系信息卡片（数据来自全局配置）", icon: Contact },
    ],
  },
  {
    label: "媒体",
    items: [
      { type: "gallery", name: "图片墙", desc: "水平滚动图片画廊", icon: Images },
    ],
  },
  {
    label: "数据展示",
    items: [
      { type: "article_list", name: "文章列表", desc: "按分类的文章列表", icon: Newspaper },
      { type: "university_list", name: "院校列表", desc: "搜索筛选院校", icon: GraduationCap },
      { type: "case_grid", name: "案例网格", desc: "成功案例卡片", icon: Trophy },
      { type: "featured_data", name: "精选展示", desc: "精选院校或案例", icon: Star },
    ],
  },
]

interface AddBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: BlockType) => void
}

/** 添加区块弹窗 */
export function AddBlockDialog({ open, onOpenChange, onSelect }: AddBlockDialogProps) {
  /** 选择区块类型 */
  function handleSelect(type: BlockType): void {
    onSelect(type)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加区块</DialogTitle>
          <DialogDescription>选择要添加的区块类型</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {BLOCK_GROUPS.map((group) => (
            <div key={group.label}>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {group.items.map((item) => (
                  <div
                    key={item.type}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
                    onClick={() => handleSelect(item.type)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleSelect(item.type)
                      }
                    }}
                  >
                    <item.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 3: 用 Playwright 验证弹窗分组显示**

打开后台 web-settings 页面，点击"添加模组"按钮，截图确认分组标题和卡片排列。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/web-settings/AddBlockDialog.tsx
git commit -m "style: 添加区块弹窗按类型分组显示"
```

---

### Task 5: BlockContentTab 支持 contact_info

**Files:**
- Modify: `frontend/src/components/admin/web-settings/BlockContentTab.tsx:26-30`
- Modify: `frontend/src/components/admin/web-settings/UnifiedBlockEditor.tsx`

- [ ] **Step 1: 修改 getBlockEditType 让 contact_info 返回 "array"**

在 `BlockContentTab.tsx` 第 26-30 行，将 `contact_info` 从 "api" 改为 "array"：

```typescript
export function getBlockEditType(type: BlockType): BlockEditType {
  if (type === "intro" || type === "cta") return "simple"
  if (
    type === "card_grid" || type === "step_list" ||
    type === "doc_list" || type === "gallery" || type === "contact_info"
  ) return "array"
  return "api"
}
```

这样 UnifiedBlockEditor 中的"内容编辑"标签页不再禁用。

- [ ] **Step 2: 在 BlockContentTab 中添加 contact_info 的条目列表渲染**

在 `BlockContentTab.tsx` 的 `ArrayItemsForm` 组件中，找到字段定义映射，为 `contact_info` 添加字段列表。具体实现取决于现有 ArrayItemsForm 的结构，需要添加 contact_info 类型的字段定义和列表项渲染。

在 ARRAY_FIELDS 中添加 contact_info 条目（参考现有 card_grid 的字段定义模式），使用 ItemEditDialog 替代现有的 inline 编辑方式。

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/web-settings/BlockContentTab.tsx
git add frontend/src/components/admin/web-settings/UnifiedBlockEditor.tsx
git commit -m "feat: BlockContentTab 支持 contact_info 内容编辑标签页"
```

---

### Task 6: ContactInfoBlock 重构 — 双入口编辑 + 预览一致性

**Files:**
- Modify: `frontend/src/components/blocks/ContactInfoBlock.tsx`
- Modify: `frontend/src/components/about/ContactInfoSection.tsx`（添加按钮仅 hover 显示）

- [ ] **Step 1: 修改添加按钮为仅 hover Block 时显示**

在 `ContactInfoBlock.tsx` 中，将 `AddContactItemMenu` 的 footer 包裹在 `group-hover/block:opacity-100 opacity-0` 的容器中，确保非 hover 状态下不占网格位。使用 CSS `hidden group-hover/block:flex` 来实现仅 hover 时显示。

在 `ContactInfoSection.tsx` 中，修改 footer prop 的渲染方式，使其不作为网格中的一个卡片占位，而是仅在 hover 时以绝对定位或追加方式显示。

- [ ] **Step 2: 修改编辑入口使用 ItemEditDialog**

在 `ContactInfoBlock.tsx` 中：
- 添加 `editingItem` 状态管理
- 铅笔按钮点击时设置 `editingItem` 而非直接调用 `onEditConfig`
- 渲染 `ItemEditDialog`，传入 `CONTACT_INFO_FIELDS` 字段定义
- 保存时根据 global/custom 类型分别调用 `onEditConfig` 对应的保存逻辑

```typescript
const CONTACT_INFO_FIELDS: FieldDefinition[] = [
  { key: "icon", label: "图标", type: "icon", localized: false },
  { key: "label", label: "标签", type: "text", localized: true, required: true },
  { key: "content", label: "内容", type: "text", localized: true, required: true },
  { key: "image_id", label: "图片", type: "image", localized: false, description: "如二维码图片" },
  {
    key: "hover_zoom", label: "悬浮放大", type: "switch", localized: false,
    description: "鼠标 hover 时放大显示图片",
    showWhen: (data) => !!data.image_id,
  },
]
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/blocks/ContactInfoBlock.tsx
git add frontend/src/components/about/ContactInfoSection.tsx
git commit -m "feat: ContactInfoBlock 双入口编辑 + 添加按钮仅 hover 显示"
```

---

### Task 7: handleEditConfig 更新 — 完整字段支持

**Files:**
- Modify: `frontend/src/app/[locale]/[panel]/web-settings/page.tsx:362-486`

- [ ] **Step 1: 更新 contact_item_global 编辑字段**

在 `page.tsx` 的 `handleEditConfig` 中，找到 `contact_item_global_` 分支（约第 362-386 行），将 fields 从只有 label/content 扩展为完整的 5 个字段（icon/label/content/image_id/hover_zoom）。

- [ ] **Step 2: 更新 contact_item_custom 编辑字段**

同样扩展 `contact_item_custom_` 分支（约第 387-419 行）的字段列表。

- [ ] **Step 3: 更新添加自定义条目的字段**

扩展 `contact_item_add_custom_` 分支（约第 458-486 行），新建条目时使用完整字段。

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/[locale]/[panel]/web-settings/page.tsx
git commit -m "feat: handleEditConfig 支持完整的 contact_item 字段编辑"
```

---

### Task 8: 添加按钮样式改造 — 模拟联系卡片

**Files:**
- Modify: `frontend/src/components/blocks/AddContactItemMenu.tsx`

- [ ] **Step 1: 修改添加按钮样式**

将当前虚线边框样式改为模拟联系卡片的完整布局（图标位 + 标签位 + 内容位），整体半透明（opacity: 0.6），暗示可添加。

```tsx
<div className="flex items-start gap-3 rounded-lg border border-border/50 p-4 opacity-60 transition-opacity hover:opacity-100">
  <CirclePlus className="mt-0.5 size-5 shrink-0 text-primary/50" />
  <div>
    <div className="text-sm font-medium text-muted-foreground">新建条目</div>
    <div className="mt-0.5 text-xs text-muted-foreground/70">点击添加联系方式</div>
  </div>
</div>
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/blocks/AddContactItemMenu.tsx
git commit -m "style: 添加条目按钮改为模拟联系卡片布局样式"
```

---

### Task 9: Playwright 验证预览一致性

**Files:**
- No code changes, verification only

- [ ] **Step 1: 启动开发容器**

Run: `./scripts/dev.sh start`

- [ ] **Step 2: 重建数据库以加载新种子数据**

Run: `docker compose down -v && ./scripts/dev.sh start`

- [ ] **Step 3: 用 Playwright 对比公开页面和后台预览**

打开 `/about` 截图 ContactInfo 区域，再打开 `/admin/web-settings` 切换到关于我们页面截图同一区域。对比确认：
- 非 hover 状态下卡片布局一致（5 个卡片，3+2 布局）
- 添加按钮不可见
- 卡片样式、间距、字体一致

- [ ] **Step 4: 验证编辑功能**

在后台预览中：
- hover 联系信息卡片，确认铅笔按钮出现
- 点击铅笔按钮，确认 ItemEditDialog 弹窗打开
- 确认弹窗包含 5 个字段：图标（IconPicker）、标签、内容、图片上传、悬浮放大开关
- 切换 LanguageCapsule 到 EN，确认标签/内容字段切换为英文值
- 点击 Block 齿轮按钮 → 内容编辑标签页，确认条目列表可见
- 点击添加条目，确认 AddContactItemMenu 出现

- [ ] **Step 5: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: 修复预览一致性和编辑功能问题"
```
