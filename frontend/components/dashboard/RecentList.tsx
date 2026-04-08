/**
 * 最近列表组件。
 * 通用的"最近 N 条记录"展示，支持标题和"查看全部"链接。
 */

import type { ReactNode } from "react"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** 列表项定义 */
export interface RecentItem {
  /** 唯一标识 */
  id: string
  /** 主标题 */
  title: string
  /** 副标题或描述 */
  subtitle?: string
  /** 右侧附加内容（如状态徽章） */
  extra?: ReactNode
  /** 点击跳转链接 */
  href?: string
}

/** 最近列表属性 */
interface RecentListProps {
  /** 区域标题 */
  title: string
  /** 列表项 */
  items: RecentItem[]
  /** "查看全部"链接 */
  viewAllHref?: string
  /** "查看全部"文本 */
  viewAllText?: string
  /** 空状态文本 */
  emptyText?: string
  /** 加载中状态 */
  loading?: boolean
}

/** 最近列表：展示最近的若干条记录 */
export function RecentList({
  title,
  items,
  viewAllHref,
  viewAllText = "查看全部",
  emptyText = "暂无数据",
  loading = false,
}: RecentListProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm text-primary hover:underline"
          >
            {viewAllText}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const content = (
                <div className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.extra && (
                    <div className="ml-3 shrink-0">{item.extra}</div>
                  )}
                </div>
              )
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block rounded transition-colors hover:bg-muted/50"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
