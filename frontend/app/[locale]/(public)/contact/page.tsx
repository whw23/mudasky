import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 联系我们页面 */
export default async function ContactPage() {
  const t = await getTranslations("Pages")
  return (
    <>
      <Banner title={t("contact")} subtitle={t("contactSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">{t("placeholder")}</p>
      </section>
    </>
  )
}
