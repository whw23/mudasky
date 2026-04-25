/**
 * SpotlightOverlay 组件测试。
 * 验证双层编辑容器的渲染、点击回调和 CSS 类名。
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"

describe("SpotlightOverlay", () => {
  it("渲染子内容", () => {
    render(<SpotlightOverlay onClick={() => {}}>内容</SpotlightOverlay>)
    expect(screen.getByText("内容")).toBeInTheDocument()
  })

  it("点击触发回调", () => {
    const onClick = vi.fn()
    render(<SpotlightOverlay onClick={onClick}>内容</SpotlightOverlay>)
    fireEvent.click(screen.getByText("内容"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("包含 spotlight-overlay class", () => {
    render(<SpotlightOverlay onClick={() => {}}>内容</SpotlightOverlay>)
    expect(screen.getByText("内容").closest(".spotlight-overlay")).toBeTruthy()
  })

  it("包含 spotlight-border 和 spotlight-content", () => {
    const { container } = render(<SpotlightOverlay onClick={() => {}}>内容</SpotlightOverlay>)
    expect(container.querySelector(".spotlight-border")).toBeTruthy()
    expect(container.querySelector(".spotlight-content")).toBeTruthy()
  })
})
