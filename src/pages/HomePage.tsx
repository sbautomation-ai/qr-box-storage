import { ThemeToggle } from '@/components/ThemeToggle'
import { Box, Check, Printer, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLink } from '@/components/BrandLink'
import { InventoryPreview } from '@/components/InventoryPreview'
import { billingEnabled, plans } from '@/lib/plans'
import { useAuth } from '@/providers/AuthProvider'
import './home.css'

const steps = [
  { icon: Box, title: 'Give every box a name', copy: 'Record what’s inside, add a photo, and note where you put it.' },
  { icon: Printer, title: 'Print a QR label', copy: 'Stick it on the box and scan with your phone’s camera to open its contents.' },
  { icon: Search, title: 'Find it when you need it', copy: 'Search for an item and see which box it’s in and where that box lives.' },
]

export function HomePage() {
  const { session } = useAuth()
  const start = session ? '/boxes' : '/signup'
  return (
    <div className="marketing">
      <header className="page-width marketing-nav">
        <BrandLink />
        <nav aria-label="Main navigation">
          <a className="marketing-nav-text" href="#pricing">Pricing</a>
          {session ? <Link className="marketing-button marketing-nav-cta" to="/boxes">Open inventory</Link> : <>
            <Link className="marketing-login" to="/login">Log in</Link>
            <Link className="marketing-button marketing-nav-cta" to="/signup">Sign up</Link>
          </>}
          <ThemeToggle />
        </nav>
      </header>
      <main>
        <section className="page-width marketing-hero">
          <div>
            <h1>Know what’s in <em>every box.</em></h1>
            <p>Label your storage boxes, keep track of what’s inside, and find what you need without opening every lid.</p>
            <Link className="marketing-button marketing-primary" to={start}>{session ? 'Open inventory' : 'Get started free'}</Link>
            <div className="marketing-trust"><ShieldCheck size={17} aria-hidden="true" /> Box contents stay private to your household.</div>
          </div>
          <InventoryPreview />
        </section>

        <section className="marketing-how" aria-labelledby="how-title">
          <div className="page-width">
            <h2 id="how-title">From packed away to found.</h2>
            <div className="marketing-steps">
              {steps.map(({ icon: Icon, title, copy }) => (
                <article key={title}>
                  <Icon aria-hidden="true" size={26} strokeWidth={1.55} />
                  <h3>{title}</h3><p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="page-width marketing-pricing" aria-labelledby="pricing-title">
          <div className="marketing-pricing-title"><h2 id="pricing-title">Plans for your household</h2><p>Start with Free. Upgrade as your inventory grows.</p></div>
          <div className="marketing-plans">
            {Object.entries(plans).map(([id, plan]) => (
              <article className={id === 'family' ? 'marketing-plan marketing-family' : 'marketing-plan'} key={id}>
                <h3>{plan.name}</h3>
                <p className="marketing-price">{'price' in plan ? plan.price : '€0'} <span>{'price' in plan ? '/ year per household' : ''}</span></p>
                <ul>
                  {[id === 'free' ? 'QR labels, search and private photos' : 'Everything in Free', `Up to ${plan.boxes} active boxes`, `Up to ${plan.members} household members`, `Up to ${plan.photos} photos, 5 MB each`].map((feature) => (
                    <li key={feature}><Check aria-hidden="true" size={17} />{feature}</li>
                  ))}
                </ul>
                {id === 'free' ? <Link className="marketing-button" to={start}>{session ? 'Open inventory' : 'Start free'}</Link>
                  : billingEnabled ? <Link className="marketing-button" to={session ? '/settings?plan=family' : '/signup?returnTo=%2Fsettings%3Fplan%3Dfamily'}>Choose Family</Link>
                    : <p className="marketing-plan-note">Family subscriptions open soon.</p>}
                {id === 'family' && <Link className="mt-3 w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-primary" to="/cancellation-and-refunds">Cancellation and refunds</Link>}
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="marketing-footer"><div className="page-width">
        <BrandLink />
        <div><Link to="/privacy">Privacy</Link><Link to="/cancellation-and-refunds">Cancellation and refunds</Link><Link to="/account/delete">Delete account</Link></div>
      </div></footer>
    </div>
  )
}
