export type Role = 'owner' | 'member'

export type Household = {
  id: string
  name: string
  created_at: string
}

export type Membership = {
  household_id: string
  user_id: string
  role: Role
  email: string
  display_name: string | null
  joined_at: string
  household?: Household
}

export type NamedResource = {
  id: string
  household_id: string
  name: string
  created_at: string
}

export type BoxRecord = {
  id: string
  household_id: string
  name: string
  description: string | null
  location_id: string
  category_id: string
  created_by: string
  created_at: string
  updated_at: string
  location?: Pick<NamedResource, 'id' | 'name'> | null
  category?: Pick<NamedResource, 'id' | 'name'> | null
  box_inventory?: Array<{
    quantity: number
    item: { id: string; name: string } | null
  }>
}

export type Item = {
  id: string
  household_id: string
  name: string
  description: string | null
  created_at: string
}

export type InventoryBalance = {
  id: string
  household_id: string
  box_id: string
  item_id: string
  quantity: number
  updated_at: string
  item: Item
}

export type MovementKind = 'add' | 'remove' | 'transfer'

export type InventoryMovement = {
  id: string
  household_id: string
  item_id: string
  from_box_id: string | null
  to_box_id: string | null
  quantity: number
  kind: MovementKind
  note: string | null
  created_by: string
  created_at: string
  item?: Pick<Item, 'id' | 'name'> | null
  from_box?: Pick<BoxRecord, 'id' | 'name'> | null
  to_box?: Pick<BoxRecord, 'id' | 'name'> | null
}

export type Photo = {
  id: string
  household_id: string
  box_id: string
  storage_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  created_by: string
  created_at: string
  signed_url?: string
}

export type HouseholdInvite = {
  id: string
  household_id: string
  email: string
  role: Role
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}
