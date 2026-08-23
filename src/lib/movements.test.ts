import { describe, expect, it } from 'vitest'
import { validateMovement } from './movements'

describe('validateMovement', () => {
  it('accepts add, remove, and transfer shapes', () => {
    expect(validateMovement({ kind: 'add', quantity: 2, toBoxId: 'a' })).toBeNull()
    expect(validateMovement({ kind: 'remove', quantity: 2, available: 3, fromBoxId: 'a' })).toBeNull()
    expect(validateMovement({ kind: 'transfer', quantity: 2, available: 3, fromBoxId: 'a', toBoxId: 'b' })).toBeNull()
  })

  it('rejects invalid quantities and movement shapes', () => {
    expect(validateMovement({ kind: 'remove', quantity: 4, available: 3, fromBoxId: 'a' })).toMatch(/exceeds/)
    expect(validateMovement({ kind: 'transfer', quantity: 1, available: 3, fromBoxId: 'a', toBoxId: 'a' })).toMatch(/different/)
    expect(validateMovement({ kind: 'add', quantity: 1.5, toBoxId: 'a' })).toMatch(/whole/)
  })
})
