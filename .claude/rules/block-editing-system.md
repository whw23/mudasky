## Block 可视化编辑系统

### 设计理念

**所见即所得 + 最小操作路径**：管理员在预览页面上直接操作内容，不需要跳转到独立的编辑页面。每个数据点都有最近的编辑入口，减少认知负担。

**蓝本驱动的渐进式改造**：先用 ContactInfo Block 完整实现所有编辑能力（IconPicker、ItemEditDialog、DnD、数据同步），验证方案后提取通用组件，再批量改造其他 Block。避免一开始就设计过度抽象的框架。

**预览即真实**：非 hover 状态下，后台预览与公开页面像素级一致。编辑装饰（虚线边框、铅笔/删除/添加按钮）仅在 hover 时显示，不影响视觉判断。

### 架构分层

#### 三层编辑体系

| 层级 | 组件 | 触发方式 | 编辑粒度 |
|------|------|---------|---------|
| Block 级 | SpotlightOverlay | 点击 Block 区域 | 打开 UnifiedBlockEditor |
| 字段级 | FieldOverlay | 点击具体字段 | 打开 ItemEditDialog |
| 配置级 | BlockEditorOverlay | 点击齿轮/删除 | Block 元信息（标题、显隐） |

**例外**：article_list 不使用 SpotlightOverlay（因为点击区域会和文章卡片的编辑/置顶/发布按钮冲突），改为直接在预览区用 EditableOverlay 包裹每篇文章。

#### 组件职责

| 组件 | 职责 | 复用范围 |
|------|------|---------|
| ItemEditDialog | 字段驱动的编辑弹窗，LanguageCapsule 切语言 | 所有数组型 Block |
| BlockItemsList | DnD 排序列表，乐观更新 | UnifiedBlockEditor 内容标签页 |
| IconPicker | 图标选择器，搜索+网格+文本输入 | ItemEditDialog、BlockTypeFields |
| AddContactItemMenu | 全局/自定义条目添加菜单 | ContactInfo Block |
| block-labels.ts | Block 类型中文名 + 子类型名 | BlockEditorOverlay、BlockRenderer、UnifiedBlockEditor |
| ArticleEditDialog | 文章创建/编辑弹窗，Tiptap 富文本编辑器 | ArticleListBlock、BlockContentTab |
| ArticleListClient | 文章列表客户端组件，分类筛选+分页 | ArticleListBlock（编辑/公开复用） |

### 数据流设计

#### 编辑 → 保存 → 刷新

```
FieldOverlay 点击
  → onEditConfig('{blockType}_item_{blockId}_{index}')
  → page.tsx handleEditConfig 打开 ItemEditDialog
  → 用户编辑 → 保存
  → API POST → refreshConfig()
  → ConfigContext 更新 → 所有消费方重渲染
```

关键约束：UnifiedBlockEditor 的"保存"按钮对数组型 Block 必须从 ConfigContext 读最新 data，不能用本地 state——因为 onEditConfig 编辑已经直接写入 API，本地 state 是过时的。

#### 数据同步（ContactInfo 特有）

contact_items 与 site_info 之间存在双向同步关系，使用不可编辑的 `type` 字段作为同步标识：

| contact_items type | 同步字段 | site_info 字段 |
|-------------------|---------|---------------|
| hotline | content.zh | hotline |
| wechat_service | image_id | wechat_service_qr_url |
| wechat_official | image_id | wechat_official_qr_url |

同步触发点：编辑 contact_item → syncContactItemToSiteInfo；编辑 site_info → syncSiteInfoToContactItems；Footer 图片上传 → syncQrIfNeeded。

### Block 分类与编辑模式

| 类型 | Block | 编辑方式 |
|------|-------|---------|
| 数组型 | card_grid, step_list, doc_list, gallery, contact_info | ItemEditDialog + BlockItemsList + DnD |
| 单体型 | intro, cta | ItemEditDialog（"编辑内容"按钮） |
| API 型 | university_list, case_grid, featured_data | 不可编辑（数据来自管理页面） |
| 文章型 | article_list | ArticleEditDialog + API 直接操作（见下方） |

