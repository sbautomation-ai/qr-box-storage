import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage, supabase } from '@/lib/supabase'
import type { Membership } from '@/types'

type AuthContextValue = {
  session: Session | null
  user: User | null
  membership: Membership | null
  loading: boolean
  membershipError: string | null
  refreshMembership: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function getMembership(userId: string, attempt = 0): Promise<Membership | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id,user_id,role,email,display_name,joined_at,household:households(id,name,created_at)')
    .eq('user_id', userId)
    .maybeSingle()
  if (error?.message === 'JWT issued at future' && attempt === 0) {
    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    return getMembership(userId, 1)
  }
  if (error) throw error
  return data as unknown as Membership | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [session, setSession] = useState<Session | null | undefined>()
  const [access, setAccess] = useState<{ userId: string; membership?: Membership | null; error?: string }>()
  const userId = session?.user.id
  const currentUser = useRef<string>(undefined)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id
      if (currentUser.current && currentUser.current !== nextUserId) {
        client.clear()
        setAccess(undefined)
      }
      currentUser.current = nextUserId
      setSession(nextSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [client])

  useEffect(() => {
    if (!userId) return
    let current = true
    getMembership(userId).then(
      (membership) => { if (current) setAccess({ userId, membership }) },
      (error) => { if (current) setAccess({ userId, error: errorMessage(error) }) },
    )
    return () => { current = false }
  }, [userId])

  const refreshMembership = useCallback(async () => {
    if (!userId) return
    try {
      const membership = await getMembership(userId)
      if (currentUser.current === userId) setAccess({ userId, membership })
    } catch (error) {
      if (currentUser.current === userId) setAccess({ userId, error: errorMessage(error) })
      throw error
    }
  }, [userId])

  const value = useMemo<AuthContextValue>(() => ({
    session: session ?? null,
    user: session?.user ?? null,
    membership: access?.userId === userId ? access?.membership ?? null : null,
    loading: session === undefined || Boolean(userId && access?.userId !== userId),
    membershipError: access?.userId === userId ? access?.error ?? null : null,
    refreshMembership,
    signOut: async () => { await supabase.auth.signOut({ scope: 'local' }) },
  }), [access, refreshMembership, session, userId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
