"use client"

import { MapPin, Phone, Mail, MessageCircle, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"

/**
 * 关于我们页面的联系方式区块
 * 从 ConfigContext 读取联系信息
 */
export function ContactInfoSection() {
  const t = useTranslations("Contact")
  const { contactInfo } = useLocalizedConfig()

  const items = [
    {
      icon: MapPin,
      label: t("addressLabel"),
      value: contactInfo.address || t("address"),
    },
    {
      icon: Phone,
      label: t("phoneLabel"),
      value: contactInfo.phone || t("phone"),
    },
    {
      icon: Mail,
      label: t("emailLabel"),
      value: contactInfo.email || t("email"),
    },
    {
      icon: MessageCircle,
      label: t("wechatLabel"),
      value: contactInfo.wechat || t("wechat"),
    },
    {
      icon: Clock,
      label: t("hoursLabel"),
      value: contactInfo.office_hours || t("hours"),
    },
  ]

  return (
    <section id="contact-info" className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("infoTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg bg-white p-5"
            >
              <item.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-sm text-foreground">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
