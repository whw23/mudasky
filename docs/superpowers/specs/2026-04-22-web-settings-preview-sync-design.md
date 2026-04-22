# Web-Settings 预览同步 + 搜索统一 设计文档

## 背景

web-settings 页面的"页面预览"与实际公开页面存在严重偏离：

- 首页/关于页预览缺失多个板块（关于我们简介、精选院校/案例、CTA、团队等），样式也不一致（emoji 替代 Lucide 图标等）
- 院校/案例/文章页预览是纯 CRUD 管理界面，与实际页面视觉完全不同
- 首页搜索框（HeroSearch）和院校页搜索筛选（UniversitySearch）是两套独立实现
- 院校页筛选为横向平铺，不够直观

## 目标

1. 预览与实际页面视觉一致——改一处，两边同步
2. 院校/案例/文章预览用实际页面组件渲染，叠加 EditableOverlay 编辑能力
3. 统一搜索体验——首页搜索跳转院校页，院校页改为左侧栏筛选布局
4. 学科分类管理嵌入搜索筛选区的 EditableOverlay，点击打开弹窗管理

## 核心策略：共享组件 + editable 模式

实际页面和 web-settings 预览导入同一组件。预览通过 `editable` prop 激活 EditableOverlay 包装（虚线框 + 蓝色铅笔 hover）。

```
实际页面：<UniversityList />
预览：    <UniversityList editable onEdit={...} />
```

已有组件（HomeBanner、StatsSection、HistorySection、MissionVisionSection、PartnershipSection、AboutStatsSection、ContactInfoSection）已经使用这个模式，本次将其扩展到所有页面板块。

## 需要提取/改造的共享组件

### 新建组件（从页面内联代码提取）

| 组件 | 位置 | 来源 | editable 模式 |
|------|------|------|---------------|
| ServicesSection | components/home/ | 首页精选服务板块 | EditableOverlay 包裹标题 |
| AboutIntroSection | components/home/ | 首页"关于我们"简介 | 只读展示 |
| NewsSection | components/home/ | 首页最新资讯 + NewsPreview 合并 | 只读展示（从 API 拉真实文章） |
| CtaSection | components/common/ | 多页面 CTA 板块，接收 translationNamespace prop | 只读展示 |
| TeamSection | components/about/ | 关于页团队介绍 | 只读展示 |
| CaseGrid | components/public/ | 案例页案例卡片网格 | 每张卡片 EditableOverlay → CaseEditDialog |
| ArticleList | components/public/ | 新闻页文章列表 | 每篇文章 EditableOverlay → ArticleEditDialog |
| SearchBar | components/common/ | HeroSearch 简化提取 | 首页和院校页共用 |

### 改造现有组件

| 组件 | 改造内容 |
|------|----------|
| PartnershipSection | 增加 `withWrapper` prop，自带标题、卡片容器、badges |
| UniversityList | 改为左侧栏筛选 + 右侧卡片网格布局；增加 `editable` prop，每张卡片 EditableOverlay → UniversityEditDialog |
| UniversitySearch | 改为垂直侧栏布局（学科门类 → 国家 → 省份 → 城市）；增加 `editable` prop，学科筛选区加 EditableOverlay → 弹窗管理 |

### 删除组件

| 组件 | 原因 |
|------|------|
| HeroSearch | 被 SearchBar 替代 |
| NewsPreview | 被 NewsSection 替代 |
| CasesPreview | 被 CaseGrid editable 替代 |
| CasesEditPreview | 被预览页直接组合替代 |
| UniversitiesEditPreview | 被预览页直接组合替代 |
| ArticleListPreview | 被预览页直接组合替代 |

## 各预览页面结构

### 首页预览（HomePreview）

| # | 组件 | 可编辑 |
|---|------|--------|
| 1 | HomeBanner | ✏ Banner 背景 / 品牌名 / 标语 |
| 2 | StatsSection | ✏ 统计数据 |
| 3 | AboutIntroSection | 只读 |
| 4 | ServicesSection | ✏ 服务标题 |
| 5 | FeaturedUniversities | 只读 |
| 6 | FeaturedCases | 只读 |
| 7 | NewsSection | 只读 |
| 8 | CtaSection | 只读 |

删除：当前预览中的"热门留学国家"板块（实际页面不存在）。

