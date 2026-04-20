import { PageBanner } from "@/components/layout/PageBanner"
import { ConsultButton } from "@/components/common/ConsultButton"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, GraduationCap, Quote, ExternalLink, FileText } from "lucide-react"
import Image from "next/image"

/** 获取案例详情 */
async function fetchCase(id: string) {
  try {
    const baseUrl = process.env.INTERNAL_API_URL || "http://api:8000"
    const res = await fetch(`${baseUrl}/api/public/cases/detail/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 案例详情页 */
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")
  const t = await getTranslations("Cases")

  const caseData = await fetchCase(id)
  if (!caseData) notFound()

  return (
    <>
      <PageBanner pageKey="cases" title={t("detailTitle")} subtitle={p("casesSubtitle")} />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* 返回链接 */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* 学生信息 */}
        <div className="mt-8 rounded-xl border bg-white p-8">
          <div className="flex items-center gap-4">
            {caseData.avatar_image_id ? (
              <Image
                src={`/api/public/images/detail?id=${caseData.avatar_image_id}`}
                alt={caseData.student_name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {caseData.student_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("year")}: {caseData.year}
              </p>
            </div>
          </div>

          {/* 录取信息 */}
          <div className="mt-6 rounded-lg bg-gray-50 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("admittedTo")}
                </p>
                {caseData.related_university ? (
                  <Link
                    href={`/universities/${caseData.related_university.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-lg font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    {caseData.university}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ) : (
                  <p className="mt-1 text-lg font-bold text-primary">
                    {caseData.university}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("major")}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {caseData.program}
                </p>
              </div>
            </div>
          </div>

          {/* 录取通知书 */}
          {caseData.offer_image_id && (
            <div className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <FileText className="inline-block mr-1 h-4 w-4" />
                录取通知书
              </h2>
              <a
                href={`/api/public/images/detail?id=${caseData.offer_image_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block overflow-hidden rounded-lg border transition-all hover:shadow-lg"
              >
                <Image
                  src={`/api/public/images/detail?id=${caseData.offer_image_id}`}
                  alt="录取通知书"
                  width={800}
                  height={600}
                  className="w-full object-contain"
                />
              </a>
            </div>
          )}

          {/* 感言 */}
          {caseData.testimonial && (
            <div className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t("testimonialTitle")}
              </h2>
              <div className="mt-3 flex gap-3 rounded-lg border-l-4 border-primary/30 bg-gray-50 p-5">
                <Quote className="mt-0.5 h-5 w-5 shrink-0 text-primary/40" />
                <p className="italic leading-relaxed text-muted-foreground">
                  {caseData.testimonial}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-muted-foreground">{t("ctaDesc")}</p>
          <ConsultButton className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>

        {/* 底部返回 */}
        <div className="mt-12 border-t pt-6">
          <Link
            href="/cases"
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
