import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { LoadingScreen } from './Feedback'

export function ProtectedRoute() {
  const { session, membership, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen label="Checking your session…" />
  if (!session) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />
  const canContinueWithoutMembership = location.pathname === '/setup-required' || location.pathname.startsWith('/join/')
  if (!membership && !canContinueWithoutMembership) return <Navigate to="/setup-required" replace />
  return <Outlet />
}
