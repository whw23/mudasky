"use client"

/**
 * 官网顶部导航。
 * 桌面端：顶栏（Logo+品牌+标语+热线+用户）+ 导航栏（仅链接）。
 * 移动端：单行（Logo+品牌+标语+电话+汉堡）+ 展开菜单。
 */

import { useState, useEffect } from "react"
import { Phone, Menu, X } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useLocalizedConfig, useConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { LocaleSwitcher } from "./LocaleSwitcher"
import { HeaderLogo } from "./HeaderLogo"


/** 预设导航项 key → href 映射 */
const BUILTIN_HREF: Record<string, string> = {
  home: "/",
  universities: "/universities",
  "study-abroad": "/study-abroad",
  requirements: "/requirements",
  cases: "/cases",
  visa: "/visa",
  life: "/life",
  news: "/news",
  about: "/about",
}

/** 预设导航项 key → 翻译 key 映射（kebab-case → camelCase） */
const NAV_KEY_TO_I18N: Record<string, string> = {
  home: "home",
  universities: "universities",
  "study-abroad": "studyAbroad",
  requirements: "requirements",
  cases: "cases",
  visa: "visa",
  life: "life",
  news: "news",
  about: "about",
}

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
  hideNav?: boolean
}

export function Header({ editable, onEdit, onPageChange, activePage, hideNav }: HeaderProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const { user, logout, showLoginModal } = useAuth()
  const { isAdmin } = usePermissions()
  const { siteInfo, navConfig } = useLocalizedConfig()
  const rawConfig = useConfig()
  const tNav = useTranslations("Nav")
  const tHeader = useTranslations("Header")
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)


  const brandName = siteInfo.brand_name || tHeader("brandName")
  const brandNameEn = getLocalizedValue(rawConfig.siteInfo.brand_name, "en") || "MUTU International Education"
  const tagline = siteInfo.tagline || tHeader("tagline")
  const hotline = siteInfo.hotline
  const hotlineContact = siteInfo.hotline_contact

  /** 根据 navConfig 生成导航项列表 */
  const navItems = navConfig.order.map((key) => {
    const i18nKey = NAV_KEY_TO_I18N[key]
    if (i18nKey) {
      // 预设项
      return { key, href: BUILTIN_HREF[key] || `/${key}`, label: tNav(i18nKey) }
    }
    // 自定义项
    const custom = navConfig.custom_items.find((c) => c.slug === key)
    const name = custom?.name
    const label = typeof name === "string" ? name : (name as Record<string, string>)?.[locale] || key
    return { key, href: `/${key}`, label }
  })

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

  /** 是否当前处于透明状态 */
  const isTransparentNow = !editable && !scrolled

  return (
    <header
      className={`overflow-x-hidden transition-all duration-300 ${
        editable
          ? ""
          : `fixed top-0 left-0 right-0 z-50 ${scrolled ? "bg-white/50 backdrop-blur-xl shadow-sm" : "bg-white/10 backdrop-blur-sm"}`
      }`}
    >
      {/* === 桌面顶栏 Row 1 === */}
      <div className="hidden md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          {/* 左侧：Logo + 品牌名 + 标语 */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              {wrapEditable(
                <HeaderLogo
                  logoUrl={siteInfo.logo_url}
                  brandName={brandName}
                  size={36}
                  className="rounded-lg shrink-0"
                />,
                "logo",
                "编辑 Logo"
              )}
              {wrapEditable(
                <div className="flex flex-col">
                  <span
                    className={`font-[800] tracking-wide whitespace-nowrap ${isTransparentNow ? "text-white/90" : "text-foreground"}`}
                    style={{ fontSize: 22 }}
                  >
                    {brandName}
                  </span>
                  <span className={`text-[10px] whitespace-nowrap ${isTransparentNow ? "text-white/60" : "text-muted-foreground"}`}>
                    {brandNameEn}
                  </span>
                </div>,
                "brand_name",
                "编辑品牌名称"
              )}
            </Link>
            {wrapEditable(
              <span className={`text-xs whitespace-nowrap ${isTransparentNow ? "text-white/60" : "text-muted-foreground"}`}>
                {tagline}
              </span>,
              "tagline",
              "编辑标语"
            )}
          </div>

          {/* 右侧：热线 + 用户信息 */}
          <div className={`flex items-center gap-4 text-xs ${isTransparentNow ? "text-white/70" : "text-foreground/60"}`}>
            {wrapEditable(
              hotline ? (
                <span className={`flex items-center gap-1.5 font-bold text-sm whitespace-nowrap ${isTransparentNow ? "text-amber-300" : "text-primary"}`}>
                  <Phone className="size-4" />
                  {hotline}
                  {hotlineContact && (
                    <span>{hotlineContact}</span>
                  )}
                </span>
              ) : null,
              "hotline",
              "编辑热线"
            )}

            <div className={editable ? "pointer-events-none" : ""}>
              <LocaleSwitcher />
            </div>

            <div className={editable ? "pointer-events-none" : ""}>
              {user ? (
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <Link
                    href="/portal/overview"
                    className={`transition-colors ${isTransparentNow ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-foreground"}`}
                  >
                    {user.username || user.phone}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      className={`transition-colors ${isTransparentNow ? "text-white/80 hover:text-white" : "text-foreground/60 hover:text-foreground"}`}
                    >
                      {tHeader("adminPanel")}
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className={`transition-colors ${isTransparentNow ? "text-white/80 hover:text-white" : "text-foreground/60 hover:text-foreground"}`}
                  >
                    {tHeader("logout")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={showLoginModal}
                  className={`rounded-full border px-4 py-1 transition-colors ${isTransparentNow ? "border-white/40 text-white hover:border-white" : "border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40"}`}
                >
                  {tHeader("loginOrRegister")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === 桌面导航栏 Row 2 === */}
      {!hideNav && (
        <nav className={`hidden md:block border-t ${isTransparentNow ? "border-white/20" : "border-black/[0.04]"}`}>
          <div className="mx-auto flex max-w-7xl items-center px-4 py-2">
            <ul className="flex flex-1 items-center justify-evenly">
              {navItems.map((item) => {
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
                            : isTransparentNow
                              ? "text-white/90 hover:text-white"
                              : "text-foreground/60 hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "text-primary border-b-2 border-primary"
                            : isTransparentNow
                              ? "text-white/90 hover:text-white"
                              : "text-foreground/60 hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      )}

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
                  className={`font-extrabold tracking-wide whitespace-nowrap ${isTransparentNow ? "text-white/90" : "text-foreground"}`}
                  style={{ fontSize: 17 }}
                >
                  {brandName}
                </span>
                <span className={`text-[10px] whitespace-nowrap truncate ${isTransparentNow ? "text-white/60" : "text-muted-foreground"}`}>
                  {tagline}
                </span>
              </div>
            </Link>,
            "brand",
            "编辑品牌名称"
          )}

          {/* 右侧：电话 + 登录/用户 + 汉堡菜单 */}
          <div className="flex items-center gap-1">
            {hotline && (
              <a
                href={`tel:${hotline}`}
                className={`p-2 rounded-full transition-colors ${isTransparentNow ? "bg-white/10 text-amber-300" : "bg-primary/5 text-primary"}`}
                aria-label="拨打热线"
              >
                <Phone className="size-4" />
              </a>
            )}
            {user ? (
              <Link
                href="/portal/overview"
                onClick={closeMenu}
                className={`p-2 rounded-full transition-colors ${isTransparentNow ? "bg-white/10 text-white/80" : "bg-foreground/5 text-foreground/60"}`}
              >
                <span className="size-4 flex items-center justify-center text-xs font-medium">
                  {(user.username || user.phone || "U").charAt(0).toUpperCase()}
                </span>
              </Link>
            ) : (
              <button
                onClick={showLoginModal}
                className={`p-2 rounded-full transition-colors ${isTransparentNow ? "bg-white/10 text-white/80 hover:text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"}`}
                aria-label={tHeader("loginOrRegister")}
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            )}
            <button
              className={`p-2 rounded-full transition-colors ${isTransparentNow ? "text-white/80 hover:text-white hover:bg-white/10" : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"}`}
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
            {navItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  className={`block whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(pathname, item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {item.label}
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
          {/* 已登录：登出按钮 */}
          {user && (
            <div className="mx-3 mt-2 mb-1">
              <button
                onClick={() => { logout(); closeMenu() }}
                className="w-full rounded-lg bg-foreground/5 px-4 py-2.5 text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                {tHeader("logout")}
              </button>
            </div>
          )}
          {/* 热线电话栏 */}
          {hotline && (
            <div className="mx-3 mt-1 mb-1 rounded-lg bg-primary/5 px-4 py-2.5 text-sm text-primary flex items-center gap-2">
              <Phone className="size-4" />
              服务热线：{hotline}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
