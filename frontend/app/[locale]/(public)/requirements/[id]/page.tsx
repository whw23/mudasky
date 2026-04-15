import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 申请条件文章详情页 */
export default async function RequirementsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/requirements"
      bannerTitle={p("requirements")}
      bannerSubtitle={p("requirementsSubtitle")}
    />
  )
}
