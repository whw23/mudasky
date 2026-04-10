"use client"

/**
 * 官网顶部导航。
 * 全透明毛玻璃风格：默认透明，滚动后统一毛玻璃效果。
 * 移动端：汉堡菜单 + 毛玻璃面板。
 */

import { useState, useEffect } from "react"
import { Phone, Menu, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { LocaleSwitcher } from "./LocaleSwitcher"

/** 导航菜单键与路径映射 */
const NAV_KEYS = [
  { key: "home", href: "/" },
  { key: "universities", href: "/universities" },
  { key: "studyAbroad", href: "/study-abroad" },
  { key: "requirements", href: "/requirements" },
  { key: "cases", href: "/cases" },
  { key: "visa", href: "/visa" },
  { key: "life", href: "/life" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
] as const

/** 判断导航项是否激活 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

interface HeaderProps {
  editable?: boolean
  onEdit?: (section: string) => void
}

export function Header({ editable, onEdit }: HeaderProps) {
  const pathname = usePathname()
  const { user, logout, showLoginModal } = useAuth()
  const { isAdmin } = usePermissions()
  const { siteInfo } = useLocalizedConfig()
  const tNav = useTranslations("Nav")
  const tHeader = useTranslations("Header")
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  /** 将内容包裹在可编辑叠加层中 */
  function wrapEditable(content: React.ReactNode, section: string, label: string) {
    if (!editable) return content
    return (
      <EditableOverlay onClick={() => onEdit?.(section)} label={label}>
        {content}
      </EditableOverlay>
    )
  }

  /** 监听滚动，滚动后启用毛玻璃背景 */
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
    <header
      className={`sticky top-0 z-50 overflow-x-hidden transition-all duration-300 ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl shadow-sm"
          : ""
      }`}
    >
      {/* 顶部信息栏 — 全透明 */}
      <div className="text-foreground/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          {/* 左侧：标语（桌面）/ 品牌名（移动） */}
          {wrapEditable(
            <span className="hidden md:inline tracking-wide">
              {siteInfo.tagline || tHeader("tagline")}
            </span>,
            "tagline",
            "编辑标语"
          )}
          {wrapEditable(
            <span className="md:hidden font-medium text-foreground/70">
              {siteInfo.brand_name || tHeader("brandName")}
            </span>,
            "brand",
            "编辑品牌名称"
          )}

          <div className="flex items-center gap-3 md:gap-4">
            {/* 热线电话（仅桌面） */}
            {wrapEditable(
              <span className="hidden md:flex items-center gap-1.5">
                <Phone className="size-3" />
                {siteInfo.hotline
                  ? `服务热线：${siteInfo.hotline} | ${siteInfo.hotline_contact}`
                  : tHeader("hotline")}
              </span>,
              "hotline",
              "编辑热线"
            )}

            <LocaleSwitcher />

            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <Link
                  href="/dashboard"
                  className="text-foreground/70 hover:text-foreground transition-colors"
                >
                  {user.username || user.phone}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="hidden md:inline text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {tHeader("adminPanel")}
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-foreground/60 hover:text-foreground transition-colors"
                >
                  {tHeader("logout")}
                </button>
              </div>
            ) : (
              <button
                onClick={showLoginModal}
                className="rounded-full border border-foreground/20 px-4 py-1 text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                {tHeader("loginOrRegister")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 分隔线 — 仅滚动后显示 */}
      <div
        className={`border-b transition-colors duration-300 ${
          scrolled ? "border-black/[0.04]" : "border-transparent"
        }`}
      />

      {/* 主导航栏 — 透明，滚动后随父容器毛玻璃 */}
      <nav>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* 品牌名 */}
          {wrapEditable(
            <Link
              href="/"
              className="text-lg font-bold tracking-wide whitespace-nowrap text-foreground"
            >
              {siteInfo.brand_name || tHeader("brandName")}
            </Link>,
            "brand",
            "编辑品牌名称"
          )}

          {/* 桌面导航 */}
          <ul className="hidden md:flex items-center gap-0.5">
            {NAV_KEYS.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* 移动端汉堡按钮 */}
          <button
            className="md:hidden p-2 text-foreground/70 hover:text-foreground rounded-full hover:bg-foreground/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* 移动端展开菜单 — 毛玻璃面板 */}
        {menuOpen && (
          <div className="md:hidden border-t border-black/[0.04] bg-white/90 backdrop-blur-xl">
            <ul className="flex flex-col px-4 py-2">
              {NAV_KEYS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`block whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(pathname, item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
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
                    className="block whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
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
