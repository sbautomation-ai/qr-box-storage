import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRightLeft, Download, Edit3, ImagePlus, MapPin, Minus, Plus, Printer, QrCode, Tag, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { EmptyState, ErrorPanel, LoadingScreen } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { queryKeys, useBox, useBoxes, useCategories, useInventory, useItems, useLocations, useMovements, usePhotos } from '@/hooks/useData'
import { recordMovement } from '@/lib/api'
import { appUrl, errorMessage, supabase } from '@/lib/supabase'
import { escapeHtml, formatDate } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import type { InventoryBalance, MovementKind } from '@/types'

export function BoxPage() {
  const { boxId = '' } = useParams()
  const { membership, user } = useAuth()
  const householdId = membership!.household_id
  const box = useBox(boxId)
  const inventory = useInventory(boxId)
  const movements = useMovements(boxId)
  const photos = usePhotos(boxId)
  const allBoxes = useBoxes(householdId)
  const items = useItems(householdId)
  const locations = useLocations(householdId)
  const categories = useCategories(householdId)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [adjusting, setAdjusting] = useState<InventoryBalance | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [photoOpen, setPhotoOpen] = useState<string | null>(null)
  const client = useQueryClient()
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    if (!qrOpen || !box.data) return
    QRCode.toDataURL(`${appUrl()}/boxes/${box.data.id}`, { width: 512, margin: 3, color: { dark: '#09090b', light: '#ffffff' } }).then(setQrUrl)
  }, [box.data, qrOpen])

  const deleteBox = useMutation({ mutationFn: async () => {
    const paths = (photos.data ?? []).map((photo) => photo.storage_path)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('box-photos').remove(paths)
      if (storageError) throw storageError
    }
    const { error } = await supabase.rpc('archive_box', { p_box_id: boxId })
    if (error) throw error
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.boxes(householdId) }); showToast('Box deleted'); navigate('/boxes') } })

  if (box.isLoading || inventory.isLoading) return <LoadingScreen label="Opening box…" />
  if (box.error || !box.data) return <ErrorPanel title="Box not found" message={errorMessage(box.error)} retry={() => void box.refetch()} />

  function confirmDelete() {
    if (window.confirm(`Delete “${box.data!.name}” and its current inventory and photos? Movement history will be retained.`)) deleteBox.mutate()
  }

  function printLabel() {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) return showToast('Allow pop-ups to print a label', 'error')
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(box.data!.name)}</title><style>@page{size:100mm 62mm;margin:5mm}body{font-family:system-ui;text-align:center;margin:0;color:#000}h1{font-size:20px;margin:0 0 4px}p{font-size:12px;margin:2px}img{width:38mm;height:38mm}</style></head><body><h1>${escapeHtml(box.data!.name)}</h1><p>${escapeHtml(box.data!.location?.name ?? '')} · ${escapeHtml(box.data!.category?.name ?? '')}</p><img src="${qrUrl}" alt="QR code"><script>onload=()=>print()</script></body></html>`)
    popup.document.close()
  }

  return <>
    <Link to="/boxes" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" />All boxes</Link>
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{box.data.name}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{box.data.location?.name}</span><span className="flex items-center gap-2"><Tag className="h-4 w-4" />{box.data.category?.name}</span></div>{box.data.description && <p className="mt-4 max-w-2xl text-zinc-300">{box.data.description}</p>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditOpen(true)}><Edit3 className="h-4 w-4" />Edit</Button><Button variant="outline" onClick={() => setQrOpen(true)}><QrCode className="h-4 w-4" />QR label</Button><Button variant="ghost" size="icon" aria-label="Delete box" onClick={confirmDelete} disabled={deleteBox.isPending}><Trash2 className="h-4 w-4" /></Button></div></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Current contents</h2><p className="text-sm text-zinc-500">Quantities reflect all recorded movements.</p></div><Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add</Button></div>{inventory.data?.length ? <div className="space-y-3">{inventory.data.map((balance) => <Card key={balance.id}><CardContent className="flex items-center gap-3 py-4"><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{balance.item.name}</h3>{balance.item.description && <p className="truncate text-xs text-zinc-500">{balance.item.description}</p>}</div><span className="rounded-lg bg-zinc-800 px-3 py-1 font-mono text-sm">×{balance.quantity}</span><Button variant="outline" size="sm" onClick={() => setAdjusting(balance)}><ArrowRightLeft className="h-4 w-4" />Move</Button></CardContent></Card>)}</div> : <EmptyState title="This box is empty" message="Add an item to start tracking its quantity." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add item</Button>} />}</section>
      <aside className="space-y-6"><PhotoSection boxId={boxId} householdId={householdId} userId={user!.id} photos={photos.data ?? []} loading={photos.isLoading} onOpen={setPhotoOpen} /><MovementSection movements={movements.data ?? []} loading={movements.isLoading} /></aside>
    </div>
    <EditBoxDialog open={editOpen} onOpenChange={setEditOpen} box={box.data} locations={locations.data ?? []} categories={categories.data ?? []} />
    <AddItemDialog open={addOpen} onOpenChange={setAddOpen} boxId={boxId} householdId={householdId} items={items.data ?? []} />
    <AdjustItemDialog open={Boolean(adjusting)} onOpenChange={(open) => !open && setAdjusting(null)} boxId={boxId} balance={adjusting} boxes={(allBoxes.data ?? []).filter((candidate) => candidate.id !== boxId)} />
    <Dialog open={qrOpen} onOpenChange={setQrOpen} title={`QR label for ${box.data.name}`}><div className="text-center">{qrUrl && <img src={qrUrl} alt={`QR code for ${box.data.name}`} className="mx-auto w-full max-w-xs rounded-xl bg-white p-3" />}<div className="mt-5 grid gap-2 sm:grid-cols-2"><a download={`${box.data.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`} href={qrUrl}><Button variant="outline" className="w-full"><Download className="h-4 w-4" />Download PNG</Button></a><Button onClick={printLabel}><Printer className="h-4 w-4" />Print label</Button></div></div></Dialog>
    <Dialog open={Boolean(photoOpen)} onOpenChange={(open) => !open && setPhotoOpen(null)} title="Box photo" className="max-w-4xl">{photoOpen && <img src={photoOpen} alt="Full-size box content" className="max-h-[75dvh] w-full rounded-xl object-contain" />}</Dialog>
  </>
}

