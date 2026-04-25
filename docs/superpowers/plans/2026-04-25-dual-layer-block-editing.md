# 双层模组编辑系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一所有 block 的编辑交互，支持 block 级 + 字段级双层编辑（spotlight 效果），并重构 ContactInfoBlock 数据模型为可增删排序的数组。

**Architecture:** 新建 SpotlightOverlay + FieldOverlay 组件，用 CSS `:has()` 驱动 spotlight 淡化效果。每个 block 在 editable 模式下用 SpotlightOverlay 包裹整体（block 级编辑入口），内部各内容字段用 FieldOverlay 包裹（字段级编辑入口）。ContactInfoBlock 数据从 5 个独立配置字段改为 `contact_items` 数组。

**Tech Stack:** React, TypeScript, Tailwind CSS, CSS `:has()`, Lucide icons, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-25-dual-layer-block-editing-design.md`

---

### Task 1: 新建 SpotlightOverlay + FieldOverlay 组件

**Files:**
- Create: `frontend/components/admin/SpotlightOverlay.tsx`
- Create: `frontend/components/admin/FieldOverlay.tsx`

- [ ] **Step 1: 创建 FieldOverlay 组件**

```tsx
// frontend/components/admin/FieldOverlay.tsx
"use client"

/** 字段级编辑高亮。hover 时显示紧凑虚线框 + 铅笔图标。 */

import { Pencil } from "lucide-react"

interface FieldOverlayProps {
  children: React.ReactNode
  onClick: () => void
  label?: string
}

