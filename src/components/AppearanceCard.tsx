import { Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useTheme } from '@/providers/ThemeProvider'

export function AppearanceCard() {
  const { preference, setPreference } = useTheme()

  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="flex items-center gap-2 font-bold"><Monitor size={20} aria-hidden="true" />Appearance</h2>
      </CardHeader>
      <CardContent className="max-w-xs">
        <Label htmlFor="theme-preference">Theme</Label>
        <Select id="theme-preference" value={preference} onChange={({ currentTarget }) => {
          const next = currentTarget.value
          if (next === 'system' || next === 'light' || next === 'dark') setPreference(next)
        }}>
          <option value="system">Use device setting</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </CardContent>
    </Card>
  )
}