function AddItemDialog({ open, onOpenChange, boxId, householdId, items }: { open: boolean; onOpenChange: (open: boolean) => void; boxId: string; householdId: string; items: Array<{ id: string; name: string }>; }) {
  const [existingId, setExistingId] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const client = useQueryClient()
  const { showToast } = useToast()
  const add = useMutation({ mutationFn: async () => {
    let itemId = existingId
    if (!itemId) {
      const { data, error } = await supabase.from('items').insert({ household_id: householdId, name: name.trim() }).select('id').single()
      if (error) throw error
      itemId = data.id
    }
    await recordMovement({ itemId, toBoxId: boxId, quantity, note })
  }, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: queryKeys.inventory(boxId) }), client.invalidateQueries({ queryKey: queryKeys.movements(boxId) }), client.invalidateQueries({ queryKey: queryKeys.items(householdId) }), client.invalidateQueries({ queryKey: queryKeys.boxes(householdId) })]); showToast('Inventory added'); onOpenChange(false); setExistingId(''); setName(''); setQuantity(1); setNote('') } })
  function submit(event: FormEvent) { event.preventDefault(); add.mutate() }
  return <Dialog open={open} onOpenChange={onOpenChange} title="Add inventory" description="Select a known item or explicitly create a new one."><form className="space-y-4" onSubmit={submit}><div><Label htmlFor="known-item">Existing item</Label><Select id="known-item" value={existingId} onChange={(event) => { setExistingId(event.target.value); if (event.target.value) setName('') }}><option value="">Create a distinct item…</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>{!existingId && <div><Label htmlFor="new-item">New item name</Label><Input id="new-item" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></div>}<div><Label htmlFor="add-quantity">Quantity</Label><Input id="add-quantity" type="number" min={1} max={999999} required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div><div><Label htmlFor="add-note">Note</Label><Input id="add-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reason or detail" /></div>{add.error && <p role="alert" className="text-sm text-red-300">{errorMessage(add.error)}</p>}<Button type="submit" className="w-full" disabled={add.isPending || (!existingId && !name.trim())}>{add.isPending ? 'Adding…' : 'Add to box'}</Button></form></Dialog>
}

