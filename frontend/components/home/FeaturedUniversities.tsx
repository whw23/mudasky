"use client"

/**
 * 主页精选院校组件。
 * 显示最多 6 个精选合作院校。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import api from "@/lib/api"
import { ArrowRight, Award, MapPin } from "lucide-react"

interface University {
  id: string
  name: string
  country: string
  city: string
  logo_image_id: string | null
  qs_rankings: { year: number; ranking: number }[] | null
}

/** 主页精选院校 */
export function FeaturedUniversities() {
  const t = useTranslations("Home")
  const [universities, setUniversities] = useState<University[]>([])

  useEffect(() => {
    api
      .get("/public/universities/list", {
        params: { is_featured: true, page_size: 6 },
      })
      .then((res) => setUniversities(res.data.items))
      .catch(() => {})
  }, [])

  if (universities.length === 0) return null

  return (
    <div>
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Partner Universities
        </h2>
        <h3 className="mt-2 text-2xl font-bold md:text-3xl">
          {t("featuredUniversities")}
        </h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {universities.map((u) => {
          const latest = u.qs_rankings?.sort((a, b) => b.year - a.year)[0]
          return (
            <Link
              key={u.id}
              href={`/universities/${u.id}`}
              className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                {u.logo_image_id ? (
                  <img
                    src={`/api/public/images/detail?id=${u.logo_image_id}`}
                    alt={u.name}
                    className="h-12 w-12 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-lg font-bold text-gray-400">
                    {u.name[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-bold group-hover:text-primary">{u.name}</h4>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {u.city}, {u.country}
                  </p>
                </div>
              </div>
              {latest && (
                <div className="mt-3 flex items-center gap-1 text-sm text-primary">
                  <Award className="h-4 w-4" />
                  QS {latest.year} #{latest.ranking}
                </div>
              )}
            </Link>
          )
        })}
      </div>
      <div className="mt-8 text-center">
        <Link href="/universities" className="inline-flex items-center gap-1 text-primary hover:underline">
          {t("viewMore")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
