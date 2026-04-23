import { PageBanner } from "@/components/layout/PageBanner"
import { HistorySection } from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 关于我们页面 */
export default async function AboutPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("about")

  return (
    <>
      <PageBanner pageKey="about" title={p("about")} subtitle={p("aboutSubtitle")} />
      <ContactInfoSection />
      <HistorySection />
      <PageBlocksRenderer pageSlug="about" initialBlocks={blocks} />
    </>
  )
}
