/**
 * Input UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Input } from "@/components/ui/input"

describe("Input", () => {
  it("渲染 data-slot='input'", () => {
    render(<Input data-testid="input" />)
    expect(screen.getByTestId("input").dataset.slot).toBe("input")
  })

  it("type 和 placeholder 透传", () => {
    render(<Input type="email" placeholder="请输入邮箱" />)
    const input = screen.getByPlaceholderText("请输入邮箱")
    expect(input).toHaveAttribute("type", "email")
  })

  it("className 合并", () => {
    render(<Input data-testid="input" className="w-64" />)
    expect(screen.getByTestId("input").className).toContain("w-64")
  })
})
