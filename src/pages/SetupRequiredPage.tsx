import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Box } from 'lucide-react'
import { AccountLayout } from '@/components/AccountLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { safeReturnTo } from '@/lib/auth'
import { errorMessage, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export function SetupRequiredPage() {
  const { user, membership, refreshMembership, signOut } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (membership) return <Navigate to={returnTo === '/setup-required' ? '/boxes' : returnTo} replace />

  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: createError } = await supabase.rpc('create_my_household', { p_name: name.trim() })
      if (createError) throw createError
      await refreshMembership()
      navigate(returnTo === '/setup-required' ? '/boxes' : returnTo, { replace: true })
    } catch (createError) {
      setError(errorMessage(createError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout>
      <Card className="sm:p-4">
        <CardHeader>
          <Box className="mb-4 h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="page-title">Create your household</h1>
          <p className="mt-2 break-all text-muted-foreground">Signed in as {user?.email}</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={create}>
            <div><Label htmlFor="household-name">Household name</Label><Input className="mt-1.5" id="household-name" placeholder="e.g. Our Home" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} required /></div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create household'}</Button>
          </form>
          <p className="mt-5 text-sm text-muted-foreground">Joining someone else’s household? Open the invitation link they shared with you.</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <button className="underline underline-offset-4" type="button" onClick={() => void signOut()}>Use another account</button>
            <Link className="underline underline-offset-4" to="/account/delete">Delete account</Link>
          </div>
        </CardContent>
      </Card>
    </AccountLayout>
  )
}
