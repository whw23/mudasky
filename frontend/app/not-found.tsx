import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

/** 404 页面 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-20">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl text-muted-foreground">页面未找到</p>
      <Link href="/" className={buttonVariants()}>
        返回首页
      </Link>
    </div>
  )
}
