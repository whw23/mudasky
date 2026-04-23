import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 留学生活页面 */
export default async function LifePage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("life")

  return (
    <>
      <PageBanner pageKey="life" title={p("life")} subtitle={p("lifeSubtitle")} />
      <PageBlocksRenderer pageSlug="life" initialBlocks={blocks} />
    </>
  )
}
