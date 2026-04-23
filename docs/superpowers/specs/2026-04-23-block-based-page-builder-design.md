# 模组化页面构建器 设计文档

## 背景

当前每个公开页面的结构是硬编码的——各 page.tsx 文件固定了板块顺序和组合。管理员只能编辑内容，不能增删或重排板块。自定义页面（通过 NavEditor 创建）只能包含文章列表，功能单一。

本次改造将所有页面统一为 Block（模组）驱动的动态渲染，管理员可以自由添加、删除、排序 Block，实现完整的页面构建能力。

## 术语

| 中文 | 英文 | 说明 |
|------|------|------|
| 面板 | Panel | admin / portal |
| 模块 | Module | 面板下的业务模块（用户管理、网页设置等） |
| 模组 | Block | 页面内可组合的内容积木 |

## 目标

1. 所有公开页面（含预设页和自定义页）由 Block 数组驱动渲染
2. 管理员可在 web-settings 预览中增删、排序 Block
3. Block 内容仍通过 EditableOverlay / ArrayEditDialog 编辑
4. 预设页面有种子数据提供默认 Block 结构，开箱即用

## 数据模型

### page_blocks 配置键

在 `system_config` 表新增 `page_blocks` 键（与 `nav_config`、`page_banners` 同级），value 为 JSON：

```typescript
type PageBlocks = Record<string, Block[]>  // key = 页面 slug（如 "home"、"visa"、"my-custom-page"）

interface Block {
  id: string                    // uuid，排序/删除标识
  type: BlockType               // 模组类型
  showTitle: boolean            // 是否显示 section 标题区域（tag + title + 分隔线）
  sectionTag: string            // 英文小标签（如 "OUR STORY"）
  sectionTitle: LocalizedField  // 标题（多语言）
  bgColor: "white" | "gray"    // 背景色
  options: Record<string, any>  // 类型特有配置
}
```

### Block 类型清单

| type | 显示名称 | 说明 | options |
|------|---------|------|---------|
| `intro` | 介绍 | 标题 + 描述段落 | `{ titleKey: string, contentKey: string }` |
| `card_grid` | 卡片网格 | 多种卡片类型的网格 | `{ cardType: "guide"\|"timeline"\|"city"\|"program"\|"checklist", configKey: string, maxColumns: 2\|3\|4 }` |
| `step_list` | 步骤列表 | 编号步骤纵向列表 | `{ configKey: string }` |
| `doc_list` | 文档清单 | 图标 + 文本列表 | `{ configKey: string, iconName: string }` |
| `gallery` | 图片墙 | 水平滚动图片廊 | `{ configKey: string }` |
| `article_list` | 文章列表 | 分类文章列表 + 分页 | `{ categorySlug: string }` |
| `university_list` | 院校列表 | 搜索 + 筛选 + 院校卡片 | `{}` |
| `case_grid` | 案例网格 | 案例卡片网格 | `{}` |
| `featured_data` | 精选展示 | 从 API 拉取精选数据 | `{ dataType: "universities"\|"cases", maxItems: number }` |
| `cta` | 行动号召 | 标题 + 描述 + 咨询按钮 | `{ variant: "border-t"\|"bg-gray-50" }` |

### 数据分层

- `page_blocks`：页面结构骨架（哪些 Block、什么顺序、显示配置）
- `site_info`：内容填充（Block 通过 `options.configKey` / `options.titleKey` 等引用 site_info 中的具体数据）
- Banner 不作为 Block，固定在每个页面顶部，由 `page_banners` 配置控制

## 页面渲染

### BlockRenderer 核心组件

所有公开页面共用一个渲染器，遍历 Block 数组调用对应组件：

