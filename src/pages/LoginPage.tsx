import { useState, type FormEvent } from 'react'
import { Navigate, Link, useSearchParams } from 'react-router-dom'
import { AccountLayout } from '@/components/AccountLayout'
import { InventoryPreview } from '@/components/InventoryPreview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authLink, safeReturnTo } from '@/lib/auth'
import { configurationError, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

const emailAuthEnabled = import.meta.env.DEV || import.meta.env.VITE_EMAIL_AUTH_ENABLED === 'true'

export function LoginPage({ mode = 'login' }: { mode?: 'login' | 'signup' }) {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const signup = mode === 'signup'
  const returnTo = safeReturnTo(params.get('returnTo'))
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(params.has('error') ? 'Sign-in couldn’t be completed. Please try again.' : '')

  if (session) return <Navigate to={returnTo} replace />

  function callbackUrl() {
    const url = new URL('/auth/callback', window.location.origin)
    url.searchParams.set('returnTo', returnTo)
    return url.toString()
  }

  async function google() {
    setBusy(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl() },
      })
      if (authError) throw authError
    } catch {
      setError(emailAuthEnabled ? 'Google sign-in is unavailable. Try again or use email.' : 'Google sign-in is unavailable. Try again in a moment.')
      setBusy(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (sentEmail) {
        const { error: codeError } = await supabase.auth.verifyOtp({ email: sentEmail, token: code.trim(), type: 'email' })
        if (codeError) throw codeError
      } else {
        const address = email.trim().toLowerCase()
        const { error: sendError } = await supabase.auth.signInWithOtp({
          email: address,
          options: { shouldCreateUser: signup, emailRedirectTo: callbackUrl() },
        })
        if (sendError && sendError.code !== 'otp_disabled') throw sendError
        setSentEmail(address)
      }
    } catch {
      setError(sentEmail
        ? 'That code is invalid or expired. Request a new code and try again.'
        : 'We couldn’t send a sign-in code. Wait a moment and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout preview={<InventoryPreview />}>
        <Card className="sm:p-4">
          <CardHeader>
            <h1 className="page-title">{signup ? 'Create your account' : 'Log in'}</h1>
            <p className="mt-2 text-muted-foreground">{signup ? 'Start a household or use an invitation to join one.' : 'Open your private household inventory.'}</p>
          </CardHeader>
          <CardContent>
            {(configurationError || error) && <p role="alert" className="mb-4 rounded-lg bg-danger-surface p-3 text-sm text-danger">{configurationError || error}</p>}
            {emailAuthEnabled && <form onSubmit={submit} className="space-y-4">
              {sentEmail ? (
                <>
                  <p className="text-sm text-muted-foreground" role="status">If we can sign you in, a code will arrive at <strong className="break-all">{sentEmail}</strong>.</p>
                  <div><Label htmlFor="email-code">Verification code</Label><Input id="email-code" className="mt-1.5" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required /></div>
                </>
              ) : (
                <div><Label htmlFor="auth-email">Email address</Label><Input id="auth-email" className="mt-1.5" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              )}
              <Button className="w-full" type="submit" disabled={busy || Boolean(configurationError)}>{busy ? 'Please wait…' : sentEmail ? 'Verify code' : 'Send sign-in code'}</Button>
              {sentEmail && <button className="text-sm text-muted-foreground underline underline-offset-4" type="button" disabled={busy} onClick={() => { setSentEmail(''); setCode(''); setError('') }}>Use a different email or request a new code</button>}
            </form>}
            {!sentEmail && <Button type="button" variant={emailAuthEnabled ? 'outline' : 'default'} className={emailAuthEnabled ? 'mt-3 w-full' : 'w-full'} onClick={() => void google()} disabled={busy || Boolean(configurationError)}>Continue with Google</Button>}
            <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-sm text-primary">
              <Link className="underline underline-offset-4" to={authLink(signup ? 'login' : 'signup', returnTo)}>{signup ? 'Already have an account? Log in' : 'New here? Sign up'}</Link>
              <Link className="underline underline-offset-4" to="/privacy">Privacy</Link>
            </div>
          </CardContent>
        </Card>
    </AccountLayout>
  )
}
