import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, MapPin, Plus, Search, Tag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorPanel, LoadingScreen } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { queryKeys, useBoxes, useCategories, useLocations } from '@/hooks/useData'
import { errorMessage, supabase } from '@/lib/supabase'
import { filterBoxes } from '@/lib/filters'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

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
  const filtered = useMemo(() => filterBoxes(boxes.data ?? [], search, locationId, categoryId), [boxes.data, categoryId, locationId, search])

  if (boxes.isLoading || locations.isLoading || categories.isLoading) return <LoadingScreen />
  if (boxes.error) return <ErrorPanel message={errorMessage(boxes.error)} retry={() => void boxes.refetch()} />

  return <>
    <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-zinc-500">{membership?.household?.name}</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Your storage boxes</h1><p className="mt-2 text-zinc-400">Search every box and item, or scan a label to jump straight in.</p></div>
      <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New box</Button>
    </section>
    <section className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]" aria-label="Box filters">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" /><Input aria-label="Search boxes and items" placeholder="Search boxes and items…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" /></div>
      <Select aria-label="Filter by location" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">All locations</option>{locations.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select>
      <Select aria-label="Filter by category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All categories</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>
    </section>
    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((boxRecord) => <Link key={boxRecord.id} to={`/boxes/${boxRecord.id}`} className="group rounded-2xl focus:outline-none focus:ring-2 focus:ring-white"><Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-zinc-600"><CardHeader><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{boxRecord.name}</h2><Box className="h-5 w-5 shrink-0 text-zinc-600" /></div></CardHeader><CardContent><div className="space-y-2 text-sm text-zinc-400"><p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{boxRecord.location?.name}</p><p className="flex items-center gap-2"><Tag className="h-4 w-4" />{boxRecord.category?.name}</p></div>{boxRecord.description && <p className="mt-4 line-clamp-3 text-sm text-zinc-300">{boxRecord.description}</p>}<p className="mt-5 text-xs text-zinc-500">{boxRecord.box_inventory?.length ?? 0} item types</p></CardContent></Card></Link>)}</div> : <EmptyState title={search || locationId || categoryId ? 'No matching boxes' : 'Create your first box'} message={search || locationId || categoryId ? 'Try another search or clear a filter.' : 'Create a box and add any missing location or category along the way.'} action={!search && !locationId && !categoryId ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New box</Button> : undefined} />}
    <BoxFormDialog open={createOpen} onOpenChange={setCreateOpen} householdId={householdId} locations={locations.data ?? []} categories={categories.data ?? []} />
  </>
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
  return <Dialog open={open} onOpenChange={onOpenChange} title="Create a box" description="Choose its home and category, or add either one without leaving this dialog."><form onSubmit={submit} className="space-y-4"><div><Label htmlFor="box-name">Name</Label><Input id="box-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="box-location">Location</Label><div className="flex gap-2"><Select id="box-location" required value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Choose…</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select><Button variant="outline" size="icon" aria-label="Add new location" title="Add new location" onClick={() => { createResource.reset(); setAddingCategory(false); setAddingLocation(true) }}><Plus className="h-4 w-4" /></Button></div>{addingLocation && <div className="mt-2 flex gap-2"><Input aria-label="New location name" placeholder="New location…" maxLength={80} value={newLocation} onChange={(event) => setNewLocation(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (newLocation.trim()) createResource.mutate({ table: 'locations', resourceName: newLocation }) } if (event.key === 'Escape') { setAddingLocation(false); setNewLocation('') } }} autoFocus /><Button size="sm" disabled={createResource.isPending || !newLocation.trim()} onClick={() => createResource.mutate({ table: 'locations', resourceName: newLocation })}>{createResource.isPending && createResource.variables?.table === 'locations' ? 'Adding…' : 'Add'}</Button><Button variant="ghost" size="icon" aria-label="Cancel new location" onClick={() => { setAddingLocation(false); setNewLocation(''); createResource.reset() }}><X className="h-4 w-4" /></Button></div>}{createResource.error && createResource.variables?.table === 'locations' && <p className="mt-2 text-sm text-red-300" role="alert">{errorMessage(createResource.error)}</p>}</div><div><Label htmlFor="box-category">Category</Label><div className="flex gap-2"><Select id="box-category" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Choose…</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><Button variant="outline" size="icon" aria-label="Add new category" title="Add new category" onClick={() => { createResource.reset(); setAddingLocation(false); setAddingCategory(true) }}><Plus className="h-4 w-4" /></Button></div>{addingCategory && <div className="mt-2 flex gap-2"><Input aria-label="New category name" placeholder="New category…" maxLength={80} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (newCategory.trim()) createResource.mutate({ table: 'categories', resourceName: newCategory }) } if (event.key === 'Escape') { setAddingCategory(false); setNewCategory('') } }} autoFocus /><Button size="sm" disabled={createResource.isPending || !newCategory.trim()} onClick={() => createResource.mutate({ table: 'categories', resourceName: newCategory })}>{createResource.isPending && createResource.variables?.table === 'categories' ? 'Adding…' : 'Add'}</Button><Button variant="ghost" size="icon" aria-label="Cancel new category" onClick={() => { setAddingCategory(false); setNewCategory(''); createResource.reset() }}><X className="h-4 w-4" /></Button></div>}{createResource.error && createResource.variables?.table === 'categories' && <p className="mt-2 text-sm text-red-300" role="alert">{errorMessage(createResource.error)}</p>}</div></div><div><Label htmlFor="box-description">Description</Label><Textarea id="box-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this box for?" /></div>{create.error && <p className="text-sm text-red-300" role="alert">{errorMessage(create.error)}</p>}<Button type="submit" className="w-full" disabled={create.isPending || !locationId || !categoryId}>{create.isPending ? 'Creating…' : 'Create box'}</Button></form></Dialog>
}