数组型 Block 遵循统一模式：预览区 FieldOverlay → handleEditConfig → ItemEditDialog；内容标签页 BlockItemsList + 添加按钮。

### 文章列表 Block（article_list）

#### 设计决策

article_list 从"API 型"升级为独立类型，原因：

1. **不使用 SpotlightOverlay**：文章卡片上有编辑/置顶/发布等多个交互按钮，SpotlightOverlay 的全区域点击会和这些按钮冲突。改为每篇文章用 EditableOverlay 包裹，点击打开 ArticleEditDialog。
2. **数据独立于 Block data**：文章存储在 Article 表中（通过 API 增删改查），不存储在 Block 的 `data` 字段。Block 的 `options.categorySlug` 只控制显示哪个分类的文章。
3. **管理工具栏拆分**：工具栏只保留导入导出（ManageToolbar），"写文章"改为文章列表末尾的占位卡片（半透明虚线框 + Plus 图标），与其他 Block 的添加按钮风格一致。

#### 分类过滤

- Block 配置中 `options.categorySlug` 指定分类（如 `"news"`、`"study-abroad"`）
- "全部分类"模式：`categorySlug` 为空，显示所有文章，创建文章时弹出分类选择器
- 指定分类模式：创建文章时分类锁定不可改
- **竞态条件修复**：`categoryReady` 状态门控，等分类 slug → ID 解析完毕后才发起文章列表请求，防止无过滤请求返回所有分类的文章

#### 文章卡片快捷操作

每篇文章卡片右上角提供三个快捷操作按钮（仅编辑模式）：

| 按钮 | 位置 | 功能 |
|------|------|------|
| 图钉 | 左侧 | 置顶/取消置顶（红色=已置顶） |
| 发布/草稿 | 中间 | 切换发布状态（绿色=已发布，灰色=草稿） |
| 编辑 | 右侧（EditableOverlay） | 打开 ArticleEditDialog |

#### UnifiedBlockEditor 内容标签页

article_list 的内容标签页使用自定义的 `ArticleItemsList` 组件（而非通用的 BlockItemsList），因为文章数据来自 API 而非 Block data：

- 从 `/admin/web-settings/articles/list?category_id=xxx` 获取文章列表
- 支持编辑（打开 ArticleEditDialog）、删除、新建
- "全部分类"模式下获取所有文章

#### 文章链接

公开页面的文章链接根据分类 slug 动态生成：`/{categorySlug}/{articleId}`（如 `/news/xxx`、`/study-abroad/xxx`）。每个分类有独立的 `[id]/page.tsx` 详情页，共享 `ArticleDetailPage` 组件。

### 富文本编辑器（Tiptap）

#### 扩展配置

基于 Tiptap v3，包含以下自定义扩展：

| 扩展 | 功能 | 缩放 | 对齐 |
|------|------|------|------|
| Image（内置） | 图片上传（粘贴/拖拽/选择） | ResizableNodeView，保持宽高比 | TextAlign 作用于父 `<p>` 的 text-align |
| VideoEmbed（自定义） | YouTube/Bilibili 视频嵌入 | ResizableNodeView，16:9 锁定 | CSS `width: fit-content` + `margin: auto`，支持 TextAlign 切换 |
| IframeEmbed（自定义） | 任意 iframe 嵌入 | 不支持（iframe 代码自己控制） | 固定居中 |

#### 视频嵌入（VideoEmbed）

- `parseHTML` 匹配 `div[data-video-url]`，通过 `getAttrs` 从嵌套的 `<iframe>` 提取 `src`/`width`/`height`
- `addNodeView` 使用 `ResizableNodeView` 包裹，拖拽角落缩放（保持 16:9）
- 居中通过 CSS `.tiptap [data-node="videoEmbed"] { width: fit-content; margin: 0 auto }` 实现
- 对齐通过 `align-left`/`align-right` class 切换 margin

#### iframe 嵌入（IframeEmbed）

