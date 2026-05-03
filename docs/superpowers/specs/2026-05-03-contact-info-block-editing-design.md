# ContactInfo Block 编辑系统改造设计

本设计同时作为**数组型 Block 编辑的通用蓝本**，后续 card_grid、step_list、doc_list、gallery 等 Block 改造时参照本文档的框架设计和扩展指南。

## 背景

### 当前问题

1. 条目编辑弹窗只有 label 和 content 两个字段，缺少图标、图片、hover_zoom 编辑
2. 编辑弹窗未采用项目的多语言设计风格（LanguageCapsule 切换），而是直接展示所有语言输入框
3. 图标编辑仅为纯文本输入，无图形化选择器和预览
4. UnifiedBlockEditor 的"内容编辑"标签页是禁用的，没有集中管理入口
5. 添加条目按钮是虚线边框样式，与联系卡片视觉不统一
6. 种子数据只有中文，缺少英/日/德翻译
7. 编辑组件与 ContactInfo 耦合，无法复用到其他数组型 Block
8. 后台预览与公开页面不一致：添加条目卡片占网格位导致卡片布局与实际页面不同

### Block 类型全景

项目共 11 种 Block，按数据编辑模式分为四类：

| 模式 | Block 类型 | 数据特征 | 适用本框架 |
|------|-----------|----------|-----------|
| 静态内容 | intro, cta | 固定字段，无数组 | 否 |
| 数组自定义 | card_grid, step_list, doc_list, gallery | data 为数组，管理员手动编辑 | **是** |
| 混合引用 | contact_info | 数组中混合 global 引用 + custom 自定义 | **是（本次）** |
| 数据库查询 | article_list, university_list, case_grid, featured_data | 无需编辑数组，数据来自 API 查询 | 否 |

本次改造 contact_info，同时建立通用框架覆盖"数组自定义"和"混合引用"两种模式。

## 目标

- 统一条目编辑体验：图标选择器 + 多语言标签/内容 + 图片上传 + 悬浮放大
- 双入口编辑：预览区域快捷编辑 + UnifiedBlockEditor 内容标签页集中管理
- 提取可复用的双层组件体系，作为后续其他 Block 类型的范本
- 预览一致性：非 hover 状态下后台预览与公开页面像素级一致

---

## 预览一致性约束

通过 Playwright 对比公开页面（`/about`）和后台预览（`/admin/web-settings`）的关于我们页面，发现以下不一致。本约束适用于所有 Block 类型。

### 对比结果

| 区域 | 差异 | 严重程度 |
|------|------|---------|
| ContactInfo 卡片网格 | 添加条目卡片占了一个网格位，第二行从 2 个变成 3 个 | 高 — 布局变化 |
| CTA 区域 | 一致 | 无 |
| Footer | 一致 | 无 |
| 导航栏 | 后台有拖拽手柄图标（编辑功能的一部分，可接受） | 低 |

现有的编辑装饰（虚线边框、铅笔/删除按钮、Block 工具栏）已正确实现为仅 hover 时显示，非 hover 状态下不影响布局。

### 需要修复的问题

**添加条目卡片占网格位**：当前添加按钮作为网格中的一个卡片占位，导致 5 个条目从 3+2 布局变成 3+3 布局（多了一个添加卡片）。需要改为仅在 hover Block 时显示，或使用不占网格位的方式呈现。

### 一致性规则（所有 Block 通用）

1. **添加按钮不影响网格**：添加按钮仅在 hover Block 时显示，非 hover 时不占网格位，不改变卡片布局
2. **编辑装饰不改变尺寸**：编辑装饰使用 CSS `outline` 或 `box-shadow`，避免改变元素尺寸
3. **验证流程**：改造完成后必须用 Playwright 对比公开页面和后台预览的截图，确认非 hover 状态下一致

---

## 第一部分：通用框架设计（蓝本）

### 双层组件架构

```text
┌─────────────────────────────────────────────────┐
│  底层独立组件（所有 Block / 非 Block 均可复用）     │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │IconPicker│ │ItemEditDialog│ │ImageUploadFld│ │
│  └──────────┘ └──────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────┤
│  上层通用框架（数组型 Block 复用）                  │
│  ┌─────────────────────────────────────────────┐ │
│  │              ArrayItemBlock                 │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │ │
│  │  │预览卡片   │ │添加按钮  │ │内容标签页   │ │ │
│  │  │网格      │ │(模拟卡片) │ │(集中列表)   │ │ │
│  │  └──────────┘ └──────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  具体 Block 实现（只提供配置 + 模板）               │
│  ┌────────────┐ ┌───────────┐ ┌──────────────┐ │
│  │ContactInfo │ │ CardGrid  │ │  StepList    │ │
│  │  Block     │ │  Block    │ │  Block       │ │
│  └────────────┘ └───────────┘ └──────────────┘ │
└─────────────────────────────────────────────────┘
```

