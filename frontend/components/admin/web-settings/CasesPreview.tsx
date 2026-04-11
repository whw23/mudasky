"use client"

/**
 * 成功案例预览组件（Client 端）。
 * 从 API 获取案例数据，复用真实案例页面的卡片样式。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { GraduationCap, Quote } from "lucide-react"
import api from "@/lib/api"

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
}

/** 案例预览 */
export function CasesPreview() {
  const t = useTranslations("Cases")
  const [cases, setCases] = useState<CaseItem[]>([])

  useEffect(() => {
    api.get("/cases?page_size=6").then((res) => {
      setCases(res.data.items ?? [])
    }).catch(() => {})
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Success Stories
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("title")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      {cases.length > 0 ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
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
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-muted-foreground">暂无案例数据</p>
      )}
    </section>
  )
}
