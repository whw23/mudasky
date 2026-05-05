# university_list Block 重构设计

## 背景

以 article_list / case_grid Block 的重构模式为蓝本，将 university_list Block 从"API 型"升级为独立管理类型，提供一致的编辑体验。

## 改动范围

### 1. UniversityListBlock — 移除 SpotlightOverlay，拆分工具栏

**当前**：整个 Block 用 SpotlightOverlay 包裹，点击任何地方都打开 Block 设置。ManageToolbar 包含导入导出、学科管理和添加院校按钮。

**改为**：
- 移除 SpotlightOverlay 包裹
- ManageToolbar 只保留：导入导出 + 学科管理按钮
- "添加院校"改为院校列表末尾的占位卡片（半透明虚线框 + Plus 图标）
- 所有弹窗（UniversityEditDialog、DisciplineManageDialog、ImportPreviewDialog）移到 section 外部，避免事件冒泡
- 刷新机制保持 `refreshKey` 不变

**与 case_grid 的差异**：工具栏多保留一个"学科管理"按钮（DisciplineManageDialog），这是院校特有的功能。

**文件**：`frontend/components/blocks/UniversityListBlock.tsx`

### 2. UniversityList — 卡片快捷操作

**当前**：editable 模式用 EditableOverlay 包裹卡片，点击打开编辑弹窗。

**改为**：
- 保留 EditableOverlay（编辑按钮）
- 每个卡片左上角增加星标按钮（精选/取消精选，`is_featured`）
  - 已精选：黄色实心星
  - 未精选：灰色空心星
  - 点击调用 `/admin/web-settings/universities/list/detail/edit` 切换 `is_featured`
- 添加 `onToggleFeatured` 回调从 UniversityListBlock 传入
- 院校没有 status 字段（无草稿/发布概念），不需要发布切换按钮

**文件**：`frontend/components/public/UniversityList.tsx`

### 3. BlockContentTab — UniversityItemsList

**当前**：university_list 分类为 "api"，内容标签页显示"此区块的数据通过管理页面编辑"。

**改为**：
- 在 BlockContentTab 中为 university_list 添加 `UniversityItemsList` 组件
- 从 `/admin/web-settings/universities/list` 获取院校列表
- 每条显示：院校名称 + 国家 + 城市 + 精选标记
- 支持编辑（打开 UniversityEditDialog）、删除、新建
- 复用 UniversityEditDialog 组件

**文件**：`frontend/components/admin/web-settings/BlockContentTab.tsx`

### 4. UniversityEditDialog — logo 上传修复

**当前**：新建模式调用 `/admin/web-settings/universities/upload-logo-temp`（可能不存在），编辑模式调用 `/admin/web-settings/universities/list/detail/upload-logo`。

**改为**：
- 统一使用通用图片上传接口 `/admin/web-settings/images/upload`
- 上传后获得 image_id，保存时传递给 `logo_image_id` 字段
- 需要检查后端 UniversityCreate/UniversityUpdate schema 是否有 `logo_image_id` 字段，没有则添加

**文件**：
- `frontend/components/admin/web-settings/UniversityEditDialog.tsx`
- `backend/api/api/admin/config/web_settings/universities/schemas.py`（如需）

### 5. 不改的部分

- 后端 API（admin/public 端点均已完善）
- 数据库模型
- UniversityList 的搜索筛选功能（国家/城市/学科过滤）
- DisciplineManageDialog
- 导入导出功能
- 公开页面院校详情页（链接保持 `/universities/{id}`）

## 对应模式映射

| article_list / case_grid | university_list |
|--------------------------|-----------------|
| SpotlightOverlay 移除 | SpotlightOverlay 移除 |
| ManageToolbar 只含导入导出 | ManageToolbar 含导入导出 + 学科管理 |
| 占位卡片（写文章/添加案例） | 占位卡片（添加院校） |
| 精选按钮（is_featured） | 精选按钮（is_featured） |
| ArticleItemsList / CaseItemsList | UniversityItemsList |
| 图片上传改通用接口 | logo 上传改通用接口 |

## 涉及文件清单

| 文件 | 改动类型 |
|------|---------|
| `frontend/components/blocks/UniversityListBlock.tsx` | 重写 |
| `frontend/components/public/UniversityList.tsx` | 修改（加精选按钮） |
| `frontend/components/admin/web-settings/BlockContentTab.tsx` | 修改（加 UniversityItemsList） |
| `frontend/components/admin/web-settings/UniversityEditDialog.tsx` | 修改（logo 上传改通用接口） |
| `backend/.../universities/schemas.py` | 修改（如需加 logo_image_id） |