function AdjustItemDialog({ open, onOpenChange, boxId, balance, boxes }: { open: boolean; onOpenChange: (open: boolean) => void; boxId: string; balance: InventoryBalance | null; boxes: Array<{ id: string; name: string }> }) {
  const [kind, setKind] = useState<Exclude<MovementKind, 'add'>>('remove')
  const [quantity, setQuantity] = useState(1)
  const [destination, setDestination] = useState('')
  const [note, setNote] = useState('')
  const client = useQueryClient()
  const { showToast } = useToast()
  const adjust = useMutation({ mutationFn: () => recordMovement({ itemId: balance!.item_id, fromBoxId: boxId, toBoxId: kind === 'transfer' ? destination : null, quantity, note }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['inventory'] }), client.invalidateQueries({ queryKey: ['movements'] }), client.invalidateQueries({ queryKey: ['boxes'] })]); showToast(kind === 'remove' ? 'Inventory removed' : 'Inventory transferred'); onOpenChange(false); setQuantity(1); setDestination(''); setNote('') } })
  function submit(event: FormEvent) { event.preventDefault(); adjust.mutate() }
  return <Dialog open={open} onOpenChange={onOpenChange} title={`Move ${balance?.item.name ?? 'item'}`} description={`Up to ${balance?.quantity ?? 0} currently available.`}><form className="space-y-4" onSubmit={submit}><div className="grid grid-cols-2 gap-2"><Button type="button" variant={kind === 'remove' ? 'default' : 'outline'} onClick={() => setKind('remove')}><Minus className="h-4 w-4" />Remove</Button><Button type="button" variant={kind === 'transfer' ? 'default' : 'outline'} onClick={() => setKind('transfer')}><ArrowRightLeft className="h-4 w-4" />Transfer</Button></div>{kind === 'transfer' && <div><Label htmlFor="destination">Destination box</Label><Select id="destination" required value={destination} onChange={(event) => setDestination(event.target.value)}><option value="">Choose…</option>{boxes.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</Select></div>}<div><Label htmlFor="move-quantity">Quantity</Label><Input id="move-quantity" type="number" min={1} max={balance?.quantity ?? 1} required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div><div><Label htmlFor="move-note">Note</Label><Input id="move-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></div>{adjust.error && <p role="alert" className="text-sm text-red-300">{errorMessage(adjust.error)}</p>}<Button type="submit" className="w-full" disabled={adjust.isPending || quantity < 1 || quantity > (balance?.quantity ?? 0) || (kind === 'transfer' && !destination)}>{adjust.isPending ? 'Saving…' : kind === 'remove' ? 'Remove from box' : 'Transfer inventory'}</Button></form></Dialog>
}

