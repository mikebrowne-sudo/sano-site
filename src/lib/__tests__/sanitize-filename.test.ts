import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'

describe('sanitizePdfFilename', () => {
  it('returns a clean stem for a typical quote-style title', () => {
    expect(sanitizePdfFilename('Sano Quote - QT-1234')).toBe('Sano Quote - QT-1234')
  })

  it('replaces unsupported characters with underscore', () => {
    expect(sanitizePdfFilename('Sano/Quote*?\\:|<>"#$&')).toBe('Sano_Quote___________')
  })

  it('strips ASCII control characters', () => {
    expect(sanitizePdfFilename('Sano\x00Quote\x1f-1')).toBe('Sano_Quote_-1')
  })

  it('collapses runs of whitespace to a single space', () => {
    expect(sanitizePdfFilename('Sano   Quote\t\t- 1')).toBe('Sano Quote - 1')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizePdfFilename('   Sano Quote - 1   ')).toBe('Sano Quote - 1')
  })

  it('preserves the en-dash-style hyphen, dots, and underscores', () => {
    expect(sanitizePdfFilename('Sano_Tax-Invoice.v2')).toBe('Sano_Tax-Invoice.v2')
  })

  it('falls back to "Sano Document" on empty input', () => {
    expect(sanitizePdfFilename('')).toBe('Sano Document')
    expect(sanitizePdfFilename('   ')).toBe('Sano Document')
    expect(sanitizePdfFilename('!!!')).toBe('Sano Document')
  })

  it('result + .pdf always matches the safe regex', () => {
    const inputs = ['Sano Quote - QT-1', 'foo/bar', '', 'a\x00b']
    for (const i of inputs) {
      const out = sanitizePdfFilename(i) + '.pdf'
      expect(out).toMatch(/^[A-Za-z0-9 .\-_]+\.pdf$/)
    }
  })
})
