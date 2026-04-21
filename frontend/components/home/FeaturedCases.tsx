"use client"

/**
 * 主页精选案例组件。
 * 显示最多 4 个精选成功案例。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import api from "@/lib/api"
import { ArrowRight } from "lucide-react"

interface Case {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  avatar_image_id: string | null
}

/** 主页精选案例 */
export function FeaturedCases() {
  const t = useTranslations("Home")
  const [cases, setCases] = useState<Case[]>([])

  useEffect(() => {
    api
      .get("/public/cases/list", { params: { is_featured: true, page_size: 4 } })
      .then((res) => setCases(res.data.items))
      .catch(() => {})
  }, [])

  if (cases.length === 0) return null

  return (
    <div className="mt-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Success Stories
        </h2>
        <h3 className="mt-2 text-2xl font-bold md:text-3xl">{t("featuredCases")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              {c.avatar_image_id ? (
                <img
                  src={`/api/public/images/detail?id=${c.avatar_image_id}`}
                  alt={c.student_name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {c.student_name[0]}
                </div>
              )}
              <div>
                <h4 className="font-bold group-hover:text-primary">{c.student_name}</h4>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {c.university} · {c.program} · {c.year}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/cases" className="inline-flex items-center gap-1 text-primary hover:underline">
          {t("viewMore")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
