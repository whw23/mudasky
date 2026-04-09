/**
 * Switch UI 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Switch } from "@/components/ui/switch"

describe("Switch", () => {
  it("渲染 role='switch'", () => {
    render(<Switch />)
    expect(screen.getByRole("switch")).toBeInTheDocument()
  })

  it("checked 状态反映在 aria-checked", () => {
    render(<Switch checked={true} />)
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  })

  it("点击触发 onCheckedChange", async () => {
    const onChange = vi.fn()
    render(<Switch onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("disabled 时不可点击", () => {
    render(<Switch disabled />)
    expect(screen.getByRole("switch")).toBeDisabled()
  })
})
