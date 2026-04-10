/**
 * Checkbox UI 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Checkbox } from "@/components/ui/checkbox"

describe("Checkbox", () => {
  it("data-slot='checkbox'", () => {
    const { container } = render(<Checkbox />)
    expect(container.querySelector("[data-slot='checkbox']")).toBeInTheDocument()
  })

  it("onCheckedChange 回调被触发", async () => {
    const onChange = vi.fn()
    const { container } = render(<Checkbox onCheckedChange={onChange} />)
    const checkbox = container.querySelector("[data-slot='checkbox']")!
    await userEvent.click(checkbox)
    expect(onChange).toHaveBeenCalled()
  })
})
