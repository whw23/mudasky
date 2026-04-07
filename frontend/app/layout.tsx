import type { ReactNode } from "react"
import { Lexend } from "next/font/google"
import "./globals.css"

const lexend = Lexend({
  variable: "--font-sans",
  subsets: ["latin"],
})

/** 根布局（语言无关） */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${lexend.variable} h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