### 底层组件：IconPicker

以 Popover 形式弹出，点击图标输入区域触发。

**功能**：

1. **搜索框**：输入关键词过滤图标列表（按 lucide 图标名称匹配）
2. **当前选中预览**：高亮显示当前选中的图标名称和图标
3. **图标网格**：6 列网格展示可选图标，选中项高亮（红色边框 + 浅红背景）
4. **手动文本输入**：底部文本框可直接输入图标名称，支持 PascalCase 和 kebab-case
5. **Lucide 链接**：底部提供 lucide.dev/icons 链接供参考

**图标数据源**：从 `lucide-react` 导出的完整图标集合（约 1500+），网格默认显示常用子集（约 50 个），搜索时从完整集合过滤。复用 `icon-utils.ts` 的 `resolveIcon()`。

**Props 接口**：

```typescript
interface IconPickerProps {
  value: string              // 当前图标名称
  onChange: (name: string) => void
  className?: string
}
```

**位置**：`frontend/src/components/admin/IconPicker.tsx`

### 底层组件：ItemEditDialog

字段定义驱动的通用条目编辑弹窗，支持 LanguageCapsule 多语言切换。

**多语言模式**：通过右上角 LanguageCapsule 切换语言，每次只显示当前语言的多语言字段输入框。切换语言时暂存已输入数据不丢失，保存时一并提交所有语言数据。中文字段必填，其他语言可选。

**字段类型系统**：

| 字段类型 | 渲染组件 | 多语言支持 | 说明 |
|---------|---------|-----------|------|
| `text` | Input | 是 | 单行文本 |
| `textarea` | Textarea | 是 | 多行文本 |
| `icon` | IconPicker | 否 | 图标选择器 |
| `image` | ImageUploadField | 否 | 图片上传 |
| `switch` | Switch | 否 | 开关 |
| `select` | Select | 否 | 下拉选择 |
| `number` | Input[type=number] | 否 | 数字输入 |

**字段定义接口**：

```typescript
interface FieldDefinition {
  key: string              // 数据字段名
  label: string            // 显示标签
  type: 'text' | 'textarea' | 'icon' | 'image' | 'switch' | 'select' | 'number'
  localized: boolean       // 是否多语言字段
  required?: boolean       // 是否必填（默认 false，中文 locale 下多语言字段默认必填）
  placeholder?: string     // 占位文本
  options?: { label: string; value: string }[]  // select 类型的选项
  description?: string     // 字段说明文本
  showWhen?: (data: Record<string, unknown>) => boolean  // 条件显示
}
```

**Props 接口**：

```typescript
interface ItemEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  fields: FieldDefinition[]
  data: Record<string, unknown>       // 当前条目数据
  onSave: (data: Record<string, unknown>) => Promise<void>
  sourceHint?: string                 // 数据来源提示（如"共享数据，修改将影响其他位置"）
}
```

**关键行为**：

- 内部维护 `formData` 状态（按 locale 分组暂存多语言数据）
- LanguageCapsule 切换时，将当前 locale 数据写入 formData 对应 slot，读取目标 locale 数据
- 保存时合并所有 locale 数据为 LocalizedField 格式提交
- `showWhen` 支持字段条件显示（如 hover_zoom 只在有 image 时显示）

**位置**：`frontend/src/components/admin/ItemEditDialog.tsx`

### 上层框架：ArrayItemBlock

数组型 Block 的通用编辑框架，封装了三个编辑入口的完整逻辑。

**框架职责**：

| 功能 | 说明 |
|------|------|
| 预览卡片网格 | 在 SpotlightOverlay 内渲染条目卡片 + 添加按钮 |
| FieldOverlay 编辑 | 点击预览卡片的铅笔按钮 → 打开 ItemEditDialog |
| 内容标签页 | 在 UnifiedBlockEditor 内渲染条目列表 + 编辑/删除/添加 |
| 添加条目 | 模拟卡片样式的添加按钮，触发添加流程 |
| 数据同源 | 支持 global/custom 混合数据源（可选） |

**Props 接口**：

