# ContactInfo Block 编辑系统改造设计

## 背景

ContactInfo Block 当前的编辑功能存在以下不足：

1. 条目编辑弹窗只有 label 和 content 两个字段，缺少图标、图片、hover_zoom 编辑
2. 编辑弹窗未采用项目的多语言设计风格（LanguageCapsule 切换），而是直接展示所有语言输入框
3. 图标编辑仅为纯文本输入，无图形化选择器和预览
4. UnifiedBlockEditor 的"内容编辑"标签页是禁用的，没有集中管理入口
5. 添加条目按钮是虚线边框样式，与联系卡片视觉不统一
6. 种子数据只有中文，缺少英/日/德翻译
7. 编辑组件与 ContactInfo 耦合，无法复用到其他数组型 Block

## 目标

- 统一条目编辑体验：图标选择器 + 多语言标签/内容 + 图片上传 + 悬浮放大
- 双入口编辑：预览区域快捷编辑 + UnifiedBlockEditor 内容标签页集中管理
- 提取可复用的双层组件体系，作为后续其他 Block 类型的范本

## 组件架构

### 底层独立组件（所有 Block 可复用）

| 组件 | 职责 |
|------|------|
| `IconPicker` | 图标选择器：搜索 + 网格 + 文本输入 + 实时预览 |
| `ItemEditDialog` | 条目编辑弹窗：字段定义驱动，LanguageCapsule 语言切换 |
| `ImageUploadField` | 图片上传（已有，复用） |

### 上层通用框架（数组型 Block 复用）

| 组件 | 职责 |
|------|------|
| `ArrayItemBlock` | 通用框架，包含：预览卡片网格 + 添加按钮 + 内容标签页列表 + 条目编辑调用 |

### 具体 Block 实现

每个具体 Block 只需提供：字段定义 + 卡片渲染模板 + 添加按钮模板。

- `ContactInfoBlock` — 本次改造
- `CardGridBlock` — 后续使用同一框架改造

## IconPicker 图标选择器

### 交互方式

以 Popover 形式弹出（非弹窗），点击图标输入区域触发。

### 功能

1. **搜索框**：输入关键词过滤图标列表（按 lucide 图标名称匹配）
2. **当前选中预览**：高亮显示当前选中的图标名称和图标
3. **图标网格**：6 列网格展示可选图标，选中项高亮（红色边框 + 浅红背景）
4. **手动文本输入**：底部文本框可直接输入图标名称，支持 PascalCase 和 kebab-case
5. **Lucide 链接**：底部提供 lucide.dev/icons 链接供参考

### 图标数据源

从 `lucide-react` 导出的完整图标集合中获取（约 1500+ 图标），通过搜索过滤交互避免一次性渲染过多。网格默认显示常用图标子集（约 50 个），搜索时从完整集合中过滤。复用已有的 `icon-utils.ts` 中的 `resolveIcon()` 函数。

### 位置

`frontend/src/components/admin/IconPicker.tsx`

## ItemEditDialog 条目编辑弹窗

### 多语言模式

通过右上角 LanguageCapsule 切换语言，每次只显示当前语言的多语言字段输入框。

- 切换语言时暂存已输入数据，不丢失
- 保存时一并提交所有语言数据
- 中文字段必填，其他语言可选

### 字段分类

| 字段 | 类型 | 多语言 | 说明 |
|------|------|--------|------|
| icon | IconPicker | 否 | 条目图标，所有语言共享 |
| label | text | 是 | 标签（如"服务热线"），随语言切换 |
| content | text | 是 | 内容（如"189-1268-6656"），随语言切换 |
| image | ImageUploadField | 否 | 可选图片（如二维码），所有语言共享 |
| hover_zoom | switch | 否 | 有图片时是否 hover 放大，所有语言共享 |

### 字段定义驱动

ItemEditDialog 接收字段定义数组，自动渲染对应的表单控件。ContactInfo Block 传入上述 5 个字段定义，其他 Block 可传入不同的字段集。

### 位置

`frontend/src/components/admin/ItemEditDialog.tsx`

## 双入口编辑

### 入口 A：预览区域快捷编辑

点击联系卡片上的铅笔按钮 → 打开 ItemEditDialog，编辑该条目的 5 个字段。

保持现有的 SpotlightOverlay + FieldOverlay 双层覆盖机制不变。

### 入口 B：UnifiedBlockEditor 内容标签页

激活"内容编辑"标签页（当前是禁用状态），展示所有条目的列表：

