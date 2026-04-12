import { SidebarShell } from "@/components/layout/SidebarShell"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { UserSidebar } from "@/components/layout/UserSidebar"

/** 统一面板布局 */
export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ panel: string }>
}) {
  const { panel } = await params

  const isAdmin = panel === "admin"

  return (
    <SidebarShell
      sidebar={isAdmin ? <AdminSidebar /> : <UserSidebar />}
      sidebarClass={isAdmin ? "bg-gray-900 text-gray-300" : "bg-gray-50"}
    >
      {children}
    </SidebarShell>
  )
}
