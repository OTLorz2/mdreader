import { describe, it, expect } from 'vitest'
import { computeOutlineScrollTopToCenter } from '../src/lib/outline-scroll'

describe('computeOutlineScrollTopToCenter', () => {
  it('centers item when possible', () => {
    expect(computeOutlineScrollTopToCenter(100, 500, 40, 20)).toBe(0)
  })

  it('clamps to max scroll', () => {
    expect(computeOutlineScrollTopToCenter(100, 110, 200, 20)).toBe(10)
  })

  it('clamps to 0 when item near top', () => {
    expect(computeOutlineScrollTopToCenter(100, 120, 0, 20)).toBe(0)
  })
})
