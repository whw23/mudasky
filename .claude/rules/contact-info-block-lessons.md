## ContactInfo Block 开发经验总结

### 设计决策

- **双层组件架构**：底层独立组件（IconPicker、ItemEditDialog）+ 上层通用框架（ArrayItemBlock），具体 Block 只提供配置和模板
- **双入口编辑**：预览区域铅笔按钮快捷编辑 + UnifiedBlockEditor 内容标签页集中管理，共用同一个 ItemEditDialog
- **多语言切换**：ItemEditDialog 通过 LanguageCapsule 切换语言，每次只编辑一种语言，非多语言字段（icon、image、switch）始终可见
- **数据同源**：contact_items 的 global/custom 混合引用机制，global 条目编辑写回全局配置，custom 写 page_blocks
- **添加按钮样式**：模拟真实卡片结构（opacity-50），hover 时变亮，和联系卡片完全一致的 HTML 结构
- **添加按钮可见性**：仅 hover Block 时显示（`hidden group-hover/block:block`），不影响非 hover 状态的网格布局
- **Block 类型分组**：添加区块弹窗按类型分组（基础内容/自定义列表/媒体/数据展示）

### 遇到的错误和修复

#### Portal 定位问题
- **问题**：在 Dialog（有 CSS transform）内部使用 Portal-based 组件（Popover、DropdownMenu），定位会偏移到错误位置
- **修复**：改用相对定位 div + 点击外部关闭（`useRef` + `mousedown` 监听），避免 Portal
- **影响组件**：IconPicker、AddContactItemMenu

#### DnD 拖动定位
- **问题**：@hello-pangea/dnd 在 Dialog 的 CSS transform 容器内拖动预览位置错误
- **修复**：使用 `Droppable.renderClone` 在 body 层渲染拖动预览，绕过 transform

#### EditableOverlay h-full 副作用
- **问题**：给 EditableOverlay 全局加 `h-full` 导致 Footer 布局错乱——品牌简介和联系方式被挤到四列下方
- **修复**：EditableOverlay 不默认 h-full，改为通过 `className` prop 按需传入，只在 ContactInfoSection 的卡片中使用

#### 图片标签重复
- **问题**：ItemEditDialog 外层渲染了字段 Label，ImageUploadField 内部也有 Label，导致"图片"标签显示两次
- **修复**：ImageUploadField 在 ItemEditDialog 中传 `label=""`，由外层统一管理标签

#### LanguageCapsule 与关闭按钮重叠
- **问题**：ItemEditDialog header 中 LanguageCapsule 和 DialogContent 右上角的关闭/放大按钮位置冲突
- **修复**：参照 UnifiedBlockEditor 用 `pr-16` 预留空间

#### ConfigEditDialog 数据格式不匹配
- **问题**：Footer 的电话/邮箱编辑用 ConfigEditDialog，把 `content` 字段当纯字符串处理（`localized: false`），但实际是 LocalizedField 对象，保存后覆盖为纯字符串导致数据损坏
- **修复**：Footer 电话/邮箱用独立的 ConfigEditDialog（`localized: true`），不复用联系信息的 ItemEditDialog

#### 内容标签页数据不刷新
- **问题**：从内容标签页触发编辑/添加后，保存调用 refreshConfig 更新了 ConfigContext，但 UnifiedBlockEditor 的 block prop 来自本地 state，不随 ConfigContext 更新
- **修复**：ContactItemsList 从 `useConfig().pageBlocks` 读最新数据（`Object.values(pageBlocks).flat().find(b => b.id === block.id)`），而非依赖 block prop

#### Subagent 不执行工具
- **问题**：分派 subagent 实现 ItemEditDialog 时，subagent 返回了报告但 0 tool_uses——它只生成了文本没有实际执行
- **教训**：prompt 中必须明确要求 "Use the Write tool and Bash tool. Do NOT just describe what you would do"

#### Subagent 创建重复文件
- **问题**：subagent 在 `frontend/src/lib/` 创建了 `icon-utils.ts`，但原文件在 `frontend/lib/`，导致两个重复文件
- **教训**：subagent prompt 中需要明确指出项目的目录结构约定

### 数据同步设计

#### 需要同步的共享数据

| 数据 | contact_items 字段 | site_info 字段 | 同步方向 |
|------|-------------------|---------------|---------|
| 服务热线 | phone → content.zh | hotline | 双向 |
| 客服微信二维码 | message-circle → image_id | wechat_service_qr_url | 双向 |
| 公众号二维码 | qr-code → image_id | wechat_official_qr_url | 双向 |

#### 同步触发点

| 修改来源 | 处理函数 | 同步目标 |
|---------|---------|---------|
| 编辑 contact_item（ItemEditDialog 保存） | syncContactItemToSiteInfo | site_info |
| 编辑 site_info（ConfigEditDialog 保存） | syncSiteInfoToContactItems | contact_items |
| Footer 上传/清除图片 | syncQrIfNeeded | contact_items |
| 种子数据初始化 | _sync_wechat_qr_to_contact_items | contact_items |

### 预览一致性规则

- 非 hover 状态下后台预览与公开页面像素级一致
- 编辑装饰（虚线边框、铅笔/删除按钮）仅 hover 显示——已正确实现
- 添加按钮仅 hover Block 时显示（`hidden group-hover/block:block`），不占网格位
- 卡片内容用 `line-clamp-2` 限制行数保持高度一致
- 卡片用 `h-full` 填满 grid 单元格，同行卡片对齐高度

### compact 模式设计

- AddContactItemMenu 支持 `compact` prop：预览用卡片样式（`top-full` 向下展开），内容标签页用按钮样式（`bottom-full` 向上展开）
- 无可用全局条目时跳过下拉菜单直接打开自定义弹窗

### 后续复用指南

后续 card_grid、step_list、doc_list、gallery 改造时参照此 Block：
1. 定义字段列表（`FieldDefinition[]`）
2. 提供卡片渲染模板
3. 接入 ArrayItemBlock 框架（待提取）
4. 需要数据同源的字段建立同步映射
