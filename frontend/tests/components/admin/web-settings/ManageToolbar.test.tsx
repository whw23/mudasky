/**
 * ManageToolbar 管理工具浮动条组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ManageToolbar } from "@/components/admin/web-settings/ManageToolbar"

describe("ManageToolbar", () => {
  it("渲染管理工具标签", () => {
    render(
      <ManageToolbar>
        <button>操作</button>
      </ManageToolbar>,
    )

    expect(screen.getByText("管理工具")).toBeInTheDocument()
  })

  it("渲染子元素", () => {
    render(
      <ManageToolbar>
        <button>添加</button>
        <button>删除</button>
      </ManageToolbar>,
    )

    expect(screen.getByText("添加")).toBeInTheDocument()
    expect(screen.getByText("删除")).toBeInTheDocument()
  })

  it("使用 data-editable 属性", () => {
    const { container } = render(
      <ManageToolbar>
        <span>内容</span>
      </ManageToolbar>,
    )

    expect(container.querySelector("[data-editable]")).toBeTruthy()
  })

  it("渲染蓝色样式容器", () => {
    const { container } = render(
      <ManageToolbar>
        <span>工具</span>
      </ManageToolbar>,
    )

    const toolbar = container.querySelector(".bg-blue-50")
    expect(toolbar).toBeTruthy()
  })

  it("接受多个按钮作为子元素", () => {
    render(
      <ManageToolbar>
        <button>按钮1</button>
        <button>按钮2</button>
        <button>按钮3</button>
      </ManageToolbar>,
    )

    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("空子元素也能正常渲染", () => {
    render(
      <ManageToolbar>
        {null}
      </ManageToolbar>,
    )

    expect(screen.getByText("管理工具")).toBeInTheDocument()
  })
})
