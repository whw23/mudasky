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

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
}

/** 步骤列表区块 */
export function StepListBlock({ block, header, bg, editable, onEdit, onFieldEdit }: BlockProps) {
  const locale = useLocale()
  const steps: Array<{ title: any; desc: any }> = Array.isArray(block.data) ? block.data : []

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑步骤">
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className="mx-auto mt-8 max-w-3xl space-y-6">
              {steps.map((step, i) => (
                <FieldOverlay
                  key={i}
                  onClick={() => onFieldEdit?.(block, "item", i)}
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
              ))}
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
