import { json, serviceClient } from '../_shared/service.ts'
import { withdrawalEmailSettings } from '../_shared/withdrawal.ts'

type Withdrawal = {
  id: string
  customer_name: string
  customer_email: string
  purchase_reference: string
  requested_at: string
  acknowledged_at: string | null
}

async function acknowledge(
  db: ReturnType<typeof serviceClient>,
  withdrawal: Withdrawal,
  settings: NonNullable<ReturnType<typeof withdrawalEmailSettings>>,
) {
  if (withdrawal.acknowledged_at) return true

  // Claim this attempt and leave the request eligible for retry if the worker stops.
  const now = new Date()
  const { data: claimed, error: claimError } = await db.from('billing_withdrawals')
    .update({ next_attempt_at: new Date(now.getTime() + 5 * 60_000).toISOString() })
    .eq('id', withdrawal.id).is('acknowledged_at', null).lte('next_attempt_at', now.toISOString())
    .select('id').maybeSingle()
  if (claimError) throw claimError
  if (!claimed) return false

  const text = [
    'We received your request to withdraw from QR Box Storage Family.',
    '',
    `Request ID: ${withdrawal.id}`,
    `Submitted: ${new Date(withdrawal.requested_at).toISOString()} (UTC)`,
    `Name: ${withdrawal.customer_name}`,
    `Family subscription reference: ${withdrawal.purchase_reference}`,
    `Acknowledgement email: ${withdrawal.customer_email}`,
    'Statement: I am withdrawing from my QR Box Storage Family subscription.',
    '',
    'Billing support will follow up about your subscription and any refund.',
  ].join('\n')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `qr-box-withdrawal/${withdrawal.id}`,
    },
    body: JSON.stringify({
      from: settings.from,
      to: [withdrawal.customer_email],
      bcc: withdrawal.customer_email.toLowerCase() === settings.support.toLowerCase() ? undefined : [settings.support],
      reply_to: settings.support,
      subject: 'QR Box Storage withdrawal received',
      text,
    }),
    signal: AbortSignal.timeout(8_000),
  })
  await response.body?.cancel()
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`)

  const { error } = await db.from('billing_withdrawals')
    .update({ acknowledged_at: new Date().toISOString() }).eq('id', withdrawal.id)
  if (error) throw error
  return true
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin')
  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  const headers = {
    'Access-Control-Allow-Origin': appUrl || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
  const reply = (data: unknown, status = 200) => json(data, status, headers)
  if (!appUrl || (origin && origin !== appUrl)) return reply({ error: 'Origin not allowed' }, 403)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)

  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return reply({ error: 'Sign in first.' }, 401)
  const settings = withdrawalEmailSettings()
  if (!settings) return reply({ error: 'The online form is unavailable. Please email billing support.' }, 503)
  const db = serviceClient()

  const sendReceipt = async (withdrawal: Withdrawal) => {
    try {
      return await acknowledge(db, withdrawal, settings)
    } catch {
      console.error('Withdrawal acknowledgement pending retry', withdrawal.id)
      return false
    }
  }

  if (!origin && token === settings.cronSecret) {
    const { data: pending, error } = await db.from('billing_withdrawals').select('*')
      .is('acknowledged_at', null).lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at').order('requested_at').limit(10)
    if (error) return reply({ error: 'Could not read withdrawal requests.' }, 503)
    let sent = 0
    for (const withdrawal of pending) {
      if (await sendReceipt(withdrawal)) sent += 1
    }
    return reply({ attempted: pending.length, sent }, sent === pending.length ? 200 : 503)
  }

  const { data: { user }, error: authError } = await db.auth.getUser(token)
  if (authError || !user?.email_confirmed_at || !user.email) return reply({ error: 'Sign in with a verified email.' }, 401)

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : ''
  const validText = (value: string, max: number) => value.length > 0 && value.length <= max && !/[\r\n\t\0]/.test(value)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || !validText(name, 120) || !validText(reference, 160)) {
    return reply({ error: 'Enter your name and a receipt number or purchase date.' }, 400)
  }

  const { data: withdrawal, error } = await db.rpc('record_billing_withdrawal', {
    p_id: id, p_requester_id: user.id, p_name: name, p_email: user.email, p_purchase_reference: reference,
  }).single<Withdrawal>()
  if (error) {
    if (error.message === 'withdrawal_rate_limit') return reply({ error: 'You’ve submitted several requests today. Email billing support if you need help.' }, 429)
    console.error('Could not record withdrawal', error.code)
    return reply({ error: 'We couldn’t submit your request. Please try again or email billing support.' }, 503)
  }

  const emailSent = await sendReceipt(withdrawal)
  return reply({ id: withdrawal.id, submittedAt: withdrawal.requested_at, emailSent })
})
