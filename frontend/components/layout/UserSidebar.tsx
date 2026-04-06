"use client"

/**
 * 用户中心侧边栏
 * 包含仪表盘、个人资料、文档管理、我的文章导航
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, User, FileText, BookOpen, ArrowLeft } from "lucide-react"

/** 侧边栏菜单项 */
const MENU_ITEMS = [
  { label: "仪表盘", href: "/dashboard", icon: LayoutDashboard },
  { label: "个人资料", href: "/profile", icon: User },
  { label: "文档管理", href: "/documents", icon: FileText },
  { label: "我的文章", href: "/articles", icon: BookOpen },
] as const

export function UserSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 border-r bg-gray-50">
      <div className="p-4">
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回官网
        </Link>
        <h2 className="mb-4 text-lg font-bold text-foreground">用户中心</h2>
        <nav className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
