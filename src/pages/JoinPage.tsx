import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CircleAlert, Users } from 'lucide-react'
import { AccountLayout } from '@/components/AccountLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { errorMessage, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export function JoinPage() {
  const { token = '' } = useParams()
  const { membership, refreshMembership, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (membership) return <Navigate to="/boxes" replace />

  async function accept() {
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('accept_household_invite', { p_token: token })
    if (rpcError) {
      setError(errorMessage(rpcError))
      setBusy(false)
      return
    }
    try {
      await refreshMembership()
      navigate('/boxes', { replace: true })
    } catch (refreshError) {
      setError(errorMessage(refreshError))
      setBusy(false)
    }
  }

  return (
    <AccountLayout>
      <Card className="sm:p-4">
        <CardHeader>
          <Users className="mb-4 h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="page-title">Join this household</h1>
          <p className="mt-2 text-muted-foreground">Sign in with the email address that received the invitation.</p>
        </CardHeader>
        <CardContent>
          {error && <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm text-danger"><CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />{error}</div>}
          <Button className="w-full" disabled={busy || !token} onClick={() => void accept()}>{busy ? 'Joining…' : 'Accept invitation'}</Button>
          <p className="mt-4 break-words text-sm text-muted-foreground">
            Signed in as {user?.email}. <button type="button" className="text-primary underline underline-offset-4" onClick={() => void signOut()}>Use another account</button>
          </p>
        </CardContent>
      </Card>
    </AccountLayout>
  )
}
