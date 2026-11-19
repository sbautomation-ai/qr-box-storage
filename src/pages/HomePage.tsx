import { Archive, Box, Check, MapPin, Printer, QrCode, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLink } from '@/components/BrandLink'
import { billingEnabled, plans } from '@/lib/plans'
import { useAuth } from '@/providers/AuthProvider'
import './home.css'

const steps = [
  { icon: Box, title: 'Give every box a name', copy: 'Record what’s inside, add a photo, and note where you put it.' },
  { icon: Printer, title: 'Print a QR label', copy: 'Stick it on the box and scan with your phone’s camera to open its contents.' },
  { icon: Search, title: 'Find it when you need it', copy: 'Search for an item and see which box it’s in and where that box lives.' },
]

function InventoryPreview() {
  return (
    <figure className="inventory-preview">
      <div className="preview-frame">
        <div className="preview-bar">
          <span><Archive size={17} /> Your storage boxes</span>
          <span className="preview-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
        <div className="preview-body">
          <div className="preview-search"><Search size={16} /> spare batteries</div>
          <div className="preview-result">
            <div className="preview-box"><Box aria-hidden="true" strokeWidth={1.1} size={42} /></div>
            <div><strong>Small fixes &amp; tools</strong><span><MapPin size={13} /> Garage · Left shelf</span></div>
          </div>
          <div className="preview-line"><span>Spare batteries</span><strong>× 8</strong></div>
          <div className="preview-line"><span>Hex key set</span><strong>× 1</strong></div>
        </div>
      </div>
      <div className="preview-label" aria-hidden="true">
        <QrCode size={44} strokeWidth={1.8} /><span><strong>Small fixes</strong><small>Scan this box</small></span>
      </div>
      <figcaption>Example inventory</figcaption>
    </figure>
  )
}

export function HomePage() {
  const { session } = useAuth()
  const start = session ? '/boxes' : '/signup'
  return (
    <div className="marketing">
      <header className="marketing-wrap marketing-nav">
        <BrandLink />
        <nav aria-label="Main navigation">
          <a className="marketing-nav-text" href="#pricing">Pricing</a>
          {session ? <Link className="marketing-button" to="/boxes">Open inventory</Link> : <>
            <Link className="marketing-login" to="/login">Log in</Link>
            <Link className="marketing-button marketing-nav-cta" to="/signup">Sign up</Link>
          </>}
        </nav>
      </header>
      <main>
        <section className="marketing-wrap marketing-hero">
          <div>
            <h1>Know what’s in <em>every box.</em></h1>
            <p>Label your storage boxes, keep track of what’s inside, and find what you need without opening every lid.</p>
            <Link className="marketing-button marketing-primary" to={start}>{session ? 'Open inventory' : 'Get started free'}</Link>
            <div className="marketing-trust"><ShieldCheck size={17} aria-hidden="true" /> Box contents stay private to your household.</div>
          </div>
          <InventoryPreview />
        </section>

        <section className="marketing-how" aria-labelledby="how-title">
          <div className="marketing-wrap">
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

        <section id="pricing" className="marketing-wrap marketing-pricing" aria-labelledby="pricing-title">
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
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="marketing-footer"><div className="marketing-wrap">
        <BrandLink />
        <div><Link to="/privacy">Privacy</Link><Link to="/account/delete">Delete account</Link></div>
      </div></footer>
    </div>
  )
}
