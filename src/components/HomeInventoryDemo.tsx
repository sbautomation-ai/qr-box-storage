import { useLayoutEffect, useRef, useState } from 'react'
import { Archive, ArrowLeft, ArrowRight, Box, MapPin, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SampleQrLabel } from '@/components/SampleQrLabel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchDemoBoxes, type DemoBox } from '@/lib/demo'

export function HomeInventoryDemo() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DemoBox | null>(null)
  const detailsHeading = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<DemoBox['slug'] | null>(null)
  const resultButtons = useRef<Partial<Record<DemoBox['slug'], HTMLButtonElement | null>>>({})
  const matches = searchDemoBoxes(search)

  useLayoutEffect(() => {
    if (selected) {
      detailsHeading.current?.focus()
    } else if (returnTo.current) {
      resultButtons.current[returnTo.current]?.focus()
      returnTo.current = null
    }
  }, [selected])

  return (
    <section id="try-demo" tabIndex={-1} aria-labelledby="sample-inventory-title" className="home-demo">
      <div className="home-demo-frame">
        <header className="home-demo-header">
          <Archive size={18} aria-hidden="true" />
          <h2 id="sample-inventory-title">Sample inventory</h2>
        </header>
        <div className="home-demo-body">
          {selected ? (
            <div>
              <button
                type="button"
                className="home-demo-text-action mb-2"
                onClick={() => {
                  returnTo.current = selected.slug
                  setSelected(null)
                }}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sample boxes
              </button>
              <h3 ref={detailsHeading} tabIndex={-1} className="rounded-sm text-lg font-semibold">{selected.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {selected.location}</p>
              <ul className="my-4 divide-y divide-border border-y border-border text-sm">
                {selected.items.map(([item, quantity]) => (
                  <li key={item} className="flex justify-between gap-2 py-2.5"><span>{item}</span><strong>× {quantity}</strong></li>
                ))}
              </ul>
              <SampleQrLabel key={selected.slug} box={selected} showBoxLink />
            </div>
          ) : (
            <div>
              <Label htmlFor="sample-inventory-search" className="sr-only">Search sample inventory</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="sample-inventory-search" type="search" className="pl-9" placeholder="Item, box or location" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <button type="button" className="home-demo-text-action mt-1" onClick={() => setSearch('spare batteries')}>Try “spare batteries”</button>
              <p role="status" className={matches.length ? 'sr-only' : 'py-5 text-sm text-muted-foreground'}>
                {matches.length ? `${matches.length} ${matches.length === 1 ? 'box' : 'boxes'} found` : 'No boxes match. Try another item, box or location.'}
              </p>
              {matches.length > 0 && (
                <ul className="mt-1 divide-y divide-border rounded-xl border border-border">
                  {matches.map((box) => (
                    <li key={box.slug}>
                      <button
                        type="button"
                        ref={(button) => { resultButtons.current[box.slug] = button }}
                        className="home-demo-result"
                        onClick={() => setSelected(box)}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Box size={17} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><strong className="block text-sm">{box.name}</strong><span className="block text-xs text-muted-foreground">{box.location}</span></span>
                        <ArrowRight size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Link className="home-demo-text-action self-start" to="/demo">Open full demo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  )
}
