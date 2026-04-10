/**
 * Card UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

describe("Card", () => {
  it("渲染 data-slot='card'", () => {
    render(<Card data-testid="card">内容</Card>)
    expect(screen.getByTestId("card").dataset.slot).toBe("card")
  })

  it("自定义 className 合并", () => {
    render(<Card data-testid="card" className="my-card">内容</Card>)
    expect(screen.getByTestId("card").className).toContain("my-card")
  })

  it("子组件全部渲染对应 data-slot", () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">标题</CardTitle>
          <CardDescription data-testid="desc">描述</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">正文</CardContent>
        <CardFooter data-testid="footer">页脚</CardFooter>
      </Card>,
    )

    expect(screen.getByTestId("header").dataset.slot).toBe("card-header")
    expect(screen.getByTestId("title").dataset.slot).toBe("card-title")
    expect(screen.getByTestId("desc").dataset.slot).toBe("card-description")
    expect(screen.getByTestId("content").dataset.slot).toBe("card-content")
    expect(screen.getByTestId("footer").dataset.slot).toBe("card-footer")
  })
})
