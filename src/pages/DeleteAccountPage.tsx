import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLink } from '@/components/BrandLink'
import { LoadingScreen } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authLink } from '@/lib/auth'
import { errorMessage, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

const primaryLink = 'inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200'

export function DeleteAccountPage() {
  const { session, user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)

  if (loading) return <LoadingScreen label="Checking your session…" />

  async function deleteAccount(event: FormEvent) {
    event.preventDefault()
    if (confirmation !== 'DELETE') return
    setBusy(true)
    setError('')
    try {
      const { error: deletionError } = await supabase.rpc('delete_my_account')
      if (deletionError) throw deletionError
      setDeleted(true)
      await signOut()
      navigate('/account/delete', { replace: true })
    } catch (deletionError) {
      setError(errorMessage(deletionError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-zinc-100">
      <div className="w-full max-w-xl">
        <div className="mb-6"><BrandLink /></div>
        <Card>
          <CardHeader><h1 className="text-2xl font-bold">{deleted ? 'Account deleted' : 'Delete your account'}</h1></CardHeader>
          <CardContent className="space-y-4">
            {deleted ? <><p role="status">Your QR Box Storage account has been deleted.</p><Link className={primaryLink} to="/">Back to the homepage</Link></> : <>
              <p className="text-zinc-300">Deleting your account removes your access and personal account details. Shared inventory stays with the household. If you’re the only person in the household, its boxes, inventory and photos are deleted as well.</p>
              {session ? (
                <form className="space-y-4" onSubmit={deleteAccount}>
                  <p className="break-all text-sm text-zinc-400">Signed in as {user?.email}</p>
                  <div><Label htmlFor="delete-confirmation">Type DELETE to confirm</Label><Input className="mt-1.5" id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required /></div>
                  {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="danger" type="submit" disabled={busy || confirmation !== 'DELETE'}>{busy ? 'Deleting…' : 'Permanently delete account'}</Button>
                    <Link className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 px-4 text-sm font-semibold" to="/settings">Back to Settings</Link>
                  </div>
                </form>
              ) : <Link className={primaryLink} to={authLink('login', '/account/delete')}>Log in to delete your account</Link>}
            </>}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
