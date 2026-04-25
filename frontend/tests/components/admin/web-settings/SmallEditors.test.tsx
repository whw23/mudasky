/**
 * 小型编辑器组件测试。
 * 覆盖 BlockContentTab, BlockTypeFields（直接测试，不 mock）。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Block } from "@/types/block"

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

/* mock LocalizedInput */
vi.mock("@/components/admin/LocalizedInput", () => ({
  LocalizedInput: ({
    label,
    value,
  }: {
    label: string
    value: any
  }) => (
    <div data-testid={`localized-input-${label}`}>
      {label}: {typeof value === "string" ? value : JSON.stringify(value)}
    </div>
  ),
}))

/* mock ArrayFieldRenderer */
vi.mock("@/components/admin/ArrayFieldRenderer", () => ({
  ArrayFieldRenderer: ({ field }: { field: { key: string; label: string } }) => (
    <div data-testid={`array-field-${field.key}`}>{field.label}</div>
  ),
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

/* ================================================================
   BlockContentTab
   ================================================================ */

import {
  BlockContentTab,
  getBlockEditType,
} from "@/components/admin/web-settings/BlockContentTab"

describe("BlockContentTab", () => {
  it("intro 类型渲染简单字段表单", () => {
    render(
      <BlockContentTab
        block={mockBlock({ type: "intro" })}
        locale="zh"
        data={{ content: { zh: "测试" } }}
        onDataChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId("localized-input-内容")).toBeInTheDocument()
  })

  it("cta 类型渲染标题和描述字段", () => {
    render(
      <BlockContentTab
        block={mockBlock({ type: "cta" })}
        locale="zh"
        data={{ title: { zh: "T" }, desc: { zh: "D" } }}
        onDataChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId("localized-input-标题")).toBeInTheDocument()
    expect(screen.getByTestId("localized-input-描述")).toBeInTheDocument()
  })

  it("article_list（API 类型）返回 null", () => {
    const { container } = render(
      <BlockContentTab
        block={mockBlock({ type: "article_list" })}
        locale="zh"
        data={null}
        onDataChange={vi.fn()}
      />,
    )

    expect(container.innerHTML).toBe("")
  })

  it("step_list 类型渲染数组条目列表", () => {
    render(
      <BlockContentTab
        block={mockBlock({ type: "step_list" })}
        locale="zh"
        data={[{ title: { zh: "步骤1" }, desc: { zh: "描述1" } }]}
        onDataChange={vi.fn()}
      />,
    )

    expect(screen.getByText("条目 1")).toBeInTheDocument()
    expect(screen.getByText("添加条目")).toBeInTheDocument()
  })

  it("数组类型显示添加条目按钮", () => {
    render(
      <BlockContentTab
        block={mockBlock({ type: "doc_list" })}
        locale="zh"
        data={[]}
        onDataChange={vi.fn()}
      />,
    )

    expect(screen.getByText("添加条目")).toBeInTheDocument()
  })

  it("点击添加条目调用 onDataChange", async () => {
    const onDataChange = vi.fn()
    render(
      <BlockContentTab
        block={mockBlock({ type: "doc_list" })}
        locale="zh"
        data={[]}
        onDataChange={onDataChange}
      />,
    )

    await userEvent.click(screen.getByText("添加条目"))

    expect(onDataChange).toHaveBeenCalledWith([{ text: "" }])
  })
})

describe("getBlockEditType", () => {
  it.each([
    ["intro", "simple"], ["cta", "simple"],
    ["card_grid", "array"], ["step_list", "array"],
    ["doc_list", "array"], ["gallery", "array"],
    ["article_list", "api"], ["university_list", "api"],
    ["case_grid", "api"],
  ] as const)("%s 返回 %s", (type, expected) => {
    expect(getBlockEditType(type)).toBe(expected)
  })
})

/* ================================================================
   TypeSpecificFields (BlockTypeFields)
   ================================================================ */

import { TypeSpecificFields } from "@/components/admin/web-settings/BlockTypeFields"

describe("TypeSpecificFields", () => {
  it("card_grid 类型渲染卡片网格选项", () => {
    render(
      <TypeSpecificFields
        type="card_grid"
        options={{ cardType: "guide", maxColumns: 3 }}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(screen.getByText("卡片网格选项")).toBeInTheDocument()
    expect(screen.getByText("卡片类型")).toBeInTheDocument()
    expect(screen.getByText("最大列数")).toBeInTheDocument()
  })

  it("doc_list 类型渲染图标名称输入", () => {
    render(
      <TypeSpecificFields
        type="doc_list"
        options={{ iconName: "FileText" }}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(screen.getByText("文档清单选项")).toBeInTheDocument()
    expect(screen.getByLabelText("图标名称")).toBeInTheDocument()
  })

  it("article_list 类型渲染分类标识输入", () => {
    render(
      <TypeSpecificFields
        type="article_list"
        options={{ categorySlug: "news" }}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(screen.getByText("文章列表选项")).toBeInTheDocument()
    expect(screen.getByLabelText("分类标识")).toBeInTheDocument()
  })

  it("featured_data 类型渲染数据类型和最大数量", () => {
    render(
      <TypeSpecificFields
        type="featured_data"
        options={{ dataType: "universities", maxItems: 6 }}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(screen.getByText("精选展示选项")).toBeInTheDocument()
    expect(screen.getByText("数据类型")).toBeInTheDocument()
    expect(screen.getByLabelText("最大数量")).toBeInTheDocument()
  })

  it("cta 类型渲染样式和按钮链接", () => {
    render(
      <TypeSpecificFields
        type="cta"
        options={{ variant: "border-t", link: "/about" }}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(screen.getByText("行动号召选项")).toBeInTheDocument()
    expect(screen.getByText("样式")).toBeInTheDocument()
    expect(screen.getByLabelText("按钮链接")).toBeInTheDocument()
  })

  it("contact_info 类型渲染联系信息选项", () => {
    render(
      <TypeSpecificFields
        type="contact_info"
        options={{}}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(screen.getByText("联系信息选项")).toBeInTheDocument()
  })

  it("intro 类型返回 null", () => {
    const { container } = render(
      <TypeSpecificFields
        type="intro"
        options={{}}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(container.innerHTML).toBe("")
  })

  it("gallery 类型返回 null", () => {
    const { container } = render(
      <TypeSpecificFields
        type="gallery"
        options={{}}
        onUpdateOption={vi.fn()}
      />,
    )

    expect(container.innerHTML).toBe("")
  })
})
