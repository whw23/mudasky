"use client"

import { useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { MapPin, Phone, Mail, MessageCircle, Building } from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

/**
 * 关于我们页面的联系方式区块
 * 从 ConfigContext 读取联系信息
 * 支持字段级编辑（每个联系信息独立 EditableOverlay）
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

interface ContactInfoSectionProps {
  editable?: boolean
  onEditField?: (field: string) => void
}

export function ContactInfoSection({
  editable,
  onEditField,
}: ContactInfoSectionProps) {
  const t = useTranslations("Contact")
  const { contactInfo, siteInfo } = useLocalizedConfig()

  const items = [
    {
      icon: MapPin,
      label: t("addressLabel"),
      value: contactInfo.address || t("address"),
      field: "address",
    },
    {
      icon: Phone,
      label: t("phoneLabel"),
      value: contactInfo.phone || t("phone"),
      field: "phone",
    },
    {
      icon: Mail,
      label: t("emailLabel"),
      value: contactInfo.email || t("email"),
      field: "email",
    },
    {
      icon: MessageCircle,
      label: t("wechatLabel"),
      value: contactInfo.wechat || t("wechat"),
      field: "wechat",
    },
    {
      icon: Building,
      label: t("registeredAddressLabel"),
      value: contactInfo.registered_address || t("registeredAddress"),
      field: "registered_address",
    },
  ]

  return (
    <section id="contact-info" className="py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isWechat = item.field === "wechat"
            const qrUrl = isWechat ? siteInfo.wechat_service_qr_url : ""

            const content = (
              <div className="flex items-start gap-3 rounded-lg bg-white p-5">
                <item.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    {item.value}
                  </div>
                </div>
                {qrUrl && <QrPopover url={qrUrl} alt={item.label} />}
              </div>
            )

            if (editable) {
              return (
                <EditableOverlay
                  key={item.field}
                  onClick={() => onEditField?.(item.field)}
                  label={`编辑${item.label}`}
                >
                  {content}
                </EditableOverlay>
              )
            }

            return <div key={item.field}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
