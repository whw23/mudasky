# mudasky 前端骨架搭建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 mudasky 前端骨架——Next.js 16+ 初始化、shadcn/ui + Tailwind 配置、四种布局组件、所有页面占位、API 封装、认证上下文、类型定义、Tiptap 编辑器骨架。

**Architecture:** Next.js App Router + Route Groups 分组（public/auth/user/admin），shadcn/ui 组件库，Tailwind CSS 自定义主题色（品牌红 #C41A1A），axios API 封装，React Context 认证状态管理。

**Tech Stack:** Next.js 16+, React, TypeScript, Tailwind CSS, shadcn/ui, Tiptap, axios 1.14.0, Lucide Icons, pnpm

**Spec:** `docs/superpowers/specs/2026-04-07-frontend-skeleton-design.md`

**Code Style Rules:**

- JS/TS/TSX: 2 spaces, camelCase variables, PascalCase components
- 所有注释使用中文
- 所有组件/函数必须有文档注释
- React 组件文件名 PascalCase，其他文件 kebab-case
- 一个文件一个组件
- 单文件最大 300 行，单函数最大 50 行
- Git commit: Conventional Commits, 中文描述

---

## 文件结构总览

### 配置文件

| 文件路径 | 职责 |
| -------- | ---- |
| `frontend/package.json` | 项目依赖（Next.js, React, axios, tiptap 等） |
| `frontend/next.config.ts` | Next.js 配置 |
| `frontend/tailwind.config.ts` | Tailwind 自定义主题色 |
| `frontend/tsconfig.json` | TypeScript 配置（@/ 别名） |
| `frontend/components.json` | shadcn/ui CLI 配置 |
| `frontend/.eslintrc.json` | ESLint 配置 |
| `frontend/.prettierrc` | Prettier 配置（2 spaces） |

### 布局和页面

| 文件路径 | 职责 |
| -------- | ---- |
| `frontend/app/layout.tsx` | 根布局（字体、全局样式、AuthProvider） |
| `frontend/app/globals.css` | 全局样式 + shadcn/ui CSS 变量 |
| `frontend/app/not-found.tsx` | 404 页面 |
| `frontend/app/(public)/layout.tsx` | 官网布局（Header + Footer） |
| `frontend/app/(public)/page.tsx` | 首页 |
| `frontend/app/(public)/about/page.tsx` | 关于我们 |
| `frontend/app/(public)/study-abroad/page.tsx` | 出国留学 |
| `frontend/app/(public)/universities/page.tsx` | 院校选择 |
| `frontend/app/(public)/requirements/page.tsx` | 申请条件 |
| `frontend/app/(public)/cases/page.tsx` | 成功案例 |
| `frontend/app/(public)/visa/page.tsx` | 签证办理 |
| `frontend/app/(public)/life/page.tsx` | 留学生活 |
| `frontend/app/(public)/news/page.tsx` | 新闻政策 |
| `frontend/app/(public)/contact/page.tsx` | 联系我们 |
| `frontend/app/(public)/articles/[id]/page.tsx` | 文章详情 |
| `frontend/app/(auth)/layout.tsx` | 认证布局（居中卡片） |
| `frontend/app/(auth)/login/page.tsx` | 登录 |
| `frontend/app/(auth)/register/page.tsx` | 注册 |
| `frontend/app/(user)/layout.tsx` | 用户中心布局（侧边栏） |
| `frontend/app/(user)/dashboard/page.tsx` | 用户仪表盘 |
| `frontend/app/(user)/profile/page.tsx` | 个人资料 |
| `frontend/app/(user)/documents/page.tsx` | 文档管理 |
| `frontend/app/(user)/articles/page.tsx` | 我的文章 |
| `frontend/app/(admin)/layout.tsx` | 后台布局（侧边栏） |
| `frontend/app/(admin)/admin/dashboard/page.tsx` | 管理仪表盘 |
| `frontend/app/(admin)/admin/users/page.tsx` | 用户管理 |
| `frontend/app/(admin)/admin/articles/page.tsx` | 文章管理 |
| `frontend/app/(admin)/admin/categories/page.tsx` | 分类管理 |