```typescript
interface ArrayItemBlockProps<T> {
  // 数据
  items: T[]                           // 解析后的条目数组
  blockConfig: BlockConfig             // Block 配置
  locale: string                       // 当前语言

  // 字段定义
  fields: FieldDefinition[]            // 条目编辑弹窗的字段列表

  // 渲染模板（具体 Block 提供）
  renderCard: (item: T, index: number) => ReactNode        // 预览卡片渲染
  renderAddButton: () => ReactNode                          // 添加按钮渲染
  renderListItem: (item: T, index: number) => ReactNode     // 内容标签页列表项渲染

  // 回调
  onEditItem: (index: number) => void
  onDeleteItem: (index: number) => void
  onAddItem: () => void
  onSaveItem: (index: number, data: Record<string, unknown>) => Promise<void>

  // 可选：数据同源支持
  getItemSource?: (item: T) => 'global' | 'custom'          // 判断条目数据源
  getSourceHint?: (source: 'global' | 'custom') => string   // 数据源提示文本
}
```

**内容标签页列表项结构**：

每行显示：图标（可选）+ 标签 + 内容摘要 + 数据来源标签（global/custom）+ 编辑按钮。点击编辑按钮打开同一个 ItemEditDialog。

**位置**：`frontend/src/components/admin/ArrayItemBlock.tsx`

### 扩展指南：如何为新 Block 接入框架

以 card_grid（guide 卡片）为例，展示如何用通用框架改造一个 Block：

**第 1 步：定义字段列表**

```typescript
const GUIDE_FIELDS: FieldDefinition[] = [
  { key: 'icon', label: '图标', type: 'icon', localized: false },
  { key: 'title', label: '标题', type: 'text', localized: true, required: true },
  { key: 'desc', label: '描述', type: 'textarea', localized: true },
]
```

**第 2 步：提供渲染模板**

```typescript
function renderGuideCard(item: GuideItem, index: number) {
  return (
    <div className="border rounded-lg p-4">
      <Icon name={item.icon} />
      <h4>{getLocalized(item.title, locale)}</h4>
      <p>{getLocalized(item.desc, locale)}</p>
    </div>
  )
}
```

**第 3 步：组装**

```typescript
<ArrayItemBlock
  items={guideItems}
  fields={GUIDE_FIELDS}
  renderCard={renderGuideCard}
  renderAddButton={renderGuideAddButton}
  renderListItem={renderGuideListItem}
  onEditItem={handleEdit}
  onDeleteItem={handleDelete}
  onAddItem={handleAdd}
  onSaveItem={handleSave}
/>
```

**不同 Block 的差异点**：

| 差异点 | contact_info | card_grid | step_list | doc_list |
|--------|-------------|-----------|-----------|----------|
| 字段列表 | icon/label/content/image/hover_zoom | 取决于 cardType（5 种子类型） | title/desc/number | icon/title/desc/link |
| 数据源 | global + custom 混合 | 纯 custom | 纯 custom | 纯 custom |
| 卡片样式 | 图标 + 标签 + 内容 | 取决于 cardType | 数字 + 标题 + 描述 | 图标 + 标题 + 描述 |
| 添加流程 | 选择全局/新建自定义 | 直接新建 | 直接新建 | 直接新建 |

---

## 第二部分：ContactInfo Block 具体实现

### 条目字段定义

```typescript
const CONTACT_INFO_FIELDS: FieldDefinition[] = [
  { key: 'icon', label: '图标', type: 'icon', localized: false },
  { key: 'label', label: '标签', type: 'text', localized: true, required: true },
  { key: 'content', label: '内容', type: 'text', localized: true, required: true },
  { key: 'image_id', label: '图片', type: 'image', localized: false, description: '如二维码图片' },
  {
    key: 'hover_zoom', label: '悬浮放大', type: 'switch', localized: false,
    description: '鼠标 hover 时放大显示图片',
    showWhen: (data) => !!data.image_id
  },
]
```

### 双入口编辑

**入口 A：预览区域快捷编辑**

点击联系卡片上的铅笔按钮 → 打开 ItemEditDialog，编辑该条目的 5 个字段。保持现有的 SpotlightOverlay + FieldOverlay 双层覆盖机制不变。

**入口 B：UnifiedBlockEditor 内容标签页**

激活"内容编辑"标签页（当前禁用），展示所有条目的列表。每行显示：图标 + 标签 + 内容摘要 + 数据来源标签 + 编辑按钮。点击编辑按钮打开同一个 ItemEditDialog。列表底部提供添加条目功能。

两个入口共用同一个 ItemEditDialog，保证编辑体验一致。

### 添加条目按钮

**样式**：模拟联系卡片的完整布局结构（图标位 + 标签位 + 内容位），整体半透明（opacity: 0.6），暗示可添加。

**交互**：现有的 AddContactItemMenu（从全局 contactItems 选择 / 新建自定义）保持不变，集成到添加按钮的交互中。选择全局条目时添加 `{ type: "global", id }` 引用，新建自定义时打开 ItemEditDialog 空白表单。

