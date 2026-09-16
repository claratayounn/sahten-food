import { describe, expect, it } from 'vitest'
import { validateMenuFields, validateMenuPatch } from './menu-validation'

describe('menu validation', () => {
  it('rejects non-positive create values', () => {
    expect(validateMenuFields({ name_en: 'Item', name_ar: 'عنصر', category: 'Kibbeh', price: 0, prep_hours: 1 })).toBeTruthy()
    expect(validateMenuFields({ name_en: 'Item', name_ar: 'عنصر', category: 'Kibbeh', price: 2, prep_hours: -1 })).toBeTruthy()
  })
  it('rejects invalid patch price', () => {
    expect(validateMenuPatch({ price: -1 })).toBeTruthy()
    expect(validateMenuPatch({ price: 'not-a-number' })).toBeTruthy()
  })
})
