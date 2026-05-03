# 全 Block 编辑系统统一改造设计

以 ContactInfo Block 编辑系统为蓝本，统一所有 Block 的编辑体验。

## 目标

- 所有数组型 Block 使用 ItemEditDialog + LanguageCapsule 编辑条目
- 所有数组型 Block 内容标签页支持条目列表 + 拖动排序 + 添加/删除
- 静态内容 Block 改用 ItemEditDialog（LanguageCapsule 切换）替代 SimpleFieldsForm
- API 类 Block 增加管理页面快捷跳转入口
- SpotlightOverlay 工具栏标签显示中文名 + 子类型

## 一、SpotlightOverlay 工具栏标签多语言

当前工具栏显示原始 BlockType 字符串（如 `contact_info`），改为显示中文名。card_grid 额外显示卡片子类型。

### 标签映射

| BlockType | cardType | 显示文本 |
|-----------|----------|---------|
| intro | — | 介绍 |
| card_grid | guide | 卡片网格 · 指南卡片 |
| card_grid | timeline | 卡片网格 · 时间线 |
| card_grid | city | 卡片网格 · 城市指南 |
| card_grid | program | 卡片网格 · 专业卡片 |
| card_grid | checklist | 卡片网格 · 检查清单 |
| step_list | — | 步骤列表 |
| doc_list | — | 文档清单 |
| gallery | — | 图片墙 |
| article_list | — | 文章列表 |
| university_list | — | 院校列表 |
| case_grid | — | 案例网格 |
| featured_data | — | 精选展示 |
| cta | — | 行动号召 |
| contact_info | — | 联系信息 |

### 实现方式

在 BlockRenderer 或 SpotlightOverlay 中，根据 `block.type` 和 `block.options?.cardType` 生成显示文本。复用 UnifiedBlockEditor 中已有的 `TYPE_NAMES` 映射，扩展支持子类型。

### 影响文件

- `frontend/components/blocks/BlockRenderer.tsx`
- `frontend/components/admin/SpotlightOverlay.tsx`（或传入 label prop 的地方）

---

## 二、数组型 Block 改造

### card_grid（5 种 cardType）

card_grid 最复杂，每种 cardType 有不同的字段集。

#### 字段定义

**guide**：
```typescript
[
  { key: "icon", label: "图标", type: "icon", localized: false },
  { key: "title", label: "标题", type: "text", localized: true, required: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
]
```

**timeline**：
```typescript
[
  { key: "title", label: "标题", type: "text", localized: true, required: true },
  { key: "time", label: "时间", type: "text", localized: true },
  { key: "desc", label: "描述", type: "text", localized: true },
]
```

**city**：
```typescript
[
  { key: "image_id", label: "图片", type: "image", localized: false },
  { key: "city", label: "城市", type: "text", localized: true, required: true },
  { key: "country", label: "国家", type: "text", localized: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
]
```

**program**：
```typescript
[
  { key: "name", label: "项目名称", type: "text", localized: true, required: true },
  { key: "country", label: "国家", type: "text", localized: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
  { key: "features", label: "特点列表", type: "textarea", localized: true, description: "每行一个特点" },
]
```

注：program 的 features 原为嵌套数组（nested-items），改为 textarea 每行一个，保存时 split('\n') 转数组，加载时 join('\n') 转文本。简化编辑体验。

**checklist**：
```typescript
[
  { key: "icon", label: "图标", type: "icon", localized: false },
  { key: "label", label: "标签", type: "text", localized: true, required: true },
  { key: "items", label: "条目列表", type: "textarea", localized: true, description: "每行一个条目" },
]
```

注：checklist 的 items 同样从 nested-items 改为 textarea。

#### 编辑入口

- **预览区域**：每个卡片有 EditableOverlay，点击铅笔 → 打开 ItemEditDialog（字段根据 cardType 动态切换）
- **内容标签页**：条目列表（图标+标题摘要+编辑/删除按钮）+ 拖动排序 + 添加条目按钮

#### 预览中编辑流程

点击卡片铅笔 → `onEditConfig('card_item_{blockId}_{index}')` → page.tsx handleEditConfig → 打开 ItemEditDialog，字段根据 block.options.cardType 选择对应的 FIELDS 定义。

### step_list

#### 字段定义
```typescript
[
  { key: "title", label: "标题", type: "text", localized: true, required: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
]
```

#### 编辑入口
- 预览区域：每个步骤有 EditableOverlay
- 内容标签页：条目列表 + 拖动排序 + 添加

### doc_list

#### 字段定义
```typescript
[
  { key: "icon", label: "图标", type: "icon", localized: false },
  { key: "text", label: "文本", type: "text", localized: true, required: true },
]
```

### gallery

#### 字段定义
```typescript
[
  { key: "image_id", label: "图片", type: "image", localized: false, required: true },
  { key: "caption", label: "说明", type: "text", localized: true },
]
```

---

## 三、静态内容 Block 改造

