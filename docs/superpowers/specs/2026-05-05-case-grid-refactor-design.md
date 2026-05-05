# case_grid Block 重构设计

## 背景

以 article_list Block 的重构模式为蓝本，将 case_grid Block 从"API 型"升级为独立管理类型，提供一致的编辑体验。

## 改动范围

### 1. CaseGridBlock — 移除 SpotlightOverlay，拆分工具栏

**当前**：整个 Block 用 SpotlightOverlay 包裹，点击任何地方都打开 Block 设置。管理工具栏包含导入导出和添加案例按钮。

**改为**：
- 移除 SpotlightOverlay 包裹
- ManageToolbar 只保留：下载模板、导入、导出
- "添加案例"改为网格末尾的占位卡片（半透明虚线框 + Plus 图标）
- CaseEditDialog 移到 section 外部（避免事件冒泡）
- 刷新通过 `refreshKey` 触发 CaseGrid 重新获取数据

**文件**：`frontend/components/blocks/CaseGridBlock.tsx`

### 2. CaseGrid — 卡片快捷操作

**当前**：editable 模式用 EditableOverlay 包裹卡片，点击打开编辑弹窗。

**改为**：
- 保留 EditableOverlay（编辑按钮）
- 每个卡片右上角增加星标按钮（精选/取消精选，`is_featured`）
  - 已精选：黄色实心星
  - 未精选：灰色空心星
  - 点击调用 `/admin/web-settings/cases/list/detail/edit` 切换 `is_featured`
- 添加 `onToggleFeatured` 回调从 CaseGridBlock 传入

**文件**：`frontend/components/public/CaseGrid.tsx`

### 3. BlockContentTab — CaseItemsList

**当前**：case_grid 分类为 "api"，内容标签页显示"此区块的数据通过管理页面编辑"。

**改为**：
- 在 `BlockContentTab` 中为 case_grid 添加 `CaseItemsList` 组件
- 从 `/admin/web-settings/cases/list` 获取案例列表
- 每条显示：学生姓名 + 院校 + 年份 + 精选标记
- 支持编辑（打开 CaseEditDialog）、删除、新建
- 复用 CaseEditDialog 组件

**文件**：`frontend/components/admin/web-settings/BlockContentTab.tsx`

### 4. 不改的部分

- 后端 API（admin/public 端点均已完善）
- CaseEditDialog（已有完整字段：姓名、院校、专业、年份、头像、offer 图、感言）
- 导入导出功能
- 数据库模型
- 公开页面案例详情页（链接保持 `/cases/{id}`）

## 对应 article_list 模式的映射

| article_list | case_grid |
|-------------|-----------|
| SpotlightOverlay 移除 | SpotlightOverlay 移除 |
| ManageToolbar 只含导入导出 | ManageToolbar 只含导入导出 |
| 写文章占位卡片 | 添加案例占位卡片 |
| 置顶按钮（is_pinned） | 精选按钮（is_featured） |
| 发布/草稿切换 | 不需要（案例无 status 字段） |
| ArticleItemsList | CaseItemsList |
| ArticleEditDialog | CaseEditDialog（已有） |
| 分类过滤（categorySlug） | 不需要（案例无分类） |

## 涉及文件清单

| 文件 | 改动类型 |
|------|---------|
| `frontend/components/blocks/CaseGridBlock.tsx` | 重写 |
| `frontend/components/public/CaseGrid.tsx` | 修改（加精选按钮） |
| `frontend/components/admin/web-settings/BlockContentTab.tsx` | 修改（加 CaseItemsList） |
