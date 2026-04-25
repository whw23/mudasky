/**
 * UniversitySearch 院校搜索筛选组件测试。
 * 验证搜索输入、国家下拉、重置按钮和筛选变更回调。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}))

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {typeof children === "function" ? children : children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: ({ children }: any) => (
    <span>{typeof children === "function" ? children(null) : children}</span>
  ),
}))

const mockGet = vi.fn()
vi.mock("@/lib/api", () => ({
  default: { get: (...args: any[]) => mockGet(...args) },
}))

import { UniversitySearch } from "@/components/public/UniversitySearch"

describe("UniversitySearch", () => {
  const mockOnFilterChange = vi.fn()
  const defaultProps = {
    countries: ["中国", "美国", "英国"],
    onFilterChange: mockOnFilterChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGet.mockResolvedValue({ data: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("渲染搜索输入框", () => {
    render(<UniversitySearch {...defaultProps} />)

    const input = screen.getByPlaceholderText("searchPlaceholder")
    expect(input).toBeInTheDocument()
  })

  it("渲染国家下拉选项", () => {
    render(<UniversitySearch {...defaultProps} />)

    expect(screen.getAllByText("allCountries").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId("select-item-中国")).toBeInTheDocument()
    expect(screen.getByTestId("select-item-美国")).toBeInTheDocument()
    expect(screen.getByTestId("select-item-英国")).toBeInTheDocument()
  })

  it("搜索输入后防抖触发 onFilterChange", async () => {
    render(<UniversitySearch {...defaultProps} />)

    const input = screen.getByPlaceholderText("searchPlaceholder")
    fireEvent.change(input, { target: { value: "清华" } })

    expect(mockOnFilterChange).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(300) })

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "清华" }),
    )
  })

  it("初始无筛选时不显示重置按钮", () => {
    render(<UniversitySearch {...defaultProps} />)

    expect(screen.queryByText("reset")).not.toBeInTheDocument()
  })

  it("有筛选内容时显示重置按钮", () => {
    render(<UniversitySearch {...defaultProps} />)

    const input = screen.getByPlaceholderText("searchPlaceholder")
    fireEvent.change(input, { target: { value: "test" } })

    expect(screen.getByText("reset")).toBeInTheDocument()
  })

  it("点击重置按钮清空所有筛选", () => {
    render(<UniversitySearch {...defaultProps} />)

    const input = screen.getByPlaceholderText("searchPlaceholder")
    fireEvent.change(input, { target: { value: "test" } })

    fireEvent.click(screen.getByText("reset"))

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: "",
      country: "",
      province: "",
      city: "",
      disciplineCategoryId: "",
      disciplineId: "",
    })
  })

  it("加载学科分类数据", async () => {
    vi.useRealTimers()
    const mockDisciplines = [
      { id: "dc1", name: "工学", disciplines: [{ id: "d1", name: "计算机" }] },
    ]
    mockGet.mockImplementation((url: string) => {
      if (url.includes("disciplines")) {
        return Promise.resolve({ data: mockDisciplines })
      }
      return Promise.resolve({ data: [] })
    })

    render(<UniversitySearch {...defaultProps} />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/public/disciplines/list")
    })
    vi.useFakeTimers()
  })

  it("空国家列表时仍渲染'全部国家'选项", () => {
    render(<UniversitySearch {...defaultProps} countries={[]} />)

    expect(screen.getAllByText("allCountries").length).toBeGreaterThanOrEqual(1)
  })
})
