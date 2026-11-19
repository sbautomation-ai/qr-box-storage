import { Box, CircleAlert, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import type { ReactNode } from 'react'

export function LoadingScreen({ label = 'Loading your storage…' }: { label?: string }) {
  return <div className="grid min-h-[60vh] place-items-center"><div className="text-center text-muted-foreground"><Box className="mx-auto mb-3 h-10 w-10 motion-safe:animate-pulse text-primary" /><p>{label}</p></div></div>
}

export function ErrorPanel({ title = 'Could not load this data', message, retry }: { title?: string; message: string; retry?: () => void }) {
  return <div className="rounded-2xl border border-danger-border bg-danger-surface p-5 text-danger" role="alert"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-danger">{message}</p>{retry && <Button variant="outline" size="sm" className="mt-4 border-input" onClick={retry}><RefreshCw className="h-4 w-4" />Retry</Button>}</div></div></div>
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-input bg-card px-5 py-12 text-center"><Box className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 font-display text-2xl text-foreground">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>{action && <div className="mt-5">{action}</div>}</div>
}
