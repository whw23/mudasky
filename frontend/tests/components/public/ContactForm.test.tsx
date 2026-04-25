/**
 * ContactForm 联系表单组件测试。
 * 验证表单字段、提交按钮和"即将推出"提示渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import { ContactForm } from "@/components/public/ContactForm"

describe("ContactForm", () => {
  it("渲染表单标题", () => {
    render(<ContactForm />)

    expect(screen.getByText("formTitle")).toBeInTheDocument()
  })

  it("渲染表单描述", () => {
    render(<ContactForm />)

    expect(screen.getByText("formDesc")).toBeInTheDocument()
  })

  it("渲染姓名输入框", () => {
    render(<ContactForm />)

    expect(screen.getByText("nameLabel")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("namePlaceholder")).toBeInTheDocument()
  })

  it("渲染邮箱输入框", () => {
    render(<ContactForm />)

    expect(screen.getByText("emailFormLabel")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("emailFormPlaceholder")).toBeInTheDocument()
  })

  it("渲染电话输入框", () => {
    render(<ContactForm />)

    expect(screen.getByText("phoneFormLabel")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("phoneFormPlaceholder")).toBeInTheDocument()
  })

  it("渲染留言文本区域", () => {
    render(<ContactForm />)

    expect(screen.getByText("messageLabel")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("messagePlaceholder")).toBeInTheDocument()
  })

  it("提交按钮处于禁用状态", () => {
    render(<ContactForm />)

    const button = screen.getByText("submitButton")
    expect(button).toBeDisabled()
  })

  it("显示'即将推出'提示", () => {
    render(<ContactForm />)

    const hints = screen.getAllByText("comingSoon")
    expect(hints.length).toBeGreaterThanOrEqual(1)
  })

  it("邮箱输入框类型为 email", () => {
    render(<ContactForm />)

    const emailInput = screen.getByPlaceholderText("emailFormPlaceholder")
    expect(emailInput).toHaveAttribute("type", "email")
  })

  it("电话输入框类型为 tel", () => {
    render(<ContactForm />)

    const phoneInput = screen.getByPlaceholderText("phoneFormPlaceholder")
    expect(phoneInput).toHaveAttribute("type", "tel")
  })
})
