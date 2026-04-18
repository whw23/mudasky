# 网页设置所见即所得重构 设计文档

## 目标

将网页设置改为完全所见即所得：导航栏可拖动排序/增删，所有页面可在预览中直接编辑内容（院校、案例、文章），删除独立的文章管理/分类管理/院校管理/案例管理页面。

## 1. 导航栏数据模型

预设导航项硬编码在前端，不存数据库。只有**排序**和**自定义项**存数据库。

### config 表存储

key: `nav_config`，value:

```json
{
  "order": ["home", "universities", "study-abroad", "requirements", "cases", "visa", "life", "news", "about"],
  "custom_items": []
}
```

### 预设导航项（不可删除）

| key | 类型 | 对应页面 |
|-----|------|---------|
| home | page | 网站首页 |
| universities | university | 院校选择 |
| study-abroad | article | 出国留学（category slug=study-abroad） |
| requirements | article | 申请条件（category slug=requirements） |
| cases | case | 成功案例 |
| visa | article | 签证办理（category slug=visa） |
| life | article | 留学生活（category slug=life） |
| news | article | 新闻政策（category slug=news） |
| about | page | 关于我们 |

### 自定义导航项

用户可新增 article 类型的导航项。新增时：
1. 创建对应的 category（name + slug）
2. 加入 `custom_items` 数组：`{ slug, name(多语言), category_id }`
3. 追加到 `order` 数组

删除时：
1. 从 `order` 和 `custom_items` 中移除
2. 对应 category 和其下文章是否删除，弹窗让用户确认

### 排序

拖动导航栏项目 → 更新 `order` 数组 → 保存到数据库。前端和官网导航栏都按 `order` 渲染。

## 2. 网页设置预览区域

### 导航栏交互

- 拖动排序（drag & drop，使用 dnd-kit 或 @hello-pangea/dnd）
- 点击切换预览页面
- "+" 按钮新增文章类导航项（弹窗输入名称和 slug）
- 自定义项显示 "×" 删除按钮，预设项不显示

### 预览内容按类型分

| 类型 | 预览内容 | 编辑方式 |
|------|---------|---------|
| page（首页） | Hero/统计/服务/留学国家/资讯 | 现有 EditableOverlay + ConfigEditDialog，不变 |
| page（关于） | 历史/使命/愿景/合作 | 现有方式，不变 |
| university | 院校列表（搜索 + 卡片/表格） | 列表中每项有编辑/删除 overlay，顶部有"添加院校"按钮 |
| case | 案例列表（卡片） | 同上，每项有编辑/删除，顶部有"添加案例"按钮 |
| article | 该分类的文章列表（只显示本分类，无跨分类 tab） | 列表中每项有编辑/删除，顶部有"写文章"按钮 |

### 文章类页面预览

- 显示 Banner + 文章列表（从 API 读取该 category 的文章）
- 每篇文章卡片上有 EditableOverlay（编辑/删除）
- 点击编辑 → 打开文章编辑 Dialog（标题、内容、slug、状态）
- 点击写文章 → 打开空白文章编辑 Dialog，category 自动绑定当前导航项

### 院校选择页预览

- 显示 Banner + 搜索框 + 院校列表
- 每个院校卡片上有 EditableOverlay
- 点击编辑 → 打开院校编辑 Dialog
- 添加院校 → 打开空白 Dialog

### 成功案例页预览

- 显示 Banner + 案例列表
- 每个案例卡片上有 EditableOverlay
- 点击编辑 → 打开案例编辑 Dialog
- 添加案例 → 打开空白 Dialog

## 3. 侧边栏 + 页面清理

从 admin 侧边栏中删除以下菜单项，并删除对应的前端页面：
- 文章管理（/admin/articles）→ 功能移到网页设置的文章类预览中
- 分类管理（/admin/categories）→ 功能变成网页设置导航栏的拖动排序和增删
- 院校管理（/admin/universities）→ 功能移到网页设置的院校选择预览中
- 案例管理（/admin/cases）→ 功能移到网页设置的成功案例预览中

