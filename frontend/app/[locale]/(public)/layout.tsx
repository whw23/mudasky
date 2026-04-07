import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

/** 官网公共布局 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
