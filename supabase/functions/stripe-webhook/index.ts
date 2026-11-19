import type Stripe from 'npm:stripe@23.1.0'
import { json, serviceClient } from '../_shared/service.ts'
import { stripeClient, stripeCrypto, stripePriceId } from '../_shared/stripe.ts'

const events = new Set([
  'checkout.session.completed', 'checkout.session.expired',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
])

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const signature = request.headers.get('stripe-signature')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!signature || !secret) return json({ error: 'Webhook unavailable' }, secret ? 400 : 503)
  const stripe = stripeClient()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret, undefined, stripeCrypto)
  } catch {
    return json({ error: 'Invalid webhook signature' }, 400)
  }
  if (!events.has(event.type)) return json({ received: true })

  try {
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription
    const customer = typeof object.customer === 'string' ? object.customer : object.customer?.id
    if (!customer) return json({ received: true })
    const db = serviceClient()
    const { data: billing, error: billingError } = await db.from('household_billing')
      .select('household_id').eq('stripe_customer_id', customer).maybeSingle()
    if (billingError) throw billingError
    if (!billing) return json({ received: true })

    // Fetch the current subscription so delayed webhooks cannot replay an old entitlement.
    const started = new Date().toISOString()
    const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 20 })
    const price = stripePriceId()
    const family = subscriptions.data.filter((sub) => sub.items.data.some((item) => item.price.id === price))
    const sub = family.find((record) => record.status === 'active' || record.status === 'trialing') ?? family[0]
    const item = sub?.items.data.find((entry) => entry.price.id === price)
    const { error: syncError } = await db.from('household_billing').update({
      stripe_subscription_id: sub?.id || null,
      status: sub?.status || null,
      period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      synced_at: started,
    }).eq('stripe_customer_id', customer).or(`synced_at.is.null,synced_at.lt.${started}`)
    if (syncError) throw syncError

    if (object.object === 'checkout.session' && object.metadata?.checkout_key) {
      const { error: checkoutError } = await db.from('household_billing')
        .update({ checkout_key: null, checkout_until: null })
        .eq('stripe_customer_id', customer).eq('checkout_key', object.metadata.checkout_key)
      if (checkoutError) throw checkoutError
    }
    return json({ received: true })
  } catch (error) {
    console.error('Stripe webhook reconciliation failed', event.type, error instanceof Error ? error.name : 'backend error')
    return json({ error: 'Webhook will be retried' }, 500)
  }
})
