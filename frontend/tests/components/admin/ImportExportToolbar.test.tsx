/**
 * ImportExportToolbar 导入导出工具栏组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

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

import api from "@/lib/api"
import { toast } from "sonner"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"

describe("ImportExportToolbar", () => {
  const defaultProps = {
    templateUrl: "/admin/template",
    importUrl: "/admin/import",
    exportUrl: "/admin/export",
    onImportPreview: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    /* mock URL.createObjectURL / revokeObjectURL */
    global.URL.createObjectURL = vi.fn(() => "blob:mock")
    global.URL.revokeObjectURL = vi.fn()
  })

  it("渲染三个按钮：下载模板、导入、导出", () => {
    render(<ImportExportToolbar {...defaultProps} />)

    expect(screen.getByText("下载模板")).toBeInTheDocument()
    expect(screen.getByText("导入")).toBeInTheDocument()
    expect(screen.getByText("导出")).toBeInTheDocument()
  })

  it("点击下载模板按钮调用 api.get", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob() })

    render(<ImportExportToolbar {...defaultProps} />)

    await userEvent.click(screen.getByText("下载模板"))

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/template", { responseType: "blob" })
    })
  })

  it("下载模板失败时显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("fail"))

    render(<ImportExportToolbar {...defaultProps} />)

    await userEvent.click(screen.getByText("下载模板"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("下载模板失败")
    })
  })

  it("点击导出按钮调用 api.get", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob() })

    render(<ImportExportToolbar {...defaultProps} />)

    await userEvent.click(screen.getByText("导出"))

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/export", { responseType: "blob" })
    })
  })

  it("导出失败时显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("fail"))

    render(<ImportExportToolbar {...defaultProps} />)

    await userEvent.click(screen.getByText("导出"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("导出失败")
    })
  })

  it("点击导入按钮触发文件选择", async () => {
    render(<ImportExportToolbar {...defaultProps} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    expect(fileInput.accept).toBe(".xlsx,.zip")
  })

  it("acceptZip=false 时只接受 .xlsx", () => {
    render(<ImportExportToolbar {...defaultProps} acceptZip={false} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput.accept).toBe(".xlsx")
  })

  it("选择文件后调用 importUrl 和 onImportPreview", async () => {
    const previewData = { items: [], errors: [], summary: {} }
    vi.mocked(api.post).mockResolvedValue({ data: previewData })

    render(<ImportExportToolbar {...defaultProps} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["data"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(defaultProps.onImportPreview).toHaveBeenCalledWith(previewData)
    })
  })

  it("导入预览失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<ImportExportToolbar {...defaultProps} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["data"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("导入预览失败")
    })
  })

  it("onFileSelect 回调在文件选择后被调用", async () => {
    const onFileSelect = vi.fn()
    vi.mocked(api.post).mockResolvedValue({ data: { items: [], errors: [], summary: {} } })

    render(<ImportExportToolbar {...defaultProps} onFileSelect={onFileSelect} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["data"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledWith(file)
    })
  })
})
