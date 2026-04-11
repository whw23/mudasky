"use client"

/**
 * 官网顶部导航。
 * 桌面端：顶栏（Logo+品牌+标语+热线+用户）+ 导航栏（仅链接）。
 * 移动端：单行（Logo+品牌+标语+电话+汉堡）+ 展开菜单。
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
import { HeaderLogo } from "./HeaderLogo"

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
  onPageChange?: (key: string) => void
  activePage?: string
}

export function Header({ editable, onEdit, onPageChange, activePage }: HeaderProps) {
  const pathname = usePathname()
  const { user, logout, showLoginModal } = useAuth()
  const { isAdmin } = usePermissions()
  const { siteInfo } = useLocalizedConfig()
  const tNav = useTranslations("Nav")
  const tHeader = useTranslations("Header")
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const brandName = siteInfo.brand_name || tHeader("brandName")
  const tagline = siteInfo.tagline || tHeader("tagline")
  const hotline = siteInfo.hotline

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
      className={`overflow-x-hidden transition-all duration-300 ${
        editable
          ? ""
          : `sticky top-0 z-50 ${scrolled ? "bg-white/70 backdrop-blur-xl shadow-sm" : ""}`
      }`}
    >
      {/* === 桌面顶栏 Row 1 === */}
      <div className="hidden md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          {/* 左侧：Logo + 品牌名 + 标语 */}
          <div className="flex items-center gap-3">
            {wrapEditable(
              <Link href="/" className="flex items-center gap-3">
                <HeaderLogo
                  logoUrl={siteInfo.logo_url}
                  brandName={brandName}
                  size={36}
                  className="rounded-lg shrink-0"
                />
                <span
                  className="font-[800] tracking-wide whitespace-nowrap text-foreground"
                  style={{ fontSize: 22 }}
                >
                  {brandName}
                </span>
              </Link>,
              "brand",
              "编辑品牌名称"
            )}
            {wrapEditable(
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {tagline}
              </span>,
              "tagline",
              "编辑标语"
            )}
          </div>

          {/* 右侧：热线 + 用户信息 */}
          <div className="flex items-center gap-4 text-xs text-foreground/60">
            {wrapEditable(
              hotline ? (
                <span className="flex items-center gap-1.5 font-semibold text-primary">
                  <Phone className="size-3.5" />
                  {hotline}
                </span>
              ) : null,
              "hotline",
              "编辑热线"
            )}

            <LocaleSwitcher />

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="text-foreground/70 hover:text-foreground transition-colors"
                >
                  {user.username || user.phone}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="text-foreground/60 hover:text-foreground transition-colors"
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

      {/* === 桌面导航栏 Row 2 === */}
      <nav className="hidden md:block border-t border-black/[0.04]">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2">
          <ul className="flex flex-1 items-center justify-evenly">
            {NAV_KEYS.map((item) => {
              const active = editable
                ? activePage === item.key
                : isActive(pathname, item.href)
              return (
                <li key={item.key}>
                  {editable ? (
                    <button
                      onClick={() => onPageChange?.(item.key)}
                      className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "text-primary border-b-2 border-primary"
                          : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {tNav(item.key)}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "text-primary border-b-2 border-primary"
                          : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {tNav(item.key)}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* === 移动端单行 === */}
      <div className="md:hidden">
        <div className="mx-auto flex items-center justify-between px-4 py-2">
          {/* 左侧：Logo + 品牌名 + 标语 */}
          {wrapEditable(
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <HeaderLogo
                logoUrl={siteInfo.logo_url}
                brandName={brandName}
                size={36}
                className="rounded-lg shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span
                  className="font-extrabold tracking-wide whitespace-nowrap text-foreground"
                  style={{ fontSize: 17 }}
                >
                  {brandName}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate">
                  {tagline}
                </span>
              </div>
            </Link>,
            "brand",
            "编辑品牌名称"
          )}

          {/* 右侧：电话按钮 + 汉堡菜单 */}
          <div className="flex items-center gap-1">
            {hotline && (
              <a
                href={`tel:${hotline}`}
                className="p-2 rounded-full bg-primary/5 text-primary transition-colors"
                aria-label="拨打热线"
              >
                <Phone className="size-4" />
              </a>
            )}
            <button
              className="p-2 text-foreground/70 hover:text-foreground rounded-full hover:bg-foreground/5 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* === 移动端展开菜单 === */}
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
          {/* 热线电话栏 */}
          {hotline && (
            <div className="mx-3 mt-2 mb-1 rounded-lg bg-primary/5 px-4 py-2.5 text-sm text-primary flex items-center gap-2">
              <Phone className="size-4" />
              服务热线：{hotline}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
