"use client"

/**
 * 院校详情展示组件。
 * 获取并展示增强后的院校信息（图片、学科、地图、成功案例等）。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import { ImageGallery } from "./ImageGallery"
import { UniversityMap } from "./UniversityMap"
import { SafeHtml } from "@/components/common/SafeHtml"
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, MapPin, Award } from "lucide-react"

interface ProgramBrief {
  name: string
  admission_requirements: string | null
}

interface Discipline {
  id: string
  name: string
  category_name: string
  program_name: string
}

interface CaseBrief {
  id: string
  student_name: string
  program: string
  year: number | null
  avatar_image_id: string | null
}

interface UniversityData {
  id: string
  name: string
  name_en: string | null
  country: string
  province: string | null
  city: string
  website: string | null
  description: string | null
  logo_image_id: string | null
  image_ids: string[]
  programs: ProgramBrief[]
  disciplines: Discipline[]
  admission_requirements: string | null
  scholarship_info: string | null
  qs_rankings: { year: number; ranking: number }[] | null
  latitude: number | null
  longitude: number | null
  related_cases: CaseBrief[]
}

interface Props {
  universityId: string
}

/** 院校详情展示组件 */
export function UniversityDetail({ universityId }: Props) {
  const t = useTranslations("Universities")
  const [data, setData] = useState<UniversityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)

  useEffect(() => {
    api
      .get(`/public/universities/detail/${universityId}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [universityId])

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-1/3 rounded bg-gray-200" />
      <div className="h-4 w-1/2 rounded bg-gray-200" />
    </div>
  }
  if (!data) return <div className="text-center text-muted-foreground">院校不存在</div>

  const latestRanking = data.qs_rankings?.sort((a, b) => b.year - a.year)[0]

  const groupedDisciplines = data.disciplines.reduce<
    Record<string, { name: string; programName: string; admissionRequirements: string | null }[]>
  >((acc, d) => {
    if (!acc[d.category_name]) acc[d.category_name] = []
    const prog = data.programs.find((p) => p.name === d.program_name)
    acc[d.category_name].push({
      name: d.name,
      programName: d.program_name,
      admissionRequirements: prog?.admission_requirements ?? null,
    })
    return acc
  }, {})

  return (
    <div className="space-y-10">
      <Link
        href="/universities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        {t("backToList")}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-6">
        {data.logo_image_id && (
          <img
            src={`/api/public/images/detail?id=${data.logo_image_id}`}
            alt={data.name}
            className="h-24 w-24 rounded-lg object-contain"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{data.name}</h1>
          {data.name_en && (
            <p className="mt-1 text-lg text-muted-foreground">{data.name_en}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {[data.city, data.province, data.country].filter(Boolean).join(", ")}
            </span>
            {latestRanking && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-primary">
                <Award className="h-4 w-4" />
                QS {latestRanking.year} #{latestRanking.ranking}
              </span>
            )}
            {data.website && (
              <a
                href={data.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {t("website")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {data.image_ids.length > 0 && (
        <ImageGallery imageIds={data.image_ids} alt={data.name} />
      )}

      {/* Description */}
      {data.description && (
        <section>
          <h2 className="text-xl font-bold">{t("about")}</h2>
          <SafeHtml html={data.description} className="prose mt-3 max-w-none" />
        </section>
      )}

      {/* Disciplines */}
      {Object.keys(groupedDisciplines).length > 0 && (
        <section>
          <h2 className="text-xl font-bold">{t("disciplines")}</h2>
          <div className="mt-3 space-y-3">
            {Object.entries(groupedDisciplines).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-medium text-muted-foreground">{category}</h3>
                <div className="mt-1 space-y-1">
                  {items.map((item) => {
                    const key = `${item.name}-${item.programName}`
                    const isExpanded = expandedProgram === key
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!item.admissionRequirements) return
                            setExpandedProgram(isExpanded ? null : key)
                          }}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                            item.admissionRequirements
                              ? "cursor-pointer bg-gray-100 hover:bg-gray-200"
                              : "cursor-default bg-gray-100"
                          }`}
                        >
                          {item.name}
                          {item.admissionRequirements && (
                            isExpanded
                              ? <ChevronDown className="size-3" />
                              : <ChevronRight className="size-3" />
                          )}
                        </button>
                        {item.admissionRequirements && isExpanded && (
                          <div className="ml-4 mt-1 rounded-lg border bg-gray-50 p-3">
                            <SafeHtml
                              html={item.admissionRequirements}
                              className="prose prose-sm max-w-none"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admission Requirements */}
      {data.admission_requirements && (
        <section>
          <h2 className="text-xl font-bold">{t("admissionRequirements")}</h2>
          <SafeHtml html={data.admission_requirements} className="prose mt-3 max-w-none" />
        </section>
      )}

      {/* Scholarships */}
      {data.scholarship_info && (
        <section>
          <h2 className="text-xl font-bold">{t("scholarships")}</h2>
          <SafeHtml html={data.scholarship_info} className="prose mt-3 max-w-none" />
        </section>
      )}

      {/* QS Rankings History */}
      {data.qs_rankings && data.qs_rankings.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">{t("rankings")}</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {data.qs_rankings.sort((a, b) => b.year - a.year).map((r) => (
              <div key={r.year} className="rounded-lg border px-4 py-2 text-center">
                <div className="text-sm text-muted-foreground">{r.year}</div>
                <div className="text-lg font-bold">#{r.ranking}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Map */}
      {data.latitude && data.longitude && (
        <section>
          <h2 className="text-xl font-bold">{t("location")}</h2>
          <div className="mt-3">
            <UniversityMap latitude={data.latitude} longitude={data.longitude} name={data.name} country={data.country} />
          </div>
        </section>
      )}

      {/* Related Cases */}
      {data.related_cases.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">{t("successCases")}</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {data.related_cases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
              >
                <div className="font-medium">{c.student_name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {c.program}{c.year !== null && c.year !== undefined ? ` · ${c.year}` : ""}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
