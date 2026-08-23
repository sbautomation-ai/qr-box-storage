import { useQuery } from '@tanstack/react-query'
import { getBox, getBoxes, getInventory, getInvites, getItems, getMembers, getMovements, getNamedResources, getPhotos } from '@/lib/api'

export const queryKeys = {
  boxes: (householdId: string) => ['boxes', householdId] as const,
  box: (boxId: string) => ['box', boxId] as const,
  locations: (householdId: string) => ['locations', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  items: (householdId: string) => ['items', householdId] as const,
  inventory: (boxId: string) => ['inventory', boxId] as const,
  movements: (boxId: string) => ['movements', boxId] as const,
  photos: (boxId: string) => ['photos', boxId] as const,
  members: (householdId: string) => ['members', householdId] as const,
  invites: (householdId: string) => ['invites', householdId] as const,
}

export const useBoxes = (householdId: string) => useQuery({ queryKey: queryKeys.boxes(householdId), queryFn: () => getBoxes(householdId), enabled: Boolean(householdId) })
export const useBox = (boxId: string) => useQuery({ queryKey: queryKeys.box(boxId), queryFn: () => getBox(boxId), enabled: Boolean(boxId) })
export const useLocations = (householdId: string) => useQuery({ queryKey: queryKeys.locations(householdId), queryFn: () => getNamedResources('locations', householdId), enabled: Boolean(householdId) })
export const useCategories = (householdId: string) => useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => getNamedResources('categories', householdId), enabled: Boolean(householdId) })
export const useItems = (householdId: string) => useQuery({ queryKey: queryKeys.items(householdId), queryFn: () => getItems(householdId), enabled: Boolean(householdId) })
export const useInventory = (boxId: string) => useQuery({ queryKey: queryKeys.inventory(boxId), queryFn: () => getInventory(boxId), enabled: Boolean(boxId) })
export const useMovements = (boxId: string) => useQuery({ queryKey: queryKeys.movements(boxId), queryFn: () => getMovements(boxId), enabled: Boolean(boxId) })
export const usePhotos = (boxId: string) => useQuery({ queryKey: queryKeys.photos(boxId), queryFn: () => getPhotos(boxId), enabled: Boolean(boxId) })
export const useMembers = (householdId: string) => useQuery({ queryKey: queryKeys.members(householdId), queryFn: () => getMembers(householdId), enabled: Boolean(householdId) })
export const useInvites = (householdId: string) => useQuery({ queryKey: queryKeys.invites(householdId), queryFn: () => getInvites(householdId), enabled: Boolean(householdId) })
