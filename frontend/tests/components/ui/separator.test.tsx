/**
 * Separator UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Separator } from "@/components/ui/separator"

describe("Separator", () => {
  it("默认 horizontal 方向", () => {
    const { container } = render(<Separator />)
    const el = container.querySelector("[data-slot='separator']")!
    expect(el).toBeInTheDocument()
  })

  it("className 合并", () => {
    const { container } = render(<Separator className="my-sep" />)
    const el = container.querySelector("[data-slot='separator']")!
    expect(el.className).toContain("my-sep")
  })
})
