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
    <Card className="@container">
      <CardContent className="flex items-center gap-[clamp(0.5rem,3cqw,1rem)] pt-2">
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 size-[clamp(2rem,10cqw,3rem)]">
          <Icon className="text-primary size-[clamp(1rem,5cqw,1.5rem)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-muted-foreground text-[clamp(0.7rem,3.5cqw,0.875rem)]">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="whitespace-nowrap font-bold text-[clamp(0.875rem,6cqw,1.5rem)]">
              {value}
            </p>
          )}
          {trend && (
            <p className="mt-0.5 text-muted-foreground text-[clamp(0.6rem,2.5cqw,0.75rem)]">
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
