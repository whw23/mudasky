"use client"

import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { ConsultButton } from "@/components/common/ConsultButton"

interface CtaSectionProps {
  translationNamespace: string
  variant?: "border-t" | "bg-gray-50"
}

/**
 * 通用 CTA 板块组件
 *
 * 用于各个页面底部的行动召唤区域，支持两种背景样式：
 * - `border-t`: 白色背景 + 顶部边框（用于首页、签证、申请条件）
 * - `bg-gray-50`: 灰色背景（用于关于我们、院校、案例、出国留学、留学生活）
 */
export function CtaSection({ translationNamespace, variant = "bg-gray-50" }: CtaSectionProps) {
  const t = useTranslations(translationNamespace)

  const desc = t("ctaDesc")

  return (
    <section className={`py-10 md:py-16 ${variant === "border-t" ? "border-t bg-white" : "bg-gray-50"}`}>
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h3 className="text-2xl md:text-3xl font-bold">{t("ctaTitle")}</h3>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{desc}</p>
        <ConsultButton
          className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {t("ctaButton")} <ArrowRight className="h-4 w-4" />
        </ConsultButton>
      </div>
    </section>
  )
}
