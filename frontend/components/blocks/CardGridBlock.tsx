"use client"

/**
 * 卡片网格区块。
 * 支持 5 种卡片类型：guide/timeline/city/program/checklist。
 * 自动计算网格列数。
 */

import { useLocale } from "next-intl"
import type { ReactNode } from "react"
import type { Block, CardType } from "@/types/block"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { GuideCard } from "./cards/GuideCard"
import { TimelineCard } from "./cards/TimelineCard"
import { CityCard } from "./cards/CityCard"
import { ProgramCard } from "./cards/ProgramCard"
import { ChecklistCard } from "./cards/ChecklistCard"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
}

/** 根据卡片类型渲染对应卡片组件 */
function renderCard(cardType: CardType, card: Record<string, any>, locale: string, index: number) {
  const key = card.id || index
  switch (cardType) {
    case "guide":
      return <GuideCard key={key} card={card} locale={locale} />
    case "timeline":
      return <TimelineCard key={key} card={card} locale={locale} />
    case "city":
      return <CityCard key={key} card={card} locale={locale} />
    case "program":
      return <ProgramCard key={key} card={card} locale={locale} />
    case "checklist":
      return <ChecklistCard key={key} card={card} locale={locale} />
    default:
      return null
  }
}

/** 根据数据量和最大列数计算网格样式 */
function getGridClass(count: number, maxColumns: number): string {
  const cols = Math.min(count, maxColumns)
  if (cols <= 1) return "mx-auto grid max-w-lg grid-cols-1 gap-6"
  if (cols === 2) return "mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2"
  if (cols === 4) return "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
  return "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
}

/** 卡片网格区块 */
export function CardGridBlock({ block, header, bg, editable, onEdit, onFieldEdit }: BlockProps) {
  const locale = useLocale()
  const cards: Record<string, any>[] = Array.isArray(block.data) ? block.data : []
  const cardType: CardType = block.options?.cardType || "guide"
  const maxColumns: number = block.options?.maxColumns || 3

  const gridClass = getGridClass(cards.length, maxColumns)

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑卡片">
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className={`mt-8 ${gridClass}`}>
              {cards.map((card, i) => (
                <FieldOverlay
                  key={card.id || i}
                  onClick={() => onFieldEdit?.(block, "item", i)}
                  label={`编辑卡片 ${i + 1}`}
                >
                  {renderCard(cardType, card, locale, i)}
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
        <div className={`mt-8 ${gridClass}`}>
          {cards.map((card, i) => renderCard(cardType, card, locale, i))}
        </div>
      </div>
    </section>
  )
}
