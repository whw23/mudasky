/**
 * UnifiedBlockEditor 统一区块编辑弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Block } from "@/types/block"

vi.mock("@/lib/i18n-config", () => ({
  CONFIG_LOCALES: [
    { code: "zh", label: "中文" },
    { code: "en", label: "English" },
  ],
  getLocalizedValue: (val: string | Record<string, string>) => {
    if (typeof val === "string") return val
    return val.zh ?? val.en ?? Object.values(val)[0] ?? ""
  },
}))

/* mock 子组件 */
vi.mock("@/components/admin/LocalizedInput", () => ({
  LocalizedInput: ({ label }: { label: string }) => (
    <div data-testid={`localized-input-${label}`}>{label}</div>
  ),
}))

vi.mock("@/components/admin/LanguageCapsule", () => ({
  LanguageCapsule: () => <div data-testid="language-capsule" />,
}))

vi.mock("@/components/admin/web-settings/BlockContentTab", () => ({
  BlockContentTab: () => <div data-testid="block-content-tab" />,
  getBlockEditType: (type: string) => {
    if (type === "intro" || type === "cta") return "simple"
    if (
      type === "card_grid" ||
      type === "step_list" ||
      type === "doc_list" ||
      type === "gallery"
    )
      return "array"
    return "api"
  },
}))

vi.mock("@/components/admin/web-settings/BlockTypeFields", () => ({
  TypeSpecificFields: () => <div data-testid="type-specific-fields" />,
}))

/** 构造测试用 Block */
function mockBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "test-block",
    type: "intro",
    showTitle: true,
    sectionTag: "TAG",
    sectionTitle: { zh: "标题" },
    bgColor: "white",
    options: {},
    data: { content: { zh: "内容" } },
    ...overrides,
  }
}

import { UnifiedBlockEditor } from "@/components/admin/web-settings/UnifiedBlockEditor"

describe("UnifiedBlockEditor", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    block: mockBlock(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染编辑弹窗标题", () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    expect(screen.getByText("编辑 介绍")).toBeInTheDocument()
  })

  it("渲染描述文本", () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    expect(screen.getByText("修改区块的显示配置和内容")).toBeInTheDocument()
  })

  it("渲染语言切换胶囊", () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    expect(screen.getByTestId("language-capsule")).toBeInTheDocument()
  })

  it("渲染显示配置和内容编辑 Tab", () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    expect(screen.getByText("显示配置")).toBeInTheDocument()
    expect(screen.getByText("内容编辑")).toBeInTheDocument()
  })

  it("渲染保存和取消按钮", () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    expect(screen.getByText("保存")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("取消按钮关闭弹窗", async () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("block 为 null 时不渲染", () => {
    render(<UnifiedBlockEditor {...defaultProps} block={null} />)

    expect(screen.queryByText("编辑 介绍")).not.toBeInTheDocument()
  })

  it("未 open 时不渲染内容", () => {
    render(<UnifiedBlockEditor {...defaultProps} open={false} />)

    expect(screen.queryByText("编辑 介绍")).not.toBeInTheDocument()
  })

  it("API 驱动类型禁用内容编辑 Tab", () => {
    render(
      <UnifiedBlockEditor
        {...defaultProps}
        block={mockBlock({ type: "article_list" })}
      />,
    )

    const contentTab = screen.getByText("内容编辑")
    expect(contentTab).toBeDisabled()
  })

  it("card_grid 类型显示卡片网格标题", () => {
    render(
      <UnifiedBlockEditor
        {...defaultProps}
        block={mockBlock({ type: "card_grid" })}
      />,
    )

    expect(screen.getByText("编辑 卡片网格")).toBeInTheDocument()
  })

  it("保存按钮调用 onSave 并关闭弹窗", async () => {
    render(<UnifiedBlockEditor {...defaultProps} />)

    await userEvent.click(screen.getByText("保存"))

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-block",
        type: "intro",
      }),
    )
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("API 驱动类型显示内容管理提示", async () => {
    render(
      <UnifiedBlockEditor
        {...defaultProps}
        block={mockBlock({ type: "article_list" })}
      />,
    )

    /* 切换到显示配置 tab（默认即为 config tab）*/
    await userEvent.click(screen.getByText("显示配置"))

    expect(
      screen.getByText(/内容通过预览页面中的管理工具栏直接编辑/),
    ).toBeInTheDocument()
  })
})
