import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Membership } from '@/types'

type AuthContextValue = {
  session: Session | null
  user: User | null
  membership: Membership | null
  loading: boolean
  refreshMembership: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMembership = useCallback(async (userId?: string) => {
    if (!userId) {
      setMembership(null)
      return
    }
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id,user_id,role,email,display_name,joined_at,household:households(id,name,created_at)')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    setMembership(data as unknown as Membership | null)
  }, [])

  const refreshMembership = useCallback(async () => {
    await loadMembership(session?.user.id)
  }, [loadMembership, session?.user.id])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      try {
        await loadMembership(data.session?.user.id)
      } finally {
        if (active) setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(true)
      window.setTimeout(() => {
        loadMembership(nextSession?.user.id).finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadMembership])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    membership,
    loading,
    refreshMembership,
    signOut: async () => {
      await supabase.auth.signOut()
      setMembership(null)
    },
  }), [loading, membership, refreshMembership, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
