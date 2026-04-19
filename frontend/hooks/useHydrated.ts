"use client"

/**
 * 检测 React 水合是否完成。
 * SSR 时返回 false，客户端水合完成后返回 true。
 * 用于控制交互元素的可见性，替代 networkidle 等待。
 */

import { useState, useEffect } from "react"

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])
  return hydrated
}
