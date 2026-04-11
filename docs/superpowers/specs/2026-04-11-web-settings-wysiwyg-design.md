# 网页设置 WYSIWYG 重构设计

## 背景

管理后台的"网页设置"页面（`/admin/web-settings`）存在多个问题：

1. 预览导航栏样式与真实官网不一致
2. 预览导航栏点击无法切换页面（pointer-events 被误禁）
3. 点击模块编辑按钮后，弹窗字段与模块不匹配
4. 数据页面（院校、案例、新闻等）没有真实内容预览，只有文字占位
5. 预览内容的 z-index 穿透管理后台侧边栏
6. 整页滚动导致侧边栏不固定

## 目标

将网页设置做成真正的所见即所得编辑器：预览与真实官网一模一样，每个模块可独立编辑。同时修复布局和层级问题。

## 设计

### 1. SidebarShell 布局修复

**影响范围**：管理后台 + 用户中心（共用 `SidebarShell` 组件）

**当前问题**：

```
flex min-h-screen     ← 外层允许撑高，整页滚动
├── aside (sidebar)   ← 跟着页面一起滚
└── main (content)    ← 跟着页面一起滚
```

**改为**：

```
flex h-screen overflow-hidden
├── aside (sidebar)   ← overflow-y-auto，独立滚动
└── main (content)    ← overflow-y-auto，独立滚动
```

**修改文件**：`components/layout/SidebarShell.tsx`

- 外层 `div`：`min-h-screen` → `h-screen overflow-hidden`
- 桌面侧边栏 `aside`：加 `overflow-y-auto`
- 移动端抽屉 `aside`：加 `overflow-y-auto`
- 主区域 `main`：加 `overflow-y-auto`

### 2. 预览容器层级隔离

**当前问题**：预览内 Header 的 `sticky top-0 z-50` 穿透到管理后台侧边栏之上。

**修复方式**：给预览容器加 `isolate` class（即 `isolation: isolate`），创建独立的 stacking context，内部的 z-index 不外溢。

同时预览内的 Header 不应该是 `sticky`。在 `editable` 模式下移除 sticky 行为，改为普通流式布局。

**修改文件**：

- `app/[locale]/(admin)/admin/web-settings/page.tsx`：预览容器加 `isolate overflow-hidden`
- `components/layout/Header.tsx`：`editable` 模式下不加 `sticky top-0 z-50`

### 3. 导航栏统一样式 + 点击恢复

**当前问题**：

- Header 传了 `hideNav` 隐藏真实导航行，用 `PreviewNavBar`（独立组件）替代
- PreviewNavBar 样式和真实导航栏不同
- `[&_button]:pointer-events-none` 把 PreviewNavBar 的按钮也禁了

**改为**：

- 移除 `hideNav` prop，直接展示 Header 的真实导航行
- Header 在 `editable` 模式下，导航链接的点击行为改为调用 `onPageChange(key)` 而非路由跳转
- 新增 Header prop：`onPageChange?: (key: string) => void`
- 导航链接在 editable 模式下用 `<button>` 代替 `<Link>`，样式保持一致
- 这些按钮加 `preview-nav` class 避免被 pointer-events-none 禁用
- 删除 `PreviewNavBar` 组件

**修改文件**：

- `components/layout/Header.tsx`：增加 `onPageChange` prop，editable 模式下导航行为替换
- `app/[locale]/(admin)/admin/web-settings/page.tsx`：移除 `hideNav`，传入 `onPageChange`
- 删除 `components/admin/web-settings/PreviewNavBar.tsx`

### 4. 编辑弹窗字段与模块对应

**当前问题**：`handleEditConfig` 的 switch-case 里，部分 section 的字段列表定义不精确，导致弹窗出现不相关字段。

**修复方式**：审查每个 section 的字段定义，确保一一对应：

| Section Key | 弹窗标题 | 字段 |
|---|---|---|
| `brand` | 编辑品牌 | brand_name, logo_url |
| `tagline` | 编辑标语 | tagline |
| `hotline` | 编辑热线 | hotline, hotline_contact |
| `hero` | 编辑 Hero | hero_title, hero_subtitle |
| `stats` | 编辑统计 | 4 组 value + label |
| `services` | 编辑服务标题 | services_title |
| `contact` | 编辑联系方式 | address, phone, email, wechat, office_hours |
| `wechat_qr` | 编辑微信二维码 | wechat_qr_url |
| `icp` | 编辑备案 | icp_filing |
| `about_history` | 编辑发展历程 | history |
| `about_mission` | 编辑使命愿景 | mission, vision |
| `about_partnership` | 编辑合作伙伴 | partnership |

