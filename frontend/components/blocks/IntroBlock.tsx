"use client"

/**
 * 介绍区块。
 * 渲染标题 + 描述段落，数据来自 block.data。
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

/** 介绍区块：标题 + 正文段落 */
export function IntroBlock({ block, header, bg, editable, onEdit, onFieldEdit }: BlockProps) {
  const locale = useLocale()
  const content = getLocalizedValue(block.data?.content, locale) || ""

  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {content}
        </p>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑介绍">
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <FieldOverlay onClick={() => onFieldEdit?.(block, "content")} label="编辑内容">
              <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
                {content}
              </p>
            </FieldOverlay>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }
  return el
}
