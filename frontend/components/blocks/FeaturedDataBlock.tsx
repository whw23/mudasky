"use client"

/**
 * 精选数据区块。
 * 根据 options.dataType 从 API 获取精选院校或案例。
 */

import { useEffect, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { MapPin, Award, GraduationCap, Building2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import type { Block } from "@/types/block"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}

interface UniversityItem {
  id: string
  name: string
  name_en?: string
  city: string
  country: string
  logo_image_id: string | null
  qs_rankings?: Array<{ year: number; ranking: number }>
}

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  avatar_image_id: string | null
}

/** 精选数据区块（院校或案例） */
export function FeaturedDataBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  const t = useTranslations("Home")
  const dataType = block.options?.dataType as "universities" | "cases"
  const maxItems = block.options?.maxItems ?? 6

  const [data, setData] = useState<UniversityItem[] | CaseItem[]>([])

  useEffect(() => {
    const endpoint = dataType === "universities" ? "/public/universities/list" : "/public/cases/list"
    api
      .get(endpoint, { params: { is_featured: true, page_size: maxItems } })
      .then((res) => setData(res.data.items ?? []))
      .catch(() => setData([]))
  }, [dataType, maxItems])

  const maxCols = block.options?.maxColumns ?? 3
  const gridCls = maxCols === 4
    ? "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
    : maxCols === 2
      ? "mt-8 grid gap-6 sm:grid-cols-2"
      : "mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"

  const content = dataType === "universities" ? (
    <UniversityGrid items={data as UniversityItem[]} gridCls={gridCls} />
  ) : (
    <CaseGrid items={data as CaseItem[]} gridCls={gridCls} />
  )

  const moreLink = dataType === "universities" ? "/universities" : "/cases"

  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">暂无数据</p>
        ) : (
          <>
            {content}
            <div className="mt-8 text-center">
              <Link
                href={moreLink}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t("viewMore")} &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑精选数据">
        {el}
      </SpotlightOverlay>
    )
  }
  return el
}

/** 院校网格 */
function UniversityGrid({ items, gridCls }: { items: UniversityItem[]; gridCls: string }) {
  return (
    <div className={gridCls}>
      {items.map((uni) => {
        const latestRanking = uni.qs_rankings?.sort((a, b) => b.year - a.year)[0]
        return (
          <Link
            key={uni.id}
            href={`/universities/${uni.id}`}
            className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
          >
            {/* Logo */}
            <div className="flex size-16 items-center justify-center rounded-lg bg-gray-100">
              {uni.logo_image_id ? (
                <img
                  src={`/api/public/images/detail?id=${uni.logo_image_id}`}
                  alt={uni.name}
                  className="size-12 object-contain"
                />
              ) : (
                <Building2 className="size-8 text-gray-400 transition-colors group-hover:text-primary" />
              )}
            </div>

            {/* 院校名称 */}
            <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
              {uni.name}
            </h4>
            {uni.name_en && (
              <p className="text-xs text-muted-foreground">{uni.name_en}</p>
            )}

            {/* 地理位置 */}
            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {uni.city}, {uni.country}
            </div>

            {/* QS排名徽章 */}
            {latestRanking && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <Award className="size-3" />
                QS {latestRanking.year} #{latestRanking.ranking}
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}

/** 案例网格 */
function CaseGrid({ items, gridCls }: { items: CaseItem[]; gridCls: string }) {
  return (
    <div className={gridCls}>
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/cases/${c.id}`}
          className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            {c.avatar_image_id ? (
              <img
                src={`/api/public/images/detail?id=${c.avatar_image_id}`}
                alt={c.student_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h4 className="font-bold">{c.student_name}</h4>
              <p className="text-xs text-muted-foreground">{c.year}</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-primary">{c.university}</p>
            <p className="text-xs text-muted-foreground">{c.program}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
