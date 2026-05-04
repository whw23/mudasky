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

#### 组件职责

| 组件 | 职责 | 复用范围 |
|------|------|---------|
| ItemEditDialog | 字段驱动的编辑弹窗，LanguageCapsule 切语言 | 所有数组型 Block |
| BlockItemsList | DnD 排序列表，乐观更新 | UnifiedBlockEditor 内容标签页 |
| IconPicker | 图标选择器，搜索+网格+文本输入 | ItemEditDialog、BlockTypeFields |
| AddContactItemMenu | 全局/自定义条目添加菜单 | ContactInfo Block |
| block-labels.ts | Block 类型中文名 + 子类型名 | BlockEditorOverlay、BlockRenderer、UnifiedBlockEditor |

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
| API 型 | article_list, university_list, case_grid, featured_data | 不可编辑（数据来自管理页面） |

数组型 Block 遵循统一模式：预览区 FieldOverlay → handleEditConfig → ItemEditDialog；内容标签页 BlockItemsList + 添加按钮。

### 踩过的坑

#### Dialog 内的 Portal 定位

Dialog 使用 CSS transform 居中，导致内部所有 Portal-based 组件（Popover、DropdownMenu、DnD 拖动预览）定位偏移。

**解法**：
- IconPicker / AddContactItemMenu → 改用相对定位 div + `mousedown` 监听关闭
- DnD 拖动预览 → `Droppable.renderClone` 在 body 层渲染
- 这是 Dialog + Portal 的通用问题，后续任何 Dialog 内的浮层都要注意

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

### 曾被忽略的点

- **API 型 Block 不可编辑**：最初给所有 Block 都加了编辑入口，但 article_list 等数据来自管理页面，应显示提示信息而非编辑表单
- **子类型标签**：card_grid 的 cardType（指南/时间线/城市等）和 featured_data 的 dataType 最初没有显示在 BlockEditorOverlay 中，后来统一到 `getBlockLabel(block)` 函数
- **不同 cardType 的添加预览**：card_grid 的添加按钮最初用统一的空卡片，但不同 cardType（program 有 features 列表、checklist 有 items 列表）需要不同的占位数据
- **compact 模式**：AddContactItemMenu 在预览区用卡片样式（`top-full`），在内容标签页用按钮样式（`bottom-full`），无可用全局条目时跳过下拉菜单
- **内容标签页添加按钮不生效**：最初只有 ContactInfo 的添加按钮走 onEditConfig，其他 Block 的添加按钮没有接入，需要统一使用 `useLatestBlockData` hook
