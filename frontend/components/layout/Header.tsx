"use client"

/**
 * 官网顶部导航
 * 包含红色顶栏（电话号码）和导航菜单
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Phone } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

/** 导航菜单项 */
const NAV_ITEMS = [
  { label: "网站首页", href: "/" },
  { label: "关于我们", href: "/about" },
  { label: "出国留学", href: "/study-abroad" },
  { label: "院校选择", href: "/universities" },
  { label: "申请条件", href: "/requirements" },
  { label: "成功案例", href: "/cases" },
  { label: "签证办理", href: "/visa" },
  { label: "留学生活", href: "/life" },
  { label: "新闻政策", href: "/news" },
  { label: "联系我们", href: "/contact" },
] as const

/** 判断导航项是否激活 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function Header() {
  const pathname = usePathname()
  const { user, logout, showLoginModal } = useAuth()

  return (
    <header>
      {/* 红色顶栏 */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-sm">
          <span>慕大国际教育 · 专注国际教育 专注出国服务</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              服务热线：189-1268-6656 | 吴老师
            </span>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="hover:underline">
                  {user.username || user.phone}
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin/dashboard" className="hover:underline">
                    管理后台
                  </Link>
                )}
                <button onClick={logout} className="hover:underline">
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={showLoginModal} className="hover:underline">
                  登录
                </button>
                <span>|</span>
                <Link href="/register" className="hover:underline">
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-primary">
            慕大国际教育
          </Link>
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(pathname, item.href)
                      ? "text-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
