import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 出国留学页面 */
export default async function StudyAbroadPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("studyAbroad")} subtitle={t("studyAbroadSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