### 组件

| 文件路径 | 职责 |
| -------- | ---- |
| `frontend/components/layout/Header.tsx` | 官网顶部导航 |
| `frontend/components/layout/Footer.tsx` | 官网底部 |
| `frontend/components/layout/Banner.tsx` | 页面 Banner |
| `frontend/components/layout/AdminSidebar.tsx` | 后台侧边栏 |
| `frontend/components/layout/UserSidebar.tsx` | 用户中心侧边栏 |
| `frontend/components/content/ArticleCard.tsx` | 文章卡片 |
| `frontend/components/content/ArticleList.tsx` | 文章列表 |
| `frontend/components/content/ArticleSidebar.tsx` | 右侧推荐栏 |
| `frontend/components/editor/TiptapEditor.tsx` | Tiptap 编辑器 |
| `frontend/components/common/Pagination.tsx` | 分页组件 |

### 工具和状态

| 文件路径 | 职责 |
| -------- | ---- |
| `frontend/lib/api.ts` | axios 实例 + 拦截器 |
| `frontend/lib/utils.ts` | 工具函数（cn） |
| `frontend/types/index.ts` | 全局类型定义 |
| `frontend/contexts/AuthContext.tsx` | 认证上下文 |
| `frontend/hooks/use-auth.ts` | 认证 hook |

---

## Task 1: Next.js 项目初始化

**Files:**
- Create/Modify: `frontend/` 下所有配置文件

- [ ] **Step 1: 使用 create-next-app 初始化**

```bash
cd d:/Code/mudasky
rm -f frontend/package.json frontend/.npmrc
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --use-pnpm --no-src-dir --no-import-alias
```

选项说明：`--app` 使用 App Router，`--tailwind` 内置 Tailwind，`--use-pnpm` 使用 pnpm。

注意：`--no-import-alias` 后我们手动配置 `@/` 别名。

- [ ] **Step 2: 配置 import alias**

在 `tsconfig.json` 中确认 `@/*` 别名已设置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 3: 安装额外依赖**

```bash
cd d:/Code/mudasky/frontend
pnpm add axios@1.14.0 @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder lucide-react
```

- [ ] **Step 4: 创建 .prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

File: `frontend/.prettierrc`

- [ ] **Step 5: 初始化 shadcn/ui**

```bash
cd d:/Code/mudasky/frontend
npx shadcn@latest init
```

选择：New York style, CSS variables, `@/components` 别名。

- [ ] **Step 6: 安装常用 shadcn 组件**

```bash
cd d:/Code/mudasky/frontend
npx shadcn@latest add button input card dialog dropdown-menu separator sheet tabs avatar badge form label textarea toast
```

- [ ] **Step 7: 自定义 Tailwind 主题色**

修改 `tailwind.config.ts`（或 `app/globals.css` 中的 CSS 变量），设置品牌红色为 primary：

在 `app/globals.css` 的 `:root` 中设置 shadcn CSS 变量：

```css
:root {
  --primary: 0 79% 43%;          /* #C41A1A */
  --primary-foreground: 0 0% 100%;
  --background: 210 40% 98%;     /* #F8FAFC */
  --foreground: 215 28% 17%;     /* #1E293B */
  --card: 0 0% 100%;
  --card-foreground: 215 28% 17%;
  --muted: 215 20% 93%;          /* #E8ECF1 */
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;         /* #E2E8F0 */
  --ring: 0 79% 43%;             /* #C41A1A */
  --destructive: 0 84% 60%;     /* #DC2626 */
}
```

- [ ] **Step 8: 配置字体（Lexend + Noto Sans SC）**

修改 `app/layout.tsx`，引入 Google Fonts：

```tsx
import { Lexend } from 'next/font/google'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-sans',
})
```

