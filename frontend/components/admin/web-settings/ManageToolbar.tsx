"use client"

import { ReactNode } from "react"

interface ManageToolbarProps {
  children: ReactNode
}

/** 管理工具浮动条（预览模式） */
export function ManageToolbar({ children }: ManageToolbarProps) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <span className="text-sm font-medium text-blue-600">管理工具</span>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}
