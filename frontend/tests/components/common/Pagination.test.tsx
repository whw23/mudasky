/**
 * Pagination 分页组件测试。
 * 验证页码显示、按钮禁用状态和回调触发。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = { prev: "上一页", next: "下一页" }
    return map[key] || key
  },
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled, onClick, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

import { Pagination } from "@/components/common/Pagination"

describe("Pagination", () => {
  const onPageChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染当前页码和总页数", () => {
    render(<Pagination page={3} totalPages={10} onPageChange={onPageChange} />)

    expect(screen.getByText("3 / 10")).toBeInTheDocument()
  })

  it("渲染上一页和下一页按钮文字", () => {
    render(<Pagination page={3} totalPages={10} onPageChange={onPageChange} />)

    expect(screen.getByText("上一页")).toBeInTheDocument()
    expect(screen.getByText("下一页")).toBeInTheDocument()
  })

  it("第一页时上一页按钮禁用", () => {
    render(<Pagination page={1} totalPages={10} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).not.toBeDisabled()
  })

  it("最后一页时下一页按钮禁用", () => {
    render(<Pagination page={10} totalPages={10} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).not.toBeDisabled()
    expect(buttons[1]).toBeDisabled()
  })

  it("点击上一页触发回调", async () => {
    render(<Pagination page={5} totalPages={10} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[0])

    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it("点击下一页触发回调", async () => {
    render(<Pagination page={5} totalPages={10} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])

    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  it("只有一页时两个按钮都禁用", () => {
    render(<Pagination page={1} totalPages={1} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeDisabled()
  })

  it("页码显示格式正确", () => {
    render(<Pagination page={1} totalPages={1} onPageChange={onPageChange} />)

    expect(screen.getByText("1 / 1")).toBeInTheDocument()
  })
})
