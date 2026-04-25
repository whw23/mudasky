/**
 * ConsultButton 立即咨询按钮组件测试。
 * 验证已登录/未登录不同行为和跳转逻辑。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockPush = vi.fn()
const mockShowLoginModal = vi.fn()
let mockIsLoggedIn = true

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
    showLoginModal: mockShowLoginModal,
  }),
}))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { ConsultButton } from "@/components/common/ConsultButton"

describe("ConsultButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = true
  })

  it("渲染按钮文本", () => {
    render(<ConsultButton>立即咨询</ConsultButton>)

    expect(screen.getByText("立即咨询")).toBeInTheDocument()
  })

  it("渲染为 button 元素", () => {
    render(<ConsultButton>立即咨询</ConsultButton>)

    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
    expect(button.getAttribute("type")).toBe("button")
  })

  it("已登录时点击跳转到关于页面", async () => {
    mockIsLoggedIn = true

    render(<ConsultButton>立即咨询</ConsultButton>)

    await userEvent.click(screen.getByText("立即咨询"))

    expect(mockPush).toHaveBeenCalledWith("/about")
    expect(mockShowLoginModal).not.toHaveBeenCalled()
  })

  it("未登录时点击跳转并弹出登录弹窗", async () => {
    mockIsLoggedIn = false

    render(<ConsultButton>立即咨询</ConsultButton>)

    await userEvent.click(screen.getByText("立即咨询"))

    expect(mockPush).toHaveBeenCalledWith("/about")
    expect(mockShowLoginModal).toHaveBeenCalled()
  })

  it("自定义 href 跳转到指定路径", async () => {
    mockIsLoggedIn = true

    render(<ConsultButton href="/contact">联系我们</ConsultButton>)

    await userEvent.click(screen.getByText("联系我们"))

    expect(mockPush).toHaveBeenCalledWith("/contact")
  })

  it("外部链接使用 window.open", async () => {
    mockIsLoggedIn = true
    const mockOpen = vi.fn()
    vi.stubGlobal("open", mockOpen)

    render(<ConsultButton href="https://example.com">外部链接</ConsultButton>)

    await userEvent.click(screen.getByText("外部链接"))

    expect(mockOpen).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    )
    expect(mockPush).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it("应用自定义 className", () => {
    render(
      <ConsultButton className="custom-class">咨询</ConsultButton>,
    )

    const button = screen.getByRole("button")
    expect(button.className).toContain("custom-class")
  })
})
