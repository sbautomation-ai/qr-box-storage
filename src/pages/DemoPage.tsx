import { useState } from 'react'
import { ArrowLeft, ArrowRight, Box, MapPin, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BrandLink } from '@/components/BrandLink'
import { SampleQrLabel } from '@/components/SampleQrLabel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { demoBoxes, demoBoxPath, searchDemoBoxes } from '@/lib/demo'
import { useAuth } from '@/providers/AuthProvider'

export function DemoPage() {
  const { slug } = useParams()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const selected = demoBoxes.find((box) => box.slug === slug)
  const matches = searchDemoBoxes(search)

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="page-width flex min-h-20 items-center justify-between gap-2 border-b border-border"><BrandLink /><ThemeToggle /></header>
      <main className="page-width max-w-3xl py-8 sm:py-12">
        {selected ? (
          <>
            <Link className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline" to="/demo"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sample boxes</Link>
            <h1 className="page-title break-words">{selected.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden="true" /> {selected.location}</p>
            <Card className="mt-6">
              <CardHeader><h2 className="text-lg font-semibold">What’s inside</h2></CardHeader>
              <CardContent>
                <ul className="mb-6 divide-y divide-border">
                  {selected.items.map(([item, quantity]) => <li key={item} className="flex items-center justify-between gap-3 py-3"><span>{item}</span><span className="font-semibold">× {quantity}</span></li>)}
                </ul>
                <SampleQrLabel key={selected.slug} box={selected} />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <h1 className="page-title">Try QR Box Storage</h1>
            <p className="mt-2 text-muted-foreground">Search the sample inventory, open a box, and try its QR label.</p>
            <div className="mt-6 max-w-sm">
              <Label htmlFor="demo-search">Search sample inventory</Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="demo-search" type="search" className="pl-9" placeholder="Box, item or location" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <button type="button" className="mt-2 min-h-9 text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setSearch('spare batteries')}>Try “spare batteries”</button>
            </div>
            <p className="sr-only" role="status">{matches.length} {matches.length === 1 ? 'box' : 'boxes'} found</p>
            {matches.length ? (
              <ul className="mt-4 space-y-3">
                {matches.map((box) => (
                  <li key={box.slug}>
                    <Link to={demoBoxPath(box.slug)} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary hover:bg-secondary sm:gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Box className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><strong className="block">{box.name}</strong><span className="block text-sm text-muted-foreground">{box.location}</span></span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-5 text-muted-foreground">No boxes match. Try another item, box or location.</p>}
          </>
        )}
        <div className="mt-8 border-t border-border pt-5">
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover" to={session ? '/boxes' : '/signup'}>{session ? 'Open my inventory' : 'Create your own inventory for free'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </main>
    </div>
  )
}
