import { describe, expect, it } from 'vitest'
import { escapeHtml } from './utils'

describe('escapeHtml', () => {
  it('escapes user content before writing a print document', () => {
    expect(escapeHtml('<script>"x" & y</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;')
  })
})
