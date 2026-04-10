"use client"

/**
 * 后台管理侧边栏
 * 包含仪表盘、用户管理、角色管理、文章管理、分类管理等导航
 * 根据用户权限过滤菜单项
 */

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import {
  LayoutDashboard,
  Users,
  Shield,
  Wrench,
  Settings,
  ArrowLeft,
} from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

/** 菜单项类型 */
interface MenuItem {
  key: string
  href: string
  icon: typeof LayoutDashboard
  permissions?: string[]
}

/** 侧边栏菜单键与路径映射 */
const MENU_KEYS: MenuItem[] = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "userManagement", href: "/admin/users", icon: Users, permissions: ["admin.user.*"] },
  { key: "roleManagement", href: "/admin/roles", icon: Shield, permissions: ["admin.role.*"] },
  { key: "generalSettings", href: "/admin/general-settings", icon: Wrench, permissions: ["admin.settings.*"] },
  { key: "webSettings", href: "/admin/web-settings", icon: Settings, permissions: ["admin.settings.*"] },
]

/** 后台管理侧边栏 */
export function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Admin")
  const { hasPermission } = usePermissions()

  /** 根据权限过滤菜单项 */
  const visibleItems = MENU_KEYS.filter(
    (item) =>
      !item.permissions || item.permissions.some((p) => hasPermission(p))
  )

  return (
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
        {visibleItems.map((item) => {
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
  )
}
