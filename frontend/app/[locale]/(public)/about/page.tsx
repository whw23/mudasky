import { PageBanner } from "@/components/layout/PageBanner"
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
      <PageBlocksRenderer pageSlug="about" initialBlocks={blocks} />
    </>
  )
}
