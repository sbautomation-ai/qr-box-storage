import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authLink, safeReturnTo } from '@/lib/auth'
import { useAuth } from '@/providers/AuthProvider'
import { ErrorPanel, LoadingScreen } from './Feedback'

export function ProtectedRoute() {
  const { session, membership, loading, membershipError, refreshMembership } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen label="Checking your session…" />
  const returnTo = safeReturnTo(location.pathname + location.search)
  if (!session) return <Navigate to={authLink('login', returnTo)} replace />
  if (membershipError) return <ErrorPanel title="Could not load your household" message={membershipError} retry={() => { void refreshMembership().catch(() => {}) }} />
  const canContinueWithoutMembership = location.pathname === '/setup-required' || location.pathname.startsWith('/join/')
  if (!membership && !canContinueWithoutMembership) return <Navigate to={`/setup-required?${new URLSearchParams({ returnTo })}`} replace />
  return <Outlet />
}
