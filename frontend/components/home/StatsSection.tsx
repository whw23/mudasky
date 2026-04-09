'use client'

/**
 * 首页统计数字区块。
 * 从系统配置获取统计数据，支持管理后台动态修改。
 * 编辑模式下支持增删改统计项。
 */

import { Plus, Trash2 } from 'lucide-react'
import { useLocalizedConfig } from '@/contexts/ConfigContext'
import { EditableOverlay } from '@/components/admin/EditableOverlay'
import { Button } from '@/components/ui/button'

interface StatsSectionProps {
  editable?: boolean
  onEdit?: (index: number) => void
  onAdd?: () => void
  onDelete?: (index: number) => void
}

/** 首页统计区块 */
export function StatsSection({ editable, onEdit, onAdd, onDelete }: StatsSectionProps) {
  const { homepageStats } = useLocalizedConfig()

  /** 删除统计项（带确认） */
  function handleDelete(e: React.MouseEvent, index: number): void {
    e.stopPropagation()
    if (confirm('确认删除该统计项？')) {
      onDelete?.(index)
    }
  }

  return (
    <section className="border-b bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
        {homepageStats.map((stat, index) => {
          const content = (
            <div className="relative text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
              {/* 编辑模式下显示删除按钮 */}
              {editable && (
                <button
                  onClick={(e) => handleDelete(e, index)}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          )

          if (editable) {
            return (
              <EditableOverlay
                key={index}
                onClick={() => onEdit?.(index)}
                label="编辑统计项"
              >
                {content}
              </EditableOverlay>
            )
          }

          return (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          )
        })}

        {/* 编辑模式下显示添加按钮 */}
        {editable && (
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onAdd}
              className="gap-1"
            >
              <Plus className="size-4" />
              添加
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
