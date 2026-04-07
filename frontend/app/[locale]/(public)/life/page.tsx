import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 留学生活页面 */
export default async function LifePage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("life")} subtitle={t("lifeSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
