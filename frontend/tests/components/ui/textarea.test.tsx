/**
 * Textarea UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Textarea } from "@/components/ui/textarea"

describe("Textarea", () => {
  it("data-slot='textarea'", () => {
    render(<Textarea data-testid="ta" />)
    expect(screen.getByTestId("ta").dataset.slot).toBe("textarea")
  })

  it("placeholder 透传", () => {
    render(<Textarea placeholder="请输入内容" />)
    expect(screen.getByPlaceholderText("请输入内容")).toBeInTheDocument()
  })

  it("rows 透传", () => {
    render(<Textarea data-testid="ta" rows={5} />)
    expect(screen.getByTestId("ta")).toHaveAttribute("rows", "5")
  })
})
