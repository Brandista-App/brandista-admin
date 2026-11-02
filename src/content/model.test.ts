import { describe, expect, it } from 'vitest'
import { move } from './model'
describe('content ordering', () => {
  it('preserves item identity and bounds while reordering', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    expect(move(items, 1, -1).map((x) => x.id)).toEqual([2, 1, 3])
    expect(items.map((x) => x.id)).toEqual([1, 2, 3])
    expect(move(items, 0, -1)).toBe(items)
    expect(move(items, 2, 1)).toBe(items)
  })
})
