import type { ReactNode } from "react"
import "./globals.css"

/** 根布局（语言无关） */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}
