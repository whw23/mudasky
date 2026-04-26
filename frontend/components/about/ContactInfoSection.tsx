"use client"

import { useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { icons, Trash2 } from "lucide-react"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { resolveIcon } from "@/lib/icon-utils"

/**
 * 关于我们页面的联系方式区块。
 * 支持两种数据来源：外部传入 items 或从 ConfigContext 读取 contactItems。
 * 支持字段级编辑（每个条目独立 EditableOverlay）+ 删除按钮（可选）。
 */

/** 二维码悬浮放大 */
function QrPopover({ url, alt }: { url: string; alt: string }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const handleEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.top - 200, left: rect.left + rect.width / 2 - 96 })
    }
    setShow(true)
  }, [])

  return (
    <div ref={ref} className="shrink-0" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      <img src={url} alt={alt} className="size-16 rounded border border-border object-contain cursor-pointer" />
      {show && createPortal(
        <div className="pointer-events-none fixed z-[9999]" style={{ top: pos.top, left: pos.left }}>
          <img src={url} alt={alt} className="size-48 rounded-lg border bg-white shadow-xl object-contain p-2" />
        </div>,
        document.body
      )}
    </div>
  )
}

interface ContactItem {
  icon: string
  label: string
  content: string
  image_id: string | null
  hover_zoom: boolean
}

interface ContactInfoSectionProps {
  editable?: boolean
  onEditField?: (field: string) => void
  maxColumns?: number
  items?: ContactItem[]
  onDelete?: (index: number) => void
}

export function ContactInfoSection({
  editable,
  onEditField,
  maxColumns = 3,
  items,
  onDelete,
}: ContactInfoSectionProps) {
  const { contactItems } = useLocalizedConfig()
  const displayItems = items ?? contactItems

  return (
    <section id="contact-info" className="py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className={`grid gap-6 sm:grid-cols-2 ${maxColumns >= 3 ? "lg:grid-cols-3" : ""}`}>
          {displayItems.map((item, index) => {
            const Icon = resolveIcon(item.icon, icons.Info)!
            const imageUrl = item.image_id ? `/api/public/images/detail?id=${item.image_id}` : ""

            const content = (
              <div className="flex items-start gap-3 rounded-lg bg-white p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    {item.content}
                  </div>
                </div>
                {imageUrl && item.hover_zoom && <QrPopover url={imageUrl} alt={item.label} />}
                {imageUrl && !item.hover_zoom && (
                  <img src={imageUrl} alt={item.label} className="size-16 rounded border object-contain" />
                )}
              </div>
            )

            if (editable) {
              return (
                <div key={index} className="group relative">
                  <EditableOverlay
                    onClick={() => onEditField?.(String(index))}
                    label={`编辑${item.label}`}
                  >
                    {content}
                  </EditableOverlay>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(index)}
                      className="absolute -left-2 -top-2 hidden size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 group-hover:flex"
                      title="删除"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )
            }
            return <div key={index}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
