import { Boxes, LogOut, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandLink } from './BrandLink'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'
import { useAuth } from '@/providers/AuthProvider'

const navigation = [
  { to: '/boxes', label: 'Boxes', icon: Boxes },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const { membership, user, signOut } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="page-width flex min-h-[4.5rem] items-center justify-between gap-2 sm:min-h-[5.25rem]">
          <BrandLink to="/boxes" />
          <nav aria-label="Inventory navigation" className="flex items-center gap-1">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className={({ isActive }) => `inline-flex min-h-11 min-w-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition sm:px-3 ${isActive ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="page-width flex-1 py-8 sm:py-12"><Outlet /></main>
      <footer className="border-t border-border">
        <div className="page-width flex flex-wrap justify-between gap-x-6 gap-y-1 py-5 text-sm text-muted-foreground">
          <p className="min-w-0 break-words">{membership?.household?.name ?? 'Household'}</p>
          {user?.email && <p className="min-w-0 break-words">Signed in as {user.email}</p>}
        </div>
      </footer>
    </div>
  )
}
