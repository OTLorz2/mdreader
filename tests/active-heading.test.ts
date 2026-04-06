import { describe, it, expect } from 'vitest'
import { computeActiveHeadingId } from '../src/lib/active-heading'

describe('computeActiveHeadingId', () => {
  it('returns null for empty headings', () => {
    expect(computeActiveHeadingId([], 0, 12)).toBeNull()
  })

  it('picks heading closest to read line among those below mainTop', () => {
    const mainTop = 100
    const headings = [
      { id: 'a', top: 80, bottom: 95 },
      { id: 'b', top: 105, bottom: 140 }
    ]
    expect(computeActiveHeadingId(headings, mainTop, 12)).toBe('b')
  })

  it('ignores headings fully above mainTop', () => {
    const mainTop = 100
    const headings = [{ id: 'x', top: 40, bottom: 90 }]
    expect(computeActiveHeadingId(headings, mainTop, 12)).toBeNull()
  })

  it('breaks ties by smaller distance (first match wins if equal)', () => {
    const mainTop = 0
    const headings = [
      { id: 'first', top: 20, bottom: 50 },
      { id: 'second', top: 20, bottom: 50 }
    ]
    const d = Math.abs(20 - 0 - 12)
    expect(d).toBe(8)
    expect(computeActiveHeadingId(headings, mainTop, 12)).toBe('first')
  })
})
