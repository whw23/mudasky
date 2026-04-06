# mudasky 前端骨架设计

## 背景

mudasky 后端 API 骨架已完成（auth、user、content、document、admin 五个领域 + worker）。前端需要搭建 Next.js 16+ 骨架，包含所有页面的基本结构和布局组件，具体页面内容后续填充。

旧系统页面截图在 `legacy_pages/` 目录下，共 16 张（含列表页和详情页）。

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16+（App Router） |
| 语言 | TypeScript |
| UI 组件 | shadcn/ui |
| 样式 | Tailwind CSS |
| 富文本编辑器 | Tiptap |
| HTTP 客户端 | axios 1.14.0（锁定版本） |
| 状态管理 | React Context + localStorage |
| 包管理 | pnpm |

## 1. 目录结构

```text
frontend/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 根布局（全局样式、字体、AuthProvider）
│   ├── not-found.tsx                 # 404 页面
│   │
│   ├── (public)/                     # ── 官网公开页面（SSG/ISR） ──
│   │   ├── layout.tsx                # 官网布局（Header + Banner + Footer）
│   │   ├── page.tsx                  # 首页
│   │   ├── about/page.tsx            # 关于我们
│   │   ├── study-abroad/page.tsx     # 出国留学
│   │   ├── universities/page.tsx     # 院校选择
│   │   ├── requirements/page.tsx     # 申请条件（文章列表）
│   │   ├── cases/page.tsx            # 成功案例
│   │   ├── visa/page.tsx             # 签证办理（文章列表）
│   │   ├── life/page.tsx             # 留学生活（文章列表）
│   │   ├── news/page.tsx             # 新闻政策（文章列表）
│   │   ├── contact/page.tsx          # 联系我们
│   │   └── articles/
│   │       └── [id]/page.tsx         # 文章详情（ISR）
│   │
│   ├── (auth)/                       # ── 认证页面（CSR） ──
│   │   ├── layout.tsx                # 认证布局（居中卡片）
│   │   ├── login/page.tsx            # 登录（三种方式）
│   │   └── register/page.tsx         # 注册（手机号+验证码）
│   │
│   ├── (user)/                       # ── 用户中心（CSR） ──
│   │   ├── layout.tsx                # 用户中心布局（侧边栏）
│   │   ├── dashboard/page.tsx        # 用户仪表盘
│   │   ├── profile/page.tsx          # 个人资料（修改用户名、密码、手机号、2FA）
│   │   ├── documents/page.tsx        # 文档管理（上传/列表/删除）
│   │   └── articles/page.tsx         # 我的文章（发布/编辑/提交审核）
│   │
│   └── (admin)/                      # ── 后台管理（CSR） ──
│       ├── layout.tsx                # 后台布局（侧边栏 + 顶栏）
│       └── admin/
│           ├── dashboard/page.tsx    # 管理仪表盘
│           ├── users/page.tsx        # 用户管理
│           ├── articles/page.tsx     # 文章管理/审核
│           └── categories/page.tsx   # 分类管理
│
├── components/                       # 通用组件
│   ├── ui/                           # shadcn/ui 组件（按需安装）
│   ├── layout/
│   │   ├── Header.tsx                # 官网顶部（红色横幅 + Logo + 导航）
│   │   ├── Footer.tsx                # 官网底部（公司信息 + 联系方式 + 二维码）
│   │   ├── Banner.tsx                # 页面 Banner（大图 + 标题）
│   │   ├── AdminSidebar.tsx          # 后台管理侧边栏
│   │   └── UserSidebar.tsx           # 用户中心侧边栏
│   ├── content/
│   │   ├── ArticleCard.tsx           # 文章卡片（hover 红底白字）
│   │   ├── ArticleList.tsx           # 文章列表（左侧列表 + 右侧推荐）
│   │   └── ArticleSidebar.tsx        # 文章页右侧栏（最新文章、精彩专题）
│   ├── editor/
│   │   └── TiptapEditor.tsx          # Tiptap 富文本编辑器
│   └── common/
│       └── Pagination.tsx            # 分页组件
│
├── lib/
│   ├── api.ts                        # axios 实例（baseURL、拦截器、自动续签）
│   └── utils.ts                      # 工具函数（cn 等）
│
├── hooks/
│   └── use-auth.ts                   # 认证状态 hook
│
├── contexts/
│   └── AuthContext.tsx               # 认证上下文（登录状态、用户信息）
│
├── types/
│   └── index.ts                      # 全局类型定义（User、Article、Document 等）
│
├── public/                           # 静态资源
│   └── images/                       # Banner 图片等
│
├── next.config.ts                    # Next.js 配置
├── tailwind.config.ts                # Tailwind 配置（自定义主色调）
├── tsconfig.json
├── package.json
├── .eslintrc.json
└── .prettierrc
```

