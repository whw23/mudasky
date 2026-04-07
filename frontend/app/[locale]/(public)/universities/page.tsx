import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 院校选择页面 */
export default async function UniversitiesPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("universities")} subtitle={t("universitiesSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
