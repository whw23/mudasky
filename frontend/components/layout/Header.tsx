"use client"

/**
 * 官网顶部导航。
 * 白底毛玻璃风格：深色信息栏 + 半透明导航栏（sticky）。
 * 移动端：汉堡菜单 + 毛玻璃面板。
 */

import { useState, useEffect } from "react"
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
  const [scrolled, setScrolled] = useState(false)

  /** 监听滚动，导航栏增强毛玻璃 */
  useEffect(() => {
    function handleScroll(): void {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  /** 点击导航后关闭菜单 */
  function closeMenu(): void {
    setMenuOpen(false)
  }

  return (
    <header className="relative z-50">
      {/* 顶部信息栏 — 深色半透明 */}
      <div className="bg-[rgba(26,26,46,0.92)] backdrop-blur-md text-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          {/* 左侧：标语（桌面）/ 品牌名（移动） */}
          <span className="hidden md:inline tracking-wide">{tHeader("tagline")}</span>
          <span className="md:hidden font-medium text-white/90">{tHeader("brandName")}</span>

          <div className="flex items-center gap-3 md:gap-4">
            {/* 热线电话（仅桌面） */}
            <span className="hidden md:flex items-center gap-1.5 text-white/70">
              <Phone className="size-3" />
              {tHeader("hotline")}
            </span>

            <LocaleSwitcher />

            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/dashboard" className="text-white/90 hover:text-white transition-colors">
                  {user.username || user.phone}
                </Link>
                {isAdmin && (
                  <Link href="/admin/dashboard" className="hidden md:inline text-white/70 hover:text-white transition-colors">
                    {tHeader("adminPanel")}
                  </Link>
                )}
                <button onClick={logout} className="text-white/70 hover:text-white transition-colors">
                  {tHeader("logout")}
                </button>
              </div>
            ) : (
              <button
                onClick={showLoginModal}
                className="rounded-full bg-white/10 px-3.5 py-1 text-white/90 hover:bg-white/20 transition-colors"
              >
                {tHeader("login")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主导航栏 — 白底毛玻璃 + sticky */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-sm border-black/[0.04]"
            : "bg-white/90 backdrop-blur-lg border-black/[0.06]"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* 品牌名 */}
          <Link href="/" className="text-lg font-bold tracking-wide text-foreground">
            {tHeader("brandName")}
          </Link>

          {/* 桌面导航 */}
          <ul className="hidden md:flex items-center gap-0.5">
            {NAV_KEYS.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {tNav(item.key)}
                    {/* 活跃指示线 */}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* 移动端汉堡按钮 */}
          <button
            className="md:hidden p-2 text-foreground hover:bg-accent rounded-md transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* 移动端展开菜单 — 毛玻璃面板 */}
        {menuOpen && (
          <div className="md:hidden border-t border-black/[0.04] bg-white/95 backdrop-blur-xl">
            <ul className="flex flex-col px-4 py-2">
              {NAV_KEYS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`block whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(pathname, item.href)
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                    className="block whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
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
