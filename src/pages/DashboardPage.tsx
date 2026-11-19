import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, MapPin, Plus, Printer, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { EmptyState, ErrorPanel, LoadingScreen } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { queryKeys, useBoxes, useCategories, useLocations } from '@/hooks/useData'
import { appUrl, errorMessage, supabase } from '@/lib/supabase'
import { filterBoxes } from '@/lib/filters'
import { buildBatchLabelPrintHtml } from '@/lib/labels'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import type { BoxRecord } from '@/types'

export function DashboardPage() {
  const { membership } = useAuth()
  const householdId = membership!.household_id
  const boxes = useBoxes(householdId)
  const locations = useLocations(householdId)
  const categories = useCategories(householdId)
  const [search, setSearch] = useState('')
  const [locationId, setLocationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const filtered = useMemo(() => filterBoxes(boxes.data ?? [], search, locationId, categoryId), [boxes.data, categoryId, locationId, search])

  if (boxes.isLoading || locations.isLoading || categories.isLoading) return <LoadingScreen />
  if (boxes.error) return <ErrorPanel message={errorMessage(boxes.error)} retry={() => void boxes.refetch()} />

  const total = boxes.data?.length ?? 0
  const query = search.trim().toLocaleLowerCase()
  const hasFilters = Boolean(query || locationId || categoryId)

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-[1.4rem] border border-border bg-secondary px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-40 sm:block" aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(var(--input) 1px, transparent 1px)', backgroundSize: '14px 14px', maskImage: 'linear-gradient(to right, transparent, black)' }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 break-words text-sm font-semibold text-primary">{membership?.household?.name}</p>
            <h1 className="page-title">Your storage boxes</h1>
            <p className="mt-3 max-w-md text-muted-foreground">Search for an item or open a box to see what’s inside.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" />New box</Button>
            {total > 0 && <Button variant="outline" onClick={() => setPrintOpen(true)}><Printer className="h-4 w-4" aria-hidden="true" />Print labels</Button>}
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 min-[365px]:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]" aria-label="Box filters">
        <div className="relative min-[365px]:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
          <Input type="search" aria-label="Search boxes and items" placeholder="Search boxes and items…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
        </div>
        <Select aria-label="Filter by location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
          <option value="">All locations</option>
          {locations.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </Select>
        <Select aria-label="Filter by category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
      </section>

      {filtered.length > 0 ? (
        <>
          <p role="status" className="mb-3 text-sm font-medium text-muted-foreground">
            {hasFilters ? `${filtered.length} of ${total}` : total} {total === 1 ? 'box' : 'boxes'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((box) => <BoxCard key={box.id} box={box} query={query} />)}
          </div>
        </>
      ) : (
        <EmptyState
          title={hasFilters ? 'No matching boxes' : 'Create your first box'}
          message={hasFilters ? 'Try a different search or clear the filters.' : 'Choose a name, location and category to get started.'}
          action={hasFilters ? <Button variant="outline" onClick={() => { setSearch(''); setLocationId(''); setCategoryId('') }}>Clear filters</Button> : undefined}
        />
      )}

      <BoxFormDialog open={createOpen} onOpenChange={setCreateOpen} householdId={householdId} locations={locations.data ?? []} categories={categories.data ?? []} />
      <BatchPrintDialog open={printOpen} onOpenChange={setPrintOpen} boxes={boxes.data ?? []} />
    </>
  )
}

