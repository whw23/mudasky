"use client"

/**
 * 官网顶部导航
 * 包含红色顶栏（电话号码）和导航菜单
 */

import { Phone } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { LocaleSwitcher } from "./LocaleSwitcher"

/** 导航菜单键与路径映射 */
const NAV_KEYS = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "studyAbroad", href: "/study-abroad" },
  { key: "universities", href: "/universities" },
  { key: "requirements", href: "/requirements" },
  { key: "cases", href: "/cases" },
  { key: "visa", href: "/visa" },
  { key: "life", href: "/life" },
  { key: "news", href: "/news" },
  { key: "contact", href: "/contact" },
] as const

/** 判断导航项是否激活 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function Header() {
  const pathname = usePathname()
  const { user, logout, showLoginModal, showRegisterModal } = useAuth()
  const { isAdmin } = usePermissions()
  const tNav = useTranslations("Nav")
  const tHeader = useTranslations("Header")

  return (
    <header>
      {/* 红色顶栏 */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-sm">
          <span>{tHeader("tagline")}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {tHeader("hotline")}
            </span>
            <LocaleSwitcher />
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="hover:underline">
                  {user.username || user.phone}
                </Link>
                {isAdmin && (
                  <Link href="/admin/dashboard" className="hover:underline">
                    {tHeader("adminPanel")}
                  </Link>
                )}
                <button onClick={logout} className="hover:underline">
                  {tHeader("logout")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={showLoginModal} className="hover:underline">
                  {tHeader("login")}
                </button>
                <span>|</span>
                <button onClick={showRegisterModal} className="hover:underline">
                  {tHeader("register")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-primary">
            {tHeader("brandName")}
          </Link>
          <ul className="flex items-center gap-1">
            {NAV_KEYS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(pathname, item.href)
                      ? "text-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
