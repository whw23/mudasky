"use client"

/**
 * 步骤列表板块组件
 *
 * 渲染带编号的流程步骤列表（签证流程、申请流程等）。
 * 优先从 ConfigContext 读取，无数据时使用翻译兜底。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface StepListSectionProps {
  /** siteInfo 中的字段名，如 "visa_process_steps" */
  configKey: string
  /** 板块标签（如 "Process"） */
  sectionTag: string
  /** 板块标题（如 "签证流程"） */
  sectionTitle: string
  /** 兜底数据（从翻译文件获取） */
  fallbackSteps: { title: string; desc: string }[]
  /** 背景色（默认白色，可选 "bg-gray-50"） */
  bgColor?: string
  /** 是否可编辑 */
  editable?: boolean
  /** 编辑回调 */
  onEdit?: () => void
}

/** 步骤列表板块 */
export function StepListSection({
  configKey,
  sectionTag,
  sectionTitle,
  fallbackSteps,
  bgColor = "",
  editable,
  onEdit,
}: StepListSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const steps = (siteInfo as any)[configKey] as { title: string; desc: string }[]
  const data = steps?.length > 0 ? steps : fallbackSteps

  const content = (
    <section className={`py-10 md:py-16 ${bgColor}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{sectionTag}</h2>
          <h3 className="mt-2 text-2xl font-bold md:text-3xl">{sectionTitle}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mx-auto mt-12 w-fit space-y-6">
          {data.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="pt-1">
                <h4 className="font-bold">{step.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </div>
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
