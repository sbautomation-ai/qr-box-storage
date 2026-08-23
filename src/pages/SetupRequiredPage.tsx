import { Clipboard, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

export function SetupRequiredPage() {
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  return <main className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-zinc-100"><Card className="w-full max-w-xl"><CardHeader><ShieldAlert className="h-10 w-10 text-amber-400" /><h1 className="mt-4 text-2xl font-bold">Household access required</h1><p className="mt-2 text-zinc-400">This Google account has authenticated successfully but has not joined a household.</p></CardHeader><CardContent><dl className="rounded-xl bg-zinc-950 p-4 text-sm"><dt className="text-zinc-500">Email</dt><dd>{user?.email}</dd><dt className="mt-3 text-zinc-500">User ID for owner bootstrap</dt><dd className="mt-1 break-all font-mono text-xs">{user?.id}</dd></dl><div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={() => { void navigator.clipboard.writeText(user?.id ?? ''); showToast('User ID copied') }}><Clipboard className="h-4 w-4" />Copy user ID</Button><Button variant="outline" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Use another account</Button></div><p className="mt-5 text-xs leading-relaxed text-zinc-500">For a new installation, run the documented owner bootstrap SQL with this user ID. Otherwise ask the household owner for an invitation link.</p></CardContent></Card></main>
}
