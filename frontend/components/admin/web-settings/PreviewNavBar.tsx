"use client"

/**
 * 网页设置页面的导航栏组件。
 * 复用公共网站导航样式，点击切换页面预览。
 */

import { useTranslations } from "next-intl"

/** 页面标识 */
export type PageKey =
  | "home"
  | "universities"
  | "studyAbroad"
  | "requirements"
  | "cases"
  | "visa"
  | "life"
  | "news"
  | "about"

/** 导航项定义 */
const PAGE_KEYS: PageKey[] = [
  "home",
  "universities",
  "studyAbroad",
  "requirements",
  "cases",
  "visa",
  "life",
  "news",
  "about",
]

interface PreviewNavBarProps {
  activePage: PageKey
  onPageChange: (page: PageKey) => void
}

/**
 * 网页设置页面的导航栏
 * 复用公共网站导航样式，点击切换页面预览
 */
export function PreviewNavBar({ activePage, onPageChange }: PreviewNavBarProps) {
  const t = useTranslations("Nav")

  return (
    <nav className="border-t border-b border-black/[0.04] bg-white">
      <div className="flex items-center gap-0.5 overflow-x-auto px-4">
        {PAGE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onPageChange(key)}
            className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors ${
              activePage === key
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>
    </nav>
  )
}