注：Noto Sans SC 较大，通过 `<link>` 从 Google Fonts CDN 加载，不用 next/font。

- [ ] **Step 9: 验证**

```bash
cd d:/Code/mudasky/frontend && pnpm dev
```

Expected: 访问 http://localhost:3000 看到 Next.js 默认页面，样式正常。

- [ ] **Step 10: 提交**

```bash
cd d:/Code/mudasky && git add frontend/
git commit -m "feat: 初始化 Next.js 16 + shadcn/ui + Tailwind 自定义主题"
```

---

## Task 2: 类型定义 + API 封装 + 认证上下文

**Files:**
- Create: `frontend/types/index.ts`
- Create: `frontend/lib/api.ts`
- Modify: `frontend/lib/utils.ts`（shadcn 已创建，确认内容）
- Create: `frontend/contexts/AuthContext.tsx`
- Create: `frontend/hooks/use-auth.ts`

- [ ] **Step 1: 编写类型定义**

```typescript
/** 全局类型定义，与后端 schemas 对应。 */

export interface User {
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

export interface Article {
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

export interface Document {
  id: string
  fileName: string
  fileHash: string
  mimeType: string
  fileSize: number
  status: string
  createdAt: string
  updatedAt?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  sortOrder: number
  createdAt: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AuthResponse {
  user: User
  step?: string
}
```

File: `frontend/types/index.ts`

- [ ] **Step 2: 编写 API 封装**

```typescript
/**
 * axios 实例封装。
 * 自动添加 CSRF 头，401 时自动续签。
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

/** 请求拦截器：添加 CSRF 头 */
api.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

/** 是否正在续签中 */
let isRefreshing = false
/** 等待续签的请求队列 */
let refreshQueue: Array<() => void> = []

/** 响应拦截器：TOKEN_EXPIRED 时自动续签并重试 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const code = error.response?.data?.code

    if (code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(api(originalRequest)))
        })
      }

      isRefreshing = true
      try {
        await api.post('/auth/refresh')
        refreshQueue.forEach((cb) => cb())
        refreshQueue = []
        return api(originalRequest)
      } catch {
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
```

File: `frontend/lib/api.ts`

- [ ] **Step 3: 编写认证上下文**

```tsx
'use client'

/**
 * 认证上下文。
 * 管理用户登录状态，从 localStorage 持久化。
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'

interface AuthContextType {
  /** 当前用户 */
  user: User | null
  /** 是否加载中 */
  loading: boolean
  /** 设置用户（登录/续签后调用） */
  setUser: (user: User | null) => void
  /** 登出 */
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: () => {},
})

const STORAGE_KEY = 'mudasky_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /** 初始化：从 localStorage 恢复用户信息 */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUserState(JSON.parse(stored))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  /** 设置用户并持久化 */
  const setUser = useCallback((u: User | null) => {
    setUserState(u)
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  /** 登出 */
  const logout = useCallback(() => {
    setUser(null)
    window.location.href = '/login'
  }, [setUser])

  const value = useMemo(
    () => ({ user, loading, setUser, logout }),
    [user, loading, setUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

File: `frontend/contexts/AuthContext.tsx`

- [ ] **Step 4: 编写认证 hook**

```typescript
'use client'

/** 认证状态 hook。 */

import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

export function useAuth() {
  return useContext(AuthContext)
}
```

File: `frontend/hooks/use-auth.ts`

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky && git add frontend/types/ frontend/lib/api.ts frontend/contexts/ frontend/hooks/
git commit -m "feat: 添加类型定义、API 封装、认证上下文"
```

---

## Task 3: 根布局 + 404 页面

**Files:**
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/app/not-found.tsx`

- [ ] **Step 1: 编写根布局**

```tsx
/**
 * 根布局。
 * 加载全局字体和样式，包裹 AuthProvider。
 */

