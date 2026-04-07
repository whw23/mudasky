import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 成功案例页面 */
export default async function CasesPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("cases")} subtitle={t("casesSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
