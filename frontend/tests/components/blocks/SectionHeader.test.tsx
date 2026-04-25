/**
 * SectionHeader 组件测试。
 * 验证标签和标题渲染、多语言字段支持。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

import { SectionHeader } from "@/components/blocks/SectionHeader"

describe("SectionHeader", () => {
  it("渲染英文标签和中文标题", () => {
    render(<SectionHeader tag="ABOUT US" title={{ zh: "关于我们", en: "About Us" }} />)

    expect(screen.getByText("ABOUT US")).toBeInTheDocument()
    expect(screen.getByText("关于我们")).toBeInTheDocument()
  })

  it("标题为纯字符串时直接渲染", () => {
    render(<SectionHeader tag="SERVICES" title="我们的服务" />)

    expect(screen.getByText("SERVICES")).toBeInTheDocument()
    expect(screen.getByText("我们的服务")).toBeInTheDocument()
  })

  it("空标签时不渲染标签元素", () => {
    render(<SectionHeader tag="" title="标题内容" />)

    expect(screen.getByText("标题内容")).toBeInTheDocument()
    /* 空字符串标签不应渲染 h2 */
    const h2 = document.querySelector("h2")
    expect(h2).toBeNull()
  })

  it("渲染红色分隔线", () => {
    render(<SectionHeader tag="TEST" title="测试标题" />)

    const divider = document.querySelector(".bg-primary")
    expect(divider).toBeInTheDocument()
  })

  it("多语言字段优先返回当前语言", () => {
    render(
      <SectionHeader
        tag="TAG"
        title={{ zh: "中文标题", en: "English Title", ja: "日本語タイトル" }}
      />,
    )

    expect(screen.getByText("中文标题")).toBeInTheDocument()
    expect(screen.queryByText("English Title")).not.toBeInTheDocument()
  })
})
