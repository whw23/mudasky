import { HomeBanner } from "@/components/home/HomeBanner"
import { UniversityGallery } from "@/components/home/UniversityGallery"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { CtaSection } from "@/components/common/CtaSection"

/** 官网首页 */
export default function HomePage() {
  return (
    <>
      <HomeBanner />
      <UniversityGallery />
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <FeaturedCases />
      </section>
      <CtaSection translationNamespace="Home" variant="border-t" />
    </>
  )
}
