/**
 * API 客户端配置测试。
 */

import { describe, it, expect } from 'vitest'
import api from '@/lib/api'

describe('api 客户端', () => {
  it('baseURL 应为 /api', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('withCredentials 应为 true', () => {
    expect(api.defaults.withCredentials).toBe(true)
  })
})
