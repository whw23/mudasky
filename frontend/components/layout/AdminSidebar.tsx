"use client"

/**
 * 后台管理侧边栏
 * 包含仪表盘、用户管理、文章管理、分类管理导航
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, BookOpen, Tag, ArrowLeft } from "lucide-react"

/** 侧边栏菜单项 */
const MENU_ITEMS = [
  { label: "仪表盘", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "用户管理", href: "/admin/users", icon: Users },
  { label: "文章管理", href: "/admin/articles", icon: BookOpen },
  { label: "分类管理", href: "/admin/categories", icon: Tag },
] as const

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 border-r bg-gray-900 text-gray-300">
      <div className="p-4">
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回官网
        </Link>
        <h2 className="mb-4 text-lg font-bold text-white">管理后台</h2>
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
                    ? "bg-primary/20 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
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
