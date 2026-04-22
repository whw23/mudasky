"use client"

import { ReactNode } from "react"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface CardGridSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackCards: any[]
  columns?: string
  bgColor?: string
  renderCard: (card: any, index: number) => ReactNode
  editable?: boolean
  onEdit?: () => void
}

/**
 * 通用卡片网格渲染组件
 *
 * 从配置中读取数据，使用传入的 renderCard 函数渲染每个卡片
 */
export function CardGridSection({
  configKey,
  sectionTag,
  sectionTitle,
  fallbackCards,
  columns = "md:grid-cols-3",
  bgColor = "",
  renderCard,
  editable,
  onEdit,
}: CardGridSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const cards = (siteInfo as any)[configKey] as any[]
  const data = cards?.length > 0 ? cards : fallbackCards

  const content = (
    <section className={`py-10 md:py-16 ${bgColor}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {sectionTag}
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{sectionTitle}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className={`mt-8 grid gap-6 ${columns}`}>
          {data.map((card, i) => renderCard(card, i))}
        </div>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={onEdit} label={`编辑${sectionTitle}`}>
        {content}
      </EditableOverlay>
    )
  }
  return content
}
