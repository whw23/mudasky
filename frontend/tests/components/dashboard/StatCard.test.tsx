/**
 * StatCard 组件测试。
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/dashboard/StatCard'
import { Users } from 'lucide-react'

describe('StatCard', () => {
  it('渲染标签和数值', () => {
    render(<StatCard icon={Users} label="用户总数" value={128} />)

    expect(screen.getByText('用户总数')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
  })

  it('渲染字符串数值', () => {
    render(<StatCard icon={Users} label="活跃率" value="85%" />)

    expect(screen.getByText('活跃率')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('加载状态下显示骨架屏而非数值', () => {
    render(<StatCard icon={Users} label="用户总数" value={128} loading />)

    expect(screen.getByText('用户总数')).toBeInTheDocument()
    expect(screen.queryByText('128')).not.toBeInTheDocument()
    /* 骨架屏元素应有 animate-pulse 类 */
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('显示趋势文本', () => {
    render(<StatCard icon={Users} label="用户总数" value={128} trend="较上月 +12%" />)

    expect(screen.getByText('较上月 +12%')).toBeInTheDocument()
  })
})
