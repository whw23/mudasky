import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { SidebarShell } from "@/components/layout/SidebarShell"

/** 后台管理布局 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarShell
      sidebar={<AdminSidebar />}
      sidebarClass="bg-gray-900 text-gray-300"
    >
      {children}
    </SidebarShell>
  )
}
