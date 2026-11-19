import Stripe from 'npm:stripe@23.1.0'

export const ongoingStatuses = ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']

export function stripeClient() {
  const secret = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secret) throw new Error('Stripe is not configured')
  return new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() })
}

export function stripePriceId() {
  const priceId = Deno.env.get('STRIPE_FAMILY_PRICE_ID')
  if (!priceId) throw new Error('No Family price configured')
  return priceId
}

export const stripeCrypto = Stripe.createSubtleCryptoProvider()
