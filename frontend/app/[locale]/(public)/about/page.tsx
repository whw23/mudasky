import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 关于我们页面 */
export default async function AboutPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("about")} subtitle={t("aboutSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
