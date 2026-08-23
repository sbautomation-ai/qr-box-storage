import { describe, expect, it } from 'vitest'
import { filterBoxes } from './filters'

const boxes = [
  { name: 'Winter clothes', description: 'Coats', location_id: 'attic', category_id: 'clothes', location: { name: 'Attic' }, category: { name: 'Clothing' }, box_inventory: [{ item: { name: 'Red scarf' } }] },
  { name: 'Tools', description: null, location_id: 'garage', category_id: 'tools', location: { name: 'Garage' }, category: { name: 'DIY' }, box_inventory: [{ item: { name: 'Cordless drill' } }] },
]

describe('filterBoxes', () => {
  it('searches box metadata and nested item names case-insensitively', () => {
    expect(filterBoxes(boxes, 'SCARF', '', '')).toEqual([boxes[0]])
    expect(filterBoxes(boxes, 'garage', '', '')).toEqual([boxes[1]])
  })

  it('combines location and category filters', () => {
    expect(filterBoxes(boxes, '', 'garage', 'tools')).toEqual([boxes[1]])
    expect(filterBoxes(boxes, '', 'attic', 'tools')).toEqual([])
  })
})
