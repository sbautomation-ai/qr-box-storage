import { json, serviceClient } from '../_shared/service.ts'
import { ongoingStatuses, stripeClient, stripePriceId } from '../_shared/stripe.ts'
import { withdrawalEmailSettings } from '../_shared/withdrawal.ts'

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  const headers = {
    'Access-Control-Allow-Origin': appUrl || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
  const reply = (data: unknown, status = 200) => json(data, status, headers)
  if (!appUrl || (origin && origin !== appUrl)) return reply({ error: 'Origin not allowed' }, 403)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)

  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return reply({ error: 'Sign in first' }, 401)
  const db = serviceClient()
  const { data: { user }, error: authError } = await db.auth.getUser(token)
  if (authError || !user?.email_confirmed_at) return reply({ error: 'Sign in with a verified email' }, 401)

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (action !== 'checkout' && action !== 'portal' && action !== 'status') return reply({ error: 'Unknown billing action' }, 400)

  try {
    const { data: membership, error: membershipError } = await db.from('household_members')
      .select('household_id,role').eq('user_id', user.id).maybeSingle()
    if (membershipError) throw membershipError
    if (membership?.role !== 'owner') return reply({ error: 'Only the household owner can manage billing' }, 403)

    const householdId = membership.household_id
    const { data: billing, error: billingError } = await db.from('household_billing')
      .select('stripe_customer_id,status,checkout_until').eq('household_id', householdId).maybeSingle()
    if (billingError) throw billingError
    const managesSubscription = Boolean(billing?.status && ongoingStatuses.includes(billing.status))
    if (action === 'status') return reply({ managesSubscription })

    const stripe = stripeClient()
    if (action === 'portal') {
      if (!billing) return reply({ error: 'No billing account found' }, 404)
      const { data: stillOwner, error: ownerError } = await db.from('household_members')
        .select('user_id').eq('household_id', householdId).eq('role', 'owner').eq('user_id', user.id).maybeSingle()
      if (ownerError) throw ownerError
      if (!stillOwner) return reply({ error: 'Only the household owner can manage billing' }, 403)
      const portal = await stripe.billingPortal.sessions.create({
        customer: billing.stripe_customer_id,
        return_url: `${appUrl}/settings`,
      })
      return reply({ url: portal.url })
    }
    if (Deno.env.get('STRIPE_CHECKOUT_ENABLED') !== 'true') return reply({ error: 'Family subscriptions are not open yet' }, 503)
    if (managesSubscription) return reply({ error: 'Manage your existing subscription in Billing' }, 409)

    const price = await stripe.prices.retrieve(stripePriceId())
    if (!price.active || price.currency !== 'eur' || price.unit_amount !== 2900 ||
        price.recurring?.interval !== 'year' || price.recurring.interval_count !== 1) {
      throw new Error('Family price must be active at 29 EUR per year')
    }
    if (price.livemode && !withdrawalEmailSettings()) {
      return reply({ error: 'Family subscriptions are not open yet' }, 503)
    }

    const customer = billing ? billing.stripe_customer_id : (await stripe.customers.create(
      { metadata: { household_id: householdId } },
      { idempotencyKey: `qr-box-customer:${householdId}:${user.id}` },
    )).id
    const { data: reservation, error: reservationError } = await db.rpc('reserve_household_checkout', {
      p_household_id: householdId, p_owner_id: user.id, p_customer_id: customer,
    }).single<{ stripe_customer_id: string; checkout_key: string; checkout_until: string }>()
    if (reservationError) throw reservationError

    const expiresAt = Math.floor(new Date(reservation.checkout_until).getTime() / 1000)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: reservation.stripe_customer_id,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { household_id: householdId, checkout_key: reservation.checkout_key },
      subscription_data: { metadata: { household_id: householdId } },
      custom_text: {
        submit: { message: `Family renews annually. See [cancellation and refunds](${appUrl}/cancellation-and-refunds), including how to exercise your right of withdrawal.` },
      },
      expires_at: expiresAt,
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancelled`,
    }, { idempotencyKey: `qr-box-checkout:${reservation.checkout_key}` })
    if (!session.url || session.status !== 'open') {
      return reply({ error: 'This checkout has closed. Check your plan status or try again shortly.' }, 409)
    }
    return reply({ url: session.url })
  } catch (error) {
    console.error('Household billing request failed', action, error instanceof Error ? error.name : 'backend error')
    return reply({ error: 'Billing is temporarily unavailable. Please try again.' }, 503)
  }
})
