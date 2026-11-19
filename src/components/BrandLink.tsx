import { Box } from 'lucide-react'
import { Link } from 'react-router-dom'

export function BrandLink({ to = '/' }: { to?: '/' | '/boxes' }) {
  return (
    <Link to={to} className="flex w-fit shrink-0 items-center gap-2.5 rounded-lg text-sm font-bold sm:text-base tracking-tight">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground">
        <Box aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
      QR Box Storage
    </Link>
  )
}