## 2. 四种布局

### 2.1 根布局（app/layout.tsx）

- 全局字体加载
- Tailwind CSS 全局样式
- AuthProvider 包裹
- 不含任何可视 UI

### 2.2 官网布局（(public)/layout.tsx）

参考旧系统截图，从上到下：

1. **红色横幅**：服务热线、快捷链接
2. **导航栏**：Logo + 10 个栏目（网站首页、关于我们、出国留学、院校选择、申请条件、成功案例、签证办理、留学生活、新闻政策、联系我们）
3. **Banner**：大图 + 页面标题（中英文）
4. **内容区域**：由各页面填充
5. **Footer**：深灰背景，公司介绍 + 联系方式（地址、电话、邮箱）+ 微信二维码 + ICP 备案

### 2.3 认证布局（(auth)/layout.tsx）

- 简洁背景（品牌色调）
- 居中卡片容器
- Logo 在卡片顶部

### 2.4 用户中心 / 后台管理布局

- **用户中心**（(user)/layout.tsx）：顶部导航栏 + 左侧侧边栏（仪表盘、个人资料、文档管理、我的文章） + 右侧内容区
- **后台管理**（(admin)/layout.tsx）：顶部导航栏 + 左侧侧边栏（仪表盘、用户管理、文章管理、分类管理） + 右侧内容区

## 3. 页面说明

### 3.1 官网页面

| 页面 | URL | 渲染 | 布局特点 |
|------|-----|------|---------|
| 首页 | `/` | SSG | 多板块拼接：关于我们 + 精选服务 + 院校选择 + 师资 + 热门申请 + 新闻中心 |
| 关于我们 | `/about` | SSG | 内容展示 + 侧边导航 |
| 出国留学 | `/study-abroad` | SSG | 内容展示 + 子分类 Tab（德国/日本/新加坡） |
| 院校选择 | `/universities` | SSG | 内容展示 + 国家 Tab |
| 申请条件 | `/requirements` | ISR | 文章列表（左侧列表 + 右侧最新文章） |
| 成功案例 | `/cases` | ISR | 内容展示 + 分类 Tab |
| 签证办理 | `/visa` | ISR | 文章列表 |
| 留学生活 | `/life` | ISR | 文章列表 |
| 新闻政策 | `/news` | ISR | 文章列表 |
| 联系我们 | `/contact` | SSG | 联系信息 + 地图 |
| 文章详情 | `/articles/[id]` | ISR | 标题 + 作者/日期 + 富文本正文 + 右侧推荐栏 |

### 3.2 认证页面

| 页面 | URL | 说明 |
|------|-----|------|
| 登录 | `/login` | 三种方式切换：手机号+验证码、用户名+密码、手机号+密码；保持登录勾选框；2FA 验证弹窗 |
| 注册 | `/register` | 手机号+验证码（必须）+ 用户名和密码（可选） |

### 3.3 用户中心页面

| 页面 | URL | 说明 |
|------|-----|------|
| 仪表盘 | `/dashboard` | 概览：文档数量、文章数量、存储配额使用情况 |
| 个人资料 | `/profile` | 修改用户名、密码、手机号、2FA 开关 |
| 文档管理 | `/documents` | 文件上传（拖拽）、列表、删除、配额显示 |
| 我的文章 | `/articles`（用户中心） | 文章列表（全状态）、新建/编辑（Tiptap 编辑器）、提交审核 |

### 3.4 后台管理页面

