export function filterBoxes<T extends { name: string; description?: string | null; location?: { name: string } | null; category?: { name: string } | null; box_inventory?: Array<{ item: { name: string } | null }> }>(boxes: T[], search: string, locationId: string, categoryId: string) {
  const query = search.trim().toLocaleLowerCase()
  return boxes.filter((box: T & { location_id?: string; category_id?: string }) => {
    if (locationId && box.location_id !== locationId) return false
    if (categoryId && box.category_id !== categoryId) return false
    if (!query) return true
    return [box.name, box.description, box.location?.name, box.category?.name, ...(box.box_inventory ?? []).map((entry) => entry.item?.name)]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(query))
  })
}
