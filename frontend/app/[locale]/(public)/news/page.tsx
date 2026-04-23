import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 新闻政策页面 */
export default async function NewsPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("news")

  return (
    <>
      <PageBanner pageKey="news" title={p("news")} subtitle={p("newsSubtitle")} />
      <PageBlocksRenderer pageSlug="news" initialBlocks={blocks} />
    </>
  )
}
