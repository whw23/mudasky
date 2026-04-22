"use client"

/**
 * 案例卡片网格。
 * 从 API 获取案例数据，支持 editable 模式（EditableOverlay）。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { GraduationCap, Quote } from "lucide-react"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  avatar_image_id: string | null
}

interface CaseGridProps {
  editable?: boolean
  onEdit?: (item: CaseItem) => void
}

/** 案例卡片网格 */
export function CaseGrid({ editable, onEdit }: CaseGridProps) {
  const t = useTranslations("Cases")
  const [cases, setCases] = useState<CaseItem[]>([])

  useEffect(() => {
    const url = editable ? "/admin/web-settings/cases/list" : "/public/cases/list"
    api.get(url, { params: { page: 1, page_size: 100 } })
      .then((res) => setCases(res.data.items ?? []))
      .catch(() => setCases([]))
  }, [editable])

  if (cases.length === 0) {
    return <p className="text-center text-muted-foreground py-12">{t("noContent")}</p>
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cases.map((c) => {
        const content = (
          <>
            <div className="flex items-center gap-3">
              {c.avatar_image_id ? (
                <img src={`/api/public/images/detail?id=${c.avatar_image_id}`} alt={c.student_name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h4 className="font-bold">{c.student_name}</h4>
                <p className="text-xs text-muted-foreground">{c.year}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-primary">{c.university}</p>
              <p className="text-xs text-muted-foreground">{c.program}</p>
            </div>
            {c.testimonial && (
              <div className="mt-4 flex gap-2">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/40" />
                <p className="text-sm italic leading-relaxed text-muted-foreground">{c.testimonial}</p>
              </div>
            )}
          </>
        )

        const cls = "group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"

        if (editable) {
          return (
            <EditableOverlay key={c.id} onClick={() => onEdit?.(c)} label={`编辑案例 ${c.student_name}`}>
              <div className={cls}>{content}</div>
            </EditableOverlay>
          )
        }

        return (
          <Link key={c.id} href={`/cases/${c.id}`} className={cls}>
            {content}
          </Link>
        )
      })}
    </div>
  )
}
