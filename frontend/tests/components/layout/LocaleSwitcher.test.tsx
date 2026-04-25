/**
 * LocaleSwitcher 语言切换器组件测试。
 * 验证当前语言显示和语言选项渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const mockReplace = vi.fn()

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = { zh: "中文", en: "English", ja: "日本語", de: "Deutsch" }
    return map[key] || key
  },
}))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/",
}))

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["zh", "en", "ja", "de"] },
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {typeof onValueChange === "function" && (
        <button data-testid="change-locale" onClick={() => onValueChange("en")}>
          change
        </button>
      )}
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }: any) => {
    const rendered = typeof children === "function" ? children("zh") : children
    return <span data-testid="select-value">{rendered}</span>
  },
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"

describe("LocaleSwitcher", () => {
  it("渲染当前语言名称", () => {
    render(<LocaleSwitcher />)

    expect(screen.getByTestId("select-value").textContent).toBe("中文")
  })

  it("渲染所有语言选项", () => {
    render(<LocaleSwitcher />)

    expect(screen.getByTestId("select-item-zh")).toBeInTheDocument()
    expect(screen.getByTestId("select-item-en")).toBeInTheDocument()
    expect(screen.getByTestId("select-item-ja")).toBeInTheDocument()
    expect(screen.getByTestId("select-item-de")).toBeInTheDocument()
  })

  it("显示各语言名称", () => {
    render(<LocaleSwitcher />)

    /* "中文"同时出现在 SelectValue 和 SelectItem 中 */
    expect(screen.getAllByText("中文").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByText("日本語")).toBeInTheDocument()
    expect(screen.getByText("Deutsch")).toBeInTheDocument()
  })

  it("select 组件接收当前 locale 值", () => {
    render(<LocaleSwitcher />)

    const select = screen.getByTestId("select")
    expect(select.getAttribute("data-value")).toBe("zh")
  })
})