- 每行显示：图标 + 标签 + 内容摘要 + 编辑按钮
- 点击编辑按钮 → 打开同一个 ItemEditDialog
- 列表底部提供添加条目功能

两个入口共用同一个 ItemEditDialog，保证编辑体验一致。

## 添加条目按钮

### 样式

模拟联系卡片的完整布局结构（图标位 + 标签位 + 内容位），但整体半透明（opacity: 0.6），暗示可添加。

### 交互

点击后打开 ItemEditDialog（空白表单），填写完成保存即添加新条目。

现有的 AddContactItemMenu（从全局 contactItems 选择 / 新建自定义）保持不变，集成到添加按钮的交互中。

## 种子数据完善

补全所有 contact_items 的四语言（中/英/日/德）label 和 content：

| 条目 | zh label | en label | ja label | de label |
|------|----------|----------|----------|----------|
| 服务热线 | 服务热线 | Hotline | ホットライン | Hotline |
| 邮箱 | 邮箱 | Email | メール | E-Mail |
| 微信咨询 | 微信咨询 | WeChat | WeChat | WeChat |
| 公司地址 | 公司地址 | Office Address | 会社住所 | Büroadresse |
| 注册地址 | 注册地址 | Registered Address | 登記住所 | Eingetragene Adresse |

content 字段同理补全（电话号码、邮箱地址等在各语言间相同，地址类需要翻译）。

## 二维码悬浮放大

保留现有 `QrPopover` 组件的功能。当条目配置了 `image` 和 `hover_zoom: true` 时，在卡片上 hover 图标/图片区域弹出放大图片。

## 数据同源机制

ContactInfo Block 的条目分为两种数据源：

### 全局条目（global）

- Block 的 `data.items` 中存 `{ type: "global", id: "xxx" }`，仅引用全局 `contact_items` 配置
- 编辑时修改写回全局 `contact_items` 配置（通过 `ConfigService.update_value()`）
- 修改后调用 `refreshConfig()`，所有使用同一数据源的组件同步更新（Footer、Header 横幅、关于我们页面等）
- 在 ItemEditDialog 中需要明确提示用户：此条目为共享数据，修改将影响其他引用位置

### 自定义条目（custom）

- Block 的 `data.items` 中存完整数据 `{ type: "custom", icon, label, content, ... }`
- 编辑时修改写入 `page_blocks` 配置，仅影响当前 Block
- 不影响全局 `contact_items` 和其他组件

### 编辑时的区分

ItemEditDialog 需要接收条目类型（global/custom），根据类型决定保存目标。在弹窗标题或提示区域标注数据来源，避免用户无意中修改共享数据。

## 数据结构

现有的 ContactItem 类型需要扩展：

```typescript
interface ContactItem {
  id: string
  icon: string           // lucide 图标名称
  label: LocalizedField  // 多语言标签
  content: LocalizedField // 多语言内容
  image_id?: string      // 可选图片 ID
  hover_zoom?: boolean   // 是否 hover 放大
}
```

label 和 content 从当前的 `string` 改为 `LocalizedField`（`{ zh: string, en?: string, ja?: string, de?: string }`）。需要处理向后兼容：旧数据（纯字符串）自动转换为 `{ zh: string }` 格式。

## 影响范围

### 新增文件

- `frontend/src/components/admin/IconPicker.tsx`
- `frontend/src/components/admin/ItemEditDialog.tsx`
- `frontend/src/components/admin/ArrayItemBlock.tsx`

### 修改文件

- `frontend/src/components/web-settings/blocks/ContactInfoBlock.tsx` — 使用 ArrayItemBlock 框架
- `frontend/src/components/admin/web-settings/UnifiedBlockEditor.tsx` — 激活内容标签页
- `frontend/src/components/admin/web-settings/BlockContentTab.tsx` — 添加 contact_info 的内容列表
- `frontend/src/app/[locale]/[panel]/web-settings/page.tsx` — 更新 handleEditConfig 的字段定义
- `frontend/src/components/admin/ConfigEditDialog.tsx` — 支持 IconPicker 和 switch 字段类型
- `backend/scripts/init/seed_config.py` — 补全四语言种子数据
- `frontend/src/messages/*.json` — 同步翻译占位文本（如需要）

### 不变

- SpotlightOverlay / FieldOverlay / PreviewContainer — 覆盖层机制不变
- QrPopover — 悬浮放大功能保留
- AddContactItemMenu — 保持全局/自定义选择逻辑
- 后端 API — contact_items 存储格式兼容，无需改后端
