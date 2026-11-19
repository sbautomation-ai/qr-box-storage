import { createContext, useContext, useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react'

type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'qr-box-theme'
const systemPreference = '(prefers-color-scheme: dark)'
const ThemeContext = createContext<{
  preference: ThemePreference
  theme: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
} | null>(null)

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(systemPreference)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function isSystemDark() {
  return window.matchMedia(systemPreference).matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readPreference)
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, isSystemDark)
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    function onStorageChange(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setPreference(readPreference())
    }
    window.addEventListener('storage', onStorageChange)
    return () => window.removeEventListener('storage', onStorageChange)
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const color = getComputedStyle(root).getPropertyValue('--background').trim()
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [theme])

  function selectPreference(next: ThemePreference) {
    setPreference(next)
    try {
      if (next === 'system') localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, next)
    } catch {
      // The choice still applies for this visit when storage is blocked.
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference: selectPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
