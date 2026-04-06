import Link from "next/link"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

/** 注册页面 */
export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>注册</CardTitle>
        <CardDescription>创建您的慕大国际教育账号</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">待实现</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          已有账号？
          <Link href="/login" className="text-primary hover:underline">
            立即登录
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
