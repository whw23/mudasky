import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 留学项目文章详情页 */
export default async function StudyAbroadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/study-abroad"
      bannerTitle={p("studyAbroad")}
      bannerSubtitle={p("studyAbroadSubtitle")}
    />
  )
}
