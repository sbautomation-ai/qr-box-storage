import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clipboard, MapPin, Plus, Tag, Trash2, UserMinus, Users } from 'lucide-react'
import { ErrorPanel, LoadingScreen } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { queryKeys, useCategories, useInvites, useLocations, useMembers } from '@/hooks/useData'
import { appUrl, errorMessage, supabase } from '@/lib/supabase'
import { formatDate, sha256 } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import type { NamedResource } from '@/types'

export function SettingsPage() {
  const { membership } = useAuth()
  const currentMembership = membership!
  const householdId = currentMembership.household_id
  const locations = useLocations(householdId)
  const categories = useCategories(householdId)
  if (locations.isLoading || categories.isLoading) return <LoadingScreen label="Loading settings…" />
  if (locations.error || categories.error) return <ErrorPanel message={errorMessage(locations.error || categories.error)} />
  return <><div className="mb-8"><p className="text-sm font-medium text-zinc-500">{currentMembership.household?.name}</p><h1 className="mt-1 text-3xl font-bold">Settings</h1><p className="mt-2 text-zinc-400">Keep shared labels tidy and manage who can access this household.</p></div><div className="grid gap-6 lg:grid-cols-2"><ResourceManager title="Locations" icon={<MapPin className="h-5 w-5" />} table="locations" householdId={householdId} resources={locations.data ?? []} /><ResourceManager title="Categories" icon={<Tag className="h-5 w-5" />} table="categories" householdId={householdId} resources={categories.data ?? []} /></div>{currentMembership.role === 'owner' ? <MemberManager householdId={householdId} currentUserId={currentMembership.user_id} /> : <Card className="mt-6"><CardHeader><h2 className="font-bold">Household members</h2></CardHeader><CardContent><p className="text-sm text-zinc-400">Only the household owner can invite or remove members.</p></CardContent></Card>}</>
}

function ResourceManager({ title, icon, table, householdId, resources }: { title: string; icon: ReactNode; table: 'locations' | 'categories'; householdId: string; resources: NamedResource[] }) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<NamedResource | null>(null)
  const client = useQueryClient()
  const { showToast } = useToast()
  const key = table === 'locations' ? queryKeys.locations(householdId) : queryKeys.categories(householdId)
  const save = useMutation({ mutationFn: async () => {
    const query = editing ? supabase.from(table).update({ name: name.trim() }).eq('id', editing.id) : supabase.from(table).insert({ household_id: householdId, name: name.trim() })
    const { error } = await query
    if (error) throw error
  }, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: queryKeys.boxes(householdId) })]); const singularTitle = title.endsWith('ies') ? `${title.slice(0, -3)}y` : title.slice(0, -1); showToast(`${singularTitle} ${editing ? 'renamed' : 'added'}`); setName(''); setEditing(null) } })
  const remove = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error }, onSuccess: async () => { await client.invalidateQueries({ queryKey: key }); showToast(`${title.slice(0, -1)} deleted`) }, onError: (error) => showToast(errorMessage(error).includes('foreign key') ? `This ${title.slice(0, -1).toLowerCase()} is in use and cannot be deleted.` : errorMessage(error), 'error') })
  function submit(event: FormEvent) { event.preventDefault(); if (name.trim()) save.mutate() }
  return <Card><CardHeader><h2 className="flex items-center gap-2 font-bold">{icon}{title}</h2></CardHeader><CardContent><form onSubmit={submit} className="mb-4 flex gap-2"><Input aria-label={`${editing ? 'Rename' : 'Add'} ${title.toLowerCase()}`} placeholder={editing ? `Rename ${editing.name}` : `Add ${title.toLowerCase()}…`} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /><Button type="submit" disabled={save.isPending || !name.trim()}><Plus className="h-4 w-4" />{editing ? 'Save' : 'Add'}</Button></form>{save.error && <p className="mb-3 text-sm text-red-300">{errorMessage(save.error)}</p>}<ul className="divide-y divide-zinc-800">{resources.map((resource) => <li key={resource.id} className="flex min-h-12 items-center justify-between gap-2"><button className="flex-1 text-left text-sm hover:text-white" onClick={() => { setEditing(resource); setName(resource.name) }}>{resource.name}</button><Button variant="ghost" size="icon" aria-label={`Delete ${resource.name}`} onClick={() => remove.mutate(resource.id)}><Trash2 className="h-4 w-4" /></Button></li>)}{!resources.length && <li className="py-4 text-sm text-zinc-500">None yet.</li>}</ul></CardContent></Card>
}

