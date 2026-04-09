/**
 * PhoneInput 工具函数测试。
 */

import { describe, it, expect } from 'vitest'
import { isValidPhone, getDigitsForCode } from '@/components/auth/PhoneInput'
import type { CountryCode } from '@/types/config'

/** 测试用国家码列表 */
const MOCK_CODES: CountryCode[] = [
  { code: '+86', country: '中国', label: '中国 +86', digits: 11, enabled: true },
  { code: '+1', country: '美国', label: '美国 +1', digits: 10, enabled: true },
  { code: '+44', country: '英国', label: '英国 +44', digits: 10, enabled: true },
]

describe('getDigitsForCode', () => {
  it('返回匹配国家码的位数', () => {
    expect(getDigitsForCode('+86', MOCK_CODES)).toBe(11)
    expect(getDigitsForCode('+1', MOCK_CODES)).toBe(10)
    expect(getDigitsForCode('+44', MOCK_CODES)).toBe(10)
  })

  it('未找到国家码时返回默认值 10', () => {
    expect(getDigitsForCode('+999', MOCK_CODES)).toBe(10)
  })
})

describe('isValidPhone', () => {
  it('有效的中国手机号应返回 true', () => {
    expect(isValidPhone('+8613800138000', MOCK_CODES)).toBe(true)
  })

  it('有效的美国手机号应返回 true', () => {
    expect(isValidPhone('+12025551234', MOCK_CODES)).toBe(true)
  })

  it('位数不足应返回 false', () => {
    expect(isValidPhone('+861380013', MOCK_CODES)).toBe(false)
  })

  it('位数过多应返回 false', () => {
    expect(isValidPhone('+86138001380001', MOCK_CODES)).toBe(false)
  })

  it('包含非数字字符应返回 false', () => {
    expect(isValidPhone('+861380013800a', MOCK_CODES)).toBe(false)
  })

  it('空号码应返回 false', () => {
    expect(isValidPhone('+86', MOCK_CODES)).toBe(false)
  })
})