### 数据同源机制

ContactInfo Block 的条目分为两种数据源：

**全局条目（global）**：

- Block 的 `data.items` 中存 `{ type: "global", id: "xxx" }`，仅引用全局 `contact_items` 配置
- 编辑时修改写回全局 `contact_items` 配置（通过 `ConfigService.update_value()`）
- 修改后调用 `refreshConfig()`，所有使用同一数据源的组件同步更新（Footer、Header 横幅、关于我们页面等）
- ItemEditDialog 顶部显示提示："此条目为共享数据，修改将影响 Footer、关于我们等页面"

**自定义条目（custom）**：

- Block 的 `data.items` 中存完整数据 `{ type: "custom", icon, label, content, ... }`
- 编辑时修改写入 `page_blocks` 配置，仅影响当前 Block
- 不影响全局 `contact_items` 和其他组件

### 二维码悬浮放大

保留现有 `QrPopover` 组件功能。当条目配置了 `image_id` 且 `hover_zoom: true` 时，在卡片上 hover 图标/图片区域弹出放大图片。

### 数据结构

现有 ContactItem 类型扩展：

```typescript
interface ContactItem {
  id: string
  icon: string            // lucide 图标名称
  label: LocalizedField   // 多语言标签
  content: LocalizedField // 多语言内容
  image_id?: string       // 可选图片 ID
  hover_zoom?: boolean    // 是否 hover 放大
}
```

label 和 content 从 `string` 改为 `LocalizedField`（`{ zh: string, en?: string, ja?: string, de?: string }`）。向后兼容：旧数据（纯字符串）自动转换为 `{ zh: string }` 格式。

### 种子数据完善

补全所有 contact_items 的四语言 label 和 content：

| 条目 | zh label | en label | ja label | de label |
|------|----------|----------|----------|----------|
| 条目 | zh label | en label | ja label | de label | zh content |
|------|----------|----------|----------|----------|------------|
| 服务热线 | 服务热线 | Hotline | ホットライン | Hotline | 189-1268-6656 |
| 邮箱 | 邮箱 | Email | メール | E-Mail | haoranxuexing@163.com |
| 微信咨询 | 微信咨询 | WeChat | WeChat | WeChat | 扫码添加客服微信 |
| 办公地址 | 办公地址 | Office Address | オフィス所在地 | Büroadresse | 苏州独墅湖大学城林泉街377号公共学院5号楼7楼 |
| 注册地址 | 注册地址 | Registered Address | 登記住所 | Eingetragene Adresse | 中国(江苏)自由贸易试验区苏州片区苏州工业园区苏州大道东398号太平金融大厦5层5112室 |

content 中电话号码、邮箱在各语言间相同；地址类中文为准，其他语言可选填。

---

## 添加区块弹窗分组

当前"添加区块"弹窗中 11 种 Block 类型为平铺列表，改为按类型分组：

| 分组 | Block 类型 |
|------|-----------|
| 基础内容 | 介绍、行动号召 |
| 自定义列表 | 卡片网格、步骤列表、文档清单、联系方式 |
| 媒体 | 图片墙 |
| 数据展示 | 文章列表、院校列表、案例网格、精选展示 |

每个分组显示分组标题，组内保持当前的卡片样式。

---

## 第三部分：影响范围

### 新增文件

| 文件 | 说明 | 复用级别 |
|------|------|---------|
| `components/admin/IconPicker.tsx` | 图标选择器 | 全局复用 |
| `components/admin/ItemEditDialog.tsx` | 条目编辑弹窗 | 全局复用 |
| `components/admin/ArrayItemBlock.tsx` | 数组型 Block 通用框架 | 数组型 Block 复用 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `components/web-settings/blocks/ContactInfoBlock.tsx` | 使用 ArrayItemBlock 框架重构 |
| `components/admin/web-settings/UnifiedBlockEditor.tsx` | 激活内容标签页 |
| `components/admin/web-settings/BlockContentTab.tsx` | 添加 contact_info 的内容列表渲染 |
| `app/[locale]/[panel]/web-settings/page.tsx` | 更新 handleEditConfig 的字段定义和保存逻辑 |
| `types/block.ts` | ContactItem 类型扩展为 LocalizedField |
| `backend/scripts/init/seed_config.py` | 补全四语言种子数据 |

### 不变

- SpotlightOverlay / FieldOverlay / PreviewContainer — 覆盖层机制不变
- QrPopover — 悬浮放大功能保留
- AddContactItemMenu — 保持全局/自定义选择逻辑
- 后端 API — contact_items 存储格式兼容，无需改后端
