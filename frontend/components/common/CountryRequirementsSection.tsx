"use client"

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { CheckSquare, type LucideIcon } from "lucide-react"

/** 根据条目数量自动选择网格列数 */
const GRID_COLS: Record<number, string> = {
  1: "md:grid-cols-1 max-w-lg mx-auto",
  2: "md:grid-cols-2 max-w-4xl mx-auto",
}

interface CountryRequirementsSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  labelKey: string
  fallbackData: { label: string; items: string[] }[]
  icon?: LucideIcon
  bgColor?: string
  editable?: boolean
  onEdit?: () => void
}

/**
 * 申请条件板块渲染组件
 *
 * 用于渲染国家申请条件、语言要求等带子项列表的卡片网格
 */
export function CountryRequirementsSection({
  configKey,
  sectionTag,
  sectionTitle,
  labelKey,
  fallbackData,
  icon: Icon = CheckSquare,
  bgColor = "",
  editable,
  onEdit,
}: CountryRequirementsSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const raw = (siteInfo as any)[configKey] as any[]
  const data =
    raw?.length > 0
      ? raw.map((item: any) => ({
          label: item[labelKey] as string,
          items: item.items as string[],
        }))
      : fallbackData

  const gridCols = GRID_COLS[data.length] || "md:grid-cols-3"

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
        <div className={`mt-8 grid gap-6 ${gridCols}`}>
          {data.map((group, i) => (
            <div key={i} className="rounded-lg border bg-white p-6">
              <h4 className="text-lg font-bold text-primary">{group.label}</h4>
              <ul className="mt-4 space-y-2">
                {group.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
