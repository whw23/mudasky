import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 申请条件页面 */
export default async function RequirementsPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("requirements")} subtitle={t("requirementsSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
