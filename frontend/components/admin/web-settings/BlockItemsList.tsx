"use client"

/**
 * 通用 Block 条目列表组件。
 * 支持拖动排序、编辑、删除操作。
 */

import type { ReactNode } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { resolveIcon } from "@/lib/icon-utils"

/** 条目摘要信息 */
export interface ItemSummary {
  icon?: string
  label: string
  content: string
  badge?: string
}

/** BlockItemsList 组件属性 */
export interface BlockItemsListProps {
  items: any[]
  onEditItem: (index: number) => void
  onDeleteItem: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  renderItemSummary: (item: any, index: number) => ItemSummary
  addButton?: ReactNode
}

/**
 * 通用 Block 条目列表组件。
 * 每行显示：拖动手柄 + 图标（可选）+ 标签 + 内容 + 徽章（可选）+ 编辑按钮 + 删除按钮。
 * 底部：自定义添加按钮（可选）。
 */
export function BlockItemsList({
  items,
  onEditItem,
  onDeleteItem,
  onReorder,
  renderItemSummary,
  addButton,
}: BlockItemsListProps) {
  /** 处理拖放结束 */
  function handleDragEnd(result: DropResult): void {
    if (!result.destination || result.source.index === result.destination.index) return
    onReorder(result.source.index, result.destination.index)
  }

  /** 渲染条目行 */
  function renderRow(item: any, idx: number, dragHandleProps?: any) {
    const summary = renderItemSummary(item, idx)
    const Icon = summary.icon ? resolveIcon(summary.icon) : null

    return (
      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
        <div className="flex min-w-0 items-center gap-2">
          <div {...(dragHandleProps ?? {})} className="cursor-grab text-muted-foreground">
            <GripVertical className="size-4" />
          </div>
          {Icon && <Icon className="size-5 shrink-0 text-primary" />}
          <div className="min-w-0">
            <div className="text-sm font-medium">{summary.label}</div>
            <div className="truncate text-xs text-muted-foreground">{summary.content}</div>
          </div>
          {summary.badge && (
            <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
              {summary.badge}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onEditItem(idx)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => onDeleteItem(idx)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable
          droppableId="block-items-list"
          renderClone={(provided, _snapshot, rubric) => (
            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
              {renderRow(items[rubric.source.index], rubric.source.index)}
            </div>
          )}
        >
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((item, idx) => (
                <Draggable key={`item-${idx}`} draggableId={`item-${idx}`} index={idx}>
                  {(dragProvided) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      {renderRow(item, idx, dragProvided.dragHandleProps)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {addButton && addButton}
    </div>
  )
}
