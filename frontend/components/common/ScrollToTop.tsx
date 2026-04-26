"use client"

/** 回到顶部按钮。滚动超过一屏时显示，点击平滑回到顶部。 */

import { useEffect, useState, useCallback } from "react"
import { ArrowUp } from "lucide-react"

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY
    const mainEl = document.querySelector("main")
    const scrollTop = mainEl ? mainEl.scrollTop : scrollY
    setVisible(scrollTop > 400)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, true)
    return () => window.removeEventListener("scroll", handleScroll, true)
  }, [handleScroll])

  function scrollToTop() {
    const mainEl = document.querySelector("main")
    if (mainEl && mainEl.scrollTop > 0) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="回到顶部"
      className={`fixed right-6 bottom-6 z-50 flex size-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur transition-all duration-300 hover:bg-primary hover:shadow-xl hover:-translate-y-0.5 active:scale-95 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="size-5" />
    </button>
  )
}
