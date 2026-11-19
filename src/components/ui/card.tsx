import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn('min-w-0 rounded-2xl border border-border bg-card', className)} {...props} />
})

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col p-5 pb-3', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-2', className)} {...props} />
}
