/**
 * 统计卡片组件。
 * 展示图标、标签、数值，可选趋势指示。
 */

import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/** 统计卡片属性 */
interface StatCardProps {
  /** 图标组件 */
  icon: LucideIcon
  /** 标签文本 */
  label: string
  /** 显示值 */
  value: string | number
  /** 可选趋势描述 */
  trend?: string
  /** 加载中状态 */
  loading?: boolean
}

/** 统计卡片：展示单项指标 */
export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  loading = false,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-2">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          {trend && (
            <p className="mt-0.5 text-xs text-muted-foreground">{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
