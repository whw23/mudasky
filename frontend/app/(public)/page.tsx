import { Banner } from "@/components/layout/Banner"

/** 官网首页 */
export default function HomePage() {
  return (
    <>
      <Banner
        title="慕大国际教育"
        subtitle="专注国际教育 专注出国服务"
      />

      {/* TODO: 热门留学国家 */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold">热门留学国家</h2>
        <p className="text-center text-muted-foreground">待实现</p>
      </section>

      {/* TODO: 最新资讯 */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 text-center text-2xl font-bold">最新资讯</h2>
          <p className="text-center text-muted-foreground">待实现</p>
        </div>
      </section>

      {/* TODO: 成功案例 */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold">成功案例</h2>
        <p className="text-center text-muted-foreground">待实现</p>
      </section>
    </>
  )
}