- 保存原始 iframe HTML 到 `rawHtml` 属性，不做属性拆解
- 支持粘贴完整 `<iframe>` HTML 代码（自动用 DOMParser 解析）或输入 URL
- 编辑器内通过 DOMPurify 消毒后渲染，保留 `width`/`height`/`style`/`sandbox` 等原始属性
- `renderHTML` 使用 `document.createElement` 返回 DOM 节点（atom 节点不支持 raw HTML 子节点）

#### 工具栏贴顶

编辑器工具栏在 ArticleEditDialog 中使用 `sticky -top-4 z-10 -mx-5 px-5` 贴在 DialogBody 滚动区域顶部。`-top-4` 和 `-mx-5` 抵消 DialogBody 的 `py-4` / `px-5` 内边距。

**注意**：CSS `sticky` 在 `transform` 容器（Dialog 居中定位）内行为可能不符合预期。当前方案通过负偏移解决，但如果 Dialog 实现方式改变需要重新验证。

### 公开页面文章渲染

#### SafeHtml 属性保留

DOMPurify 默认会过滤 iframe/img 等标签的属性。通过 `addHook('uponSanitizeAttribute')` + `forceKeepAttr = true` 强制保留：

| 标签 | 保留的属性 |
|------|----------|
| IFRAME | src, width, height, frameborder, allow, allowfullscreen, scrolling, sandbox, referrerpolicy, loading, tabindex, style, class |
| IMG | src, alt, width, height, style, class |
| DIV | style, class, data-video-url |
| P/H1-H4 | style（用于 text-align 对齐） |

#### 共享样式（article-content.css）

编辑器（`.tiptap`）和公开页面（`.article-content`）共享图片/视频/iframe 的渲染样式：

- 图片 `display: inline`（覆盖 prose 的 `display: block`，使 `text-align: center` 生效）
- 视频 `.video-embed` 居中（`margin: auto`）
- iframe `.iframe-embed` 居中

#### X-Frame-Options

网关 `X-Frame-Options` 设为 `SAMEORIGIN`（而非 `DENY`），允许同源 iframe 嵌入（PDF 预览、视频播放器）。

### 踩过的坑

#### Dialog 内的 Portal 定位

Dialog 使用 CSS transform 居中，导致内部所有 Portal-based 组件（Popover、DropdownMenu、DnD 拖动预览）定位偏移。

**解法**：
- IconPicker / AddContactItemMenu → 改用相对定位 div + `mousedown` 监听关闭
- DnD 拖动预览 → `Droppable.renderClone` 在 body 层渲染
- 这是 Dialog + Portal 的通用问题，后续任何 Dialog 内的浮层都要注意
- `sticky` 定位也受影响（见"工具栏贴顶"）

#### DnD 间距跳动（三层修复）

1. **间距**：容器 `gap-2` / `space-y-2` → 改为每个 Draggable wrapper `mb-2`（placeholder 包含正确高度）
2. **视觉跳回**：API 保存再 refetch → BlockItemsList 用 `useState(localItems)` 乐观更新
3. **全页重渲染**：reorder 调 `fetchAllConfigs(true)` → 改为只调 `refreshConfig()`

这三层缺任何一层都会有不同类型的跳动。

#### 高度对齐

Grid 布局中同行卡片高度不一致。

**解法**：`FieldOverlay` 默认 `h-full` + 各卡片组件根 div `h-full`。但 EditableOverlay 不能默认 `h-full`（会破坏 Footer 布局），通过 `className` prop 按需传入。

#### 添加按钮的视觉一致性

添加按钮必须模拟真实卡片结构（`opacity-50`），否则视觉上格格不入。card_grid 用 `ADD_PLACEHOLDER` 占位数据 + 真实卡片组件渲染，自动匹配不同 cardType 的视觉结构。

#### 数据标识符必须稳定

同步映射最初用 icon 名称匹配 contact_items。用户通过 IconPicker 换了图标后，同步全部失效。

**解法**：给 contact_items 加不可编辑的 `type` 字段，所有查找/同步改为按 `type` 匹配。Footer 查找电话/邮箱条目也改为按 `type`。