**修改文件**：`app/[locale]/(admin)/admin/web-settings/page.tsx` 中的 `handleEditConfig` 和 `handleHeaderEdit` / `handleFooterEdit`

### 5. 数据页面复用真实组件

**当前做法**：`PagePreview` 中数据页面用 `DataSectionOverlay` 包裹管理表格（如 `UniversityTable`），或者显示"暂不支持编辑"占位文字。

**改为**：复用公开页面的真实组件渲染真实数据，用 `EditableOverlay` 或 `DataSectionOverlay` 包裹。

| 页面 | 复用组件 | 编辑方式 |
|---|---|---|
| Home | `Banner` + `StatsSection` + Services Grid + Countries Grid | EditableOverlay → ConfigEditDialog |
| Universities | `UniversityList`（含搜索、卡片、分页） | DataSectionOverlay → 跳转到院校管理 |
| Cases | 真实 Cases Grid（从 API 拉取） | DataSectionOverlay → 跳转到案例管理 |
| News | 真实文章列表（分类筛选 + 分页） | DataSectionOverlay → 跳转到文章管理 |
| About | `HistorySection` + `MissionVisionSection` 等（已在用） | EditableOverlay → ConfigEditDialog |
| Study Abroad | 真实页面所有 section（Programs Grid + ArticleSection） | 静态 i18n 内容标注不可编辑 |
| Requirements | 真实页面所有 section | 同上 |
| Visa | 真实页面所有 section | 同上 |
| Life | 真实页面所有 section | 同上 |

**注意事项**：

- 部分公开页面组件是 Server Component（如 Cases、News 的数据获取），需要在预览中改用 Client 端 API 调用。可以创建轻量的 Client 包装组件。
- `DataSectionOverlay` 的"管理"按钮改为链接跳转到对应管理页面（如 `/admin/universities`），而不是在弹窗里嵌入管理表格。
- 静态 i18n 页面在预览中正常渲染内容，但编辑 overlay 提示"此内容由翻译文件管理"。

**修改文件**：

- 重写 `components/admin/web-settings/PagePreview.tsx`
- 可能新增 Client 包装组件（如 `CasesPreview.tsx`、`NewsPreview.tsx`）用于在 Client 端获取数据

### 6. pointer-events 策略优化

**当前规则**：

```
[&_a]:pointer-events-none        ← 禁所有链接
[&_button]:pointer-events-none   ← 禁所有按钮
[&_.group]:pointer-events-auto   ← 开 EditableOverlay
[&_.preview-nav]:pointer-events-auto  ← 开 PreviewNavBar
```

**问题**：`button` 全禁太粗暴，导航按钮也被禁了。

**改为**：

```
[&_a]:pointer-events-none        ← 禁所有链接（防导航跳转）
[&_.group]:pointer-events-auto   ← 开 EditableOverlay / DataSectionOverlay
```

- 移除 `[&_button]:pointer-events-none` — 按钮不全禁
- 移除 `[&_.preview-nav]:pointer-events-auto` — 不再需要（导航改为 Header 内部处理）
- Header 的导航按钮（editable 模式）自带 pointer-events-auto，不受限制
- 预览内其他按钮（如 UniversityList 的分页按钮）保持可用，提升所见即所得体验

## 文件变更清单

| 文件 | 变更 |
|---|---|
| `components/layout/SidebarShell.tsx` | h-screen + 左右独立滚动 |
| `components/layout/Header.tsx` | editable 模式：移除 sticky、导航行为替换、新增 onPageChange prop |
| `app/[locale]/(admin)/admin/web-settings/page.tsx` | 预览容器隔离、移除 hideNav、修复字段定义、pointer-events 简化 |
| `components/admin/web-settings/PagePreview.tsx` | 重写：复用真实公开页面组件 |
| `components/admin/web-settings/PreviewNavBar.tsx` | 删除 |
| 可能新增 Client 包装组件 | CasesPreview、NewsPreview 等 |

## 不在范围

- 新增管理页面（articles、cases、categories、universities、settings 的管理页面路由）
- i18n 翻译内容的后台编辑
- 移动端预览适配
