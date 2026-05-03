# 全 Block 编辑系统统一改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 ContactInfo Block 为蓝本，统一所有 Block 的编辑体验——SpotlightOverlay 中文标签、ItemEditDialog 弹窗编辑、内容标签页条目列表 + 拖动排序。

**Architecture:** 提取 BlockItemsList 通用组件（从 ContactItemsList 抽象），每种数组型 Block 只需提供字段定义和摘要渲染函数。Block 组件中 FieldOverlay 的点击改为调用 onEditConfig，page.tsx 的 handleEditConfig 统一处理所有 Block 的编辑/删除/排序/添加。

**Tech Stack:** React, TypeScript, Tailwind CSS, @hello-pangea/dnd, ItemEditDialog, IconPicker, ImageUploadField

**Spec:** `docs/superpowers/specs/2026-05-04-all-blocks-editing-refactor-design.md`

---

### Task 1: SpotlightOverlay 工具栏标签多语言

**Files:**
- Modify: `frontend/components/blocks/BlockRenderer.tsx`
- Modify: `frontend/components/admin/web-settings/UnifiedBlockEditor.tsx`（复用 TYPE_NAMES）

- [ ] **Step 1: 创建 Block 标签生成函数**

在 BlockRenderer.tsx 中添加函数，根据 block.type 和 block.options?.cardType 生成中文显示标签：

```typescript
const CARD_TYPE_LABELS: Record<string, string> = {
  guide: "指南卡片", timeline: "时间线", city: "城市指南",
  program: "专业卡片", checklist: "检查清单",
}

function getBlockLabel(block: Block): string {
  const TYPE_NAMES: Record<string, string> = {
    intro: "介绍", card_grid: "卡片网格", step_list: "步骤列表",
    doc_list: "文档清单", gallery: "图片墙", article_list: "文章列表",
    university_list: "院校列表", case_grid: "案例网格",
    featured_data: "精选展示", cta: "行动号召", contact_info: "联系信息",
  }
  const base = TYPE_NAMES[block.type] ?? block.type
  if (block.type === "card_grid" && block.options?.cardType) {
    const sub = CARD_TYPE_LABELS[block.options.cardType]
    return sub ? `${base} · ${sub}` : base
  }
  return base
}
```

- [ ] **Step 2: 将 label 传入各 Block 的 SpotlightOverlay**

修改 `renderBlock` 函数中每个 Block 的渲染调用，将 `getBlockLabel(block)` 作为 label 传入。方式有两种：通过 BlockProps 传入，或在 BlockRenderer 层包裹 SpotlightOverlay（推荐后者，统一处理）。

当前各 Block 自己内部包裹 SpotlightOverlay，label 是硬编码中文。改为从 BlockRenderer 传入 `blockLabel` prop，各 Block 用这个 prop 替代硬编码 label。

- [ ] **Step 3: 更新所有 Block 组件的 SpotlightOverlay label**

修改 CardGridBlock、StepListBlock、DocListBlock、GalleryBlock、IntroBlock、CtaBlock、ContactInfoBlock 中的 SpotlightOverlay label，从硬编码改为使用 `blockLabel` prop（如果传入）或保持默认。

- [ ] **Step 4: 验证 TypeScript 编译并提交**

```bash
pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20
git commit -am "feat: SpotlightOverlay 工具栏标签显示中文名 + 卡片子类型"
```

---

### Task 2: 提取 BlockItemsList 通用组件

