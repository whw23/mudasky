import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 签证办理页面 */
export default async function VisaPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("visa")} subtitle={t("visaSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