export function FieldOverlay({ children, onClick, label }: FieldOverlayProps) {
  return (
    <div
      data-field
      className="group/field relative w-fit cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
    >
      {children}
      <div className="pointer-events-none absolute inset-0 rounded border-2 border-dashed border-transparent transition-colors group-hover/field:border-blue-400">
        <div className="absolute top-1 right-1 rounded bg-blue-500 p-1 text-white opacity-0 shadow transition-opacity group-hover/field:opacity-100">
          <Pencil className="size-3" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 SpotlightOverlay 组件**

```tsx
// frontend/components/admin/SpotlightOverlay.tsx
"use client"

/** 双层编辑容器。包裹整个 block，提供 block 级 + 字段级（spotlight）编辑。 */

import { Pencil } from "lucide-react"

interface SpotlightOverlayProps {
  children: React.ReactNode
  onClick: () => void
  label?: string
}

export function SpotlightOverlay({ children, onClick, label }: SpotlightOverlayProps) {
  return (
    <div
      className="spotlight-overlay group/block relative cursor-pointer"
      onClick={onClick}
      title={label}
    >
      <div className="spotlight-content">
        {children}
      </div>
      {/* block 级虚线框（无 FieldOverlay hover 时显示） */}
      <div className="spotlight-border pointer-events-none absolute inset-0 rounded border-2 border-dashed border-transparent transition-all group-hover/block:border-blue-400">
        <div className="absolute top-1 right-1 rounded bg-blue-500 p-1 text-white opacity-0 shadow transition-opacity group-hover/block:opacity-100">
          <Pencil className="size-3" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 添加 spotlight CSS 到全局样式**

Modify: `frontend/app/globals.css`

在文件末尾添加：

```css
/* 双层编辑 spotlight 效果 */
.spotlight-overlay:has([data-field]:hover) .spotlight-border {
  opacity: 0 !important;
  border-color: transparent !important;
}

.spotlight-overlay:has([data-field]:hover) .spotlight-content > *:not(:has([data-field]:hover)) {
  opacity: 0.35;
  transition: opacity 0.2s;
}

.spotlight-overlay:has([data-field]:hover) .spotlight-content > *:has([data-field]:hover) {
  opacity: 1;
}
```

- [ ] **Step 4: 验证组件渲染**

Run: `pnpm --prefix frontend exec tsc --noEmit`
Expected: 无编译错误

- [ ] **Step 5: 提交**

```bash
git add frontend/components/admin/SpotlightOverlay.tsx frontend/components/admin/FieldOverlay.tsx frontend/app/globals.css
git commit -m "feat: 新建 SpotlightOverlay + FieldOverlay 双层编辑组件"
```

---

### Task 2: 更新类型定义 + ConfigContext

**Files:**
- Modify: `frontend/types/config.ts`
- Modify: `frontend/types/block.ts`
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 添加 ContactItem 类型，替换 ContactInfo**

```ts
// frontend/types/config.ts — 替换 ContactInfo 接口
/** 联系信息条目 */
export interface ContactItem {
  icon: string
  label: LocalizedField
  content: LocalizedField
  image_id: string | null
  hover_zoom: boolean
}
```

删除旧的 `ContactInfo` 接口。

- [ ] **Step 2: 更新 ConfigContext 使用 ContactItem[]**

修改 `frontend/contexts/ConfigContext.tsx`：

1. 导入改为 `import type { ContactItem, SiteInfo, ... } from '@/types/config'`
2. 删除 `DEFAULT_CONTACT_INFO`
3. `ConfigContextType.contactInfo` 改为 `contactItems: ContactItem[]`
4. `useState<ContactInfo>` 改为 `useState<ContactItem[]>([])`
5. `fetchConfig` 中 `data.contact_info` 改为 `data.contact_items`：
   ```ts
   if (Array.isArray(data.contact_items)) setContactItems(data.contact_items)
   ```
6. `useLocalizedConfig()` 返回值中，`contactInfo` 替换为：
   ```ts
   contactItems: config.contactItems.map((item) => ({
     ...item,
     label: getLocalizedValue(item.label, locale),
     content: getLocalizedValue(item.content, locale),
   })),
   ```

- [ ] **Step 3: 类型检查**

Run: `pnpm --prefix frontend exec tsc --noEmit`
Expected: 多处编译错误（因为下游组件还在用旧接口），记录数量

- [ ] **Step 4: 提交**

```bash
git add frontend/types/config.ts frontend/types/block.ts frontend/contexts/ConfigContext.tsx
git commit -m "refactor: ContactInfo 改为 ContactItem[] 数组结构"
```

---

### Task 3: 更新 BlockRenderer + PageBlocksPreview 接线

**Files:**
- Modify: `frontend/components/blocks/BlockRenderer.tsx`
- Modify: `frontend/components/admin/web-settings/PageBlocksPreview.tsx`

- [ ] **Step 1: BlockRenderer 添加 onFieldEdit 回调**

修改 `BlockRendererProps`，添加：
```ts
/** 字段级编辑回调（block + 字段索引/标识） */
onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
```

在 `renderBlock` 中传递 `onFieldEdit` 给每个 block 组件：
```ts
const props = { block, header, bg, editable, onEdit: onEditData, onFieldEdit }
```

- [ ] **Step 2: PageBlocksPreview 添加 handleFieldEdit**

在 `PageBlocksPreview` 中新增：
```ts
/** 字段级编辑（打开 UnifiedBlockEditor 聚焦到指定字段） */
function handleFieldEdit(block: Block, fieldKey: string, fieldIndex?: number): void {
  setEditingBlock(block)
  setEditingTab("content")
  setEditingFieldIndex(fieldIndex ?? null)
}
```

添加 state：`const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null)`

将 `onFieldEdit={handleFieldEdit}` 传入 `BlockRenderer`。

将 `editingFieldIndex` 传给 `UnifiedBlockEditor`：
```tsx
<UnifiedBlockEditor
  open={!!editingBlock}
  onOpenChange={(open) => { if (!open) { setEditingBlock(null); setEditingFieldIndex(null) } }}
  block={editingBlock}
  defaultTab={editingTab}
  defaultFieldIndex={editingFieldIndex}
  onSave={handleEditSave}
/>
```

- [ ] **Step 3: 提交**

```bash
git add frontend/components/blocks/BlockRenderer.tsx frontend/components/admin/web-settings/PageBlocksPreview.tsx
git commit -m "feat: BlockRenderer + PageBlocksPreview 接入 onFieldEdit 回调"
```

---

### Task 4: 简单文本 block 改造（IntroBlock, CtaBlock）

**Files:**
- Modify: `frontend/components/blocks/IntroBlock.tsx`
- Modify: `frontend/components/blocks/CtaBlock.tsx`

- [ ] **Step 1: IntroBlock 改用 SpotlightOverlay + FieldOverlay**

```tsx
// IntroBlock.tsx — 替换编辑模式部分
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"

// 在 props 中添加 onFieldEdit
interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
}

