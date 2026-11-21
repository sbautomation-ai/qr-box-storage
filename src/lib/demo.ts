export const demoBoxes = [
  { slug: 'tools', name: 'Small fixes & tools', location: 'Garage · Left shelf', items: [['Spare batteries', 8], ['Hex key set', 1], ['Extension cord', 2]] },
  { slug: 'camping', name: 'Camping kit', location: 'Garage · Top shelf', items: [['Headlamp', 2], ['Tent pegs', 12], ['First-aid kit', 1]] },
  { slug: 'holiday', name: 'Holiday decorations', location: 'Attic · By the hatch', items: [['String lights', 3], ['Tree ornaments', 24], ['Tree stand', 1]] },
] as const

export type DemoBox = (typeof demoBoxes)[number]

export function demoBoxPath(slug: DemoBox['slug']) {
  return `/demo/${slug}`
}

export function searchDemoBoxes(search: string) {
  const query = search.trim().toLowerCase()
  return demoBoxes.filter((box) => {
    const terms = [box.name, box.location, ...box.items.map(([item]) => item)]
    return terms.some((term) => term.toLowerCase().includes(query))
  })
}