import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: '慕大国际教育',
  description: '专注国际教育 专注出国服务',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${lexend.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

File: `frontend/app/layout.tsx`

- [ ] **Step 2: 编写 404 页面**

```tsx
/** 404 页面。 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">页面未找到</p>
      <Button asChild className="mt-8">
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  )
}
```

File: `frontend/app/not-found.tsx`

- [ ] **Step 3: 提交**

```bash
cd d:/Code/mudasky && git add frontend/app/layout.tsx frontend/app/not-found.tsx frontend/app/globals.css
git commit -m "feat: 添加根布局（字体+AuthProvider）和 404 页面"
```

---

## Task 4: 官网布局组件（Header + Footer + Banner）

**Files:**
- Create: `frontend/components/layout/Header.tsx`
- Create: `frontend/components/layout/Footer.tsx`
- Create: `frontend/components/layout/Banner.tsx`
- Create: `frontend/app/(public)/layout.tsx`

- [ ] **Step 1: 编写 Header**

```tsx
'use client'

/**
 * 官网顶部导航。
 * 红色横幅 + Logo + 10 个导航栏目。
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: '网站首页', href: '/' },
  { label: '关于我们', href: '/about' },
  { label: '出国留学', href: '/study-abroad' },
  { label: '院校选择', href: '/universities' },
  { label: '申请条件', href: '/requirements' },
  { label: '成功案例', href: '/cases' },
  { label: '签证办理', href: '/visa' },
  { label: '留学生活', href: '/life' },
  { label: '新闻政策', href: '/news' },
  { label: '联系我们', href: '/contact' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header>
      {/* 红色横幅 */}
      <div className="bg-primary text-primary-foreground text-sm py-1">
        <div className="container mx-auto flex justify-end px-4">
          <span>服务热线：189-1268-6656 | 吴老师</span>
        </div>
      </div>

      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            慕大国际教育
          </Link>

          {/* 导航项 */}
          <ul className="flex gap-6">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`transition-colors duration-200 hover:text-primary ${
                    pathname === item.href
                      ? 'text-primary font-medium'
                      : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
```

File: `frontend/components/layout/Header.tsx`

- [ ] **Step 2: 编写 Footer**

```tsx
/**
 * 官网底部。
 * 深灰背景，公司信息 + 联系方式 + 二维码。
 */

export function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 公司简介 */}
        <div>
          <h3 className="text-white text-lg font-bold mb-4">慕大国际教育</h3>
          <p className="text-sm leading-relaxed">
            慕大国际从事小语种留学项目运营已15年，为慕尼黑大学语言中心江苏省唯一指定招生考点。
          </p>
        </div>

        {/* 联系方式 */}
        <div>
          <h3 className="text-white text-lg font-bold mb-4">联系我们</h3>
          <ul className="space-y-2 text-sm">
            <li>苏州市吴中区苏州大学城林泉街377号公共学院5号楼7楼</li>
            <li>189-1268-6656</li>
            <li>haoanmuaxeng@163.com</li>
          </ul>
        </div>

        {/* 二维码占位 */}
        <div>
          <h3 className="text-white text-lg font-bold mb-4">申请留学</h3>
          <div className="w-24 h-24 bg-gray-600 flex items-center justify-center text-xs">
            二维码
          </div>
          <p className="text-xs mt-2">官方客服微信</p>
        </div>
      </div>

      {/* 备案 */}
      <div className="border-t border-gray-700 mt-8 pt-4">
        <p className="text-center text-xs text-gray-500">
          苏ICP备2022046719号-1 | 慕大国际
        </p>
      </div>
    </footer>
  )
}
```

File: `frontend/components/layout/Footer.tsx`

- [ ] **Step 3: 编写 Banner**

```tsx
/**
 * 页面 Banner 组件。
 * 大图 + 半透明遮罩 + 标题（中英文）。
 */

interface BannerProps {
  /** 中文标题 */
  title: string
  /** 英文副标题 */
  subtitle?: string
  /** 背景图片 URL */
  image?: string
}