```tsx
function BlockRenderer({ blocks, editable, onEditBlock, onEditContent }: Props) {
  return blocks.map((block) => {
    const content = renderBlock(block, editable, onEditContent)
    if (editable) {
      return (
        <BlockEditorOverlay key={block.id} block={block} onEdit={onEditBlock}>
          {content}
        </BlockEditorOverlay>
      )
    }
    return <Fragment key={block.id}>{content}</Fragment>
  })
}

function renderBlock(block: Block, editable: boolean, onEditContent: Fn) {
  const header = block.showTitle
    ? <SectionHeader tag={block.sectionTag} title={block.sectionTitle} />
    : null

  switch (block.type) {
    case "intro":
      return <IntroBlock header={header} bgColor={block.bgColor} {...block.options} editable={editable} onEdit={onEditContent} />
    case "card_grid":
      return <CardGridBlock header={header} bgColor={block.bgColor} {...block.options} editable={editable} onEdit={onEditContent} />
    // ... 其他类型
  }
}
```

### 公开页面统一路由

预设页面（home、about、universities 等）保留各自的 `page.tsx`，但渲染逻辑统一：

```tsx
export default function VisaPage() {
  return (
    <>
      <PageBanner pageKey="visa" ... />
      <PageBlocksRenderer pageSlug="visa" />
    </>
  )
}
```

`PageBlocksRenderer` 从 ConfigContext 读 `pageBlocks["visa"]`，调用 BlockRenderer 渲染。

自定义页面通过动态路由 `[slug]/page.tsx` 渲染，同样使用 `PageBlocksRenderer`。

### web-settings 预览

预览中的 Block 列表支持：
1. 每个 Block 用 `BlockEditorOverlay` 包裹（拖拽手柄 + 编辑按钮 + 删除按钮）
2. Block 之间显示"+ 添加模组"插入点
3. 拖拽排序（@hello-pangea/dnd）
4. 点击编辑按钮 → 编辑 Block 的显示配置（标题、背景色等）
5. 点击 Block 内容 → 通过 EditableOverlay 编辑内容数据（复用现有机制）
6. 点击"添加模组" → AddBlockDialog 选择类型 → 插入默认配置的新 Block

### AddBlockDialog 模组选择弹窗

显示所有可用 Block 类型，每种类型一张卡片（图标 + 名称 + 描述）。管理员点击选择后：
1. 生成一个新 Block（默认配置）
2. 插入到指定位置
3. 保存 page_blocks 到后端
4. 如果 Block 需要 configKey（如 card_grid），自动在 site_info 中创建空数组字段

## 组件变更

### 合并

| 原组件 | 合并为 | 说明 |
|--------|--------|------|
| CountryRequirementsSection | CardGridSection + cardType="checklist" | 带子列表的卡片 |
| FeaturedUniversities + FeaturedCases | FeaturedDataBlock | 通用精选展示 |

### 迁移到 components/blocks/

| 原路径 | 新路径 |
|--------|--------|
| `components/common/CardGridSection.tsx` | `components/blocks/CardGridBlock.tsx` |
| `components/common/StepListSection.tsx` | `components/blocks/StepListBlock.tsx` |
| `components/common/DocListSection.tsx` | `components/blocks/DocListBlock.tsx` |
| `components/common/PageIntroSection.tsx` | `components/blocks/IntroBlock.tsx` |
| `components/common/CtaSection.tsx` | `components/blocks/CtaBlock.tsx` |
| `components/about/OfficeGallery.tsx` | `components/blocks/GalleryBlock.tsx` |

### 新增组件

| 组件 | 职责 |
|------|------|
| `components/blocks/BlockRenderer.tsx` | 核心渲染器：遍历 Block 数组分发渲染 |
| `components/blocks/SectionHeader.tsx` | 通用标题区域（tag + title + 分隔线） |
| `components/blocks/FeaturedDataBlock.tsx` | 精选数据展示（universities/cases） |
| `components/blocks/PageBlocksRenderer.tsx` | 页面级：从 ConfigContext 读 blocks 调用 BlockRenderer |
| `components/admin/web-settings/AddBlockDialog.tsx` | 添加模组选择弹窗 |
| `components/admin/web-settings/BlockEditorOverlay.tsx` | Block 编辑覆盖层（拖拽 + 删除 + 编辑配置） |

