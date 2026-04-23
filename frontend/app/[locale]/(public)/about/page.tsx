import { PageBanner } from "@/components/layout/PageBanner"
import {
  HistorySection,
  MissionVisionSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { OfficeGallery } from "@/components/about/OfficeGallery"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"

/** 关于我们页面 */
export default async function AboutPage() {
  const p = await getTranslations("Pages")

  return (
    <>
      <PageBanner pageKey="about" title={p("about")} subtitle={p("aboutSubtitle")} />

      {/* 联系方式 */}
      <ContactInfoSection />

      {/* 公司简介 */}
      <HistorySection />

      {/* 使命愿景 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <MissionVisionSection />
        </div>
      </section>

      {/* 办公环境 */}
      <OfficeGallery />

      {/* CTA */}
      <CtaSection translationNamespace="About" />
    </>
  )
}
