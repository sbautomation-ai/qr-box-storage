import { describe, expect, it } from 'vitest'
import { buildBatchLabelPrintHtml } from './labels'

describe('buildBatchLabelPrintHtml', () => {
  it('creates an A4 multi-label sheet and escapes box metadata', () => {
    const html = buildBatchLabelPrintHtml([
      { name: '<Winter & coats>', category: 'Clothing', qrDataUrl: 'data:image/png;base64,one' },
      { name: 'Tools', category: 'DIY', qrDataUrl: 'data:image/png;base64,two' },
    ])

    expect(html).toContain('@page { size: A4 portrait')
    expect(html).toContain('grid-template-columns: repeat(2')
    expect(html.match(/<article class="label">/g)).toHaveLength(2)
    expect(html).toContain('&lt;Winter &amp; coats&gt;')
    expect(html).not.toContain('<Winter & coats>')
    expect(html).not.toContain('Attic')
  })
})
