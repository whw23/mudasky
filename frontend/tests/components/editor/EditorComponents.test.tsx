/**
 * EditorPreview + HtmlSourceEditor + EditorToolbar 编辑器组件测试。
 * 验证预览渲染、源码编辑和工具栏按钮交互。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

/* mock SafeHtml（测试中直接渲染，实际使用 DOMPurify 消毒） */
vi.mock("@/components/common/SafeHtml", () => ({
  SafeHtml: ({ html, className }: { html: string; className?: string }) => {
    const props: any = { className, "data-testid": "safe-html" }
    props.dangerouslySetInnerHTML = { __html: html }
    return <div {...props} />
  },
}))

import { EditorPreview } from "@/components/editor/EditorPreview"
import { HtmlSourceEditor } from "@/components/editor/HtmlSourceEditor"
import { EditorToolbar } from "@/components/editor/EditorToolbar"

/* ─── EditorPreview ─── */

describe("EditorPreview", () => {
  it("渲染 HTML 内容", () => {
    render(<EditorPreview html="<p>预览内容</p>" />)

    const safeHtml = screen.getByTestId("safe-html")
    expect(safeHtml.textContent).toContain("预览内容")
  })

  it("应用 prose 样式类", () => {
    render(<EditorPreview html="<p>内容</p>" />)

    const safeHtml = screen.getByTestId("safe-html")
    expect(safeHtml.className).toContain("prose")
    expect(safeHtml.className).toContain("max-w-none")
  })

  it("空内容时渲染空容器", () => {
    render(<EditorPreview html="" />)

    const safeHtml = screen.getByTestId("safe-html")
    expect(safeHtml).toBeInTheDocument()
    expect(safeHtml.textContent).toBe("")
  })

  it("渲染包含标签的富文本", () => {
    render(<EditorPreview html="<h1>标题</h1><p>正文</p>" />)

    const safeHtml = screen.getByTestId("safe-html")
    expect(safeHtml.querySelector("h1")).toBeInTheDocument()
    expect(safeHtml.querySelector("p")).toBeInTheDocument()
  })
})

/* ─── HtmlSourceEditor ─── */

describe("HtmlSourceEditor", () => {
  it("渲染文本区域", () => {
    render(<HtmlSourceEditor value="<p>源码</p>" onChange={vi.fn()} />)

    const textarea = screen.getByDisplayValue("<p>源码</p>")
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe("TEXTAREA")
  })

  it("输入触发 onChange", () => {
    const onChange = vi.fn()
    render(<HtmlSourceEditor value="" onChange={onChange} />)

    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "<h1>新内容</h1>" } })

    expect(onChange).toHaveBeenCalledWith("<h1>新内容</h1>")
  })

  it("禁用拼写检查", () => {
    render(<HtmlSourceEditor value="" onChange={vi.fn()} />)

    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveAttribute("spellcheck", "false")
  })

  it("显示当前值", () => {
    render(
      <HtmlSourceEditor value="<div>测试内容</div>" onChange={vi.fn()} />,
    )

    expect(screen.getByDisplayValue("<div>测试内容</div>")).toBeInTheDocument()
  })

  it("应用等宽字体样式", () => {
    render(<HtmlSourceEditor value="" onChange={vi.fn()} />)

    const textarea = screen.getByRole("textbox")
    expect(textarea.className).toContain("font-mono")
  })
})

/* ─── EditorToolbar ─── */

/** 创建 mock 编辑器实例 */
function createMockEditor() {
  const run = vi.fn()
  const chainMethods: any = {
    focus: vi.fn(() => chainMethods),
    undo: vi.fn(() => chainMethods),
    redo: vi.fn(() => chainMethods),
    toggleBold: vi.fn(() => chainMethods),
    toggleItalic: vi.fn(() => chainMethods),
    toggleUnderline: vi.fn(() => chainMethods),
    toggleStrike: vi.fn(() => chainMethods),
    toggleHeading: vi.fn(() => chainMethods),
    setColor: vi.fn(() => chainMethods),
    toggleHighlight: vi.fn(() => chainMethods),
    toggleBulletList: vi.fn(() => chainMethods),
    toggleOrderedList: vi.fn(() => chainMethods),
    toggleTaskList: vi.fn(() => chainMethods),
    toggleBlockquote: vi.fn(() => chainMethods),
    toggleCodeBlock: vi.fn(() => chainMethods),
    setHorizontalRule: vi.fn(() => chainMethods),
    setTextAlign: vi.fn(() => chainMethods),
    toggleSuperscript: vi.fn(() => chainMethods),
    toggleSubscript: vi.fn(() => chainMethods),
    setLink: vi.fn(() => chainMethods),
    setImage: vi.fn(() => chainMethods),
    insertContent: vi.fn(() => chainMethods),
    insertTable: vi.fn(() => chainMethods),
    run,
  }

  return {
    chain: vi.fn(() => chainMethods),
    isActive: vi.fn(() => false),
    _chainMethods: chainMethods,
    _run: run,
  }
}

