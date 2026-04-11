"use client"

/**
 * 侧边栏外壳。
 * 桌面端显示固定侧边栏，移动端隐藏侧边栏并提供汉堡按钮展开遮罩抽屉。
 */

import { useState } from "react"
import { Menu, X } from "lucide-react"

interface SidebarShellProps {
  /** 侧边栏内容 */
  sidebar: React.ReactNode
  /** 主区域内容 */
  children: React.ReactNode
  /** 侧边栏背景色 class */
  sidebarClass?: string
}

/** 带移动端抽屉的侧边栏布局 */
export function SidebarShell({
  sidebar,
  children,
  sidebarClass = "bg-gray-50",
}: SidebarShellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面端固定侧边栏 */}
      <aside className={`hidden md:block w-60 shrink-0 overflow-y-auto border-r ${sidebarClass}`}>
        {sidebar}
      </aside>

      {/* 移动端遮罩 + 抽屉 */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 overflow-y-auto border-r transition-transform duration-200 ${sidebarClass} ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
          onClick={() => setOpen(false)}
        >
          <X className="size-5" />
        </button>
        <div onClick={() => setOpen(false)}>
          {sidebar}
        </div>
      </aside>

      {/* 主区域 */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* 移动端顶栏：汉堡按钮 */}
        <div className="md:hidden flex items-center border-b bg-white px-4 py-3">
          <button onClick={() => setOpen(true)} className="p-1">
            <Menu className="size-5" />
          </button>
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
