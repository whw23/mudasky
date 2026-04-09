/**
 * CountryCode 类型校验测试。
 */

import { describe, it, expect } from 'vitest'
import type { CountryCode } from '@/types/config'

describe('CountryCode 类型', () => {
  it('应包含所有必需字段', () => {
    const entry: CountryCode = {
      code: '+86',
      country: '中国',
      label: '中国 +86',
      digits: 11,
      enabled: true,
    }

    expect(entry.code).toBe('+86')
    expect(entry.country).toBe('中国')
    expect(entry.label).toBe('中国 +86')
    expect(entry.digits).toBe(11)
    expect(entry.enabled).toBe(true)
  })

  it('字段类型应正确', () => {
    const entry: CountryCode = {
      code: '+1',
      country: 'US',
      label: 'US +1',
      digits: 10,
      enabled: false,
    }

    expect(typeof entry.code).toBe('string')
    expect(typeof entry.country).toBe('string')
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.digits).toBe('number')
    expect(typeof entry.enabled).toBe('boolean')
  })
})
