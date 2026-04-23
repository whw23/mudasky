# Block 统一编辑器设计

## 背景

当前编辑一个 Block 需要打开两个弹窗：齿轮按钮打开"区块配置"弹窗（BlockEditDialog），点击 Block 内容打开"数据编辑"弹窗（BlockDataEditor → ConfigEditDialog / ArrayEditDialog）。操作不方便。

同时，多语言输入组件（LocalizedInput）为每个字段展示 4 行输入框（zh/en/ja/de），多个多语言字段叠加后非常拥挤。

## 设计决策

### 1. 弹窗布局：Tab 切换

将配置和内容合并到一个弹窗，顶部两个 Tab：

- **显示配置** Tab：showTitle 开关、英文标签、板块标题（多语言）、背景色、类型特定选项（cardType、link、maxColumns 等）
- **内容编辑** Tab：block.data 的编辑界面

三类 Block 适配：

| 类型 | 示例 | 内容 Tab |
|------|------|----------|
| 简单数据 | intro, cta | 普通表单（标题、描述等字段） |
| 数组数据 | card_grid, step_list, doc_list, gallery | 条目列表（增删、拖动排序） |
| API 驱动 | article_list, university_list, case_grid, featured_data, contact_info | Tab 可见但置灰不可点击，显示配置 Tab 底部提示"内容通过预览页面管理工具栏编辑" |

默认 Tab：有内容的 Block 默认打开"内容编辑"，API 驱动型默认"显示配置"。

### 2. 多语言输入：统一语言胶囊

弹窗 Header 右上角放一个语言切换胶囊（`中文 | EN | JA | DE`），切换后弹窗内**所有**多语言字段同时切换到对应语言，每个字段只显示一行输入框。

- 非多语言字段（图标名称、链接、分类标识等）不受切换影响
- 中文为必填，其他语言可选
- 语言胶囊作为公共组件提取，可在 ConfigEditDialog、ArrayEditDialog 等场景复用

## 组件架构

### 新增组件

- `LanguageCapsule` — 语言切换胶囊，接收 `value: ConfigLocale` 和 `onChange`，渲染 4 个语言按钮
- `UnifiedBlockEditor` — 统一 Block 编辑弹窗，合并原 BlockEditDialog + BlockDataEditor 的功能

### 修改组件

- `LocalizedInput` — 新增 `locale` prop，传入时只渲染该语言的输入框（单行模式）；不传时保持原有行为（兼容其他使用场景）
- `ArrayEditDialog` — 支持接收外部 `locale` prop 控制多语言字段显示
- `ConfigEditDialog` — 支持接收外部 `locale` prop 控制多语言字段显示

### 删除组件

- `BlockDataEditor` — 逻辑合并到 UnifiedBlockEditor 中
- `BlockEditDialog` — 逻辑合并到 UnifiedBlockEditor 中

### 调用方变更

- `PageBlocksPreview` — 移除 `editBlock`/`dataEditBlock` 双状态，统一为一个 `editingBlock` 状态
- `BlockEditorOverlay` — 齿轮按钮打开 UnifiedBlockEditor（显示配置 Tab）
- Block 内容点击 — 打开 UnifiedBlockEditor（内容编辑 Tab）

## 交互流程

1. 用户点击齿轮按钮 → 打开 UnifiedBlockEditor，默认"显示配置" Tab
2. 用户点击 Block 内容区域 → 打开 UnifiedBlockEditor，默认"内容编辑" Tab
3. 用户通过 Tab 自由切换配置和内容
4. 用户通过语言胶囊切换多语言
5. 点击"保存"一次性保存配置和内容

## 数据流

保存时合并两部分数据：

```
{
  ...block,
  showTitle,      // 来自显示配置 Tab
  sectionTag,
  sectionTitle,
  bgColor,
  options,        // 来自显示配置 Tab（类型选项）
  data,           // 来自内容编辑 Tab
}
```

调用 `saveBlocks()` 一次性写入 page_blocks 配置。
