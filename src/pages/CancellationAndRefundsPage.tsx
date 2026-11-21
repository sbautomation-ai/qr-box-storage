import { Link } from 'react-router-dom'
import { BrandLink } from '@/components/BrandLink'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { withdrawalEnabled } from '@/lib/plans'
import { supportEmail } from '@/lib/support'

export function CancellationAndRefundsPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <article className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-2">
          <BrandLink />
          <ThemeToggle />
        </header>
        <Card>
          <CardHeader>
            <h1 className="page-title">Cancellation and refunds</h1>
            <p className="mt-2 text-sm text-muted-foreground">For Family subscriptions purchased on the QR Box Storage website.</p>
          </CardHeader>
          <CardContent className="space-y-7 leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Annual billing</h2>
              <p>Family is billed once a year at the price shown at checkout. Your subscription renews automatically each year unless you cancel before the next billing date.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Cancel your renewal</h2>
              <p>Sign in as the household owner and go to <strong>Settings → Household plan → Manage subscription</strong> to cancel. If you can’t access your account, email billing support before your next billing date. When you stop renewal, your household keeps Family access until the end of the paid year, then moves to Free. You can still access your existing inventory. Free plan limits apply to new additions.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">14-day right of withdrawal</h2>
              <p>If you are a consumer with a statutory right of withdrawal, you generally have 14 days from the day you first subscribe to withdraw without giving a reason.</p>
              {withdrawalEnabled && <p className="mt-3"><Link className="font-semibold text-primary underline underline-offset-4" to="/account/withdraw">Withdraw from your contract</Link>. Submit the online form before the deadline and we’ll email you an acknowledgement with the statement, date and time.</p>}
              <p className="mt-3">You can also <a className="underline underline-offset-4 hover:text-primary" href={`mailto:${supportEmail}`}>email billing support</a> before the deadline. Say that you are withdrawing from your QR Box Storage Family contract and include your name, the email used to subscribe, and the receipt number or purchase date.</p>
              <p className="mt-3">If you exercise your right to withdraw, we’ll end your Family subscription and issue a full refund to your original payment method within 14 days of receiving your request.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Other refund requests</h2>
              <p>Outside the withdrawal period, cancelling renewal stops future charges. Refunds for the current year are available to correct billing errors and where required by consumer law. If you believe you were billed in error or have a problem with the service, contact us with your account email and receipt number if available. Your statutory consumer rights apply.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Billing support</h2>
              <p>Email <a className="break-words underline underline-offset-4 hover:text-primary" href={`mailto:${supportEmail}`}>{supportEmail}</a> for billing questions, cancellation help, or refund requests.</p>
            </section>
          </CardContent>
        </Card>
      </article>
    </main>
  )
}
