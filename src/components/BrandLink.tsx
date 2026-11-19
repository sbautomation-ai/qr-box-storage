import { Box } from 'lucide-react'
import { Link } from 'react-router-dom'

export function BrandLink() {
  return (
    <Link to="/" className="flex w-fit items-center gap-2.5 font-bold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#21483b] text-white">
        <Box aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
      QR Box Storage
    </Link>
  )
}
