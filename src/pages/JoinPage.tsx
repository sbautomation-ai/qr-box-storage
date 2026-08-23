import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CircleAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { errorMessage, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export function JoinPage() {
  const { token = '' } = useParams()
  const { membership, refreshMembership } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  useEffect(() => { if (membership) setAccepted(true) }, [membership])
  if (accepted && membership) return <Navigate to="/boxes" replace />

  async function accept() {
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('accept_household_invite', { p_token: token })
    if (rpcError) {
      setError(errorMessage(rpcError))
      setBusy(false)
      return
    }
    await refreshMembership()
    navigate('/boxes', { replace: true })
  }

  return <main className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-zinc-100"><Card className="w-full max-w-md"><CardHeader className="text-center"><Users className="mx-auto h-10 w-10" /><h1 className="mt-4 text-2xl font-bold">Join this household</h1><p className="mt-2 text-sm text-zinc-400">Your signed-in Google email must match the invitation.</p></CardHeader><CardContent>{error && <div className="mb-4 flex gap-2 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"><CircleAlert className="h-5 w-5 shrink-0" />{error}</div>}<Button className="w-full" disabled={busy || !token} onClick={() => void accept()}>{busy ? 'Joining…' : 'Accept invitation'}</Button></CardContent></Card></main>
}
