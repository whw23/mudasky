import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 新闻政策页面 */
export default async function NewsPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("news")} subtitle={t("newsSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
