"use client"

/**
 * 数据驱动区块的编辑浮层组件。
 * hover 显示管理按钮，点击跳转到对应管理页面。
 */

import { Link } from "@/i18n/navigation"

interface DataSectionOverlayProps {
  children: React.ReactNode
  label: string
  href: string
}

/**
 * 数据驱动区块的编辑浮层
 * hover 显示管理按钮，点击跳转到管理页面
 */
export function DataSectionOverlay({
  children,
  label,
  href,
}: DataSectionOverlayProps) {
  return (
    <div className="group relative">
      {children}
      <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-transparent transition-colors group-hover:border-blue-400 group-hover:bg-blue-50/30">
        <Link
          href={href}
          className="pointer-events-auto absolute right-2 top-2 rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          {label}
        </Link>
      </div>
    </div>
  )
}
