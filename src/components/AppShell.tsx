import { Box, LogOut, Settings } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button } from './ui/button'
import { useAuth } from '@/providers/AuthProvider'

export function AppShell() {
  const { membership, user, signOut } = useAuth()
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/boxes" className="flex items-center gap-2 font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-zinc-950"><Box className="h-5 w-5" /></span><span>QR Box Storage</span></Link>
          <div className="flex items-center gap-1">
            <NavLink to="/settings" aria-label="Settings" className={({ isActive }) => `grid h-11 w-11 place-items-center rounded-xl transition ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}><Settings className="h-5 w-5" /></NavLink>
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out"><LogOut className="h-5 w-5" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10"><Outlet /></main>
      <footer className="mx-auto max-w-7xl border-t border-zinc-900 px-4 py-8 text-xs text-zinc-600 sm:px-6">{membership?.household?.name ?? 'Household'} · Signed in as {user?.email}</footer>
    </div>
  )
}
