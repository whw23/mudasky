"use client"

/**
 * 步骤列表区块。
 * 渲染编号步骤：左侧圆形序号 + 右侧标题与描述。
 */

import { useLocale } from "next-intl"
import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { getLocalizedValue } from "@/lib/i18n-config"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { Trash2, Plus } from "lucide-react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
  onEditConfig?: (section: string) => void
  blockLabel?: string
}

/** 步骤列表区块 */
export function StepListBlock({ block, header, bg, editable, onEdit, onFieldEdit, onEditConfig, blockLabel }: BlockProps) {
  const locale = useLocale()
  const steps: Array<{ title: any; desc: any }> = Array.isArray(block.data) ? block.data : []

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label={blockLabel || "编辑步骤"}>
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className="mx-auto mt-8 max-w-3xl space-y-6">
              {steps.map((step, i) => (
                <div key={i} className="group relative">
                  <FieldOverlay
                    onClick={() => onEditConfig?.(`step_list_item_${block.id}_${i}`)}
                    label={`编辑步骤 ${i + 1}`}
                  >
                    <div className="flex gap-4">
                      {/* 左侧编号圆 */}
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      {/* 右侧内容 */}
                      <div>
                        <h4 className="font-semibold">
                          {getLocalizedValue(step.title, locale)}
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getLocalizedValue(step.desc, locale)}
                        </p>
                      </div>
                    </div>
                  </FieldOverlay>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditConfig?.(`step_list_delete_${block.id}_${i}`)
                    }}
                    className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                    title="移除"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              {/* 添加步骤按钮 */}
              <div
                className="hidden group-hover/block:block"
                data-editable
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  onClick={() => onEditConfig?.(`step_list_add_${block.id}`)}
                  className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-4 opacity-50 transition-opacity hover:opacity-80"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    <Plus className="size-5" />
                  </div>
                  <div className="text-sm text-muted-foreground">添加新步骤</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }

  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className="mx-auto mt-8 max-w-3xl space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              {/* 左侧编号圆 */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              {/* 右侧内容 */}
              <div>
                <h4 className="font-semibold">
                  {getLocalizedValue(step.title, locale)}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getLocalizedValue(step.desc, locale)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
