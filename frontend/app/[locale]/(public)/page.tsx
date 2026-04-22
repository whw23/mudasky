import { HomeBanner } from "@/components/home/HomeBanner"
import { StatsSection } from "@/components/home/StatsSection"
import { AboutIntroSection } from "@/components/home/AboutIntroSection"
import { ServicesSection } from "@/components/home/ServicesSection"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { CtaSection } from "@/components/common/CtaSection"
import { NewsSection } from "@/components/home/NewsSection"

/** 官网首页 */
export default async function HomePage() {
  return (
    <>
      {/* Hero Banner */}
      <HomeBanner />

      {/* 数据统计 */}
      <StatsSection />

      {/* 关于我们 */}
      <AboutIntroSection />

      {/* 精选服务 */}
      <ServicesSection />

      {/* 精选院校和成功案例 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <FeaturedUniversities />
        <FeaturedCases />
      </section>

      {/* 最新资讯 */}
      <NewsSection />

      {/* CTA */}
      <CtaSection translationNamespace="Home" variant="border-t" />
    </>
  )
}