### intro

当前用 SimpleFieldsForm 编辑 content 字段（多语言长文本）。改为点击内容区域 → 打开 ItemEditDialog，LanguageCapsule 切换语言编辑。

#### 字段定义
```typescript
[
  { key: "content", label: "内容", type: "textarea", localized: true, required: true },
]
```

### cta

当前用 SimpleFieldsForm 编辑 title/desc。改为 ItemEditDialog。

#### 字段定义
```typescript
[
  { key: "title", label: "标题", type: "text", localized: true, required: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
]
```

---

## 四、API 类 Block 快捷入口

article_list、university_list、case_grid、featured_data 的内容在数据库管理。在 SpotlightOverlay 工具栏中增加"管理"按钮（链接图标），点击跳转到对应管理页面。

| Block | 跳转目标 |
|-------|---------|
| article_list | /admin/web-settings（当前页面，滚动到文章管理） |
| university_list | /admin/web-settings（院校管理模块不存在于侧边栏，暂不跳转） |
| case_grid | /admin/web-settings（同上） |
| featured_data | 无跳转（数据由 is_featured 标记控制） |

注：由于院校/案例管理目前嵌入在网页设置内部，不是独立侧边栏页面，API 类 Block 的快捷入口暂简化为在 SpotlightOverlay 工具栏显示提示文字"数据在管理页面编辑"。后续有独立管理页面时再加跳转。

---

## 五、BlockContentTab 统一改造

### 当前状态

- `getBlockEditType` 返回 simple/array/api
- simple：SimpleFieldsForm（intro, cta）
- array：ArrayItemsForm 行内编辑（card_grid, step_list, doc_list, gallery）
- api：禁用内容标签页
- contact_info：特例，ContactItemsList

### 改造后

- simple（intro, cta）：改用 ItemEditDialog 编辑
- array（card_grid, step_list, doc_list, gallery）：改用条目列表 + ItemEditDialog（参照 ContactItemsList 模式）
- api：显示提示信息"数据在管理页面编辑"
- contact_info：保持现有 ContactItemsList

### 通用条目列表组件

从 ContactItemsList 提取通用的 `BlockItemsList` 组件：

```typescript
interface BlockItemsListProps {
  block: Block
  locale: ConfigLocale
  fields: FieldDefinition[]
  items: any[]
  onEditItem: (index: number) => void
  onDeleteItem: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onAdd: () => void
  renderItemSummary: (item: any, locale: string) => { icon?: string; label: string; content: string }
}
```

每个 Block 只需提供 `fields`、`items`、`renderItemSummary` 和回调函数。

---

## 六、handleEditConfig 扩展

page.tsx 的 handleEditConfig 需要为每种数组型 Block 添加编辑/删除/排序/添加的 section 处理。

### section 命名约定

| 操作 | section 格式 | 示例 |
|------|-------------|------|
| 编辑条目 | `{blockType}_item_{blockId}_{index}` | `card_grid_item_abc123_2` |
| 删除条目 | `{blockType}_delete_{blockId}_{index}` | `step_list_delete_abc123_0` |
| 排序条目 | `{blockType}_reorder_{blockId}_{from}_{to}` | `gallery_reorder_abc123_1_3` |
| 添加条目 | `{blockType}_add_{blockId}` | `doc_list_add_abc123` |

### 保存逻辑

数组型 Block 的数据直接存在 `block.data`（数组），保存时更新 `page_blocks` 配置。与 contact_info 的 custom 条目保存逻辑相同。

---

## 七、影响范围

### 新增文件

| 文件 | 说明 |
|------|------|
| `components/admin/web-settings/BlockItemsList.tsx` | 通用条目列表组件（从 ContactItemsList 提取） |

### 修改文件

| 文件 | 改动 |
|------|------|
| `components/blocks/CardGridBlock.tsx` | 预览区域每个卡片加 EditableOverlay + onEditConfig |
| `components/blocks/StepListBlock.tsx` | 同上 |
| `components/blocks/DocListBlock.tsx` | 同上 |
| `components/blocks/GalleryBlock.tsx` | 同上 |
| `components/blocks/IntroBlock.tsx` | FieldOverlay 编辑改用 ItemEditDialog |
| `components/blocks/CtaBlock.tsx` | 同上 |
| `components/blocks/BlockRenderer.tsx` | SpotlightOverlay 标签显示中文名 |
| `components/admin/web-settings/BlockContentTab.tsx` | array 类改用 BlockItemsList，api 类显示提示 |
| `components/admin/web-settings/UnifiedBlockEditor.tsx` | 传递 onEditConfig |
| `app/[locale]/[panel]/web-settings/page.tsx` | handleEditConfig 添加所有 Block 的编辑/删除/排序/添加处理 |

### 不变

- ContactInfo Block — 已完成
- API 类 Block 的内容编辑方式 — 保持专用弹窗
- ItemEditDialog / IconPicker / ImageUploadField — 直接复用
