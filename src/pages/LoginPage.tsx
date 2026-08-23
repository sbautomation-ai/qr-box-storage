import { Box, Chrome, ShieldCheck } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { configurationError, errorMessage, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useState } from 'react'

export function LoginPage() {
  const { session, membership } = useAuth()
  const [params] = useSearchParams()
  const [error, setError] = useState(configurationError)
  const [busy, setBusy] = useState(false)
  const returnTo = params.get('returnTo') || '/boxes'

  if (session && membership) return <Navigate to={returnTo} replace />

  async function signIn() {
    setBusy(true)
    setError(null)
    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('returnTo', returnTo.startsWith('/') ? returnTo : '/boxes')
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    })
    if (authError) {
      setError(errorMessage(authError))
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-zinc-100">
      <Card className="w-full max-w-md bg-zinc-900">
        <CardHeader className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-zinc-950"><Box className="h-7 w-7" /></div>
          <h1 className="mt-5 text-3xl font-bold">QR Box Storage</h1>
          <p className="mt-2 text-sm text-zinc-400">Private household inventory that is always one scan away.</p>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200" role="alert">{error}</p>}
          <Button className="w-full" onClick={() => void signIn()} disabled={busy || Boolean(configurationError)}><Chrome className="h-5 w-5" />{busy ? 'Opening Google…' : 'Continue with Google'}</Button>
          <div className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-zinc-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Only invited Google accounts can access a household. Box contents and photos remain private.</p></div>
          <p className="mt-4 text-center text-xs text-zinc-500"><a className="underline underline-offset-4 hover:text-zinc-200" href="/privacy">Privacy policy</a></p>
        </CardContent>
      </Card>
    </main>
  )
}
