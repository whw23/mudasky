"use client"

/**
 * 用户中心侧边栏
 * 包含仪表盘、个人资料、文档管理、我的文章导航
 */

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { LayoutDashboard, User, FileText, BookOpen, ArrowLeft } from "lucide-react"

/** 侧边栏菜单键与路径映射 */
const MENU_KEYS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "profile", href: "/profile", icon: User },
  { key: "documents", href: "/documents", icon: FileText },
  { key: "myArticles", href: "/articles", icon: BookOpen },
] as const

export function UserSidebar() {
  const pathname = usePathname()
  const t = useTranslations("User")

  return (
    <aside className="w-60 shrink-0 border-r bg-gray-50">
      <div className="p-4">
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t("backToSite")}
        </Link>
        <h2 className="mb-4 text-lg font-bold text-foreground">{t("title")}</h2>
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
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
