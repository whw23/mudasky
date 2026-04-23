import { HomeBanner } from "@/components/home/HomeBanner"
import { PageBlocksRenderer } from "@/components/blocks/PageBlocksRenderer"
import { fetchPageBlocks } from "@/lib/page-api"

/** 官网首页 */
export default async function HomePage() {
  const blocks = await fetchPageBlocks("home")

  return (
    <>
      <HomeBanner />
      <PageBlocksRenderer pageSlug="home" initialBlocks={blocks} />
    </>
  )
}
