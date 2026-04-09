/**
 * Button UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("渲染 data-slot='button'", () => {
    render(<Button>点击</Button>)
    const btn = screen.getByText("点击")
    expect(btn.closest("[data-slot='button']")).toBeInTheDocument()
  })

  it("默认 variant 包含 bg-primary", () => {
    render(<Button>默认</Button>)
    const el = screen.getByText("默认").closest("[data-slot='button']")!
    expect(el.className).toContain("bg-primary")
  })

  it("outline variant 包含 border-border", () => {
    render(<Button variant="outline">边框</Button>)
    const el = screen.getByText("边框").closest("[data-slot='button']")!
    expect(el.className).toContain("border-border")
  })

  it("自定义 className 合并到组件上", () => {
    render(<Button className="my-custom">自定义</Button>)
    const el = screen.getByText("自定义").closest("[data-slot='button']")!
    expect(el.className).toContain("my-custom")
  })

  it("render prop 传入时 nativeButton 自动设为 false", () => {
    render(<Button render={<a href="#" />}>链接按钮</Button>)
    const el = screen.getByText("链接按钮")
    expect(el.tagName).toBe("A")
  })
})
