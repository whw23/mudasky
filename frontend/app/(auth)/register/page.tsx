'use client'

/**
 * 注册页面（已改为全局 Modal）。
 * 访问此页面时自动打开注册弹窗并跳转首页。
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function RegisterPage() {
  const router = useRouter()
  const { showRegisterModal } = useAuth()

  useEffect(() => {
    showRegisterModal()
    router.replace('/')
  }, [showRegisterModal, router])

  return null
}
