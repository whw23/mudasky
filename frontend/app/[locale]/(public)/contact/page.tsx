import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"
import { ContactInfoPanel } from "@/components/public/ContactInfoPanel"
import { ContactForm } from "@/components/public/ContactForm"

/** 联系我们页面 */
export default async function ContactPage() {
  const p = await getTranslations("Pages")

  return (
    <>
      <Banner title={p("contact")} subtitle={p("contactSubtitle")} />

      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* 左侧：联系信息（从系统配置读取） */}
          <ContactInfoPanel />

          {/* 右侧：联系表单 */}
          <ContactForm />
        </div>
      </section>
    </>
  )
}
