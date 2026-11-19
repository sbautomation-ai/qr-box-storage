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
    default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    secondary: 'bg-secondary text-primary hover:bg-secondary-hover',
    outline: 'border border-input bg-card text-primary hover:bg-secondary',
    ghost: 'text-muted-foreground hover:bg-secondary hover:text-primary',
    danger: 'bg-danger-action text-white hover:bg-danger-action-hover',
  }
  const sizes = {
    default: 'min-h-11 px-4 py-2',
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    icon: 'h-11 w-10 sm:w-11',
  }

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
