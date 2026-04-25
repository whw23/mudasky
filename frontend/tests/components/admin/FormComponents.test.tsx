/**
 * 小型表单组件集合测试。
 * 包含 ArrayFieldRenderer、NestedItemsField、LocalizedInput、
 * LanguageCapsule、ImageUploadField、PreviewContainer、EditableOverlay。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
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

/* ========== LocalizedInput ========== */
import { LocalizedInput } from "@/components/admin/LocalizedInput"

describe("LocalizedInput", () => {
  it("渲染所有语言的输入框", () => {
    const onChange = vi.fn()
    render(
      <LocalizedInput
        value={{ zh: "中文值", en: "English", ja: "", de: "" }}
        onChange={onChange}
        label="标题"
      />,
    )

    expect(screen.getByText("标题")).toBeInTheDocument()
    expect(screen.getByDisplayValue("中文值")).toBeInTheDocument()
    expect(screen.getByDisplayValue("English")).toBeInTheDocument()
  })

  it("字符串值标准化为多语言对象", () => {
    const onChange = vi.fn()
    render(
      <LocalizedInput value="纯字符串" onChange={onChange} label="名称" />,
    )

    expect(screen.getByDisplayValue("纯字符串")).toBeInTheDocument()
  })

  it("修改语言值触发 onChange", async () => {
    const onChange = vi.fn()
    render(
      <LocalizedInput
        value={{ zh: "", en: "", ja: "", de: "" }}
        onChange={onChange}
        label="描述"
      />,
    )

    /* 中文输入框（第一个空 input） */
    const inputs = screen.getAllByRole("textbox")
    await userEvent.type(inputs[0], "新值")

    expect(onChange).toHaveBeenCalled()
  })

  it("multiline 模式渲染 textarea", () => {
    const onChange = vi.fn()
    render(
      <LocalizedInput
        value={{ zh: "", en: "", ja: "", de: "" }}
        onChange={onChange}
        label="内容"
        multiline
        rows={5}
      />,
    )

    const textareas = screen.getAllByRole("textbox")
    expect(textareas.length).toBeGreaterThan(0)
  })

  it("单语言模式只显示指定语言", () => {
    const onChange = vi.fn()
    render(
      <LocalizedInput
        value={{ zh: "中文", en: "EN", ja: "JA", de: "DE" }}
        onChange={onChange}
        label="标题"
        locale="en"
      />,
    )

    expect(screen.getByDisplayValue("EN")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("中文")).not.toBeInTheDocument()
  })
})

/* ========== LanguageCapsule ========== */
import { LanguageCapsule } from "@/components/admin/LanguageCapsule"

describe("LanguageCapsule", () => {
  it("渲染所有语言按钮", () => {
    const onChange = vi.fn()
    render(<LanguageCapsule value="zh" onChange={onChange} />)

    expect(screen.getByText("中文")).toBeInTheDocument()
    expect(screen.getByText("EN")).toBeInTheDocument()
    expect(screen.getByText("JA")).toBeInTheDocument()
    expect(screen.getByText("DE")).toBeInTheDocument()
  })

  it("当前选中语言有高亮样式", () => {
    const onChange = vi.fn()
    render(<LanguageCapsule value="zh" onChange={onChange} />)

    const zhBtn = screen.getByText("中文")
    expect(zhBtn.className).toContain("bg-primary")
  })

  it("点击语言按钮触发 onChange", async () => {
    const onChange = vi.fn()
    render(<LanguageCapsule value="zh" onChange={onChange} />)

    await userEvent.click(screen.getByText("EN"))
    expect(onChange).toHaveBeenCalledWith("en")
  })

  it("非选中语言无高亮样式", () => {
    const onChange = vi.fn()
    render(<LanguageCapsule value="zh" onChange={onChange} />)

    const enBtn = screen.getByText("EN")
    expect(enBtn.className).not.toContain("bg-primary")
  })
})

/* ========== ImageUploadField ========== */
import { ImageUploadField } from "@/components/admin/ImageUploadField"