describe("EditorToolbar", () => {
  it("渲染源码和预览按钮", () => {
    const editor = createMockEditor()
    render(
      <EditorToolbar
        editor={editor}
        mode="edit"
        onModeChange={vi.fn()}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    expect(screen.getByTitle("sourceCode")).toBeInTheDocument()
    expect(screen.getByTitle("preview")).toBeInTheDocument()
  })

  it("点击源码按钮切换到 source 模式", () => {
    const onModeChange = vi.fn()
    const editor = createMockEditor()

    render(
      <EditorToolbar
        editor={editor}
        mode="edit"
        onModeChange={onModeChange}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle("sourceCode"))
    expect(onModeChange).toHaveBeenCalledWith("source")
  })

  it("source 模式下再点击源码按钮切回 edit", () => {
    const onModeChange = vi.fn()
    const editor = createMockEditor()

    render(
      <EditorToolbar
        editor={editor}
        mode="source"
        onModeChange={onModeChange}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle("sourceCode"))
    expect(onModeChange).toHaveBeenCalledWith("edit")
  })

  it("点击预览按钮切换到 preview 模式", () => {
    const onModeChange = vi.fn()
    const editor = createMockEditor()

    render(
      <EditorToolbar
        editor={editor}
        mode="edit"
        onModeChange={onModeChange}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle("preview"))
    expect(onModeChange).toHaveBeenCalledWith("preview")
  })

  it("preview 模式下再点击预览按钮切回 edit", () => {
    const onModeChange = vi.fn()
    const editor = createMockEditor()

    render(
      <EditorToolbar
        editor={editor}
        mode="preview"
        onModeChange={onModeChange}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle("preview"))
    expect(onModeChange).toHaveBeenCalledWith("edit")
  })

  it("edit 模式下工具栏按钮可点击", () => {
    const editor = createMockEditor()

    render(
      <EditorToolbar
        editor={editor}
        mode="edit"
        onModeChange={vi.fn()}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    /* 点击 undo 按钮 */
    fireEvent.click(screen.getByTitle("undo"))
    expect(editor.chain).toHaveBeenCalled()
  })

  it("非 edit 模式下工具栏按钮禁用", () => {
    const editor = createMockEditor()

    render(
      <EditorToolbar
        editor={editor}
        mode="source"
        onModeChange={vi.fn()}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    const undoButton = screen.getByTitle("undo")
    expect(undoButton).toBeDisabled()
  })

  it("无 editor 时按钮禁用", () => {
    render(
      <EditorToolbar
        editor={null}
        mode="edit"
        onModeChange={vi.fn()}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    /* 无 editor 时 row1Groups/row2Groups 为空数组，工具栏无按钮 */
    expect(screen.queryByTitle("undo")).not.toBeInTheDocument()
    /* 但源码和预览按钮仍在 */
    expect(screen.getByTitle("sourceCode")).toBeInTheDocument()
  })

  it("渲染两行工具栏", () => {
    const editor = createMockEditor()
    const { container } = render(
      <EditorToolbar
        editor={editor}
        mode="edit"
        onModeChange={vi.fn()}
        onImageSelect={vi.fn()}
        onVideoInsert={vi.fn()}
      />,
    )

    /* 两行由 border-t 和顶级 border-b 区分 */
    const borderT = container.querySelectorAll(".border-t")
    expect(borderT.length).toBeGreaterThanOrEqual(1)
  })
})
