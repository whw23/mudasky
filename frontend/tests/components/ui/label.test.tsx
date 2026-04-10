/**
 * Label UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Label } from "@/components/ui/label"

describe("Label", () => {
  it("渲染 children", () => {
    render(<Label>用户名</Label>)
    expect(screen.getByText("用户名")).toBeInTheDocument()
  })

  it("htmlFor 透传", () => {
    render(<Label htmlFor="email">邮箱</Label>)
    expect(screen.getByText("邮箱")).toHaveAttribute("for", "email")
  })

  it("data-slot='label'", () => {
    render(<Label data-testid="label">标签</Label>)
    expect(screen.getByTestId("label").dataset.slot).toBe("label")
  })
})