### 删除组件

| 组件 | 原因 |
|------|------|
| `components/common/CountryRequirementsSection.tsx` | 合并到 CardGridBlock(checklist) |
| `components/common/FeaturedProgramSection.tsx` | 合并到 CardGridBlock(program) |
| `components/home/FeaturedUniversities.tsx` | 合并到 FeaturedDataBlock |
| `components/home/FeaturedCases.tsx` | 合并到 FeaturedDataBlock |
| `components/home/UniversityGallery.tsx` | 替换为 FeaturedDataBlock |

## 种子数据

删库重建（`docker compose down -v`）。`seed_config.py` 生成完整的 `page_blocks`，将现有各页面的硬编码结构转为 Block 数组。

示例（签证页）：
```python
"visa": [
    {"id": uuid4(), "type": "step_list", "showTitle": True, "sectionTag": "Process", "sectionTitle": {"zh": "签证流程", "en": "Visa Process"}, "bgColor": "white", "options": {"configKey": "visa_process_steps"}},
    {"id": uuid4(), "type": "doc_list", "showTitle": True, "sectionTag": "Documents", "sectionTitle": {"zh": "所需材料", "en": "Required Documents"}, "bgColor": "gray", "options": {"configKey": "visa_required_docs", "iconName": "FileText"}},
    {"id": uuid4(), "type": "card_grid", "showTitle": True, "sectionTag": "Timeline", "sectionTitle": {"zh": "办理周期", "en": "Processing Time"}, "bgColor": "white", "options": {"cardType": "timeline", "configKey": "visa_timeline", "maxColumns": 3}},
    {"id": uuid4(), "type": "doc_list", "showTitle": True, "sectionTag": "Tips", "sectionTitle": {"zh": "注意事项", "en": "Important Notes"}, "bgColor": "gray", "options": {"configKey": "visa_tips", "iconName": "AlertTriangle"}},
    {"id": uuid4(), "type": "article_list", "showTitle": False, "sectionTag": "", "sectionTitle": "", "bgColor": "white", "options": {"categorySlug": "visa"}},
    {"id": uuid4(), "type": "cta", "showTitle": False, "sectionTag": "", "sectionTitle": "", "bgColor": "white", "options": {"variant": "border-t"}},
]
```

所有页面（home、about、universities、cases、study-abroad、visa、requirements、life、news）均生成对应的默认 Block 列表。

## ConfigContext 变更

新增 `pageBlocks` 数据源：

```typescript
interface ConfigContextType {
  // ... 现有 ...
  pageBlocks: PageBlocks        // { "home": Block[], "visa": Block[], ... }
  refreshConfig: () => void
}
```

公开 API `/public/config/all` 返回 `page_blocks` 配置。

## 前端路由变更

### 自定义页面动态路由

新增 `app/[locale]/(public)/[slug]/page.tsx`：

```tsx
export default function DynamicPage({ params }: { params: { slug: string } }) {
  return (
    <>
      <PageBanner pageKey={params.slug} ... />
      <PageBlocksRenderer pageSlug={params.slug} />
    </>
  )
}
```

### 预设页面简化

所有预设 page.tsx（home、about、visa 等）简化为：

```tsx
export default function VisaPage() {
  return (
    <>
      <PageBanner pageKey="visa" title={...} subtitle={...} />
      <PageBlocksRenderer pageSlug="visa" />
    </>
  )
}
```

## 不变的部分

- Banner（PageBanner）固定在顶部，不作为 Block
- Header / Footer 不变
- NavEditor 不变
- 后端 CRUD API（院校/案例/文章/学科）不变
- site_info 中的内容数据字段不变（Block 通过 configKey 引用）
- EditableOverlay + ArrayEditDialog 编辑机制不变
- PreviewContainer 交互拦截不变
