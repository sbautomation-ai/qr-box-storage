import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoadingScreen } from '@/components/Feedback'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useEffect(() => {
    const returnTo = params.get('returnTo')
    const safeReturn = returnTo?.startsWith('/') ? returnTo : '/boxes'
    supabase.auth.getSession().then(({ error }) => {
      navigate(error ? `/login?error=${encodeURIComponent(error.message)}` : safeReturn, { replace: true })
    })
  }, [navigate, params])
  return <LoadingScreen label="Completing Google sign-in…" />
}
