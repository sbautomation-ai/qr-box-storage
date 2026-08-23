import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-10 text-zinc-100">
      <article className="mx-auto w-full max-w-3xl">
        <Link className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" to="/login">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <Card className="bg-zinc-900">
          <CardHeader>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-white text-zinc-950"><ShieldCheck className="h-6 w-6" /></div>
            <h1 className="text-3xl font-bold">Privacy policy</h1>
            <p className="mt-2 text-sm text-zinc-400">Last updated 23 August 2026</p>
          </CardHeader>
          <CardContent className="space-y-7 leading-relaxed text-zinc-300">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">Information we process</h2>
              <p>QR Box Storage uses your Google account name, email address, and profile identifier to authenticate you. The app also stores inventory information, box photos, household membership, invitations, and an audit history of inventory movements that you choose to create.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">How information is used</h2>
              <p>Your information is used only to provide household inventory features, enforce access controls, display who performed inventory changes, and operate the service. We do not sell personal information or use it for advertising.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">Storage and sharing</h2>
              <p>Application data is stored in Supabase and the web application is hosted by Vercel. Data is shared with those processors only as needed to run the service. Household data is accessible only to authenticated members of that household, subject to database row-level security.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">Retention and deletion</h2>
              <p>Inventory movement history is retained to preserve the household audit trail. A household owner may remove members and delete application content. To request deletion of your account data, contact the application owner at <a className="underline underline-offset-4 hover:text-white" href="mailto:sciclunaluke.93@gmail.com">sciclunaluke.93@gmail.com</a>.</p>
            </section>
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">Google account data</h2>
              <p>The app requests only the basic Google identity information needed for sign-in. Its use of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.</p>
            </section>
          </CardContent>
        </Card>
      </article>
    </main>
  )
}