**教训**：用于数据关联的标识符必须是不可编辑的稳定字段，不能用可变字段（icon、label 等）。

#### 格式一致性

lucide-react 的 `icons` 键为 PascalCase，IconPicker 直接保存导致与种子数据的 kebab-case 不一致。

**解法**：IconPicker `handleSelect` 加 `toKebab()` 转换，统一保存 kebab-case。`resolveIcon` 两种格式都能解析，显示不受影响。

#### LocalizedField 与纯字符串混淆

Footer 电话/邮箱编辑把 `content`（LocalizedField 对象）当纯字符串处理，保存后覆盖为字符串导致数据损坏。

**解法**：Footer 电话/邮箱用独立的 ConfigEditDialog（`localized: true`），不复用 ItemEditDialog。

#### 弹窗内组件标签重复

ItemEditDialog 外层渲染字段 Label，ImageUploadField 内部也有 Label → 传 `label=""` 由外层统一管理。LanguageCapsule 与关闭按钮重叠 → header 加 `pr-16` 预留空间。

#### 文章分类过滤竞态

ArticleListClient 挂载时 `activeCategoryId` 为 undefined，`fetchArticles` 立即执行不带过滤，返回所有分类文章。分类 API 加载完后才设置 ID，导致短暂显示错误文章。

**解法**：`categoryReady` 状态，初始为 `false`（有 categorySlug 时），`fetchArticles` 检查 `if (!categoryReady) return`，分类加载完后 `setCategoryReady(true)` 触发正确的请求。

#### Admin 文章列表不支持分类过滤

后端 `/admin/web-settings/articles/list` 最初没有 `category_id` 参数，导致编辑模式下所有分类的文章混在一起。

**解法**：Repository → Service → Router 三层都加上 `category_id` 可选参数。

#### DOMPurify 过滤 iframe/img 属性

DOMPurify 的 `ADD_ATTR` 对 iframe 标签的 `width`/`height` 等属性无效（可能因为 iframe 是安全敏感标签）。

**解法**：使用 `DOMPurify.addHook('uponSanitizeAttribute')` + `data.forceKeepAttr = true` 按标签名强制保留属性。记得用完 `removeHook` 清理。

#### Tailwind prose 覆盖图片 display

`prose` 类设置 `img { display: block }`，导致父元素 `text-align: center` 对图片无效。

**解法**：在 `article-content.css` 中设置 `.article-content img { display: inline }`，覆盖 prose 默认值。

#### 视频 ResizableNodeView 居中

ResizableNodeView 的外层容器 `[data-resize-container]` 设置 `display: flex` 且无固定宽度，占满全宽，`margin: auto` 无效。

**解法**：CSS `.tiptap [data-node="videoEmbed"] { width: fit-content; margin: 0 auto }` 让容器收缩到内容宽度后居中。

### 曾被忽略的点

- **子类型标签**：card_grid 的 cardType（指南/时间线/城市等）和 featured_data 的 dataType 最初没有显示在 BlockEditorOverlay 中，后来统一到 `getBlockLabel(block)` 函数
- **不同 cardType 的添加预览**：card_grid 的添加按钮最初用统一的空卡片，但不同 cardType（program 有 features 列表、checklist 有 items 列表）需要不同的占位数据
- **compact 模式**：AddContactItemMenu 在预览区用卡片样式（`top-full`），在内容标签页用按钮样式（`bottom-full`），无可用全局条目时跳过下拉菜单
- **内容标签页添加按钮不生效**：最初只有 ContactInfo 的添加按钮走 onEditConfig，其他 Block 的添加按钮没有接入，需要统一使用 `useLatestBlockData` hook
- **分类名称与页面名称不一致**：种子数据分类名"留学项目"与导航页面名"出国留学"不匹配，下拉选择器显示混淆，需要保持一致
- **文章链接硬编码**：最初所有文章链接都指向 `/news/{id}`，应根据分类 slug 动态生成 `/{categorySlug}/{id}`
- **公开文章计数包含草稿**：`count_articles_by_category` 未过滤 `status=published`，导致分类文章数统计不准
