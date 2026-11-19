import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl focus:outline-none sm:p-6', className)}>
          <DialogPrimitive.Title className="pr-10 font-display text-[1.8rem] leading-tight tracking-tight text-foreground">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>}
          <div className="mt-5">{children}</div>
          <DialogPrimitive.Close className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
