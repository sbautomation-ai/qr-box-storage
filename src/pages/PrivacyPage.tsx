import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <article className="mx-auto w-full max-w-3xl">
        <Link className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to="/login">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <Card>
          <CardHeader>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="h-6 w-6" /></div>
            <h1 className="page-title">Privacy policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated 19 November 2026</p>
          </CardHeader>
          <CardContent className="space-y-7 leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Information we process</h2>
              <p>QR Box Storage uses your email address and, if you sign in with Google, your Google account name and identifier to authenticate you. The app also stores inventory information, box photos, household membership, invitations, and an audit history of inventory movements that you choose to create.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">How information is used</h2>
              <p>Your information is used only to provide household inventory features, enforce access controls, display who performed inventory changes, and operate the service. We do not sell personal information or use it for advertising.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Storage and sharing</h2>
              <p>Application data is stored in Supabase and the web application is hosted by Vercel. We use those providers to run the service. When you subscribe to Family, Stripe processes your payment and we receive the customer and subscription identifiers and billing status needed to manage access. Household data is accessible only to authenticated members of that household, subject to database row-level security.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Retention and deletion</h2>
              <p>Shared inventory and movement history stay with your household when you leave. Deleting your account removes your sign-in and member profile. If you are the only household member, deletion also removes the household inventory and schedules its photo files for removal. Use the <Link className="underline underline-offset-4 hover:text-primary" to="/account/delete">account deletion page</Link> or email <a className="underline underline-offset-4 hover:text-primary" href="mailto:sciclunaluke.93@gmail.com">sciclunaluke.93@gmail.com</a> for help.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Google account data</h2>
              <p>The app requests only the basic Google identity information needed for sign-in. Its use of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.</p>
            </section>
          </CardContent>
        </Card>
      </article>
    </main>
  )
}
