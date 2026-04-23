import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 出国留学页面 */
export default async function StudyAbroadPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("study-abroad")

  return (
    <>
      <PageBanner pageKey="study-abroad" title={p("studyAbroad")} subtitle={p("studyAbroadSubtitle")} />
      <PageBlocksRenderer pageSlug="study-abroad" initialBlocks={blocks} />
    </>
  )
}
