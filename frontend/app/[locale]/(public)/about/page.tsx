import { PageBanner } from "@/components/layout/PageBanner"
import { HistorySection } from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { OfficeGallery } from "@/components/about/OfficeGallery"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"

const ABOUT_CARDS_FALLBACK = [
  { icon: "Target", title: "我们的使命", desc: "让学生上理想的好大学。" },
  { icon: "Eye", title: "我们的愿景", desc: "实现学生接受优质高等教育的梦想，并依靠点点滴滴契而不舍的艰苦追求，成为最专业的国际教育资源咨询服务企业。" },
  { icon: "Heart", title: "我们的价值观", desc: "无条件让学生和家长满意、团队精神、团队互助、持续学习。" },
]

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
      <CardGridSection
        configKey="about_cards"
        sectionTag="About Us"
        sectionTitle="使命与愿景"
        fallbackCards={ABOUT_CARDS_FALLBACK}
        cardType="guide"
        bgColor="bg-gray-50"
      />

      {/* 办公环境 */}
      <OfficeGallery />

      {/* CTA */}
      <CtaSection translationNamespace="About" />
    </>
  )
}
