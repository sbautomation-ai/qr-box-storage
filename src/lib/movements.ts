import type { MovementKind } from '@/types'

export type MovementInput = {
  kind: MovementKind
  quantity: number
  available?: number
  fromBoxId?: string | null
  toBoxId?: string | null
}

export function validateMovement(input: MovementInput) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return 'Quantity must be a positive whole number.'
  if (input.kind !== 'add' && input.quantity > (input.available ?? 0)) return 'Quantity exceeds the available inventory.'
  if (input.kind === 'add' && (!input.toBoxId || input.fromBoxId)) return 'Additions require only a destination box.'
  if (input.kind === 'remove' && (!input.fromBoxId || input.toBoxId)) return 'Removals require only a source box.'
  if (input.kind === 'transfer' && (!input.fromBoxId || !input.toBoxId || input.fromBoxId === input.toBoxId)) return 'Transfers require two different boxes.'
  return null
}