export function Banner({ title, subtitle, image }: BannerProps) {
  return (
    <div
      className="relative h-64 bg-cover bg-center"
      style={{
        backgroundImage: image ? `url(${image})` : undefined,
        backgroundColor: image ? undefined : '#374151',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative flex h-full flex-col items-center justify-center text-white">
        <h1 className="text-3xl font-bold">【{title}】</h1>
        {subtitle && (
          <p className="mt-2 text-sm tracking-widest uppercase">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
```

File: `frontend/components/layout/Banner.tsx`

- [ ] **Step 4: 编写官网布局**

```tsx
/**
 * 官网公开页面布局。
 * Header + Banner + 内容区 + Footer。
 */

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
```

File: `frontend/app/(public)/layout.tsx`

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky && git add frontend/components/layout/ frontend/app/\(public\)/layout.tsx
git commit -m "feat: 添加官网布局组件（Header、Footer、Banner）"
```

---

## Task 5: 认证 + 用户中心 + 后台管理布局

**Files:**
- Create: `frontend/app/(auth)/layout.tsx`
- Create: `frontend/components/layout/UserSidebar.tsx`
- Create: `frontend/app/(user)/layout.tsx`
- Create: `frontend/components/layout/AdminSidebar.tsx`
- Create: `frontend/app/(admin)/layout.tsx`

- [ ] **Step 1: 编写认证布局**

```tsx
/**
 * 认证页面布局。
 * 居中卡片，简洁背景。
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">慕大国际教育</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
```

File: `frontend/app/(auth)/layout.tsx`

- [ ] **Step 2: 编写 UserSidebar**

```tsx
'use client'

/** 用户中心侧边栏。 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, FileText, BookOpen } from 'lucide-react'

const items = [
  { label: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { label: '个人资料', href: '/profile', icon: User },
  { label: '文档管理', href: '/documents', icon: FileText },
  { label: '我的文章', href: '/articles', icon: BookOpen },
]

export function UserSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r bg-white p-4">
      <h2 className="mb-4 text-lg font-bold">用户中心</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 hover:text-primary ${
              pathname === item.href
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

File: `frontend/components/layout/UserSidebar.tsx`

- [ ] **Step 3: 编写用户中心布局**

```tsx
/** 用户中心布局。 */

import { UserSidebar } from '@/components/layout/UserSidebar'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 bg-muted/30 p-6">{children}</main>
    </div>
  )
}
```

File: `frontend/app/(user)/layout.tsx`

- [ ] **Step 4: 编写 AdminSidebar**

```tsx
'use client'

/** 后台管理侧边栏。 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Tag } from 'lucide-react'

const items = [
  { label: '仪表盘', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: '用户管理', href: '/admin/users', icon: Users },
  { label: '文章管理', href: '/admin/articles', icon: BookOpen },
  { label: '分类管理', href: '/admin/categories', icon: Tag },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r bg-white p-4">
      <h2 className="mb-4 text-lg font-bold text-primary">管理后台</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 hover:text-primary ${
              pathname === item.href
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

File: `frontend/components/layout/AdminSidebar.tsx`

- [ ] **Step 5: 编写后台管理布局**

```tsx
/** 后台管理布局。 */

import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-muted/30 p-6">{children}</main>
    </div>
  )
}
```

File: `frontend/app/(admin)/layout.tsx`

- [ ] **Step 6: 提交**

```bash
cd d:/Code/mudasky && git add frontend/app/\(auth\)/ frontend/app/\(user\)/ frontend/app/\(admin\)/ frontend/components/layout/UserSidebar.tsx frontend/components/layout/AdminSidebar.tsx
git commit -m "feat: 添加认证、用户中心、后台管理布局"
```

---

## Task 6: 官网页面占位（10 个栏目 + 文章详情）

**Files:**
- Create: 11 个页面文件

- [ ] **Step 1: 创建目录结构**

```bash
cd d:/Code/mudasky/frontend
mkdir -p app/\(public\)/about
mkdir -p app/\(public\)/study-abroad
mkdir -p app/\(public\)/universities
mkdir -p app/\(public\)/requirements
mkdir -p app/\(public\)/cases
mkdir -p app/\(public\)/visa
mkdir -p app/\(public\)/life
mkdir -p app/\(public\)/news
mkdir -p app/\(public\)/contact
mkdir -p app/\(public\)/articles/\[id\]
```

- [ ] **Step 2: 编写首页**

```tsx
/** 首页。 */

import { Banner } from '@/components/layout/Banner'

export default function HomePage() {
  return (
    <>
      <Banner title="慕大国际教育" subtitle="专注国际教育 专注出国服务" />
      <div className="container mx-auto px-4 py-12">
        {/* TODO: 关于我们板块 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">关于我们</h2>
          <p className="text-muted-foreground">待实现</p>
        </section>

        {/* TODO: 精选服务板块 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">精选服务</h2>
          <p className="text-muted-foreground">待实现</p>
        </section>

        {/* TODO: 院校选择板块 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">院校选择</h2>
          <p className="text-muted-foreground">待实现</p>
        </section>

        {/* TODO: 新闻中心板块 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">新闻中心</h2>
          <p className="text-muted-foreground">待实现</p>
        </section>
      </div>
    </>
  )
}
```

File: `frontend/app/(public)/page.tsx`

- [ ] **Step 3: 编写其他 9 个官网页面（统一模板）**

每个页面使用 Banner + 占位内容。以 about 为例：

```tsx
/** 关于我们页面。 */

import { Banner } from '@/components/layout/Banner'

export default function AboutPage() {
  return (
    <>
      <Banner title="关于我们" subtitle="About Us" />
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">待实现</p>
      </div>
    </>
  )
}
```

对应文件和标题：

| 文件 | 标题 | 英文副标题 |
|------|------|-----------|
| `about/page.tsx` | 关于我们 | About Us |
| `study-abroad/page.tsx` | 出国留学 | Study Abroad |
| `universities/page.tsx` | 院校选择 | Universities |
| `requirements/page.tsx` | 申请条件 | Requirements |
| `cases/page.tsx` | 成功案例 | Success Cases |
| `visa/page.tsx` | 签证办理 | Visa Service |
| `life/page.tsx` | 留学生活 | Campus Life |
| `news/page.tsx` | 新闻政策 | News & Policy |
| `contact/page.tsx` | 联系我们 | Contact Us |

- [ ] **Step 4: 编写文章详情页**

```tsx
/** 文章详情页。 */

import { Banner } from '@/components/layout/Banner'

export default function ArticleDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <>
      <Banner title="文章详情" subtitle="Article Detail" />
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">文章 ID: {params.id} — 待实现</p>
      </div>
    </>
  )
}
```

File: `frontend/app/(public)/articles/[id]/page.tsx`

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky && git add frontend/app/\(public\)/
git commit -m "feat: 添加官网 10 个栏目页面 + 文章详情页（占位）"
```

---

## Task 7: 认证 + 用户中心 + 后台管理页面占位

**Files:**
- Create: 10 个页面文件

- [ ] **Step 1: 创建目录结构**

```bash
cd d:/Code/mudasky/frontend
mkdir -p app/\(auth\)/login
mkdir -p app/\(auth\)/register
mkdir -p app/\(user\)/dashboard
mkdir -p app/\(user\)/profile
mkdir -p app/\(user\)/documents
mkdir -p app/\(user\)/articles
mkdir -p app/\(admin\)/admin/dashboard
mkdir -p app/\(admin\)/admin/users
mkdir -p app/\(admin\)/admin/articles
mkdir -p app/\(admin\)/admin/categories
```

- [ ] **Step 2: 编写登录页**

```tsx
/** 登录页面。 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          待实现：手机号+验证码 / 用户名+密码 / 手机号+密码
        </p>
      </CardContent>
    </Card>
  )
}
```

File: `frontend/app/(auth)/login/page.tsx`

- [ ] **Step 3: 编写注册页**

```tsx
/** 注册页面。 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>注册</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          待实现：手机号+验证码（必须）+ 用户名和密码（可选）
        </p>
      </CardContent>
    </Card>
  )
}
```

File: `frontend/app/(auth)/register/page.tsx`

- [ ] **Step 4: 编写用户中心页面（4 个）**

每个页面使用 Card 包裹 + 占位内容。统一模板：

```tsx
/** [页面名] 页面。 */

export default function [组件名]Page() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">[页面标题]</h1>
      <p className="text-muted-foreground">待实现</p>
    </div>
  )
}
```

| 文件 | 组件名 | 标题 |
|------|--------|------|
| `(user)/dashboard/page.tsx` | Dashboard | 仪表盘 |
| `(user)/profile/page.tsx` | Profile | 个人资料 |
| `(user)/documents/page.tsx` | Documents | 文档管理 |
| `(user)/articles/page.tsx` | MyArticles | 我的文章 |

- [ ] **Step 5: 编写后台管理页面（4 个）**

同样的占位模板：

| 文件 | 组件名 | 标题 |
|------|--------|------|
| `(admin)/admin/dashboard/page.tsx` | AdminDashboard | 管理仪表盘 |
| `(admin)/admin/users/page.tsx` | AdminUsers | 用户管理 |
| `(admin)/admin/articles/page.tsx` | AdminArticles | 文章管理 |
| `(admin)/admin/categories/page.tsx` | AdminCategories | 分类管理 |

- [ ] **Step 6: 提交**

```bash
cd d:/Code/mudasky && git add frontend/app/\(auth\)/ frontend/app/\(user\)/ frontend/app/\(admin\)/
git commit -m "feat: 添加认证、用户中心、后台管理页面（占位）"
```

---

## Task 8: 内容组件（ArticleCard + ArticleSidebar + Pagination）

**Files:**
- Create: `frontend/components/content/ArticleCard.tsx`
- Create: `frontend/components/content/ArticleList.tsx`
- Create: `frontend/components/content/ArticleSidebar.tsx`
- Create: `frontend/components/common/Pagination.tsx`

- [ ] **Step 1: 编写 ArticleCard**

```tsx
/**
 * 文章卡片。
 * hover 时整卡片背景变红色，文字变白色。
 */

import Link from 'next/link'

interface ArticleCardProps {
  id: string
  title: string
  summary: string
  date: string
  image?: string
}

export function ArticleCard({
  id,
  title,
  summary,
  date,
  image,
}: ArticleCardProps) {
  const [year, month, day] = date.split('-')

  return (
    <Link href={`/articles/${id}`}>
      <div className="group flex gap-4 rounded-lg border bg-card p-4 transition-colors duration-200 hover:bg-primary hover:text-primary-foreground">
        {/* 日期 */}
        <div className="flex flex-col items-center justify-center text-primary group-hover:text-primary-foreground">
          <span className="text-3xl font-bold">{day}</span>
          <span className="text-sm">
            {month}-{year}
          </span>
        </div>

        {/* 缩略图 */}
        {image && (
          <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1">
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground group-hover:text-primary-foreground/80 line-clamp-2">
            {summary}
          </p>
        </div>
      </div>
    </Link>
  )
}
```

File: `frontend/components/content/ArticleCard.tsx`

- [ ] **Step 2: 编写 ArticleSidebar**

```tsx
/**
 * 文章页右侧栏。
 * 最新文章、精彩专题推荐。
 */

export function ArticleSidebar() {
  return (
    <aside className="w-72 space-y-6">
      {/* 最新文章 */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
          最新文章
        </h3>
        <p className="text-sm text-muted-foreground">待实现</p>
      </div>

      {/* 精彩专题 */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
          精彩专题
        </h3>
        <p className="text-sm text-muted-foreground">待实现</p>
      </div>
    </aside>
  )
}
```

File: `frontend/components/content/ArticleSidebar.tsx`

- [ ] **Step 3: 编写 ArticleList**

```tsx
/**
 * 文章列表。
 * 左侧文章卡片列表 + 右侧推荐栏。
 */

import { ArticleSidebar } from './ArticleSidebar'

export function ArticleList() {
  return (
    <div className="container mx-auto flex gap-8 px-4 py-12">
      {/* 文章列表 */}
      <div className="flex-1 space-y-4">
        <p className="text-muted-foreground">待实现：文章列表</p>
      </div>

      {/* 右侧栏 */}
      <ArticleSidebar />
    </div>
  )
}
```

File: `frontend/components/content/ArticleList.tsx`

- [ ] **Step 4: 编写 Pagination**

```tsx
/**
 * 分页组件。
 */

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        上一页
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

File: `frontend/components/common/Pagination.tsx`

- [ ] **Step 5: 提交**

```bash
cd d:/Code/mudasky && git add frontend/components/content/ frontend/components/common/
git commit -m "feat: 添加文章卡片、文章列表、侧边栏、分页组件"
```

---

## Task 9: Tiptap 编辑器骨架

**Files:**
- Create: `frontend/components/editor/TiptapEditor.tsx`

- [ ] **Step 1: 编写 Tiptap 编辑器组件**

```tsx
'use client'

/**
 * Tiptap 富文本编辑器。
 * 支持标题、粗体、斜体、列表、引用、图片、链接。
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  ImageIcon,
  LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface TiptapEditorProps {
  /** 编辑器内容（HTML） */
  content?: string
  /** 内容变更回调 */
  onChange?: (html: string) => void
  /** 占位文字 */
  placeholder?: string
}

/** 工具栏按钮 */
function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  )
}

