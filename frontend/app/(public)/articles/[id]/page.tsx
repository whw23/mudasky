import { Banner } from "@/components/layout/Banner"

/** 文章详情页 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <Banner title="文章详情" />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-center text-muted-foreground">
          文章 ID: {id} — 待实现
        </p>
      </section>
    </>
  )
}
