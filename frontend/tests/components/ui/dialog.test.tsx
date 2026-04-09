/**
 * Dialog UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

describe("Dialog", () => {
  it("open 时渲染内容", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标题</DialogTitle>
            <DialogDescription>描述</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByText("标题")).toBeInTheDocument()
    expect(screen.getByText("描述")).toBeInTheDocument()
  })

  it("未 open 时不渲染内容", () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>隐藏标题</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByText("隐藏标题")).not.toBeInTheDocument()
  })
})