### 关于页预览（AboutPreview）

| # | 组件 | 可编辑 |
|---|------|--------|
| 1 | PageBanner | ✏ Banner 背景 |
| 2 | ContactInfoSection | ✏ 各联系信息字段（顺序修正：从底部移到 #2） |
| 3 | HistorySection（补"Our Story"标题） | ✏ 公司历史 |
| 4 | MissionVisionSection | ✏ 使命 / 愿景 |
| 5 | PartnershipSection（withWrapper） | ✏ 合作介绍 |
| 6 | AboutStatsSection | ✏ 统计数据 |
| 7 | TeamSection | 只读 |
| 8 | CtaSection | 只读 |

### 院校页预览（UniversitiesPreview）

| # | 组件 | 可编辑 |
|---|------|--------|
| 1 | PageBanner | ✏ Banner 背景 |
| 2 | 概述板块（静态文字） | 只读 |
| 3 | 管理工具栏（浮动） | 添加院校 / 导入 / 导出 |
| 4 | UniversityList editable | 左侧栏筛选 + 右侧卡片网格，每张卡片 ✏ |
| 4a | └ 学科筛选 EditableOverlay | 点击 → 弹窗管理学科分类 |
| 5 | 选校建议 + CtaSection | 只读 |

### 案例页预览（CasesPreview）

| # | 组件 | 可编辑 |
|---|------|--------|
| 1 | PageBanner | ✏ Banner 背景 |
| 2 | 统计条（静态） | 只读 |
| 3 | 管理工具栏（浮动） | 添加案例 / 导入 / 导出 |
| 4 | CaseGrid editable | 每张案例卡片 ✏ |
| 5 | CtaSection | 只读 |

### 文章页预览（ArticlePreview）

适用于所有文章类页面（出国留学、签证办理、新闻政策、留学生活、申请条件）。

每个文章页有自己独特的介绍板块（如出国留学有概述+德语项目+项目对比，签证页有流程介绍等）。这些板块需要从各页面的 Server Component 内联代码提取为独立的 Client Component，以便预览复用。

| # | 组件 | 可编辑 |
|---|------|--------|
| 1 | PageBanner | ✏ Banner 背景 |
| 2 | 页面特有介绍板块 | 只读（从各 page.tsx 提取为 Client Component） |
| 3 | 管理工具栏（浮动） | 写文章 / 导入 / 导出 |
| 4 | ArticleList editable | 每篇文章 ✏ |
| 5 | CtaSection | 只读 |

## 搜索改造

### 首页搜索栏（SearchBar）

- 胶囊圆角样式（无 Tab），放在 HomeBanner 内
- 单一搜索框，模糊匹配大学名称、城市、学科
- 点击搜索 → 跳转 `/universities?search=xxx`
- 替代当前的 HeroSearch（删除 HeroSearch）

### 院校列表页筛选布局

从当前的横向 flex-wrap 改为左侧栏 + 右侧结果的双栏布局：

- **左侧栏**（固定宽度 ~240px）：学科门类 → 国家 → 省份/州（联动） → 城市（联动） + 重置按钮
- **右侧**：院校卡片网格 + 总数 + 分页
- 筛选条件联动逻辑不变（选国家后出省份/城市，选学科大类后出学科）
- URL 参数驱动（从首页搜索跳转时带 `search` 参数，筛选条件变化更新 URL）

### 学科分类管理（预览模式）

- 院校页预览中，左侧栏的学科筛选区域加 EditableOverlay
- 点击后打开弹窗，弹窗内容复用现有的学科分类树形管理界面
- 弹窗支持：大分类增删改、学科增删改、导入/导出

## 管理工具栏设计

院校/案例/文章预览中，管理工具栏作为浮动条出现在列表上方：

- 蓝色浅底背景（`bg-blue-50 border-blue-200`）
- 左侧：📋 管理工具 标签
- 右侧：操作按钮（导入 / 导出 / 添加）
- 仅在 editable 模式下显示

## 不变的部分

- EditableOverlay 组件本身不修改（虚线框 + 蓝色铅笔 hover 效果）
- ConfigEditDialog、BannerEditDialog 等编辑弹窗不修改
- NavEditor 不修改
- 高级设置 tab 不修改
- 后端 API 不修改
