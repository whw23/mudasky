"use client"

/**
 * 后台管理侧边栏
 * 包含仪表盘、用户管理、文章管理、分类管理导航
 */

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { LayoutDashboard, Users, BookOpen, Tag, ArrowLeft } from "lucide-react"

/** 侧边栏菜单键与路径映射 */
const MENU_KEYS = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "userManagement", href: "/admin/users", icon: Users },
  { key: "articleManagement", href: "/admin/articles", icon: BookOpen },
  { key: "categoryManagement", href: "/admin/categories", icon: Tag },
] as const

export function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Admin")

  return (
    <aside className="w-60 shrink-0 border-r bg-gray-900 text-gray-300">
      <div className="p-4">
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t("backToSite")}
        </Link>
        <h2 className="mb-4 text-lg font-bold text-white">{t("title")}</h2>
        <nav className="space-y-1">
          {MENU_KEYS.map((item) => {
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
                {t(item.key)}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
