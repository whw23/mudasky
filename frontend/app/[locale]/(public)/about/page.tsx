import { PageBanner } from "@/components/layout/PageBanner"
import { HistorySection } from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { OfficeGallery } from "@/components/about/OfficeGallery"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"

const ABOUT_CARDS_FALLBACK = [
  { icon: "Award", title: "我们的使命", desc: "让每一位留学梦想的学子都能获得专业、贴心的一站式留学服务，帮助学生找到最适合自己的海外学府，实现人生价值的飞跃。" },
  { icon: "Globe", title: "我们的愿景", desc: "成为中国最值得信赖的国际教育服务品牌，打通中国学子与世界名校之间的桥梁，推动中外教育文化交流与融合。" },
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
