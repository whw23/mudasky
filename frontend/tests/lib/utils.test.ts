/**
 * cn() 工具函数测试。
 */

import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("无参数时返回空字符串", () => {
    expect(cn()).toBe("")
  })

  it("单个类名原样返回", () => {
    expect(cn("text-red-500")).toBe("text-red-500")
  })

  it("合并多个类名", () => {
    const result = cn("text-sm", "font-bold")
    expect(result).toContain("text-sm")
    expect(result).toContain("font-bold")
  })

  it("Tailwind 冲突时后者覆盖前者", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("条件类名：false 值被忽略", () => {
    expect(cn("base", false && "hidden")).toBe("base")
  })

  it("条件类名：true 值被保留", () => {
    const result = cn("base", true && "visible")
    expect(result).toContain("base")
    expect(result).toContain("visible")
  })

  it("undefined 和 null 被忽略", () => {
    expect(cn("base", undefined, null)).toBe("base")
  })
})
