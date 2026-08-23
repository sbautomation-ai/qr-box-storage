import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'default' | 'sm' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', type = 'button', ...props },
  ref,
) {
  const variants = {
    default: 'bg-white text-zinc-950 hover:bg-zinc-200',
    secondary: 'bg-zinc-800 text-zinc-50 hover:bg-zinc-700',
    outline: 'border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900',
    ghost: 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }
  const sizes = {
    default: 'min-h-11 px-4 py-2',
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    icon: 'h-11 w-11',
  }

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
