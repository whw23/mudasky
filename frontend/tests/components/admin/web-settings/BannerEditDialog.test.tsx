/**
 * BannerEditDialog Banner 图片编辑弹窗组件测试。
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
import { BannerEditDialog } from "@/components/admin/web-settings/BannerEditDialog"

describe("BannerEditDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    pageKey: "home",
    imageIds: [] as string[],
    onUpdate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染弹窗标题和描述", () => {
    render(<BannerEditDialog {...defaultProps} />)

    expect(screen.getByText("编辑 Banner 图片")).toBeInTheDocument()
    expect(screen.getByText("管理页面顶部 Banner 背景图片。")).toBeInTheDocument()
  })

  it("无图片时显示默认提示", () => {
    render(<BannerEditDialog {...defaultProps} imageIds={[]} />)

    expect(screen.getByText("未设置背景图，使用默认渐变色")).toBeInTheDocument()
  })

  it("有图片时渲染图片列表", () => {
    render(<BannerEditDialog {...defaultProps} imageIds={["img1", "img2"]} />)

    const images = screen.getAllByAltText("Banner")
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute("src", "/api/public/images/detail?id=img1")
    expect(images[1]).toHaveAttribute("src", "/api/public/images/detail?id=img2")
  })

  it("显示添加图片按钮", () => {
    render(<BannerEditDialog {...defaultProps} />)

    expect(screen.getByText("添加图片")).toBeInTheDocument()
  })

  it("显示关闭按钮", () => {
    render(<BannerEditDialog {...defaultProps} />)

    expect(screen.getByText("关闭")).toBeInTheDocument()
  })

  it("点击关闭按钮调用 onOpenChange(false)", async () => {
    render(<BannerEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("关闭"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("移除图片成功后调用 onUpdate", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<BannerEditDialog {...defaultProps} imageIds={["img1"]} />)

    /* 图片旁的删除按钮 - 查找包含 img[alt=Banner] 后的 button */
    const bannerImg = screen.getByAltText("Banner")
    const deleteBtn = bannerImg.parentElement!.querySelector("button")!
    await userEvent.click(deleteBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/web-settings/banners/remove", {
        page_key: "home",
        image_id: "img1",
      })
      expect(toast.success).toHaveBeenCalledWith("已移除")
      expect(defaultProps.onUpdate).toHaveBeenCalled()
    })
  })

  it("移除失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<BannerEditDialog {...defaultProps} imageIds={["img1"]} />)

    const bannerImg = screen.getByAltText("Banner")
    const deleteBtn = bannerImg.parentElement!.querySelector("button")!
    await userEvent.click(deleteBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("移除失败")
    })
  })

  it("未 open 时不渲染内容", () => {
    render(<BannerEditDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("编辑 Banner 图片")).not.toBeInTheDocument()
  })

  it("显示 Banner 背景图标签", () => {
    render(<BannerEditDialog {...defaultProps} />)

    expect(screen.getByText("Banner 背景图")).toBeInTheDocument()
  })
})
