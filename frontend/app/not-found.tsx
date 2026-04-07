'use client'

/**
 * 404 页面。
 * 2 秒后自动回退到上一页。
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back()
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl text-muted-foreground">页面未找到</p>
      <p className="text-sm text-muted-foreground">2 秒后自动返回...</p>
    </div>
  )
}
