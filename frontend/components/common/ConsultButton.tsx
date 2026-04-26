"use client"

/**
 * 立即咨询按钮。
 * 已登录：跳转到关于我们页面联系信息区域。
 * 未登录：弹出登录弹窗。
 */

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "@/i18n/navigation"

interface ConsultButtonProps {
  className?: string
  children: React.ReactNode
  href?: string
  showLogin?: boolean
}

/** 立即咨询按钮 */
export function ConsultButton({ className, children, href, showLogin }: ConsultButtonProps) {
  const { isLoggedIn, showLoginModal } = useAuth()
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      if (href.startsWith("http")) {
        window.open(href, "_blank", "noopener,noreferrer")
      } else {
        router.push(href)
      }
    }
    if (showLogin && !isLoggedIn) {
      showLoginModal()
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
