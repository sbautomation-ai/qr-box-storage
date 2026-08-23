import { escapeHtml } from './utils'

export type PrintableBoxLabel = {
  name: string
  location: string
  category: string
  qrDataUrl: string
}

export function buildBatchLabelPrintHtml(labels: PrintableBoxLabel[]) {
  const labelMarkup = labels.map((label) => `
    <article class="label">
      <img src="${escapeHtml(label.qrDataUrl)}" alt="">
      <div class="details">
        <h1>${escapeHtml(label.name)}</h1>
        <p>${escapeHtml(label.location)}</p>
        <p>${escapeHtml(label.category)}</p>
      </div>
    </article>`).join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${labels.length} QR box label${labels.length === 1 ? '' : 's'}</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #000; background: #fff; font-family: Arial, system-ui, sans-serif; }
      .sheet { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 62mm; gap: 5mm; }
      .label { display: grid; grid-template-columns: 38mm minmax(0, 1fr); align-items: center; gap: 4mm; height: 62mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; border: 0.3mm solid #888; border-radius: 2mm; padding: 4mm; }
      .label img { display: block; width: 38mm; height: 38mm; }
      .details { min-width: 0; }
      h1 { margin: 0 0 3mm; overflow-wrap: anywhere; font-size: 15pt; line-height: 1.15; }
      p { margin: 1.5mm 0; overflow-wrap: anywhere; font-size: 10pt; line-height: 1.2; }
      @media screen { body { padding: 8mm; background: #eee; } .sheet { max-width: 194mm; margin: auto; } .label { background: #fff; } }
    </style>
  </head>
  <body>
    <main class="sheet">${labelMarkup}</main>
    <script>window.addEventListener('load', function () { window.print(); });</script>
  </body>
</html>`
}
