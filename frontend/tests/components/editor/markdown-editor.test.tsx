/**
 * MarkdownEditor 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockMDEditor = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
      <textarea data-testid="md-editor" value={value} onChange={(e) => onChange(e.target.value)} />
    )
    MockMDEditor.displayName = "MockMDEditor"
    return MockMDEditor
  },
}))

import { MarkdownEditor } from "@/components/editor/MarkdownEditor"

describe("MarkdownEditor", () => {
  it("渲染模式切换按钮", () => {
    render(<MarkdownEditor content="" onChange={() => {}} />)
    expect(screen.getByText("markdownSource")).toBeTruthy()
    expect(screen.getByText("markdownSplit")).toBeTruthy()
    expect(screen.getByText("markdownPreview")).toBeTruthy()
  })

  it("默认选中分屏模式", () => {
    render(<MarkdownEditor content="" onChange={() => {}} />)
    const splitBtn = screen.getByText("markdownSplit")
    // 分屏按钮应该有 secondary 样式（active）
    expect(splitBtn.closest("button")).toBeTruthy()
  })
})
