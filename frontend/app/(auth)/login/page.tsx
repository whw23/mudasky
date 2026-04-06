import Link from "next/link"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

/** 登录页面 */
export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>使用您的账号登录慕大国际教育</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">待实现</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          还没有账号？
          <Link href="/register" className="text-primary hover:underline">
            立即注册
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
