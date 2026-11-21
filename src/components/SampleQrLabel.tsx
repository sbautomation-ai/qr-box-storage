import { useState } from 'react'
import { ArrowRight, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { demoBoxPath, type DemoBox } from '@/lib/demo'

type LabelState = { status: 'loading' | 'error' } | { status: 'ready'; src: string }

export function SampleQrLabel({ box, showBoxLink = false }: { box: DemoBox; showBoxLink?: boolean }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState<LabelState>()
  const boxPath = demoBoxPath(box.slug)

  async function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen || label?.status === 'loading' || label?.status === 'ready') return

    setLabel({ status: 'loading' })
    try {
      const QRCode = await import('qrcode')
      const url = new URL(boxPath, window.location.origin)
      const src = await QRCode.toDataURL(url.href, { width: 256, margin: 4 })
      setLabel({ status: 'ready', src })
    } catch {
      setLabel({ status: 'error' })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => void changeOpen(nextOpen)}
      trigger={<Button variant="outline"><QrCode className="h-4 w-4" aria-hidden="true" /> Show sample QR label</Button>}
      title={`QR label for ${box.name}`}
      description="Scan this code with another device to reopen this sample box."
    >
      {label?.status === 'ready'
        ? <img src={label.src} width={256} height={256} className="mx-auto h-auto w-full max-w-64 rounded-xl bg-white" alt={`QR code for ${box.name}`} />
        : <p role="status" className="text-sm text-muted-foreground">{label?.status === 'error' ? 'The label couldn’t load. Close this window and try again.' : 'Generating your sample label…'}</p>}
      {showBoxLink && (
        <Link to={boxPath} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">
          Open sample box <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </Dialog>
  )
}
