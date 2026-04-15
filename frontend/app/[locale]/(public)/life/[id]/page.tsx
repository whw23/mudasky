import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"
import { getTranslations } from "next-intl/server"

/** 留学生活文章详情页 */
export default async function LifeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <ArticleDetailPage
      articleId={id}
      backPath="/life"
      bannerTitle={p("life")}
      bannerSubtitle={p("lifeSubtitle")}
    />
  )
}
