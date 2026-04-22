"use client"

/**
 * 首页"关于我们"简介区块。
 */

import { useTranslations } from "next-intl"

/** 首页关于我们简介区块 */
export function AboutIntroSection() {
  const t = useTranslations("Home")

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t("aboutUsTag")}
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("aboutUsTitle")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
        {t("aboutUsContent")}
      </p>
    </section>
  )
}
