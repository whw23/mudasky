import { UserSidebar } from "@/components/layout/UserSidebar"

/** 用户中心布局 */
export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
