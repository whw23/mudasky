import { Banner } from "@/components/layout/Banner"
import { ConsultButton } from "@/components/common/ConsultButton"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import {
  GraduationCap,
  Quote,
  ArrowRight,
} from "lucide-react"

/** 从 API 获取成功案例列表 */
async function fetchCases() {
  try {
    const baseUrl = process.env.INTERNAL_API_URL || "http://api:8000"
    const res = await fetch(`${baseUrl}/api/public/case/list?page_size=100`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}

/** 成功案例页面 */
export default async function CasesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Cases")

  const apiCases = await fetchCases()

  // API 有数据则使用 API 数据，否则回退到翻译文件中的占位数据
  const cases = apiCases.length > 0
    ? apiCases.map((c: { id: string; student_name: string; university: string; program: string; year: number; testimonial: string | null }) => ({
      id: c.id,
      name: c.student_name,
      uni: c.university,
      program: c.program,
      year: String(c.year),
      quote: c.testimonial ?? "",
    }))
    : [
      { name: t("s1.name"), uni: t("s1.uni"), program: t("s1.program"), year: "2025", quote: t("s1.quote") },
      { name: t("s2.name"), uni: t("s2.uni"), program: t("s2.program"), year: "2025", quote: t("s2.quote") },
      { name: t("s3.name"), uni: t("s3.uni"), program: t("s3.program"), year: "2024", quote: t("s3.quote") },
      { name: t("s4.name"), uni: t("s4.uni"), program: t("s4.program"), year: "2024", quote: t("s4.quote") },
      { name: t("s5.name"), uni: t("s5.uni"), program: t("s5.program"), year: "2024", quote: t("s5.quote") },
      { name: t("s6.name"), uni: t("s6.uni"), program: t("s6.program"), year: "2023", quote: t("s6.quote") },
    ]

  const stats = [
    { value: "500+", label: t("statCases") },
    { value: "98%", label: t("statVisa") },
    { value: "50+", label: t("statSchools") },
  ]

  return (
    <>
      <Banner title={p("cases")} subtitle={p("casesSubtitle")} />

      {/* 统计 */}
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 案例网格 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Success Stories
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("title")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c: Record<string, string>) => {
            const content = (
              <>
                {/* 头像占位 */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">{c.year}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-primary">{c.uni}</p>
                  <p className="text-xs text-muted-foreground">{c.program}</p>
                </div>
                {c.quote && (
                  <div className="mt-4 flex gap-2">
                    <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/40" />
                    <p className="text-sm italic leading-relaxed text-muted-foreground">
                      {c.quote}
                    </p>
                  </div>
                )}
              </>
            )
            const cls = "group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
            return c.id ? (
              <Link key={c.name} href={`/cases/${c.id}`} className={cls}>
                {content}
              </Link>
            ) : (
              <div key={c.name} className={cls}>
                {content}
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">{t("ctaTitle")}</h3>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t("ctaDesc")}
          </p>
          <ConsultButton
            className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>
      </section>
    </>
  )
}
