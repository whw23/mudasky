/**
 * PageBlocksPreview 页面区块统一预览组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Block } from "@/types/block"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "zh",
}))

/* mock 拖拽库 */
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Droppable: ({
    children,
  }: {
    children: (p: any) => React.ReactNode
  }) =>
    children({
      innerRef: vi.fn(),
      droppableProps: {},
      placeholder: null,
    }),
  Draggable: ({
    children,
  }: {
    children: (p: any, s: any) => React.ReactNode
  }) =>
    children(
      {
        innerRef: vi.fn(),
        draggableProps: { style: {} },
        dragHandleProps: {},
      },
      { isDragging: false },
    ),
}))

/* mock 子组件 */
vi.mock("@/components/blocks/BlockRenderer", () => ({
  BlockRenderer: () => <div data-testid="block-renderer" />,
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({
    children,
    label,
  }: {
    children: React.ReactNode
    label: string
  }) => <div data-testid={`editable-overlay-${label}`}>{children}</div>,
}))

vi.mock("@/components/layout/PageBanner", () => ({
  PageBanner: ({ title }: { title: string }) => (
    <div data-testid="page-banner">{title}</div>
  ),
}))

vi.mock("@/components/home/HomeBanner", () => ({
  HomeBanner: () => <div data-testid="home-banner" />,
}))

vi.mock("@/contexts/ConfigContext", () => ({
  useConfig: () => ({
    pageBlocks: {
      home: [
        {
          id: "b1",
          type: "intro",
          showTitle: true,
          sectionTag: "TAG",
          sectionTitle: { zh: "标题" },
          bgColor: "white",
          options: {},
          data: { content: { zh: "内容" } },
        },
      ],
      about: [],
    },
    refreshConfig: vi.fn(),
  }),
}))

vi.mock("@/components/admin/web-settings/AddBlockDialog", () => ({
  AddBlockDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-block-dialog" /> : null,
}))

vi.mock("@/components/admin/web-settings/UnifiedBlockEditor", () => ({
  UnifiedBlockEditor: ({ open }: { open: boolean }) =>
    open ? <div data-testid="unified-block-editor" /> : null,
}))

vi.mock("@/components/admin/web-settings/BlockEditorOverlay", () => ({
  BlockEditorOverlay: ({
    children,
    block,
  }: {
    children: React.ReactNode
    block: Block
  }) => (
    <div data-testid={`overlay-${block.id}`}>{children}</div>
  ),
}))

import { PageBlocksPreview } from "@/components/admin/web-settings/PageBlocksPreview"

describe("PageBlocksPreview", () => {
  const defaultProps = {
    pageSlug: "home",
    onBannerEdit: vi.fn(),
    onEditConfig: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染首页 HomeBanner", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="home" />)

    expect(screen.getByTestId("home-banner")).toBeInTheDocument()
  })

  it("渲染 Block 编辑覆盖层", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="home" />)

    expect(screen.getByTestId("overlay-b1")).toBeInTheDocument()
  })

  it("渲染 BlockRenderer", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="home" />)

    expect(screen.getByTestId("block-renderer")).toBeInTheDocument()
  })

  it("空页面不渲染 Block", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="about" />)

    expect(screen.queryByTestId("overlay-b1")).not.toBeInTheDocument()
  })

  it("渲染添加模组按钮", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="home" />)

    const addButtons = screen.getAllByText("添加模组")
    /* 至少有 1 个末尾插入点 + block 之间的插入点 */
    expect(addButtons.length).toBeGreaterThanOrEqual(1)
  })

  it("about 页面渲染 PageBanner", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="about" />)

    expect(screen.getByTestId("page-banner")).toBeInTheDocument()
  })

  it("home 页面不渲染 PageBanner", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="home" />)

    expect(screen.queryByTestId("page-banner")).not.toBeInTheDocument()
  })

  it("about 页面不渲染 HomeBanner", () => {
    render(<PageBlocksPreview {...defaultProps} pageSlug="about" />)

    expect(screen.queryByTestId("home-banner")).not.toBeInTheDocument()
  })
})
