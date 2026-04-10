/**
 * Tabs UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

describe("Tabs", () => {
  it("渲染完整的 Tab 结构", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">标签1</TabsTrigger>
          <TabsTrigger value="tab2">标签2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">内容1</TabsContent>
        <TabsContent value="tab2">内容2</TabsContent>
      </Tabs>,
    )

    expect(screen.getByText("标签1")).toBeInTheDocument()
    expect(screen.getByText("标签2")).toBeInTheDocument()
    expect(screen.getByText("内容1")).toBeInTheDocument()
  })

  it("data-slot 正确设置", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">内容</TabsContent>
      </Tabs>,
    )

    expect(container.querySelector("[data-slot='tabs']")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='tabs-list']")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='tabs-trigger']")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='tabs-content']")).toBeInTheDocument()
  })
})