export function IntroBlock({ block, header, bg, editable, onEdit, onFieldEdit }: BlockProps) {
  const locale = useLocale()
  const content = getLocalizedValue(block.data?.content, locale) || ""

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑介绍">
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <FieldOverlay
              onClick={() => onFieldEdit?.(block, "content")}
              label="编辑内容"
            >
              <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
                {content}
              </p>
            </FieldOverlay>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }

  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {content}
        </p>
      </div>
    </section>
  )
}
```

删除 `EditableOverlay` 导入。

- [ ] **Step 2: CtaBlock 改用 SpotlightOverlay + FieldOverlay**

同理，CtaBlock 有三个可编辑字段：`title`、`desc`、按钮文字。
用 FieldOverlay 分别包裹 `<h3>{title}</h3>`、`<p>{desc}</p>`。
按钮文字保持原样（不可编辑，因为是硬编码的"立即咨询"）。

```tsx
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"

// props 同 IntroBlock 添加 onFieldEdit

if (editable && onEdit) {
  return (
    <SpotlightOverlay onClick={() => onEdit(block)} label="编辑 CTA">
      <section className={`py-10 md:py-16 ${bgClass}`}>
        <div className="mx-auto max-w-7xl px-4 text-center">
          {header}
          {title && (
            <FieldOverlay onClick={() => onFieldEdit?.(block, "title")} label="编辑标题">
              <h3 className="mt-6 text-2xl font-bold">{title}</h3>
            </FieldOverlay>
          )}
          {desc && (
            <FieldOverlay onClick={() => onFieldEdit?.(block, "desc")} label="编辑描述">
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{desc}</p>
            </FieldOverlay>
          )}
          <ConsultButton className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            立即咨询
            <ArrowRight className="size-4" />
          </ConsultButton>
        </div>
      </section>
    </SpotlightOverlay>
  )
}
```

删除 `EditableOverlay` 导入。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/blocks/IntroBlock.tsx frontend/components/blocks/CtaBlock.tsx
git commit -m "feat: IntroBlock + CtaBlock 改用 SpotlightOverlay 双层编辑"
```

---

### Task 5: 数组 block 改造（CardGridBlock, StepListBlock, DocListBlock, GalleryBlock）

**Files:**
- Modify: `frontend/components/blocks/CardGridBlock.tsx`
- Modify: `frontend/components/blocks/StepListBlock.tsx`
- Modify: `frontend/components/blocks/DocListBlock.tsx`
- Modify: `frontend/components/blocks/GalleryBlock.tsx`

- [ ] **Step 1: CardGridBlock 改造**

用 SpotlightOverlay 包裹整体，每张卡片用 FieldOverlay 包裹：

```tsx
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"

// props 添加 onFieldEdit

if (editable && onEdit) {
  return (
    <SpotlightOverlay onClick={() => onEdit(block)} label="编辑卡片">
      <section className={`py-10 md:py-16 ${bg}`}>
        <div className="mx-auto max-w-7xl px-4">
          {header}
          <div className={`mt-8 ${gridClass}`}>
            {cards.map((card, i) => (
              <FieldOverlay
                key={card.id || i}
                onClick={() => onFieldEdit?.(block, "item", i)}
                label={`编辑卡片 ${i + 1}`}
              >
                {renderCard(cardType, card, locale, i)}
              </FieldOverlay>
            ))}
          </div>
        </div>
      </section>
    </SpotlightOverlay>
  )
}
```

删除 `EditableOverlay` 导入。

- [ ] **Step 2: StepListBlock 改造**

每个步骤用 FieldOverlay 包裹：

