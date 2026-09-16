export const ALLOWED_PAYMENT_METHODS = ['whish', 'omt', 'cash'] as const
export const PHONE_PATTERN = /^[0-9+\s-]{7,24}$/

export function isValidPhone(value: unknown) {
  return typeof value === 'string' && PHONE_PATTERN.test(value.trim()) && value.replace(/\D/g, '').length >= 7
}

export function isValidReadyDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return !Number.isNaN(date.getTime()) && date >= today
}

const STATUS_TRANSITIONS: Record<string, string[]> = { pending: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['completed', 'cancelled'], completed: [], cancelled: [] }

export function validateStatusTransition(current: string, next: string) {
  return current === next || STATUS_TRANSITIONS[current]?.includes(next) === true
}

export function isAllowedPaymentMethod(value: unknown): value is typeof ALLOWED_PAYMENT_METHODS[number] {
  return typeof value === 'string' && ALLOWED_PAYMENT_METHODS.includes(value as typeof ALLOWED_PAYMENT_METHODS[number])
}
