"use client"

/**
 * 行动号召（CTA）区块。
 * 渲染标题 + 描述 + 咨询按钮。
 */

import { useLocale } from "next-intl"
import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { getLocalizedValue } from "@/lib/i18n-config"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { ConsultButton } from "@/components/common/ConsultButton"
import { ArrowRight } from "lucide-react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
}

/** 行动号召区块 */
export function CtaBlock({ block, header, bg, editable, onEdit, onFieldEdit }: BlockProps) {
  const locale = useLocale()
  const title = getLocalizedValue(block.data?.title, locale) || ""
  const desc = getLocalizedValue(block.data?.desc, locale) || ""
  const link = (block.data?.link as string) || "/about"

  const variant = block.options?.variant || "bg-gray-50"
  const bgClass = variant === "border-t" ? "border-t bg-white" : "bg-gray-50"

  const el = (
    <section className={`py-10 md:py-16 ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-4 text-center">
        {header}
        {title && <h3 className="mt-6 text-2xl font-bold">{title}</h3>}
        {desc && (
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{desc}</p>
        )}
        <ConsultButton href={link} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          立即咨询
          <ArrowRight className="size-4" />
        </ConsultButton>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑 CTA">
        <section className={`py-10 md:py-16 ${bgClass}`}>
          <div className="mx-auto max-w-7xl px-4 text-center">
            {header}
            {title && (
              <FieldOverlay onClick={() => onFieldEdit?.(block, "title")} label="编辑标题" className="mx-auto mt-6">
                <h3 className="text-2xl font-bold">{title}</h3>
              </FieldOverlay>
            )}
            {desc && (
              <FieldOverlay onClick={() => onFieldEdit?.(block, "desc")} label="编辑描述" className="mx-auto mt-4 max-w-2xl">
                <p className="text-muted-foreground">{desc}</p>
              </FieldOverlay>
            )}
            <ConsultButton href={link} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              立即咨询
              <ArrowRight className="size-4" />
            </ConsultButton>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }
  return el
}
