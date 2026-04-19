import { Banner } from "@/components/layout/Banner"
import { ConsultButton } from "@/components/common/ConsultButton"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react"

/** 获取院校详情 */
async function fetchUniversity(id: string) {
  try {
    const baseUrl = process.env.INTERNAL_API_URL || "http://api:8000"
    const res = await fetch(
      `${baseUrl}/api/public/universities/detail/${id}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 院校详情页 */
export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")
  const t = await getTranslations("Universities")

  const uni = await fetchUniversity(id)
  if (!uni) notFound()

  const locationParts = [uni.city, uni.province, uni.country].filter(Boolean)

  return (
    <>
      <Banner title={t("detailTitle")} subtitle={p("universitiesSubtitle")} />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* 返回链接 */}
        <Link
          href="/universities"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* 院校信息卡 */}
        <div className="mt-8 rounded-xl border bg-white p-8">
          {/* 头部：Logo + 校名 */}
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              {uni.logo_url ? (
                <img
                  src={uni.logo_url}
                  alt={uni.name}
                  className="h-14 w-14 object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{uni.name}</h1>
              {uni.name_en && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {uni.name_en}
                </p>
              )}
            </div>
          </div>

          {/* 地理信息 */}
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>{locationParts.join(", ")}</span>
          </div>

          {/* 官网链接 */}
          {uni.website && (
            <a
              href={uni.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {t("visitWebsite")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* 开设专业 */}
          {uni.programs && uni.programs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("programs")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {uni.programs.map((prog: string) => (
                  <span
                    key={prog}
                    className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {prog}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 学校简介 */}
          {uni.description && (
            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("about")}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {uni.description}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <ConsultButton className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>

        {/* 底部返回 */}
        <div className="mt-12 border-t pt-6">
          <Link
            href="/universities"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </div>
      </div>
    </>
  )
}
