import { Banner } from "@/components/layout/Banner"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import {
  MapPin,
  GraduationCap,
  Building2,
  ArrowRight,
} from "lucide-react"

/** 院校类型 */
interface UniversityItem {
  id: string
  name: string
  name_en: string | null
  country: string
  city: string
  logo_url: string | null
  description: string | null
  programs: string[]
  website: string | null
  is_featured: boolean
}

/** 从后端获取合作院校列表 */
async function fetchUniversities(): Promise<UniversityItem[]> {
  try {
    const backendUrl = process.env.INTERNAL_API_URL ?? "http://api:8000"
    const res = await fetch(
      `${backendUrl}/api/universities?page_size=100`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}

/** 院校选择页面 */
export default async function UniversitiesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Universities")

  const universities = await fetchUniversities()

  return (
    <>
      <Banner title={p("universities")} subtitle={p("universitiesSubtitle")} />

      {/* 概述 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Partner Universities
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("title")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </section>

      {/* 院校列表 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {universities.map((uni) => (
              <div
                key={uni.id}
                className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                {/* Logo */}
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                  {uni.logo_url ? (
                    <img
                      src={uni.logo_url}
                      alt={uni.name}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-gray-400 transition-colors group-hover:text-primary" />
                  )}
                </div>
                <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
                  {uni.name}
                </h4>
                {uni.name_en && (
                  <p className="text-xs text-muted-foreground">{uni.name_en}</p>
                )}
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {uni.city}, {uni.country}
                </div>
                {uni.programs.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    {uni.programs.join(", ")}
                  </div>
                )}
                {uni.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {uni.description}
                  </p>
                )}
                {uni.website && (
                  <a
                    href={uni.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    {uni.website}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 选校建议 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold">{t("adviceTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("adviceContent")}
        </p>
        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
