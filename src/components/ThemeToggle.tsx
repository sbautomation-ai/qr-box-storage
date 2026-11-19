import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/providers/ThemeProvider'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setPreference } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`
  const Icon = next === 'light' ? Sun : Moon

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={label}
      title={label}
      onClick={() => setPreference(next)}
    >
      <Icon size={19} aria-hidden="true" />
    </Button>
  )
}
