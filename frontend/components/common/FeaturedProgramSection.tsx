"use client"

/**
 * 主推项目板块。
 * 从 study_abroad_programs 的第一个项目渲染主推卡片。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { Languages, CheckCircle2 } from "lucide-react"

interface FeaturedProgramSectionProps {
  sectionTag: string
  sectionTitle: string
  fallbackTitle: string
  fallbackDesc: string
  fallbackFeatures: string[]
  editable?: boolean
  onEdit?: () => void
}

/** 主推项目板块 */
export function FeaturedProgramSection({
  sectionTag,
  sectionTitle,
  fallbackTitle,
  fallbackDesc,
  fallbackFeatures,
  editable,
  onEdit,
}: FeaturedProgramSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const programs = (siteInfo as any).study_abroad_programs as any[]
  const first = programs?.find((p: any) => p.featured) || programs?.[0]
  const title = first?.name || fallbackTitle
  const desc = first?.desc || fallbackDesc
  const features = first?.features?.length > 0 ? first.features as string[] : fallbackFeatures

  const content = (
    <section className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {sectionTag}
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{sectionTitle}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mx-auto mt-8 max-w-4xl rounded-lg border-2 border-primary/20 bg-white p-8 md:p-12">
          <div className="flex items-start gap-4">
            <Languages className="mt-1 h-8 w-8 shrink-0 text-primary" />
            <div>
              <h4 className="text-xl font-bold">{title}</h4>
              <p className="mt-3 leading-relaxed text-muted-foreground">{desc}</p>
              <div className="mx-auto mt-6 grid w-fit gap-3 sm:grid-cols-2">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return <EditableOverlay onClick={onEdit} label="编辑留学项目">{content}</EditableOverlay>
  }
  return content
}
