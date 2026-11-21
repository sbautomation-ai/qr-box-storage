import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLink } from '@/components/BrandLink'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authLink } from '@/lib/auth'
import { billingSupportEmail, withdrawalEnabled } from '@/lib/plans'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

type Receipt = { id: string; submittedAt: string; emailSent: boolean }

function WithdrawalForm({ email }: { email: string }) {
  const [name, setName] = useState('')
  const [reference, setReference] = useState('')
  const [requestId, setRequestId] = useState<string>()
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<Receipt>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!requestId) {
      if (!name.trim() || !reference.trim()) {
        setError('Enter your name and a receipt number or purchase date.')
        return
      }
      setError('')
      setRequestId(crypto.randomUUID())
      return
    }

    setAttempted(true)
    setBusy(true)
    setError('')
    const fallback = 'We couldn’t confirm submission. Try again or email billing support.'
    try {
      const { data, error: submitError } = await supabase.functions.invoke<Receipt>('billing-withdrawal', {
        body: { id: requestId, name: name.trim(), reference: reference.trim() },
      })
      if (submitError || !data) {
        const details = submitError?.context instanceof Response ? await submitError.context.json().catch(() => null) : null
        setError(typeof details?.error === 'string' ? details.error : fallback)
        return
      }
      setReceipt(data)
    } catch {
      setError(fallback)
    } finally {
      setBusy(false)
    }
  }

  if (receipt) return (
    <div role="status" className="space-y-2 rounded-lg bg-secondary p-4 text-foreground">
      <h2 className="font-semibold">Withdrawal submitted</h2>
      <p>{receipt.emailSent ? 'We’ve emailed your acknowledgement.' : 'We’ve saved your request and will email your acknowledgement.'}</p>
      <p className="text-sm">Submitted <time dateTime={receipt.submittedAt}>{new Date(receipt.submittedAt).toLocaleString()}</time></p>
      <p className="break-words text-sm">Request ID {receipt.id}</p>
    </div>
  )

  return (
    <form className="space-y-4" onSubmit={submit}>
      {requestId ? (
        <section className="space-y-2 rounded-lg bg-secondary p-4 text-foreground" aria-labelledby="withdrawal-review">
          <h2 id="withdrawal-review" className="font-semibold">Review your withdrawal</h2>
          <p>I am withdrawing from my QR Box Storage Family subscription.</p>
          <dl className="space-y-1 break-words text-sm">
            <div><dt className="inline font-semibold">Name </dt><dd className="inline">{name.trim()}</dd></div>
            <div><dt className="inline font-semibold">Receipt or purchase date </dt><dd className="inline">{reference.trim()}</dd></div>
            <div><dt className="inline font-semibold">Acknowledgement email </dt><dd className="inline">{email}</dd></div>
          </dl>
        </section>
      ) : (
        <>
          <div><Label htmlFor="withdrawal-name">Your name</Label><Input id="withdrawal-name" className="mt-1.5" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></div>
          <div><Label htmlFor="withdrawal-reference">Receipt number or purchase date</Label><Input id="withdrawal-reference" className="mt-1.5" aria-describedby="withdrawal-reference-hint" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={160} required /><p id="withdrawal-reference-hint" className="mt-1.5 text-sm">Use the number from your Stripe receipt or the date you subscribed.</p></div>
          <p className="break-words text-sm">We’ll send your acknowledgement to <strong>{email}</strong>.</p>
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{requestId ? 'Confirm withdrawal' : 'Review withdrawal'}</Button>
        {requestId && !attempted && <Button type="button" variant="outline" onClick={() => setRequestId(undefined)}>Edit details</Button>}
        {busy && <span role="status" className="text-sm">Submitting your request…</span>}
      </div>
    </form>
  )
}

export function WithdrawPage() {
  const { user, loading } = useAuth()
  const email = user?.email_confirmed_at ? user.email : undefined

  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <article className="mx-auto w-full max-w-xl">
        <header className="mb-6 flex items-center justify-between gap-2"><BrandLink /><ThemeToggle /></header>
        <Card>
          <CardHeader>
            <h1 className="page-title">Withdraw from your contract</h1>
            <p className="mt-2 text-muted-foreground">Use this form to exercise your right to withdraw from a QR Box Storage Family subscription.</p>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            {!withdrawalEnabled ? <p>The online form is currently unavailable. You can request withdrawal by email.</p>
              : email ? <WithdrawalForm key={user?.id} email={email} />
                : loading ? <p role="status">Checking sign-in…</p>
                  : <p><Link className="font-semibold text-primary underline underline-offset-4" to={authLink('login', '/account/withdraw')}>Sign in</Link> to submit your withdrawal and receive an acknowledgement at your verified email.</p>}
            <p className="text-sm">You can also <a className="underline underline-offset-4 hover:text-primary" href={`mailto:${billingSupportEmail}`}>email billing support</a> to withdraw. See <Link className="underline underline-offset-4 hover:text-primary" to="/cancellation-and-refunds">cancellation and refunds</Link> for details.</p>
          </CardContent>
        </Card>
      </article>
    </main>
  )
}
