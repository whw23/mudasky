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
}

/** 立即咨询按钮 */
export function ConsultButton({ className, children, href }: ConsultButtonProps) {
  const { isLoggedIn, showLoginModal } = useAuth()
  const router = useRouter()

  const handleClick = () => {
    const target = href || "/about"
    if (target.startsWith("http")) {
      window.open(target, "_blank", "noopener,noreferrer")
    } else {
      router.push(target)
    }
    if (!isLoggedIn) {
      showLoginModal()
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