```tsx
if (editable && onEdit) {
  return (
    <SpotlightOverlay onClick={() => onEdit(block)} label="编辑步骤">
      <section className={`py-10 md:py-16 ${bg}`}>
        <div className="mx-auto max-w-7xl px-4">
          {header}
          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            {steps.map((step, i) => (
              <FieldOverlay
                key={i}
                onClick={() => onFieldEdit?.(block, "item", i)}
                label={`编辑步骤 ${i + 1}`}
              >
                <div className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h4 className="font-semibold">{getLocalizedValue(step.title, locale)}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{getLocalizedValue(step.desc, locale)}</p>
                  </div>
                </div>
              </FieldOverlay>
            ))}
          </div>
        </div>
      </section>
    </SpotlightOverlay>
  )
}
```

- [ ] **Step 3: DocListBlock 改造**

同理，每个文档项用 FieldOverlay 包裹。

- [ ] **Step 4: GalleryBlock 改造**

同理，每张图片用 FieldOverlay 包裹。

- [ ] **Step 5: 提交**

```bash
git add frontend/components/blocks/CardGridBlock.tsx frontend/components/blocks/StepListBlock.tsx frontend/components/blocks/DocListBlock.tsx frontend/components/blocks/GalleryBlock.tsx
git commit -m "feat: 数组 block 改用 SpotlightOverlay + 逐项 FieldOverlay"
```

---

### Task 6: API 驱动 block 改造（ArticleListBlock, UniversityListBlock, CaseGridBlock, FeaturedDataBlock）

**Files:**
- Modify: `frontend/components/blocks/ArticleListBlock.tsx`
- Modify: `frontend/components/blocks/UniversityListBlock.tsx`
- Modify: `frontend/components/blocks/CaseGridBlock.tsx`
- Modify: `frontend/components/blocks/FeaturedDataBlock.tsx`

- [ ] **Step 1: ArticleListBlock 改造**

将外层 `EditableOverlay` 替换为 `SpotlightOverlay`。保留 ManageToolbar。
`ArticleListClient` 的 `onEdit` 回调已有逐篇编辑能力，作为 FieldOverlay 的等价物（点击文章 → 打开 ArticleEditDialog）。

```tsx
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"

// 编辑模式分支
if (editable && onEdit) {
  return (
    <SpotlightOverlay onClick={() => onEdit(block)} label="编辑文章列表">
      {el}
      {/* 弹窗保持不变 */}
      {categoryId && (
        <ArticleEditDialog ... />
      )}
      <ImportPreviewDialog ... />
    </SpotlightOverlay>
  )
}
```

删除 `EditableOverlay` 导入。

- [ ] **Step 2: UniversityListBlock 改造**

同理，`EditableOverlay` → `SpotlightOverlay`。`UniversityList` 的 `onEdit` 回调已提供逐项编辑。

- [ ] **Step 3: CaseGridBlock 改造**

同理，`EditableOverlay` → `SpotlightOverlay`。`CaseGrid` 的 `onEdit` 回调已提供逐项编辑。

- [ ] **Step 4: FeaturedDataBlock 改造**

将 `EditableOverlay` → `SpotlightOverlay`。在 `UniversityGrid` 和 `CaseGrid` 的每个项目外包裹 FieldOverlay。

由于 FeaturedDataBlock 的项目数据来自 API 且只读展示，FieldOverlay 点击行为暂时与 block 级一致（打开 UnifiedBlockEditor 配置），后续可扩展为直接跳转编辑。

```tsx
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"

if (editable && onEdit) {
  return (
    <SpotlightOverlay onClick={() => onEdit(block)} label="编辑精选数据">
      {el}
    </SpotlightOverlay>
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add frontend/components/blocks/ArticleListBlock.tsx frontend/components/blocks/UniversityListBlock.tsx frontend/components/blocks/CaseGridBlock.tsx frontend/components/blocks/FeaturedDataBlock.tsx
git commit -m "feat: API 驱动 block 改用 SpotlightOverlay"
```

---

### Task 7: ContactInfoBlock + ContactInfoSection 改造

**Files:**
- Modify: `frontend/components/blocks/ContactInfoBlock.tsx`
- Modify: `frontend/components/about/ContactInfoSection.tsx`

- [ ] **Step 1: ContactInfoSection 适配 ContactItem[] 数组**

