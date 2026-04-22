import { HomeBanner } from "@/components/home/HomeBanner"
import { StatsSection } from "@/components/home/StatsSection"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { CtaSection } from "@/components/common/CtaSection"
import { NewsSection } from "@/components/home/NewsSection"

/** 官网首页 */
export default function HomePage() {
  return (
    <>
      {/* Hero Banner */}
      <HomeBanner />

      {/* 数据统计 */}
      <StatsSection />

      {/* 关于我们 */}
      <PageIntroSection
        titleKey="home_intro_title"
        contentKey="home_intro_content"
        titleFallback="关于我们"
        contentFallback="慕大国际从事小语种留学项目运营已15年，为慕尼黑大学语言中心江苏省唯一指定招生考点。慕尼黑大学语言中心是官方德语培训基地考点。我们致力于为学生提供全方位的留学咨询、院校申请、签证办理等一站式服务。"
        sectionTag="About Us"
      />

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