function MemberManager({ householdId, currentUserId }: { householdId: string; currentUserId: string }) {
  const members = useMembers(householdId)
  const invites = useInvites(householdId)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const client = useQueryClient()
  const { showToast } = useToast()
  const invite = useMutation({ mutationFn: async () => {
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '')
    const tokenHash = await sha256(token)
    const { error } = await supabase.from('household_invites').insert({ household_id: householdId, email: email.trim().toLowerCase(), token_hash: tokenHash, role: 'member', expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() })
    if (error) throw error
    return `${appUrl()}/join/${token}`
  }, onSuccess: async (link) => { setInviteLink(link); await client.invalidateQueries({ queryKey: queryKeys.invites(householdId) }); showToast('Invitation created') } })
  const revoke = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('household_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id); if (error) throw error }, onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.invites(householdId) }); showToast('Invitation revoked') } })
  const remove = useMutation({ mutationFn: async (userId: string) => { const { error } = await supabase.rpc('remove_household_member', { p_user_id: userId }); if (error) throw error }, onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.members(householdId) }); showToast('Member removed') }, onError: (error) => showToast(errorMessage(error), 'error') })
  return <Card className="mt-6"><CardHeader className="flex-row items-center justify-between"><div><h2 className="flex items-center gap-2 font-bold"><Users className="h-5 w-5" />Household access</h2><p className="mt-1 text-sm text-zinc-500">Members can edit inventory. Invitations expire after seven days.</p></div><Button onClick={() => { setInviteOpen(true); setInviteLink(''); setEmail('') }}><Plus className="h-4 w-4" />Invite</Button></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-2"><div><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Members</h3><ul className="space-y-2">{members.data?.map((member) => <li key={member.user_id} className="flex items-center gap-3 rounded-xl bg-zinc-950 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.display_name || member.email}</p><p className="truncate text-xs text-zinc-500">{member.email} · {member.role}</p></div>{member.user_id !== currentUserId && <Button variant="ghost" size="icon" aria-label={`Remove ${member.email}`} onClick={() => { if (window.confirm(`Remove ${member.email} from this household?`)) remove.mutate(member.user_id) }}><UserMinus className="h-4 w-4" /></Button>}</li>)}</ul></div><div><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending invitations</h3><ul className="space-y-2">{invites.data?.filter((entry) => !entry.accepted_at && !entry.revoked_at).map((entry) => <li key={entry.id} className="flex items-center gap-3 rounded-xl bg-zinc-950 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm">{entry.email}</p><p className="text-xs text-zinc-500">Expires {formatDate(entry.expires_at)}</p></div><Button variant="ghost" size="icon" aria-label={`Revoke invitation for ${entry.email}`} onClick={() => revoke.mutate(entry.id)}><Trash2 className="h-4 w-4" /></Button></li>)}{!invites.data?.some((entry) => !entry.accepted_at && !entry.revoked_at) && <li className="text-sm text-zinc-500">No pending invitations.</li>}</ul></div></div></CardContent><Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Invite a family member" description="Their Google account email must exactly match this address.">{inviteLink ? <div><Label htmlFor="invite-link">Share this single-use link</Label><div className="flex gap-2"><Input id="invite-link" readOnly value={inviteLink} /><Button onClick={() => { void navigator.clipboard.writeText(inviteLink); showToast('Invitation link copied') }}><Clipboard className="h-4 w-4" />Copy</Button></div><p className="mt-3 text-xs text-zinc-500">For security, this full link is only shown now. Revoke and create another if it is lost.</p></div> : <form onSubmit={(event) => { event.preventDefault(); invite.mutate() }} className="space-y-4"><div><Label htmlFor="invite-email">Google email address</Label><Input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>{invite.error && <p className="text-sm text-red-300">{errorMessage(invite.error)}</p>}<Button type="submit" className="w-full" disabled={invite.isPending}>{invite.isPending ? 'Creating…' : 'Create invitation'}</Button></form>}</Dialog></Card>
}
