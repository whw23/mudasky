import { PageBanner } from "@/components/layout/PageBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"
import { getTranslations } from "next-intl/server"

/** 申请条件页面 */
export default async function RequirementsPage() {
  const p = await getTranslations("Pages")
  const blocks = await fetchPageBlocks("requirements")

  return (
    <>
      <PageBanner pageKey="requirements" title={p("requirements")} subtitle={p("requirementsSubtitle")} />
      <PageBlocksRenderer pageSlug="requirements" initialBlocks={blocks} />
    </>
  )
}
