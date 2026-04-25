/**
 * PasswordInput 密码输入框组件测试。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { PasswordInput } from '@/components/auth/PasswordInput'

describe('PasswordInput', () => {
  const defaultProps = {
    id: 'test-pwd',
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染密码输入框，默认隐藏文本', () => {
    render(<PasswordInput {...defaultProps} value="secret123" />)

    const input = screen.getByDisplayValue('secret123')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('渲染带自定义 placeholder 的输入框', () => {
    render(
      <PasswordInput {...defaultProps} placeholder="请输入密码" />,
    )

    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
  })

  it('未传 placeholder 时使用翻译的默认占位符', () => {
    render(<PasswordInput {...defaultProps} />)

    expect(screen.getByPlaceholderText('passwordPlaceholder')).toBeInTheDocument()
  })

  it('点击切换按钮后显示密码文本', async () => {
    const user = userEvent.setup()
    render(<PasswordInput {...defaultProps} value="secret123" />)

    const input = screen.getByDisplayValue('secret123')
    expect(input).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button')
    await user.click(toggleBtn)

    expect(input).toHaveAttribute('type', 'text')
  })

  it('再次点击切换按钮后隐藏密码', async () => {
    const user = userEvent.setup()
    render(<PasswordInput {...defaultProps} value="secret123" />)

    const toggleBtn = screen.getByRole('button')
    await user.click(toggleBtn)
    expect(screen.getByDisplayValue('secret123')).toHaveAttribute('type', 'text')

    await user.click(toggleBtn)
    expect(screen.getByDisplayValue('secret123')).toHaveAttribute('type', 'password')
  })

  it('输入时调用 onChange 回调并传递值', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PasswordInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByPlaceholderText('passwordPlaceholder')
    await user.type(input, 'a')

    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('required 属性正确传递', () => {
    render(<PasswordInput {...defaultProps} required />)

    const input = screen.getByPlaceholderText('passwordPlaceholder')
    expect(input).toBeRequired()
  })

  it('非 required 时输入框不带 required 属性', () => {
    render(<PasswordInput {...defaultProps} />)

    const input = screen.getByPlaceholderText('passwordPlaceholder')
    expect(input).not.toBeRequired()
  })
})
