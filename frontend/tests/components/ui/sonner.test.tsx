/**
 * Sonner/Toaster 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light" }),
}))

import { Toaster } from "@/components/ui/sonner"

describe("Toaster", () => {
  it("渲染不报错", () => {
    const { container } = render(<Toaster />)
    expect(container).toBeTruthy()
  })
})