function BoxCard({ box, query }: { box: BoxRecord; query: string }) {
  const count = box.box_inventory?.length ?? 0
  const matches = query ? box.box_inventory?.filter(({ item }) => item?.name.toLocaleLowerCase().includes(query)) : undefined
  return (
    <Link to={`/boxes/${box.id}`} className="group block rounded-2xl">
      <Card className="flex h-full flex-col gap-4 p-5 transition-colors group-hover:border-input">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
            <Box size={23} strokeWidth={1.55} aria-hidden="true" />
          </span>
          {box.category && <span className="max-w-full break-words rounded-full bg-muted px-2.5 py-1 text-sm text-muted-foreground">{box.category.name}</span>}
        </div>
        <div>
          <h2 className="break-words font-display text-[1.6rem] leading-tight tracking-tight group-hover:text-primary">{box.name}</h2>
          {box.location && <p className="mt-1.5 flex items-start gap-1.5 break-words text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">{box.location.name}</span></p>}
          {box.description && <p className="mt-3 line-clamp-2 break-words text-sm text-muted-foreground">{box.description}</p>}
        </div>
        <div className="mt-auto border-t border-border pt-3">
          {matches?.length ? (
            <ul className="space-y-1 text-sm">
              {matches.map(({ item, quantity }) => <li key={item!.id} className="flex justify-between gap-3"><span className="min-w-0 break-words">{item!.name}</span><span className="shrink-0 text-muted-foreground">× {quantity}</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{count} item {count === 1 ? 'type' : 'types'}</p>}
        </div>
      </Card>
    </Link>
  )
}

function BatchPrintDialog({ open, onOpenChange, boxes }: { open: boolean; onOpenChange: (open: boolean) => void; boxes: BoxRecord[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [printing, setPrinting] = useState(false)
  const wasOpen = useRef(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (open && !wasOpen.current) setSelectedIds(boxes.map((box) => box.id))
    wasOpen.current = open
  }, [boxes, open])

  async function printLabels() {
    const selectedBoxes = boxes.filter((box) => selectedIds.includes(box.id))
    if (!selectedBoxes.length) return
    const popup = window.open('', '_blank')
    if (!popup) return showToast('Allow pop-ups to print labels', 'error')
    popup.opener = null
    popup.document.write('<!doctype html><title>Preparing labels…</title><p style="font-family:system-ui;padding:2rem">Preparing QR labels…</p>')
    popup.document.close()
    setPrinting(true)
    try {
      const labels = await Promise.all(selectedBoxes.map(async (box) => ({
        name: box.name,
        category: box.category?.name ?? '',
        qrDataUrl: await QRCode.toDataURL(`${appUrl()}/boxes/${box.id}`, { width: 512, margin: 3, color: { dark: '#09090b', light: '#ffffff' } }),
      })))
      popup.document.open()
      popup.document.write(buildBatchLabelPrintHtml(labels))
      popup.document.close()
      onOpenChange(false)
    } catch (error) {
      popup.close()
      showToast(errorMessage(error), 'error')
    } finally {
      setPrinting(false)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange} title="Print QR labels" description="Choose boxes to arrange as compact labels on A4 paper." className="max-w-2xl"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{selectedIds.length} of {boxes.length} selected</p><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setSelectedIds(boxes.map((box) => box.id))}>Select all</Button><Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button></div></div><fieldset className="max-h-[50dvh] space-y-2 overflow-y-auto pr-1"><legend className="sr-only">Boxes to print</legend>{boxes.map((box) => { const checked = selectedIds.includes(box.id); return <label key={box.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:border-input"><input type="checkbox" checked={checked} onChange={() => setSelectedIds((current) => checked ? current.filter((id) => id !== box.id) : [...current, box.id])} className="h-5 w-5 accent-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{box.name}</span><span className="block truncate text-xs text-muted-foreground">{box.location?.name} · {box.category?.name}</span></span></label> })}</fieldset><Button className="mt-5 w-full" disabled={!selectedIds.length || printing} onClick={() => void printLabels()}><Printer className="h-4 w-4" />{printing ? 'Preparing labels…' : `Print ${selectedIds.length} label${selectedIds.length === 1 ? '' : 's'}`}</Button></Dialog>
}

function BoxFormDialog({ open, onOpenChange, householdId, locations, categories }: { open: boolean; onOpenChange: (open: boolean) => void; householdId: string; locations: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [locationId, setLocationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const client = useQueryClient()
  const { user } = useAuth()
  const { showToast } = useToast()
  const create = useMutation({ mutationFn: async () => {
    const { error } = await supabase.from('boxes').insert({ household_id: householdId, name: name.trim(), description: description.trim() || null, location_id: locationId, category_id: categoryId, created_by: user!.id })
    if (error) throw error
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.boxes(householdId) }); showToast('Box created'); onOpenChange(false); setName(''); setDescription(''); setLocationId(''); setCategoryId('') } })
  const createResource = useMutation({ mutationFn: async ({ table, resourceName }: { table: 'locations' | 'categories'; resourceName: string }) => {
    const { data, error } = await supabase.from(table).insert({ household_id: householdId, name: resourceName.trim() }).select('id,name').single()
    if (error) throw error
    return { ...data, table }
  }, onSuccess: async (resource) => {
    const isLocation = resource.table === 'locations'
    const key = isLocation ? queryKeys.locations(householdId) : queryKeys.categories(householdId)
    client.setQueryData<Array<{ id: string; name: string }>>(key, (current = []) => current.some((entry) => entry.id === resource.id) ? current : [...current, { id: resource.id, name: resource.name }])
    if (isLocation) {
      setLocationId(resource.id)
      setNewLocation('')
      setAddingLocation(false)
      showToast('Location added and selected')
    } else {
      setCategoryId(resource.id)
      setNewCategory('')
      setAddingCategory(false)
      showToast('Category added and selected')
    }
    await client.invalidateQueries({ queryKey: key })
  } })
  function submit(event: FormEvent) { event.preventDefault(); create.mutate() }
  return <Dialog open={open} onOpenChange={onOpenChange} title="Create a box" description="Choose its home and category, or add either one without leaving this dialog."><form onSubmit={submit} className="space-y-4"><div><Label htmlFor="box-name">Name</Label><Input id="box-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="box-location">Location</Label><div className="flex gap-2"><Select id="box-location" required value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Choose…</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select><Button variant="outline" size="icon" aria-label="Add new location" title="Add new location" onClick={() => { createResource.reset(); setAddingCategory(false); setAddingLocation(true) }}><Plus className="h-4 w-4" /></Button></div>{addingLocation && <div className="mt-2 flex gap-2"><Input aria-label="New location name" placeholder="New location…" maxLength={80} value={newLocation} onChange={(event) => setNewLocation(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (newLocation.trim()) createResource.mutate({ table: 'locations', resourceName: newLocation }) } if (event.key === 'Escape') { setAddingLocation(false); setNewLocation('') } }} autoFocus /><Button size="sm" disabled={createResource.isPending || !newLocation.trim()} onClick={() => createResource.mutate({ table: 'locations', resourceName: newLocation })}>{createResource.isPending && createResource.variables?.table === 'locations' ? 'Adding…' : 'Add'}</Button><Button variant="ghost" size="icon" aria-label="Cancel new location" onClick={() => { setAddingLocation(false); setNewLocation(''); createResource.reset() }}><X className="h-4 w-4" /></Button></div>}{createResource.error && createResource.variables?.table === 'locations' && <p className="mt-2 text-sm text-danger" role="alert">{errorMessage(createResource.error)}</p>}</div><div><Label htmlFor="box-category">Category</Label><div className="flex gap-2"><Select id="box-category" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Choose…</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><Button variant="outline" size="icon" aria-label="Add new category" title="Add new category" onClick={() => { createResource.reset(); setAddingLocation(false); setAddingCategory(true) }}><Plus className="h-4 w-4" /></Button></div>{addingCategory && <div className="mt-2 flex gap-2"><Input aria-label="New category name" placeholder="New category…" maxLength={80} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (newCategory.trim()) createResource.mutate({ table: 'categories', resourceName: newCategory }) } if (event.key === 'Escape') { setAddingCategory(false); setNewCategory('') } }} autoFocus /><Button size="sm" disabled={createResource.isPending || !newCategory.trim()} onClick={() => createResource.mutate({ table: 'categories', resourceName: newCategory })}>{createResource.isPending && createResource.variables?.table === 'categories' ? 'Adding…' : 'Add'}</Button><Button variant="ghost" size="icon" aria-label="Cancel new category" onClick={() => { setAddingCategory(false); setNewCategory(''); createResource.reset() }}><X className="h-4 w-4" /></Button></div>}{createResource.error && createResource.variables?.table === 'categories' && <p className="mt-2 text-sm text-danger" role="alert">{errorMessage(createResource.error)}</p>}</div></div><div><Label htmlFor="box-description">Description</Label><Textarea id="box-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this box for?" /></div>{create.error && <p className="text-sm text-danger" role="alert">{errorMessage(create.error)}</p>}<Button type="submit" className="w-full" disabled={create.isPending || !locationId || !categoryId}>{create.isPending ? 'Creating…' : 'Create box'}</Button></form></Dialog>
}
