/**
 * FieldOverlay 组件测试。
 * 验证字段级编辑高亮的渲染、点击冒泡和属性。
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { FieldOverlay } from "@/components/admin/FieldOverlay"

describe("FieldOverlay", () => {
  it("渲染子内容", () => {
    render(<FieldOverlay onClick={() => {}}>内容</FieldOverlay>)
    expect(screen.getByText("内容")).toBeInTheDocument()
  })

  it("点击触发回调并阻止冒泡", () => {
    const onClick = vi.fn()
    const onParentClick = vi.fn()
    render(
      <div onClick={onParentClick}>
        <FieldOverlay onClick={onClick}>内容</FieldOverlay>
      </div>
    )
    fireEvent.click(screen.getByText("内容"))
    expect(onClick).toHaveBeenCalledOnce()
    expect(onParentClick).not.toHaveBeenCalled()
  })

  it("添加 data-field 属性", () => {
    render(<FieldOverlay onClick={() => {}}>内容</FieldOverlay>)
    expect(screen.getByText("内容").closest("[data-field]")).toBeTruthy()
  })

  it("支持自定义 className", () => {
    render(<FieldOverlay onClick={() => {}} className="mx-auto w-fit">内容</FieldOverlay>)
    const el = screen.getByText("内容").closest("[data-field]")
    expect(el).toHaveClass("mx-auto")
    expect(el).toHaveClass("w-fit")
  })
})
