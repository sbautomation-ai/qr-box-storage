import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { billingEnabled, plans, withdrawalEnabled } from '@/lib/plans'
import { errorMessage, supabase } from '@/lib/supabase'

async function billingRequest<T>(action: 'status' | 'checkout' | 'portal') {
  const { data, error } = await supabase.functions.invoke<T>('household-billing', { body: { action } })
  if (error) {
    const response = error.context instanceof Response ? error.context : null
    const details = await response?.json().catch(() => null)
    throw new Error(details?.error || 'We couldn’t reach billing. Please try again.')
  }
  if (!data) throw new Error('Billing returned an empty response.')
  return data
}

export function BillingCard({ householdId, isOwner }: { householdId: string; isOwner: boolean }) {
  const [params] = useSearchParams()
  const checkoutFinished = params.get('billing') === 'success'
  const plan = useQuery({
    queryKey: ['household-plan', householdId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_household_plan')
      if (error) throw error
      return data === 'family' ? 'family' as const : 'free' as const
    },
    refetchInterval: (query) => checkoutFinished && query.state.data !== 'family' && query.state.dataUpdateCount < 12 ? 3000 : false,
    refetchOnWindowFocus: true,
  })
  const billing = useQuery({
    queryKey: ['household-billing', householdId],
    queryFn: () => billingRequest<{ managesSubscription: boolean }>('status'),
    enabled: billingEnabled && isOwner && plan.data === 'free',
  })
  const checkout = useMutation({
    mutationFn: (action: 'checkout' | 'portal') => billingRequest<{ url: string }>(action),
    onSuccess: ({ url }) => window.location.assign(url),
  })
  const canManage = plan.data === 'family' || billing.data?.managesSubscription
  const currentPlan = plan.data ? plans[plan.data] : null

  return (
    <Card className="mt-6" id="billing">
      <CardHeader><h2 className="font-bold">Household plan</h2></CardHeader>
      <CardContent className="space-y-3">
        {plan.isPending && <p className="text-sm text-muted-foreground">Loading your plan…</p>}
        {plan.error && <p className="text-sm text-danger" role="alert">Couldn’t load your plan. <button type="button" className="underline" onClick={() => void plan.refetch()}>Retry</button></p>}
        {currentPlan && <p className="text-sm text-muted-foreground"><strong>{currentPlan.name}</strong> · {currentPlan.boxes} active boxes · {currentPlan.members} members · {currentPlan.photos} photos</p>}
        {checkoutFinished && <p role="status" className="text-sm text-muted-foreground">{plan.data === 'family' ? 'Family is active.' : 'We’re confirming your payment. Check back shortly if Family hasn’t appeared.'}</p>}
        {params.get('billing') === 'cancelled' && <p role="status" className="text-sm text-muted-foreground">Checkout was closed. Your plan is unchanged.</p>}
        {plan.data === 'free' && !billingEnabled && <p className="text-sm text-muted-foreground">Family subscriptions open soon.</p>}
        {billingEnabled && isOwner && currentPlan && (
          <>
            {billing.error && <p className="text-sm text-danger" role="alert">{errorMessage(billing.error)}</p>}
            <Button type="button" variant="outline" disabled={checkout.isPending || billing.isFetching} onClick={() => checkout.mutate(canManage ? 'portal' : 'checkout')}>
              {checkout.isPending ? 'Opening Stripe…' : canManage ? 'Manage subscription' : `Upgrade to Family · ${plans.family.price}/year`}
            </Button>
          </>
        )}
        {checkout.error && <p className="text-sm text-danger" role="alert">{errorMessage(checkout.error)}</p>}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-primary" to="/cancellation-and-refunds">Cancellation and refunds</Link>
          {withdrawalEnabled && isOwner && canManage && <Link className="underline underline-offset-4 hover:text-primary" to="/account/withdraw">Withdraw from your contract</Link>}
        </div>
      </CardContent>
    </Card>
  )
}
