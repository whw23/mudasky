import { HomeBanner } from "@/components/home/HomeBanner"
import { StatsSection } from "@/components/home/StatsSection"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { CtaSection } from "@/components/common/CtaSection"

/** 官网首页 */
export default function HomePage() {
  return (
    <>
      <HomeBanner />
      <StatsSection />
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <FeaturedUniversities />
        <FeaturedCases />
      </section>
      <CtaSection translationNamespace="Home" variant="border-t" />
    </>
  )
}