改为从 `useLocalizedConfig()` 读取 `contactItems` 数组，动态渲染：

```tsx
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { resolveIcon } from "@/lib/icon-utils"
import { icons } from "lucide-react"

export function ContactInfoSection({ editable, onEditField, maxColumns = 3 }: ContactInfoSectionProps) {
  const { contactItems, siteInfo } = useLocalizedConfig()

  return (
    <section id="contact-info" className="py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className={`grid gap-6 sm:grid-cols-2 ${maxColumns >= 3 ? "lg:grid-cols-3" : ""}`}>
          {contactItems.map((item, index) => {
            const Icon = resolveIcon(item.icon, icons.Info)!
            const imageUrl = item.image_id
              ? `/api/public/images/detail?id=${item.image_id}`
              : ""

            const content = (
              <div className="flex items-start gap-3 rounded-lg bg-white p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
                  <div className="mt-1 text-sm text-foreground">{item.content}</div>
                </div>
                {imageUrl && item.hover_zoom && (
                  <QrPopover url={imageUrl} alt={item.label} />
                )}
                {imageUrl && !item.hover_zoom && (
                  <img src={imageUrl} alt={item.label} className="size-16 rounded border object-contain" />
                )}
              </div>
            )

            if (editable) {
              return (
                <EditableOverlay
                  key={index}
                  onClick={() => onEditField?.(String(index))}
                  label={`编辑${item.label}`}
                >
                  {content}
                </EditableOverlay>
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

删除旧的硬编码 5 字段 items 数组。

- [ ] **Step 2: ContactInfoBlock 加 SpotlightOverlay**

```tsx
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"