**Files:**
- Create: `frontend/components/admin/web-settings/BlockItemsList.tsx`
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`

- [ ] **Step 1: 从 ContactItemsList 提取通用 BlockItemsList**

创建 `BlockItemsList.tsx`，接口如下：

```typescript
interface BlockItemsListProps {
  items: any[]
  onEditItem: (index: number) => void
  onDeleteItem: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  renderItemSummary: (item: any, index: number) => {
    icon?: string
    label: string
    content: string
  }
  addButton?: ReactNode
}
```

实现内容：
- DragDropContext + Droppable + Draggable（复用 @hello-pangea/dnd）
- renderClone 在 body 层渲染拖动预览（修复 Dialog transform 偏移）
- 每行：拖拽手柄 + 图标(可选) + 标签 + 内容摘要 + 编辑按钮 + 删除按钮
- 底部渲染 addButton

- [ ] **Step 2: 重构 ContactItemsList 使用 BlockItemsList**

修改 BlockContentTab.tsx 中的 ContactItemsList，内部使用 BlockItemsList 渲染条目列表，只保留 contact_info 特有的逻辑（global/custom 数据源解析、共享标签）。

- [ ] **Step 3: 验证 contact_info 编辑功能不受影响**

用 Playwright 验证：打开 UnifiedBlockEditor → 内容标签页 → 确认条目列表显示正常、拖动可用、编辑/删除按钮工作。

- [ ] **Step 4: 提交**

```bash
git commit -am "refactor: 提取 BlockItemsList 通用条目列表组件"
```

---

### Task 3: card_grid 改造

**Files:**
- Modify: `frontend/components/blocks/CardGridBlock.tsx`
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

- [ ] **Step 1: 定义 card_grid 各 cardType 的 FieldDefinition**

在 page.tsx 或 BlockContentTab.tsx 中定义：

```typescript
import type { FieldDefinition } from "@/components/admin/ItemEditDialog"

