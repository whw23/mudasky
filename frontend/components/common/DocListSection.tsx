"use client"

/**
 * 文档/项目列表板块组件
 *
 * 渲染带图标的文档/项目列表（签证材料、申请条件、小贴士等）。
 * 优先从 ConfigContext 读取，无数据时使用翻译兜底。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { FileText, AlertTriangle } from "lucide-react"

const ICON_MAP: Record<string, typeof FileText> = {
  FileText,
  AlertTriangle,
}

interface DocListSectionProps {
  /** siteInfo 中的字段名，如 "visa_required_docs" */
  configKey: string
  /** 板块标签（如 "Required Documents"） */
  sectionTag: string
  /** 板块标题（如 "所需材料"） */
  sectionTitle: string
  /** 兜底数据（从翻译文件获取） */
  fallbackDocs: string[]
  /** 图标名称（默认 "FileText"，可选 "AlertTriangle"） */
  iconName?: string
  /** 背景色（默认白色，可选 "bg-gray-50"） */
  bgColor?: string
  /** 是否可编辑 */
  editable?: boolean
  /** 编辑回调 */
  onEdit?: () => void
}

/** 文档/项目列表板块 */
export function DocListSection({
  configKey,
  sectionTag,
  sectionTitle,
  fallbackDocs,
  iconName = "FileText",
  bgColor = "",
  editable,
  onEdit,
}: DocListSectionProps) {
  const Icon = ICON_MAP[iconName] || FileText
  const { siteInfo } = useLocalizedConfig()
  const docs = (siteInfo as any)[configKey] as { text: string }[]
  const data = docs?.length > 0 ? docs.map((d) => d.text) : fallbackDocs

  const content = (
    <section className={`py-10 md:py-16 ${bgColor}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{sectionTag}</h2>
          <h3 className="mt-2 text-2xl font-bold md:text-3xl">{sectionTitle}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {data.map((text, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return <EditableOverlay onClick={onEdit} label={`编辑${sectionTitle}`}>{content}</EditableOverlay>
  }
  return content
}
