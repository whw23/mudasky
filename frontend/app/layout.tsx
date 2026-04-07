import type { Metadata } from "next"
import { Lexend } from "next/font/google"
import { AuthProvider } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/auth/LoginModal"
import { RegisterModal } from "@/components/auth/RegisterModal"
import "./globals.css"

const lexend = Lexend({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "慕大国际教育",
  description: "专注国际教育 专注出国服务",
}

/** 根布局 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`${lexend.variable} h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <LoginModal />
          <RegisterModal />
        </AuthProvider>
      </body>
    </html>
  )
}
