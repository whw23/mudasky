"use client"

/**
 * 通用卡片网格渲染组件。
 * 从配置读取数据，根据 cardType 选择内置渲染模板。
 */

import { ReactNode } from "react"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { icons, Clock, CheckCircle2, Home, MapPin, Languages } from "lucide-react"

/** 按名称查找图标，支持 PascalCase、kebab-case、小写 */
function resolveIcon(name: string) {
  if (icons[name as keyof typeof icons]) return icons[name as keyof typeof icons]
  const pascal = name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("")
  return icons[pascal as keyof typeof icons]
}

/** 根据条目数量自动选择网格列数 */
const AUTO_GRID_COLS: Record<number, string> = {
  1: "md:grid-cols-1 max-w-lg mx-auto",
  2: "md:grid-cols-2 max-w-4xl mx-auto",
}

interface CardGridSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackCards: any[]
  columns?: string
  bgColor?: string
  cardType: "timeline" | "program" | "guide" | "city" | "language"
  renderCard?: (card: any, index: number) => ReactNode
  editable?: boolean
  onEdit?: () => void
}

/** 内置卡片渲染 */
function renderBuiltinCard(card: any, i: number, type: string): ReactNode {
  switch (type) {
    case "timeline":
      return (
        <div key={i} className="rounded-lg border bg-white p-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-primary" />
          <h4 className="mt-3 font-bold">{card.title}</h4>
          <p className="mt-2 text-2xl font-bold text-primary">{card.time}</p>
          <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
        </div>
      )
    case "program":
      return (
        <div key={i} className="rounded-lg border bg-white p-6">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{card.country}</span>
          <h4 className="mt-3 text-lg font-bold">{card.name}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
          {card.features?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {card.features.map((f: string, j: number) => (
                <li key={j} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    case "guide": {
      const Icon = resolveIcon(card.icon) || Home
      return (
        <div key={i} className="rounded-lg border bg-white p-6 text-center">
          <Icon className="mx-auto h-10 w-10 text-primary" />
          <h4 className="mt-4 text-lg font-bold">{card.title}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
        </div>
      )
    }
    case "city":
      return (
        <div key={i} className="overflow-hidden rounded-lg border bg-white">
          {card.image_id ? (
            <img src={`/api/public/images/detail?id=${card.image_id}`} alt={card.city} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gray-100">
              <MapPin className="h-8 w-8 text-gray-300" />
            </div>
          )}
          <div className="p-4">
            <h4 className="font-bold">{card.city}</h4>
            <p className="text-xs text-muted-foreground">{card.country}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
          </div>
        </div>
      )
    case "language":
      return (
        <div key={i} className="rounded-lg border bg-white p-6">
          <Languages className="h-8 w-8 text-primary" />
          <h4 className="mt-3 text-lg font-bold text-primary">{card.language}</h4>
          <ul className="mt-4 space-y-2">
            {(card.items || []).map((item: string, j: number) => (
              <li key={j} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    default:
      return <div key={i} className="rounded-lg border bg-white p-4">{JSON.stringify(card)}</div>
  }
}

/** 通用卡片网格渲染 */
export function CardGridSection({
  configKey, sectionTag, sectionTitle, fallbackCards,
  columns = "md:grid-cols-3", bgColor = "",
  cardType, renderCard, editable, onEdit,
}: CardGridSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const cards = (siteInfo as any)[configKey] as any[]
  const data = cards?.length > 0 ? cards : fallbackCards

  const content = (
    <section className={`py-10 md:py-16 ${bgColor}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{sectionTag}</h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{sectionTitle}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className={`mt-8 grid gap-6 ${AUTO_GRID_COLS[data.length] || columns}`}>
          {data.map((card, i) => renderCard ? renderCard(card, i) : renderBuiltinCard(card, i, cardType))}
        </div>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return <EditableOverlay onClick={onEdit} label={`编辑${sectionTitle}`}>{content}</EditableOverlay>
  }
  return content
}
