import type { ReactNode } from 'react'
import { BrandLink } from './BrandLink'
import { ThemeToggle } from './ThemeToggle'

export function AccountLayout({ children, preview }: { children: ReactNode; preview?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="page-width flex min-h-[4.5rem] items-center justify-between sm:min-h-[5.25rem]">
          <BrandLink />
          <ThemeToggle />
        </div>
      </header>
      <main className={`page-width grid max-w-5xl flex-1 content-center gap-12 py-10 sm:py-16 ${preview ? 'lg:grid-cols-2 lg:items-center' : ''}`}>
        <div className="mx-auto w-full max-w-lg">{children}</div>
        {preview && <div className="hidden min-w-0 lg:block">{preview}</div>}
      </main>
    </div>
  )
}