export function TiptapEditor({
  content = '',
  onChange,
  placeholder = '开始编写文章...',
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-lg border">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolbarButton
          onClick={() => {
            // TODO: 图片上传对话框
            const url = prompt('输入图片 URL')
            if (url) editor.chain().focus().setImage({ src: url }).run()
          }}
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = prompt('输入链接 URL')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* 编辑区 */}
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  )
}
```

File: `frontend/components/editor/TiptapEditor.tsx`

- [ ] **Step 2: 提交**

```bash
cd d:/Code/mudasky && git add frontend/components/editor/
git commit -m "feat: 添加 Tiptap 富文本编辑器骨架"
```

---

## Task 10: Docker 配置更新 + 验证

**Files:**
- Modify: `docker/frontend.Dockerfile`

- [ ] **Step 1: 更新 frontend.Dockerfile**

```dockerfile
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

File: `docker/frontend.Dockerfile`

- [ ] **Step 2: 本地验证**

```bash
cd d:/Code/mudasky/frontend && pnpm dev
```

Expected: 所有页面路由可访问（/、/about、/login、/dashboard、/admin/dashboard 等）

- [ ] **Step 3: 提交**

```bash
cd d:/Code/mudasky && git add docker/frontend.Dockerfile
git commit -m "feat: 更新 frontend Dockerfile（Next.js 生产构建）"
```

---

## Task 11: 最终验证和清理

- [ ] **Step 1: 运行 lint**

```bash
cd d:/Code/mudasky/frontend && pnpm lint
```

- [ ] **Step 2: 验证所有页面路由**

| URL | 预期 |
|-----|------|
| `/` | 首页 + Header + Footer |
| `/about` | 关于我们 + Banner |
| `/login` | 居中卡片登录 |
| `/register` | 居中卡片注册 |
| `/dashboard` | 用户中心 + 侧边栏 |
| `/admin/dashboard` | 后台管理 + 侧边栏 |
| `/articles/test-id` | 文章详情 |
| `/nonexistent` | 404 页面 |

- [ ] **Step 3: 最终提交**

```bash
cd d:/Code/mudasky && git add -A
git commit -m "chore: 前端骨架搭建完成"
```
