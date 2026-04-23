import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 院校选择页面 */
export default async function UniversitiesPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("universities")

  return (
    <>
      <PageBanner pageKey="universities" title={p("universities")} subtitle={p("universitiesSubtitle")} />
      <PageBlocksRenderer pageSlug="universities" initialBlocks={blocks} />
    </>
  )
}