const CARD_GRID_FIELDS: Record<string, FieldDefinition[]> = {
  guide: [
    { key: "icon", label: "图标", type: "icon", localized: false },
    { key: "title", label: "标题", type: "text", localized: true, required: true },
    { key: "desc", label: "描述", type: "textarea", localized: true },
  ],
  timeline: [
    { key: "title", label: "标题", type: "text", localized: true, required: true },
    { key: "time", label: "时间", type: "text", localized: true },
    { key: "desc", label: "描述", type: "text", localized: true },
  ],
  city: [
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "city", label: "城市", type: "text", localized: true, required: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true },
  ],
  program: [
    { key: "name", label: "项目名称", type: "text", localized: true, required: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true },
    { key: "features", label: "特点列表", type: "textarea", localized: true, description: "每行一个特点" },
  ],
  checklist: [
    { key: "icon", label: "图标", type: "icon", localized: false },
    { key: "label", label: "标签", type: "text", localized: true, required: true },
    { key: "items", label: "条目列表", type: "textarea", localized: true, description: "每行一个条目" },
  ],
}
```

- [ ] **Step 2: CardGridBlock 的 FieldOverlay 改用 onEditConfig**

修改 CardGridBlock.tsx，将 FieldOverlay 的 onClick 从 `onFieldEdit?.(block, "item", i)` 改为 `onEditConfig?.(\`card_grid_item_${block.id}_${i}\`)`。

需要在 BlockProps 接口中添加 `onEditConfig?: (section: string) => void`，并在 BlockRenderer.tsx 中传入。

- [ ] **Step 3: handleEditConfig 添加 card_grid 编辑/删除/排序/添加处理**

在 page.tsx 的 handleEditConfig 中添加：

```typescript
// card_grid 编辑条目
if (section.startsWith('card_grid_item_')) {
  const rest = section.replace('card_grid_item_', '')
  const sepIdx = rest.lastIndexOf('_')
  const blockId = rest.substring(0, sepIdx)
  const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
  const currentBlocks = pageBlocks[activePage] ?? []
  const block = currentBlocks.find((b) => b.id === blockId)
  if (block) {
    const cardType = block.options?.cardType || 'guide'
    const fields = CARD_GRID_FIELDS[cardType] || CARD_GRID_FIELDS.guide
    const items = Array.isArray(block.data) ? block.data : []
    const item = items[itemIndex] ?? {}
    setItemDialogState({
      open: true,
      title: `编辑${CARD_TYPE_LABELS[cardType] || '卡片'}`,
      subtitle: '编辑配置项，中文字段为必填。',
      fields,
      data: item,
      onSave: async (data) => {
        // program/checklist 的 features/items：textarea → 数组
        const processed = processNestedFields(data, cardType)
        const newItems = [...items]
        newItems[itemIndex] = { ...item, ...processed }
        const updatedBlock = { ...block, data: newItems }
        const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
        await api.post("/admin/web-settings/list/edit", {
          key: "page_blocks", value: { ...pageBlocks, [activePage]: updatedBlocks }
        })
        toast.success('保存成功')
        await fetchAllConfigs(true)
        refreshConfig()
      },
    })
  }
}
```

同样添加 `card_grid_delete_`、`card_grid_reorder_`、`card_grid_add_` 的处理（模式与 contact_item 相同）。

- [ ] **Step 4: BlockContentTab 中 card_grid 内容标签页改用 BlockItemsList**

在 BlockContentTab.tsx 中，当 block.type === "card_grid" 时，替代现有的 ArrayItemsForm，改用 BlockItemsList + onEditConfig 模式（与 ContactItemsList 类似）。

- [ ] **Step 5: 处理 nested-items 字段的转换**

添加 `processNestedFields` 函数：program 的 features 和 checklist 的 items 在 ItemEditDialog 中用 textarea（每行一个），保存时 split('\n') 转数组，加载时 join('\n') 转文本。

- [ ] **Step 6: 验证 TypeScript 编译并提交**

```bash
pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20
git commit -am "feat: card_grid 改用 ItemEditDialog + BlockItemsList + 拖动排序"
```

---

### Task 4: step_list + doc_list + gallery 改造

**Files:**
- Modify: `frontend/components/blocks/StepListBlock.tsx`
- Modify: `frontend/components/blocks/DocListBlock.tsx`
- Modify: `frontend/components/blocks/GalleryBlock.tsx`
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

- [ ] **Step 1: 定义字段**

```typescript
const STEP_LIST_FIELDS: FieldDefinition[] = [
  { key: "title", label: "标题", type: "text", localized: true, required: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
]

const DOC_LIST_FIELDS: FieldDefinition[] = [
  { key: "icon", label: "图标", type: "icon", localized: false },
  { key: "text", label: "文本", type: "text", localized: true, required: true },
]

const GALLERY_FIELDS: FieldDefinition[] = [
  { key: "image_id", label: "图片", type: "image", localized: false, required: true },
  { key: "caption", label: "说明", type: "text", localized: true },
]
```

- [ ] **Step 2: 三个 Block 组件的 FieldOverlay 改用 onEditConfig**

StepListBlock、DocListBlock、GalleryBlock 中，将 FieldOverlay 的 onClick 从 `onFieldEdit?.(block, "item", i)` 改为 `onEditConfig?.(\`{blockType}_item_${block.id}_${i}\`)`。

添加 `onEditConfig` prop 到各 Block 的 BlockProps 接口，BlockRenderer 中传入。

- [ ] **Step 3: handleEditConfig 添加三种 Block 的处理**

在 page.tsx 添加 `step_list_item_`、`doc_list_item_`、`gallery_item_` 以及对应的 delete/reorder/add 处理。模式统一——读取 block.data 数组，打开 ItemEditDialog，保存回 page_blocks。

可以提取通用函数避免重复代码：

```typescript
function handleArrayBlockEdit(
  section: string, blockType: string, fields: FieldDefinition[],
  titlePrefix: string,
) {
  const rest = section.replace(`${blockType}_item_`, '')
  const sepIdx = rest.lastIndexOf('_')
  const blockId = rest.substring(0, sepIdx)
  const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
  // ... 通用编辑逻辑
}
```

- [ ] **Step 4: BlockContentTab 中三种 Block 改用 BlockItemsList**

替代 ArrayItemsForm，改用 BlockItemsList + onEditConfig。

- [ ] **Step 5: 验证并提交**

```bash
git commit -am "feat: step_list/doc_list/gallery 改用 ItemEditDialog + BlockItemsList"
```

---

### Task 5: intro + cta 改造

**Files:**
- Modify: `frontend/components/blocks/IntroBlock.tsx`
- Modify: `frontend/components/blocks/CtaBlock.tsx`
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

- [ ] **Step 1: IntroBlock 和 CtaBlock 的 FieldOverlay 改用 onEditConfig**

IntroBlock：`onEditConfig?.(\`intro_field_${block.id}_content\`)`
CtaBlock：`onEditConfig?.(\`cta_field_${block.id}_title\`)` / `cta_field_${block.id}_desc`

- [ ] **Step 2: handleEditConfig 添加 intro/cta 的处理**

```typescript
if (section.startsWith('intro_field_')) {
  const rest = section.replace('intro_field_', '')
  const sepIdx = rest.lastIndexOf('_')
  const blockId = rest.substring(0, sepIdx)
  const fieldKey = rest.substring(sepIdx + 1)
  const block = currentBlocks.find((b) => b.id === blockId)
  if (block) {
    const fields = INTRO_FIELDS.filter((f) => f.key === fieldKey)
    setItemDialogState({
      open: true,
      title: '编辑介绍',
      fields,
      data: block.data ?? {},
      onSave: async (data) => {
        const updatedBlock = { ...block, data: { ...block.data, ...data } }
        // 保存到 page_blocks
      },
    })
  }
}
```

cta 同理。

- [ ] **Step 3: BlockContentTab 中 simple 类型改用 ItemEditDialog**

当前 SimpleFieldsForm 用 LocalizedInput 展示所有语言。改为：点击字段 → 打开 ItemEditDialog（LanguageCapsule 切换）。

或保留 SimpleFieldsForm 但在 header 中添加 LanguageCapsule，只显示当前语言的字段。

- [ ] **Step 4: 验证并提交**

```bash
git commit -am "feat: intro/cta 改用 ItemEditDialog + LanguageCapsule 语言切换"
```

---

### Task 6: API 类 Block 提示信息

**Files:**
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`

- [ ] **Step 1: API 类 Block 内容标签页显示提示**

当 `getBlockEditType` 返回 "api" 时，当前返回 null（禁用）。改为显示提示信息：

```tsx
if (editType === "api") {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
      <Info className="mb-2 size-8" />
      <p className="text-sm">此区块的数据通过管理页面编辑</p>
      <p className="mt-1 text-xs">使用左侧导航栏进入对应的管理模块</p>
    </div>
  )
}
```

- [ ] **Step 2: 验证并提交**

```bash
git commit -am "feat: API 类 Block 内容标签页显示管理提示"
```

---

### Task 7: 清理旧代码

**Files:**
- Modify: `frontend/components/admin/web-settings/BlockContentTab.tsx`

- [ ] **Step 1: 移除不再使用的 ArrayItemsForm**

所有数组型 Block 都改用 BlockItemsList + ItemEditDialog 后，ArrayItemsForm 及其依赖（ArrayFieldRenderer、ArrayEditDialog）不再被 BlockContentTab 使用。清理：

- 从 BlockContentTab 中移除 ArrayItemsForm 组件
- 移除 ARRAY_FIELDS、CARD_TYPE_FIELDS 常量（已迁移到 page.tsx 或 BlockContentTab 的新位置）
- 保留 getBlockEditType（其他地方还在用）

注意：ArrayFieldRenderer 和 ArrayEditDialog 可能被其他组件引用（如 BlockTypeFields.tsx），不要删除文件本身，只清理 BlockContentTab 中的引用。

- [ ] **Step 2: 移除不再使用的 SimpleFieldsForm**

如果 intro/cta 已完全改用 ItemEditDialog，SimpleFieldsForm 也不再需要。

- [ ] **Step 3: 验证并提交**

```bash
pnpm --prefix frontend exec tsc --noEmit --pretty 2>&1 | head -20
git commit -am "refactor: 清理旧的 ArrayItemsForm 和 SimpleFieldsForm"
```

---

### Task 8: Playwright 验证

- [ ] **Step 1: 验证各 Block 的编辑功能**

逐个验证：
- card_grid（guide 类型）：点击卡片铅笔 → ItemEditDialog 打开（IconPicker + title + desc）→ 保存 → 预览更新
- step_list：点击步骤铅笔 → ItemEditDialog → 保存
- gallery：点击图片铅笔 → ItemEditDialog（图片上传 + 说明）→ 保存
- intro：点击内容铅笔 → ItemEditDialog（LanguageCapsule 切换）→ 保存
- cta：同上
- 内容标签页：各 Block 条目列表显示正常、拖动排序、添加/删除

- [ ] **Step 2: 验证 SpotlightOverlay 标签**

确认各 Block 工具栏显示中文名（如"卡片网格 · 指南卡片"而非"card_grid"）。

- [ ] **Step 3: 提交修复（如有）**

```bash
git commit -am "fix: Block 编辑系统验证修复"
```
