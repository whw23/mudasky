"use client"

/**
 * 案例卡片网格。
 * 从 API 获取案例数据，支持 editable 模式（EditableOverlay + 精选按钮）。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { GraduationCap, Quote, Star } from "lucide-react"
import { toast } from "sonner"
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
  is_featured: boolean
  avatar_image_id: string | null
}

interface CaseGridProps {
  editable?: boolean
  onEdit?: (item: CaseItem) => void
  onAdd?: () => void
}

/** 案例卡片网格 */
export function CaseGrid({ editable, onEdit, onAdd }: CaseGridProps) {
  const t = useTranslations("Cases")
  const [cases, setCases] = useState<CaseItem[]>([])

  const fetchCases = useCallback(() => {
    const url = editable ? "/admin/web-settings/cases/list" : "/public/cases/list"
    api.get(url, { params: { page: 1, page_size: 100 } })
      .then((res) => setCases(res.data.items ?? []))
      .catch(() => setCases([]))
  }, [editable])

  useEffect(() => { fetchCases() }, [fetchCases])

  async function handleToggleFeatured(item: CaseItem) {
    try {
      await api.post("/admin/web-settings/cases/list/detail/edit", {
        case_id: item.id,
        is_featured: !item.is_featured,
      })
      toast.success(item.is_featured ? "已取消精选" : "已设为精选")
      fetchCases()
    } catch {
      toast.error("操作失败")
    }
  }

  if (cases.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{t("noContent")}</p>
  }

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cases.map((c) => (
        <CaseCard
          key={c.id}
          item={c}
          editable={editable}
          onEdit={onEdit}
          onToggleFeatured={editable ? handleToggleFeatured : undefined}
        />
      ))}
      {onAdd && (
        <button onClick={onAdd} className="group rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 opacity-50 transition-all hover:border-primary hover:opacity-80">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-muted-foreground">添加案例</h4>
              <p className="text-xs text-muted-foreground">2026</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-primary/50">录取大学</p>
            <p className="text-xs text-muted-foreground">录取专业</p>
          </div>
        </button>
      )}
    </div>
  )
}

/** 案例卡片 */
function CaseCard({
  item,
  editable,
  onEdit,
  onToggleFeatured,
}: {
  item: CaseItem
  editable?: boolean
  onEdit?: (item: CaseItem) => void
  onToggleFeatured?: (item: CaseItem) => void
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        {item.avatar_image_id ? (
          <img
            src={`/api/public/images/detail?id=${item.avatar_image_id}`}
            alt={item.student_name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
        )}
        <div>
          <h4 className="font-bold">{item.student_name}</h4>
          <p className="text-xs text-muted-foreground">{item.year}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-primary">{item.university}</p>
        <p className="text-xs text-muted-foreground">{item.program}</p>
      </div>
      {item.testimonial && (
        <div className="mt-4 flex gap-2">
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/40" />
          <p className="text-sm italic leading-relaxed text-muted-foreground">{item.testimonial}</p>
        </div>
      )}
    </>
  )

  const cls = "group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"

  if (editable) {
    return (
      <div className="relative">
        <EditableOverlay onClick={() => onEdit?.(item)} label={`编辑案例 ${item.student_name}`}>
          <div className={cls}>{content}</div>
        </EditableOverlay>
        {onToggleFeatured && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFeatured(item) }}
            className={`absolute left-2 top-2 z-10 rounded-full p-1.5 shadow-sm transition-colors ${
              item.is_featured
                ? "bg-yellow-400 text-white hover:bg-yellow-500"
                : "bg-white text-muted-foreground hover:bg-gray-100 hover:text-yellow-500"
            }`}
            title={item.is_featured ? "取消精选" : "设为精选"}
          >
            <Star className={`size-3.5 ${item.is_featured ? "fill-current" : ""}`} />
          </button>
        )}
      </div>
    )
  }

  return (
    <Link href={`/cases/${item.id}`} className={cls}>
      {content}
    </Link>
  )
}