describe("ImageUploadField", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("无图片时显示上传按钮", () => {
    const onChange = vi.fn()
    render(<ImageUploadField label="封面图" imageId="" onChange={onChange} />)

    expect(screen.getByText("封面图")).toBeInTheDocument()
    expect(screen.getByText("上传图片")).toBeInTheDocument()
  })

  it("有图片时显示预览", () => {
    const onChange = vi.fn()
    render(<ImageUploadField label="封面图" imageId="img123" onChange={onChange} />)

    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("src", "/api/public/images/detail?id=img123")
  })

  it("有图片时点击删除清空 imageId", async () => {
    const onChange = vi.fn()
    render(<ImageUploadField label="封面图" imageId="img123" onChange={onChange} />)

    /* 删除按钮（X 图标） */
    const deleteBtn = screen.getByRole("button")
    await userEvent.click(deleteBtn)

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("上传成功后调用 onChange", async () => {
    const onChange = vi.fn()
    vi.mocked(api.post).mockResolvedValue({ data: { id: "new-img-id" } })
    render(<ImageUploadField label="封面图" imageId="" onChange={onChange} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["test"], "test.png", { type: "image/png" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(onChange).toHaveBeenCalledWith("new-img-id")
      expect(toast.success).toHaveBeenCalledWith("上传成功")
    })
  })

  it("上传失败显示错误提示", async () => {
    const onChange = vi.fn()
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))
    render(<ImageUploadField label="封面图" imageId="" onChange={onChange} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["test"], "test.png", { type: "image/png" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("上传失败")
    })
  })
})

/* ========== NestedItemsField ========== */
import { NestedItemsField } from "@/components/admin/NestedItemsField"

describe("NestedItemsField", () => {
  it("无条目时显示空提示", () => {
    const onChange = vi.fn()
    render(<NestedItemsField label="子项" items={[]} onChange={onChange} />)

    expect(screen.getByText("暂无条目")).toBeInTheDocument()
  })

  it("有条目时渲染列表", () => {
    const onChange = vi.fn()
    const items = [
      { zh: "项目A", en: "", ja: "", de: "" },
      { zh: "项目B", en: "", ja: "", de: "" },
    ]
    render(<NestedItemsField label="子项" items={items} onChange={onChange} />)

    expect(screen.getByText("子项 1")).toBeInTheDocument()
    expect(screen.getByText("子项 2")).toBeInTheDocument()
  })

  it("点击添加按钮增加空条目", async () => {
    const onChange = vi.fn()
    render(<NestedItemsField label="子项" items={[]} onChange={onChange} />)

    await userEvent.click(screen.getByText("添加子项"))

    expect(onChange).toHaveBeenCalledWith([
      { zh: "", en: "", ja: "", de: "" },
    ])
  })

  it("点击删除按钮移除条目", async () => {
    const onChange = vi.fn()
    const items = [{ zh: "项目A", en: "", ja: "", de: "" }]
    render(<NestedItemsField label="子项" items={items} onChange={onChange} />)

    /* 找到 X 按钮 */
    const removeBtn = screen.getAllByRole("button").find(
      (btn) => btn.className.includes("hover:text-destructive"),
    )
    if (removeBtn) {
      await userEvent.click(removeBtn)
      expect(onChange).toHaveBeenCalledWith([])
    }
  })
})

/* ========== PreviewContainer ========== */
import { PreviewContainer } from "@/components/admin/PreviewContainer"

