/**
 * DocumentUpload 组件测试。
 * 验证文档上传对话框的渲染、文件类型校验和分类选择。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { DocumentUpload } from "@/components/user/DocumentUpload"
import api from "@/lib/api"
import { toast } from "sonner"

describe("DocumentUpload", () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染上传按钮", () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    expect(screen.getByText("upload")).toBeInTheDocument()
  })

  it("点击上传按钮打开对话框", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    expect(screen.getByText("uploadTitle")).toBeInTheDocument()
    expect(screen.getByText("uploadDesc")).toBeInTheDocument()
  })

  it("对话框内显示文件选择区域和分类选择器", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    expect(screen.getByText("selectFile")).toBeInTheDocument()
    expect(screen.getByText("dragDrop")).toBeInTheDocument()
    expect(screen.getByText("acceptedTypes")).toBeInTheDocument()
    expect(screen.getByText("category")).toBeInTheDocument()
  })

  it("无文件时上传按钮禁用", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    /* 对话框内的上传按钮（第二个 upload 文本） */
    const uploadButtons = screen.getAllByText("upload")
    const dialogUploadBtn = uploadButtons[uploadButtons.length - 1]
    expect(dialogUploadBtn.closest("button")).toBeDisabled()
  })

  it("选择合法文件后显示文件名", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    const file = new File(["content"], "test.pdf", { type: "application/pdf" })
    const input = document.querySelector("input[type='file']") as HTMLInputElement
    expect(input).toBeTruthy()

    await userEvent.upload(input, file)

    expect(screen.getByText("test.pdf")).toBeInTheDocument()
  })

  it("选择非法文件类型时显示错误提示", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    const file = new File(["content"], "test.exe", { type: "application/octet-stream" })
    const input = document.querySelector("input[type='file']") as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("invalidFileType")
  })

  it("上传成功后调用 onSuccess 回调", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    /* 选择文件 */
    const file = new File(["content"], "test.pdf", { type: "application/pdf" })
    const input = document.querySelector("input[type='file']") as HTMLInputElement
    await userEvent.upload(input, file)

    /* 点击上传 */
    const uploadButtons = screen.getAllByText("upload")
    const dialogUploadBtn = uploadButtons[uploadButtons.length - 1]
    await userEvent.click(dialogUploadBtn)

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      "/portal/documents/list/upload",
      expect.any(FormData),
    )
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("uploadSuccess")
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it("上传失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    const file = new File(["content"], "test.pdf", { type: "application/pdf" })
    const input = document.querySelector("input[type='file']") as HTMLInputElement
    await userEvent.upload(input, file)

    const uploadButtons = screen.getAllByText("upload")
    const dialogUploadBtn = uploadButtons[uploadButtons.length - 1]
    await userEvent.click(dialogUploadBtn)

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("uploadError")
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it("拖拽合法文件到上传区域", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    const dropZone = screen.getByText("selectFile").closest("div")!
    const file = new File(["content"], "doc.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })

    fireEvent.dragOver(dropZone, { dataTransfer: { files: [file] } })
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } })

    expect(screen.getByText("doc.docx")).toBeInTheDocument()
  })

  it("拖拽非法文件时显示错误提示", async () => {
    render(<DocumentUpload onSuccess={mockOnSuccess} />)

    await userEvent.click(screen.getByText("upload"))

    const dropZone = screen.getByText("selectFile").closest("div")!
    const file = new File(["content"], "virus.exe", {
      type: "application/octet-stream",
    })

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } })

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("invalidFileType")
  })
})
