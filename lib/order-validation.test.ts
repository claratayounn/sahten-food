import { describe, expect, it } from 'vitest'
import { isAllowedPaymentMethod, isValidPhone, isValidReadyDate } from './order-validation'

describe('order validation', () => {
  it('accepts allowed payment methods only', () => {
    expect(isAllowedPaymentMethod('cash')).toBe(true)
    expect(isAllowedPaymentMethod('card')).toBe(false)
  })
  it('rejects malformed phones', () => {
    expect(isValidPhone('abc123')).toBe(false)
    expect(isValidPhone('03 123456')).toBe(true)
  })
  it('rejects invalid and past dates', () => {
    expect(isValidReadyDate('not-a-date')).toBe(false)
    expect(isValidReadyDate('2000-01-01')).toBe(false)
  })
})
