/**
 * ConfigEditDialog 配置编辑弹窗组件测试。
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

vi.mock("@/components/admin/LocalizedInput", () => ({
  LocalizedInput: ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: string | Record<string, string>
    onChange: (v: Record<string, string>) => void
  }) => (
    <div data-testid={`localized-${label}`}>
      <span>{label}</span>
      <input
        data-testid={`localized-input-${label}`}
        value={typeof value === "string" ? value : value?.zh ?? ""}
        onChange={(e) => onChange({ zh: e.target.value, en: "", ja: "", de: "" })}
      />
    </div>
  ),
}))

import { toast } from "sonner"
import { ConfigEditDialog } from "@/components/admin/ConfigEditDialog"

describe("ConfigEditDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "编辑联系信息",
    fields: [
      { key: "phone", label: "电话", type: "text" as const, localized: false },
      { key: "email", label: "邮箱", type: "text" as const, localized: false },
    ],
    data: { phone: "010-12345678", email: "test@example.com" },
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onSave = vi.fn().mockResolvedValue(undefined)
  })

  it("渲染标题和描述", () => {
    render(<ConfigEditDialog {...defaultProps} />)

    expect(screen.getByText("编辑联系信息")).toBeInTheDocument()
    expect(screen.getByText("编辑配置项，中文字段为必填。")).toBeInTheDocument()
  })

  it("渲染文本输入字段并显示数据", () => {
    render(<ConfigEditDialog {...defaultProps} />)

    expect(screen.getByText("电话")).toBeInTheDocument()
    expect(screen.getByText("邮箱")).toBeInTheDocument()
    expect(screen.getByDisplayValue("010-12345678")).toBeInTheDocument()
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument()
  })

  it("渲染 textarea 类型字段", () => {
    const props = {
      ...defaultProps,
      fields: [
        { key: "address", label: "地址", type: "textarea" as const, localized: false, rows: 3 },
      ],
      data: { address: "北京市海淀区" },
    }

    render(<ConfigEditDialog {...props} />)

    expect(screen.getByText("地址")).toBeInTheDocument()
    expect(screen.getByDisplayValue("北京市海淀区")).toBeInTheDocument()
  })

  it("渲染多语言字段使用 LocalizedInput", () => {
    const props = {
      ...defaultProps,
      fields: [
        { key: "brand_name", label: "品牌名", type: "text" as const, localized: true },
      ],
      data: { brand_name: { zh: "慕大教育", en: "Muda Education" } },
    }

    render(<ConfigEditDialog {...props} />)

    expect(screen.getByTestId("localized-品牌名")).toBeInTheDocument()
  })

  it("渲染图片上传字段", () => {
    const props = {
      ...defaultProps,
      fields: [
        { key: "logo_url", label: "Logo", type: "image" as const, localized: false },
      ],
      data: { logo_url: "https://example.com/logo.png" },
    }

    render(<ConfigEditDialog {...props} />)

    expect(screen.getByText("Logo")).toBeInTheDocument()
    /* 图片上传按钮 */
    expect(screen.getByText("上传")).toBeInTheDocument()
    /* 清除按钮（有图片值时显示） */
    expect(screen.getByText("清除")).toBeInTheDocument()
  })

  it("保存按钮调用 onSave", async () => {
    render(<ConfigEditDialog {...defaultProps} />)

    const saveBtn = screen.getByText("保存")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "010-12345678", email: "test@example.com" }),
      )
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("保存失败显示错误提示", async () => {
    defaultProps.onSave = vi.fn().mockRejectedValue(new Error("fail"))

    render(<ConfigEditDialog {...defaultProps} />)

    const saveBtn = screen.getByText("保存")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("保存失败")
    })
  })

  it("取消按钮关闭弹窗", async () => {
    render(<ConfigEditDialog {...defaultProps} />)

    const cancelBtn = screen.getByText("取消")
    await userEvent.click(cancelBtn)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("未 open 时不渲染内容", () => {
    render(<ConfigEditDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("编辑联系信息")).not.toBeInTheDocument()
  })

  it("多语言字段中文为空时保存触发错误", async () => {
    const props = {
      ...defaultProps,
      fields: [
        { key: "brand_name", label: "品牌名", type: "text" as const, localized: true },
      ],
      data: { brand_name: { zh: "", en: "Brand" } },
    }

    render(<ConfigEditDialog {...props} />)

    const saveBtn = screen.getByText("保存")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("品牌名（中文）不能为空")
    })
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })
})
