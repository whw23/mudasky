/**
 * SearchBar 搜索栏组件测试。
 * 验证输入、搜索按钮和 Enter 键触发跳转。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockPush = vi.fn()

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      searchPlaceholder: "搜索院校...",
      searchButton: "搜索",
    }
    return map[key] || key
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { SearchBar } from "@/components/common/SearchBar"

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染搜索输入框", () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("搜索院校...")
    expect(input).toBeInTheDocument()
  })

  it("渲染搜索按钮", () => {
    render(<SearchBar />)

    expect(screen.getByText("搜索")).toBeInTheDocument()
  })

  it("输入内容后点击搜索跳转", async () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("搜索院校...")
    await userEvent.type(input, "北京大学")

    const button = screen.getByText("搜索")
    await userEvent.click(button)

    expect(mockPush).toHaveBeenCalledWith("/universities?search=%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6")
  })

  it("空搜索时跳转到列表页（无 search 参数）", async () => {
    render(<SearchBar />)

    const button = screen.getByText("搜索")
    await userEvent.click(button)

    expect(mockPush).toHaveBeenCalledWith("/universities")
  })

  it("Enter 键触发搜索", async () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("搜索院校...")
    await userEvent.type(input, "清华{Enter}")

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/universities?search="),
    )
  })

  it("空格内容视为空搜索", async () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("搜索院校...")
    await userEvent.type(input, "   ")

    const button = screen.getByText("搜索")
    await userEvent.click(button)

    expect(mockPush).toHaveBeenCalledWith("/universities")
  })

  it("输入框初始值为空", () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("搜索院校...") as HTMLInputElement
    expect(input.value).toBe("")
  })
})