function MovementSection({ movements, loading }: { movements: Array<{ id: string; kind: MovementKind; quantity: number; created_at: string; note: string | null; item?: { name: string } | null; from_box?: { name: string } | null; to_box?: { name: string } | null }>; loading: boolean }) {
  return <Card><CardHeader><h2 className="font-bold">Recent movement</h2></CardHeader><CardContent>{loading ? <p className="text-sm text-zinc-500">Loading history…</p> : movements.length ? <ol className="space-y-4">{movements.slice(0, 12).map((movement) => <li key={movement.id} className="border-l border-zinc-700 pl-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{movement.item?.name}</p><span className="rounded bg-zinc-800 px-2 py-0.5 text-xs uppercase text-zinc-400">{movement.kind}</span></div><p className="mt-1 text-xs text-zinc-500">×{movement.quantity}{movement.kind === 'transfer' && ` · ${movement.from_box?.name} → ${movement.to_box?.name}`} · {formatDate(movement.created_at)}</p>{movement.note && <p className="mt-1 text-xs text-zinc-400">{movement.note}</p>}</li>)}</ol> : <p className="text-sm text-zinc-500">No movements yet.</p>}</CardContent></Card>
}

function PhotoSection({ boxId, householdId, userId, photos, loading, onOpen }: { boxId: string; householdId: string; userId: string; photos: Array<{ id: string; storage_path: string; signed_url?: string; original_name: string }>; loading: boolean; onOpen: (url: string) => void }) {
  const client = useQueryClient()
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  async function upload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const valid = Array.from(files).filter((file) => {
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { showToast(`${file.name} must be an image under 5 MB`, 'error'); return false }
        return true
      })
      const created = await Promise.all(valid.map(async (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
        const path = `${householdId}/${boxId}/${crypto.randomUUID()}.${extension}`
        const { error: storageError } = await supabase.storage.from('box-photos').upload(path, file, { contentType: file.type, upsert: false })
        if (storageError) throw storageError
        const { error: databaseError } = await supabase.from('photos').insert({ household_id: householdId, box_id: boxId, storage_path: path, original_name: file.name, mime_type: file.type, size_bytes: file.size, created_by: userId })
        if (databaseError) { await supabase.storage.from('box-photos').remove([path]); throw databaseError }
        return path
      }))
      if (created.length) showToast(`${created.length} photo${created.length === 1 ? '' : 's'} uploaded`)
      await client.invalidateQueries({ queryKey: queryKeys.photos(boxId) })
    } catch (error) { showToast(errorMessage(error), 'error') } finally { setUploading(false) }
  }
  async function remove(photo: { id: string; storage_path: string }) {
    if (!window.confirm('Delete this photo?')) return
    const { error: storageError } = await supabase.storage.from('box-photos').remove([photo.storage_path])
    if (storageError) return showToast(errorMessage(storageError), 'error')
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (error) return showToast(errorMessage(error), 'error')
    await client.invalidateQueries({ queryKey: queryKeys.photos(boxId) })
    showToast('Photo deleted')
  }
  return <Card><CardHeader className="flex-row items-center justify-between"><h2 className="font-bold">Photos</h2><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 px-3 text-xs font-semibold hover:bg-zinc-800"><ImagePlus className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload'}<input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(event) => { void upload(event.target.files); event.target.value = '' }} /></label></CardHeader><CardContent>{loading ? <p className="text-sm text-zinc-500">Loading photos…</p> : photos.length ? <div className="grid grid-cols-3 gap-2">{photos.map((photo) => <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-950"><button className="h-full w-full" onClick={() => photo.signed_url && onOpen(photo.signed_url)}><img src={photo.signed_url} alt={photo.original_name} className="h-full w-full object-cover" /></button><button onClick={() => void remove(photo)} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-lg bg-black/70 opacity-100 hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Delete ${photo.original_name}`}><Trash2 className="h-4 w-4" /></button></div>)}</div> : <p className="text-sm text-zinc-500">No photos yet.</p>}</CardContent></Card>
}

function EditBoxDialog({ open, onOpenChange, box, locations, categories }: { open: boolean; onOpenChange: (open: boolean) => void; box: { id: string; household_id: string; name: string; description: string | null; location_id: string; category_id: string }; locations: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }> }) {
  const [name, setName] = useState(box.name)
  const [description, setDescription] = useState(box.description ?? '')
  const [locationId, setLocationId] = useState(box.location_id)
  const [categoryId, setCategoryId] = useState(box.category_id)
  const client = useQueryClient()
  const { showToast } = useToast()
  useEffect(() => { if (open) { setName(box.name); setDescription(box.description ?? ''); setLocationId(box.location_id); setCategoryId(box.category_id) } }, [box, open])
  const update = useMutation({ mutationFn: async () => { const { error } = await supabase.from('boxes').update({ name: name.trim(), description: description.trim() || null, location_id: locationId, category_id: categoryId }).eq('id', box.id); if (error) throw error }, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: queryKeys.box(box.id) }), client.invalidateQueries({ queryKey: queryKeys.boxes(box.household_id) })]); showToast('Box updated'); onOpenChange(false) } })
  return <Dialog open={open} onOpenChange={onOpenChange} title="Edit box"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); update.mutate() }}><div><Label htmlFor="edit-name">Name</Label><Input id="edit-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="edit-location">Location</Label><Select id="edit-location" required value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></div><div><Label htmlFor="edit-category">Category</Label><Select id="edit-category" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></div></div><div><Label htmlFor="edit-description">Description</Label><Textarea id="edit-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>{update.error && <p role="alert" className="text-sm text-red-300">{errorMessage(update.error)}</p>}<Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button></form></Dialog>
}
