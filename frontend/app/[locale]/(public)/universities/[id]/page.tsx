import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"
import { UniversityDetail } from "@/components/public/UniversityDetail"

interface Props {
  params: Promise<{ id: string }>
}

/** 院校详情页 */
export default async function UniversityDetailPage({ params }: Props) {
  const { id } = await params
  const p = await getTranslations("Pages")

  return (
    <>
      <Banner title={p("universities")} subtitle={p("universitiesSubtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <UniversityDetail universityId={id} />
      </section>
    </>
  )
}
