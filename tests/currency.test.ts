import { describe, expect, it } from 'vitest'
import { formatCurrency } from '../src/lib/format'

describe('PKR currency precision', () => {
  it.each([
    [2750.5, 'Rs 2,750.50'],
    [2750.0, 'Rs 2,750.00'],
    [0.5, 'Rs 0.50'],
    [999999.99, 'Rs 999,999.99'],
    [0, 'Rs 0.00'],
    [9999999999.99, 'Rs 9,999,999,999.99'],
  ] as const)('formats %s with two decimal places', (amount, expected) => {
    expect(formatCurrency(amount, 'PKR')).toBe(expected)
  })
})