删除的前端文件：
- `app/[locale]/[panel]/articles/page.tsx`
- `app/[locale]/[panel]/categories/page.tsx`
- `app/[locale]/[panel]/universities/page.tsx`
- `app/[locale]/[panel]/cases/page.tsx`
- 对应的表格组件（ArticleTable、CategoryTable、UniversityTable、CaseTable）

保留的：
- 后端 CRUD API（网页设置预览组件调用）
- 编辑 Dialog 组件（网页设置预览中复用）

## 4. 官网前端导航栏

官网 Header 的导航栏不再硬编码 `NAV_KEYS`，改为从 `nav_config` 读取：
- 按 `order` 数组排序
- 预设项名称从 `next-intl` 翻译文件读
- 自定义项名称从 `custom_items` 的 `name` 字段读（多语言）
- 动态路由：预设项有固定路由，自定义项路由为 `/{slug}`

自定义导航项对应的前端页面：复用现有的文章列表页组件，通过 slug → category_id 查询文章。

## 5. 后端 API 变化

### 路由迁移

将 categories/articles/universities/cases 的 CRUD 路由从各自独立位置迁移到 web-settings 下，统一管理权限：

```
迁移前:
/api/admin/content/categories/...    ← backend/api/api/admin/content/
/api/admin/content/articles/...      ← backend/api/api/admin/content/
/api/admin/universities/...          ← backend/api/api/admin/university/
/api/admin/cases/...                 ← backend/api/api/admin/case/

迁移后:
/api/admin/config/web-settings/nav/...           ← 新增：导航栏配置
/api/admin/config/web-settings/categories/...    ← 从 content/ 移入
/api/admin/config/web-settings/articles/...      ← 从 content/ 移入
/api/admin/config/web-settings/universities/...  ← 从 university/ 移入
/api/admin/config/web-settings/cases/...         ← 从 case/ 移入
```

### 文件夹迁移

```
迁移前:
backend/api/api/admin/content/       ← categories + articles
backend/api/api/admin/university/    ← universities
backend/api/api/admin/case/          ← cases

迁移后:
backend/api/api/admin/config/web-settings/nav/           ← 新建
backend/api/api/admin/config/web-settings/categories/    ← 移入
backend/api/api/admin/config/web-settings/articles/      ← 移入
backend/api/api/admin/config/web-settings/universities/  ← 移入
backend/api/api/admin/config/web-settings/cases/         ← 移入
```

删除的目录：
- `backend/api/api/admin/content/`（拆分后不再需要）
- `backend/api/api/admin/university/`
- `backend/api/api/admin/case/`

`admin/__init__.py` 中移除对应的 include_router。

### 新增导航栏 API

- `GET /api/admin/config/web-settings/nav/list` — 获取 nav_config
- `POST /api/admin/config/web-settings/nav/reorder` — 拖动排序
- `POST /api/admin/config/web-settings/nav/add-item` — 新增导航项（创建 category + 更新 nav_config）
- `POST /api/admin/config/web-settings/nav/remove-item` — 删除导航项

### 公开接口

- `GET /api/public/config/nav` — 官网前端读取导航配置（加入 /config/all 合并接口）

### 权限码变化

迁移后权限码（= URL 路径去掉 /api/ 前缀）自动变为 `admin/config/web-settings/*`，统一由"网页设置"权限控制。原来的 `admin/content/*`、`admin/universities/*`、`admin/cases/*` 权限码不再使用。

## 6. 不做的事

- 不做富文本编辑器（文章内容用纯文本/Markdown，沿用现有方式）
- 不做页面模板系统（每种类型的页面布局固定）
- 不做多级导航（只有一级导航栏）
- 不改现有的首页和关于页编辑方式