export function ContactInfoBlock({ block, header, bg, editable, onEdit, onEditConfig }: BlockProps) {
  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑联系信息">
        <div className={bg}>
          {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
          <ContactInfoSection
            editable={editable}
            maxColumns={block.options?.maxColumns}
            onEditField={onEditConfig
              ? (index) => onEditConfig(`contact_item_${index}`)
              : undefined}
          />
        </div>
      </SpotlightOverlay>
    )
  }

  return (
    <div className={bg}>
      {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
      <ContactInfoSection maxColumns={block.options?.maxColumns} />
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/components/blocks/ContactInfoBlock.tsx frontend/components/about/ContactInfoSection.tsx
git commit -m "feat: ContactInfoBlock 改用 SpotlightOverlay + ContactItem[] 数组"
```

---

### Task 8: Footer 适配新数据结构

**Files:**
- Modify: `frontend/components/layout/Footer.tsx`

- [ ] **Step 1: Footer 改读 contactItems 数组**

Footer 目前硬编码读 `contactInfo.phone` 和 `contactInfo.email`。改为从 `contactItems` 中查找对应图标的项：

```tsx
const { contactItems, siteInfo } = useLocalizedConfig()

// 从 contactItems 中按 icon 查找
const phoneItem = contactItems.find((i) => i.icon === "phone")
const emailItem = contactItems.find((i) => i.icon === "mail")

// 渲染
<li className="flex items-center gap-2">
  <Phone className="size-4 shrink-0 text-primary" />
  {wrapEditable(
    <span>{phoneItem?.content || t("phone")}</span>,
    "phone", "编辑电话", true
  )}
</li>
<li className="flex items-center gap-2">
  <Mail className="size-4 shrink-0 text-primary" />
  {wrapEditable(
    <span>{emailItem?.content || t("email")}</span>,
    "email", "编辑邮箱", true
  )}
</li>
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/layout/Footer.tsx
git commit -m "refactor: Footer 适配 contactItems 数组结构"
```

---

### Task 9: UnifiedBlockEditor + BlockContentTab 支持字段聚焦 + contact_info 编辑

**Files:**
- Modify: `frontend/components/admin/web-settings/UnifiedBlockEditor.tsx`
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`

- [ ] **Step 1: UnifiedBlockEditor 添加 defaultFieldIndex prop**

```tsx
interface UnifiedBlockEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  block: Block | null
  defaultTab?: EditorTab
  defaultFieldIndex?: number | null
  onSave: (updated: Block) => void
}
```

传递给 `BlockContentTab`：
```tsx
<BlockContentTab
  block={{ ...block, options }}
  locale={locale}
  data={data}
  onDataChange={setData}
  defaultFieldIndex={defaultFieldIndex}
/>
```

- [ ] **Step 2: ArrayFieldDef + ArrayFieldRenderer 添加 switch 类型**

修改 `frontend/components/admin/ArrayEditDialog.tsx` 中的 `ArrayFieldDef`：
```ts
type: "text" | "textarea" | "nested-items" | "radio" | "image" | "switch"
```

修改 `frontend/components/admin/ArrayFieldRenderer.tsx`，在 `/* 图片上传 */` 之前添加：
```tsx
/* 开关（布尔值） */
if (field.type === "switch") {
  return (
    <div key={field.key} className="flex items-center justify-between">
      <Label className="text-sm font-medium">{field.label}</Label>
      <Switch checked={!!value} onCheckedChange={(v) => onUpdate(index, field.key, v)} />
    </div>
  )
}
```

添加导入：`import { Switch } from "@/components/ui/switch"`

- [ ] **Step 3: BlockContentTab 支持 contact_info 类型**

修改 `getBlockEditType`：
```ts
export function getBlockEditType(type: BlockType): BlockEditType {
  if (type === "intro" || type === "cta") return "simple"
  if (type === "card_grid" || type === "step_list" || type === "doc_list" || type === "gallery" || type === "contact_info") return "array"
  return "api"
}
```

在 `ARRAY_FIELDS` 中添加 `contact_info` 字段定义：
```ts
contact_info: [
  { key: "icon", label: "图标名称", type: "text", localized: false },
  { key: "label", label: "标签", type: "text", localized: true },
  { key: "content", label: "内容", type: "text", localized: true },
  { key: "image_id", label: "图片", type: "image", localized: false },
  { key: "hover_zoom", label: "悬浮放大", type: "switch", localized: false },
],
```

注意：`contact_info` 的数据来自全局配置而非 `block.data`。UnifiedBlockEditor 的保存逻辑需要特殊处理 — 这需要在 `PageBlocksPreview.handleEditSave` 中判断：如果是 `contact_info` 类型，保存到全局配置 API（`/admin/web-settings/list/edit` with key `contact_items`）而非 block.data。

在 `PageBlocksPreview.handleEditSave` 中添加：
```ts
async function handleEditSave(updated: Block): Promise<void> {
  if (updated.type === "contact_info" && updated.data) {
    // contact_info 数据保存到全局配置
    await api.post("/admin/web-settings/list/edit", {
      key: "contact_items",
      value: updated.data,
    })
    refreshConfig()
  }
  // block 配置（showTitle, bgColor 等）照常保存
  const newBlocks = blocks.map((b) =>
    b.id === updated.id ? { ...updated, data: updated.type === "contact_info" ? null : updated.data } : b,
  )
  saveBlocks(newBlocks)
  setEditingBlock(null)
}
```

在 `UnifiedBlockEditor` 打开时，如果是 `contact_info` 类型，从 ConfigContext 加载数据而非 block.data：
```ts
useEffect(() => {
  if (!block || !open) return
  // ... 现有初始化代码 ...
  if (block.type === "contact_info") {
    // 从 ConfigContext 加载 contact_items
    api.get("/public/config/all").then((res) => {
      setData(res.data.contact_items ?? [])
    })
  } else {
    setData(JSON.parse(JSON.stringify(block.data ?? null)))
  }
}, [block, open, defaultTab])
```

- [ ] **Step 3: ArrayItemsForm 支持 defaultFieldIndex 自动展开**

`BlockContentTab` 接收 `defaultFieldIndex`。如果非 null，在 ArrayItemsForm 渲染后自动滚动到对应条目。

在 ArrayItemsForm 中添加 `useEffect` 滚动到指定索引的条目：
```tsx
interface ArrayItemsFormProps {
  // ... 现有 props
  defaultFieldIndex?: number | null
}

// 在组件内部
const scrollRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (defaultFieldIndex != null && scrollRef.current) {
    const target = scrollRef.current.querySelector(`[data-item-index="${defaultFieldIndex}"]`)
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
  }
}, [defaultFieldIndex])
```

每个 Draggable 条目添加 `data-item-index={index}` 属性。

- [ ] **Step 4: 提交**

```bash
git add frontend/components/admin/web-settings/UnifiedBlockEditor.tsx frontend/components/admin/web-settings/BlockContentTab.tsx frontend/components/admin/web-settings/PageBlocksPreview.tsx
git commit -m "feat: UnifiedBlockEditor 支持字段聚焦 + contact_info 数组编辑"
```

---

### Task 10: HomeBanner 迁移到 SpotlightOverlay

**Files:**
- Modify: `frontend/components/home/HomeBanner.tsx`

- [ ] **Step 1: HomeBanner 改用 SpotlightOverlay + FieldOverlay**

```tsx
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"

if (!editable) return banner

return (
  <SpotlightOverlay onClick={() => onBannerEdit?.("home")} label="编辑 Banner 背景">
    {banner}
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
      <FieldOverlay onClick={() => onEditConfig?.("brand_name")} label="编辑品牌名称">
        <span className="pointer-events-auto text-2xl md:text-5xl font-bold tracking-wide text-transparent select-none">
          【{title}】
        </span>
      </FieldOverlay>
      <FieldOverlay onClick={() => onEditConfig?.("tagline")} label="编辑标语">
        <span className="pointer-events-auto text-xs md:text-sm tracking-[0.3em] text-transparent select-none">
          {subtitle}
        </span>
      </FieldOverlay>
    </div>
  </SpotlightOverlay>
)
```

删除 `EditableOverlay` 导入。

- [ ] **Step 2: 提交**

```bash
git add frontend/components/home/HomeBanner.tsx
git commit -m "refactor: HomeBanner 迁移到 SpotlightOverlay 统一风格"
```

---

### Task 11: 种子数据改造

**Files:**
- Modify: `backend/scripts/init/seed_config.py`

- [ ] **Step 1: 将 contact_info 改为 contact_items 数组**

在 seed_config.py 中找到 `contact_info` 配置项，替换为：

```python
{
    "key": "contact_items",
    "value": [
        {
            "icon": "phone",
            "label": {"zh": "服务热线", "en": "Hotline"},
            "content": {"zh": "189-1268-6656"},
            "image_id": None,
            "hover_zoom": False,
        },
        {
            "icon": "mail",
            "label": {"zh": "邮箱", "en": "Email"},
            "content": {"zh": "info@mudasky.com"},
            "image_id": None,
            "hover_zoom": False,
        },
        {
            "icon": "message-circle",
            "label": {"zh": "微信咨询", "en": "WeChat"},
            "content": {"zh": "扫码添加客服微信"},
            "image_id": None,
            "hover_zoom": True,
        },
        {
            "icon": "map-pin",
            "label": {"zh": "公司地址", "en": "Address"},
            "content": {"zh": "苏州市工业园区"},
            "image_id": None,
            "hover_zoom": False,
        },
        {
            "icon": "building",
            "label": {"zh": "注册地址", "en": "Registered Address"},
            "content": {"zh": "苏州市工业园区"},
            "image_id": None,
            "hover_zoom": False,
        },
    ],
    "description": "联系信息列表",
},
```

注意：微信二维码的 `image_id` 由 `seed_images.py` 设置，这里先设为 None。检查 `seed_images.py` 是否需要同步更新写入路径。

- [ ] **Step 2: 检查 seed_images.py 是否需要更新**

查看 `seed_images.py` 中是否有写入 contact_info 相关字段的逻辑。如果有（比如写入 wechat 二维码的 image_id），需要改为更新 `contact_items` 数组中对应项的 `image_id`。

- [ ] **Step 3: 提交**

```bash
git add backend/scripts/init/seed_config.py
git commit -m "refactor: 种子数据 contact_info 改为 contact_items 数组"
```

---

### Task 12: 前端单元测试

**Files:**
- Create: `frontend/components/admin/SpotlightOverlay.test.tsx`
- Create: `frontend/components/admin/FieldOverlay.test.tsx`
- Modify: existing block test files as needed

- [ ] **Step 1: FieldOverlay 测试**

```tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { FieldOverlay } from "./FieldOverlay"

describe("FieldOverlay", () => {
  it("渲染子内容", () => {
    render(<FieldOverlay onClick={() => {}}>内容</FieldOverlay>)
    expect(screen.getByText("内容")).toBeInTheDocument()
  })

  it("点击触发回调并阻止冒泡", () => {
    const onClick = vi.fn()
    const onParentClick = vi.fn()
    render(
      <div onClick={onParentClick}>
        <FieldOverlay onClick={onClick}>内容</FieldOverlay>
      </div>
    )
    fireEvent.click(screen.getByText("内容"))
    expect(onClick).toHaveBeenCalledOnce()
    expect(onParentClick).not.toHaveBeenCalled()
  })

  it("添加 data-field 属性", () => {
    render(<FieldOverlay onClick={() => {}}>内容</FieldOverlay>)
    expect(screen.getByText("内容").closest("[data-field]")).toBeTruthy()
  })

  it("使用 fit-content 宽度", () => {
    render(<FieldOverlay onClick={() => {}}>内容</FieldOverlay>)
    expect(screen.getByText("内容").closest("[data-field]")).toHaveClass("w-fit")
  })
})
```

- [ ] **Step 2: SpotlightOverlay 测试**

```tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { SpotlightOverlay } from "./SpotlightOverlay"

describe("SpotlightOverlay", () => {
  it("渲染子内容", () => {
    render(<SpotlightOverlay onClick={() => {}}>内容</SpotlightOverlay>)
    expect(screen.getByText("内容")).toBeInTheDocument()
  })

  it("点击触发回调", () => {
    const onClick = vi.fn()
    render(<SpotlightOverlay onClick={onClick}>内容</SpotlightOverlay>)
    fireEvent.click(screen.getByText("内容"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("包含 spotlight-overlay class", () => {
    render(<SpotlightOverlay onClick={() => {}}>内容</SpotlightOverlay>)
    expect(screen.getByText("内容").closest(".spotlight-overlay")).toBeTruthy()
  })

  it("包含 spotlight-border 和 spotlight-content", () => {
    const { container } = render(<SpotlightOverlay onClick={() => {}}>内容</SpotlightOverlay>)
    expect(container.querySelector(".spotlight-border")).toBeTruthy()
    expect(container.querySelector(".spotlight-content")).toBeTruthy()
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --prefix frontend test`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add frontend/components/admin/SpotlightOverlay.test.tsx frontend/components/admin/FieldOverlay.test.tsx
git commit -m "test: SpotlightOverlay + FieldOverlay 单元测试"
```

---

### Task 13: 类型检查 + 构建验证

- [ ] **Step 1: 全量类型检查**

Run: `pnpm --prefix frontend exec tsc --noEmit`
Expected: 无错误

- [ ] **Step 2: 开发构建测试**

Run: `pnpm --prefix frontend build`
Expected: 构建成功

- [ ] **Step 3: 运行全部前端测试**

Run: `pnpm --prefix frontend test`
Expected: 所有测试通过

- [ ] **Step 4: 提交最终修复（如有）**

---

### Task 14: 重建数据库 + 视觉验证

- [ ] **Step 1: 重建数据库**

```bash
./scripts/dev.sh --clean
```

等待容器完全启动。

- [ ] **Step 2: 通过 Playwright MCP 验证**

打开 `http://localhost/zh/admin/web-settings`，导航到页面预览：

1. hover 一个 IntroBlock → 看到 block 级蓝色虚线框
2. hover IntroBlock 内的文字 → 看到字段级紧凑虚线框 + 周围淡化（spotlight）
3. 点击字段 → 打开 UnifiedBlockEditor 内容标签页
4. 点击 block 空白处 → 打开 UnifiedBlockEditor
5. 检查 ContactInfoBlock → 看到从数组渲染的联系信息
6. hover ContactInfoBlock 某个联系项 → 看到 spotlight 效果

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat: 双层模组编辑系统完成 — spotlight 效果 + ContactItem 数组"
```
