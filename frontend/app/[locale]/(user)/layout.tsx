import { UserSidebar } from "@/components/layout/UserSidebar"
import { SidebarShell } from "@/components/layout/SidebarShell"

/** 用户中心布局 */
export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarShell sidebar={<UserSidebar />}>
      {children}
    </SidebarShell>
  )
}
