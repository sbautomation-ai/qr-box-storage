import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoadingScreen } from '@/components/Feedback'
import { authLink, safeReturnTo } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const rejected = params.has('error') || params.has('error_code') || new URLSearchParams(location.hash.slice(1)).has('error')
  useEffect(() => {
    let current = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!current) return
      const destination = !rejected && !error && data.session ? returnTo : `${authLink('login', returnTo)}&error=callback`
      navigate(destination, { replace: true })
    })
    return () => { current = false }
  }, [navigate, rejected, returnTo])
  return <LoadingScreen label="Completing sign-in…" />
}