describe("PreviewContainer", () => {
  it("渲染子元素", () => {
    render(
      <PreviewContainer>
        <p>预览内容</p>
      </PreviewContainer>,
    )
    expect(screen.getByText("预览内容")).toBeInTheDocument()
  })

  it("拦截链接点击", () => {
    const preventDefault = vi.fn()
    render(
      <PreviewContainer>
        <a href="/test">测试链接</a>
      </PreviewContainer>,
    )

    const link = screen.getByText("测试链接")
    fireEvent.click(link, { preventDefault })
    /* 链接不应该实际导航 */
  })

  it("data-editable 元素不被拦截", () => {
    const onClick = vi.fn()
    render(
      <PreviewContainer>
        <div data-editable onClick={onClick}>可编辑</div>
      </PreviewContainer>,
    )

    fireEvent.click(screen.getByText("可编辑"))
    expect(onClick).toHaveBeenCalled()
  })

  it("支持自定义 className", () => {
    const { container } = render(
      <PreviewContainer className="custom-class">
        <p>内容</p>
      </PreviewContainer>,
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })
})

/* ========== EditableOverlay ========== */
import { EditableOverlay } from "@/components/admin/EditableOverlay"

describe("EditableOverlay", () => {
  it("渲染子元素", () => {
    const onClick = vi.fn()
    render(
      <EditableOverlay onClick={onClick}>
        <span>可编辑内容</span>
      </EditableOverlay>,
    )
    expect(screen.getByText("可编辑内容")).toBeInTheDocument()
  })

  it("点击触发 onClick", async () => {
    const onClick = vi.fn()
    render(
      <EditableOverlay onClick={onClick}>
        <span>点击我</span>
      </EditableOverlay>,
    )

    await userEvent.click(screen.getByText("点击我"))
    expect(onClick).toHaveBeenCalled()
  })

  it("inline 模式使用 span 标签", () => {
    const onClick = vi.fn()
    const { container } = render(
      <EditableOverlay onClick={onClick} inline>
        <span>行内</span>
      </EditableOverlay>,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe("SPAN")
  })

  it("非 inline 模式使用 div 标签", () => {
    const onClick = vi.fn()
    const { container } = render(
      <EditableOverlay onClick={onClick}>
        <span>块级</span>
      </EditableOverlay>,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe("DIV")
  })

  it("支持 label 作为 title 属性", () => {
    const onClick = vi.fn()
    const { container } = render(
      <EditableOverlay onClick={onClick} label="编辑标题">
        <span>内容</span>
      </EditableOverlay>,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveAttribute("title", "编辑标题")
  })
})

/* ========== ArrayFieldRenderer ========== */
import { ArrayFieldRenderer } from "@/components/admin/ArrayFieldRenderer"

describe("ArrayFieldRenderer", () => {
  const onUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("radio 类型返回 null", () => {
    const { container } = render(
      <ArrayFieldRenderer
        item={{ featured: true }}
        index={0}
        field={{ key: "featured", label: "推荐", type: "radio", localized: false }}
        onUpdate={onUpdate}
      />,
    )
    expect(container.innerHTML).toBe("")
  })

  it("text 类型渲染 Input", () => {
    render(
      <ArrayFieldRenderer
        item={{ title: "测试标题" }}
        index={0}
        field={{ key: "title", label: "标题", type: "text", localized: false }}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByText("标题")).toBeInTheDocument()
    expect(screen.getByDisplayValue("测试标题")).toBeInTheDocument()
  })

  it("textarea 类型渲染 Textarea", () => {
    render(
      <ArrayFieldRenderer
        item={{ desc: "描述内容" }}
        index={0}
        field={{ key: "desc", label: "描述", type: "textarea", localized: false }}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByText("描述")).toBeInTheDocument()
    expect(screen.getByDisplayValue("描述内容")).toBeInTheDocument()
  })

  it("text 输入变化触发 onUpdate", async () => {
    render(
      <ArrayFieldRenderer
        item={{ title: "" }}
        index={0}
        field={{ key: "title", label: "标题", type: "text", localized: false }}
        onUpdate={onUpdate}
      />,
    )

    const input = screen.getByRole("textbox")
    await userEvent.type(input, "A")

    expect(onUpdate).toHaveBeenCalledWith(0, "title", "A")
  })

  it("localized 字段渲染 LocalizedInput", () => {
    render(
      <ArrayFieldRenderer
        item={{ name: { zh: "中文名", en: "", ja: "", de: "" } }}
        index={0}
        field={{ key: "name", label: "名称", type: "text", localized: true }}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByText("名称")).toBeInTheDocument()
    expect(screen.getByDisplayValue("中文名")).toBeInTheDocument()
  })
})
