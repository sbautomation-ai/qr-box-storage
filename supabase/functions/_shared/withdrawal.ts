export function withdrawalEmailSettings() {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  const from = Deno.env.get('WITHDRAWAL_FROM_EMAIL')?.trim()
  const support = Deno.env.get('WITHDRAWAL_SUPPORT_EMAIL')?.trim()
  const cronSecret = Deno.env.get('WITHDRAWAL_CRON_SECRET')?.trim()
  if (!apiKey || !from || !support || !cronSecret) return null
  return { apiKey, from, support, cronSecret }
}
