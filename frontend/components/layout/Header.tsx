"use client"

/**
 * 官网顶部导航
 * 包含红色顶栏（电话号码）和导航菜单
 * 移动端：顶栏精简 + 汉堡菜单
 */

import { useState } from "react"
import { Phone, Menu, X } from "lucide-react"
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
  const { user, logout, showLoginModal } = useAuth()
  const { isAdmin } = usePermissions()
  const tNav = useTranslations("Nav")
  const tHeader = useTranslations("Header")
  const [menuOpen, setMenuOpen] = useState(false)

  /** 点击导航后关闭菜单 */
  function closeMenu(): void {
    setMenuOpen(false)
  }

  return (
    <header>
      {/* 红色顶栏 */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-sm">
          {/* 左侧：标语（桌面）/ 品牌名（移动） */}
          <span className="hidden md:inline">{tHeader("tagline")}</span>
          <span className="md:hidden text-xs">{tHeader("brandName")}</span>

          <div className="flex items-center gap-3 md:gap-4">
            {/* 热线电话（仅桌面） */}
            <span className="hidden md:flex items-center gap-1">
              <Phone className="size-3.5" />
              {tHeader("hotline")}
            </span>

            <LocaleSwitcher />

            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/dashboard" className="hover:underline text-xs md:text-sm">
                  {user.username || user.phone}
                </Link>
                {isAdmin && (
                  <Link href="/admin/dashboard" className="hidden md:inline hover:underline">
                    {tHeader("adminPanel")}
                  </Link>
                )}
                <button onClick={logout} className="hover:underline text-xs md:text-sm">
                  {tHeader("logout")}
                </button>
              </div>
            ) : (
              <button onClick={showLoginModal} className="hover:underline text-xs md:text-sm">
                {tHeader("login")}
              </button>
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

          {/* 桌面导航 */}
          <ul className="hidden md:flex items-center gap-1">
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

          {/* 移动端汉堡按钮 */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* 移动端展开菜单 */}
        {menuOpen && (
          <div className="md:hidden border-t bg-white">
            <ul className="flex flex-col px-4 py-2">
              {NAV_KEYS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`block rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(pathname, item.href)
                        ? "text-primary bg-primary/5"
                        : "text-foreground hover:text-primary hover:bg-muted"
                    }`}
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
              {/* 移动端管理后台入口 */}
              {isAdmin && (
                <li>
                  <Link
                    href="/admin/dashboard"
                    onClick={closeMenu}
                    className="block rounded px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    {tHeader("adminPanel")}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </nav>
    </header>
  )
}
