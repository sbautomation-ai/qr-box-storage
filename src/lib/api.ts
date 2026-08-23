import { supabase } from './supabase'
import type { BoxRecord, HouseholdInvite, InventoryBalance, InventoryMovement, Item, Membership, NamedResource, Photo } from '@/types'

export async function getBoxes(householdId: string) {
  const { data, error } = await supabase
    .from('boxes')
    .select('*,location:locations(id,name),category:categories(id,name),box_inventory(quantity,item:items(id,name))')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as BoxRecord[]
}

export async function getBox(boxId: string) {
  const { data, error } = await supabase
    .from('boxes')
    .select('*,location:locations(id,name),category:categories(id,name)')
    .eq('id', boxId)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data as unknown as BoxRecord
}

export async function getNamedResources(table: 'locations' | 'categories', householdId: string) {
  const { data, error } = await supabase.from(table).select('*').eq('household_id', householdId).order('name')
  if (error) throw error
  return data as NamedResource[]
}

export async function getItems(householdId: string) {
  const { data, error } = await supabase.from('items').select('*').eq('household_id', householdId).order('name')
  if (error) throw error
  return data as Item[]
}

export async function getInventory(boxId: string) {
  const { data, error } = await supabase
    .from('box_inventory')
    .select('*,item:items(*)')
    .eq('box_id', boxId)
    .gt('quantity', 0)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as InventoryBalance[]
}

export async function getMovements(boxId: string) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*,item:items(id,name),from_box:boxes!inventory_movements_from_box_id_fkey(id,name),to_box:boxes!inventory_movements_to_box_id_fkey(id,name)')
    .or(`from_box_id.eq.${boxId},to_box_id.eq.${boxId}`)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as unknown as InventoryMovement[]
}

export async function getPhotos(boxId: string) {
  const { data, error } = await supabase.from('photos').select('*').eq('box_id', boxId).order('created_at', { ascending: false })
  if (error) throw error
  const photos = data as Photo[]
  if (!photos.length) return photos
  const { data: urls, error: urlError } = await supabase.storage.from('box-photos').createSignedUrls(photos.map((photo) => photo.storage_path), 3600)
  if (urlError) throw urlError
  return photos.map((photo, index) => ({ ...photo, signed_url: urls[index]?.signedUrl }))
}

export async function recordMovement(input: {
  itemId: string
  fromBoxId?: string | null
  toBoxId?: string | null
  quantity: number
  note?: string
}) {
  const { data, error } = await supabase.rpc('record_inventory_movement', {
    p_item_id: input.itemId,
    p_from_box_id: input.fromBoxId ?? null,
    p_to_box_id: input.toBoxId ?? null,
    p_quantity: input.quantity,
    p_note: input.note?.trim() || null,
  })
  if (error) throw error
  return data as string
}

export async function getMembers(householdId: string) {
  const { data, error } = await supabase.from('household_members').select('*').eq('household_id', householdId).order('joined_at')
  if (error) throw error
  return data as Membership[]
}

export async function getInvites(householdId: string) {
  const { data, error } = await supabase.from('household_invites').select('id,household_id,email,role,expires_at,accepted_at,revoked_at,created_at').eq('household_id', householdId).order('created_at', { ascending: false })
  if (error) throw error
  return data as HouseholdInvite[]
}