| 页面 | URL | 说明 |
|------|-----|------|
| 仪表盘 | `/admin/dashboard` | 统计概览：用户数、文章数、待审核数 |
| 用户管理 | `/admin/users` | 用户列表、启用/禁用、角色修改、配额调整 |
| 文章管理 | `/admin/articles` | 全部文章列表、审核（通过/拒绝）、编辑、删除 |
| 分类管理 | `/admin/categories` | 分类 CRUD、排序 |

## 4. 核心组件

### 4.1 Header.tsx

参考旧系统：
- 顶部红色横幅：服务热线
- Logo + 10 个导航栏目
- 当前页面导航项高亮为红色
- 其他导航项 hover 时变红色

### 4.2 ArticleCard.tsx

参考旧系统申请条件页截图：
- 左侧日期（大字号日+月年）
- 中间缩略图
- 右侧标题 + 摘要
- **hover 时整个卡片背景变红色，文字变白色**
- 非 hover：白底黑字

### 4.3 ArticleSidebar.tsx

参考旧系统详情页截图：
- "最新文章" 板块
- "热点推荐" 板块
- "精彩专题" 板块
- 每项带缩略图 + 标题 + 日期

### 4.4 TiptapEditor.tsx

基于 Tiptap 的富文本编辑器，支持：
- 标题层级（H2-H4）
- 粗体、斜体、下划线
- 有序/无序列表
- 引用块
- 图片上传/拖拽
- 链接
- 工具栏

用于用户中心的文章编辑和后台管理的文章编辑。

## 5. 设计风格

### 5.1 颜色

Tailwind 自定义颜色：

```ts
// tailwind.config.ts
colors: {
  primary: {
    DEFAULT: '#C41A1A',
    hover: '#A01515',
    light: '#FFF0F0',
  },
}
```

### 5.2 交互规范

- 所有可点击的文字链接 hover 时变红色（primary）
- 文章卡片 hover 时整卡片背景变红色，文字变白色
- 导航当前项为红色，其他项 hover 变红
- 按钮主色调为红色

### 5.3 Banner

- 每个官网页面有大图 Banner
- Banner 上叠加半透明层 + 页面标题（中文大字 + 英文小字）
- 首页 Banner 可以是轮播

## 6. API 封装

### 6.1 axios 实例（lib/api.ts）

- baseURL: `/api`（通过 gateway 代理）
- 请求拦截器：自动添加 `X-Requested-With: XMLHttpRequest`（CSRF）
- 响应拦截器：401 + TOKEN_EXPIRED 时自动调用 `/api/auth/refresh` 续签并重试
- 锁定 axios 版本 1.14.0

### 6.2 认证上下文（contexts/AuthContext.tsx）

- 从 localStorage 读取用户信息
- 提供 login、logout、refreshUser 方法
- 登录/续签/修改信息时更新 localStorage
- 提供 useAuth hook

## 7. 类型定义（types/index.ts）

与后端 schemas 对应：

```ts
interface User {
  id: string
  phone: string
  username?: string
  role: 'user' | 'admin'
  isActive: boolean
  twoFactorEnabled: boolean
  storageQuota: number
  createdAt: string
  updatedAt?: string
}

interface Article {
  id: string
  title: string
  content: string
  summary?: string
  coverImage?: string
  categoryId: string
  authorId: string
  status: 'draft' | 'pending' | 'published' | 'rejected'
  publishedAt?: string
  createdAt: string
  updatedAt?: string
}

interface Document {
  id: string
  fileName: string
  fileHash: string
  mimeType: string
  fileSize: number
  status: string
  createdAt: string
  updatedAt?: string
}

interface Category {
  id: string
  name: string
  slug: string
  sortOrder: number
  createdAt: string
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

## 8. 骨架阶段范围

骨架阶段只搭建框架结构，所有页面使用占位内容：

- Next.js 初始化 + 配置（Tailwind、TypeScript、ESLint、Prettier）
- shadcn/ui 初始化 + 安装常用组件
- 四种布局组件（Header、Footer、Banner、Sidebar）
- 所有页面文件创建（占位内容：页面标题 + "待实现"）
- API 封装（axios 实例 + 拦截器）
- 认证上下文
- 类型定义
- TiptapEditor 组件骨架
- Docker 配置更新（frontend 服务可启动）

**不包含**：具体页面内容、真实数据获取、表单交互逻辑、样式细节打磨
