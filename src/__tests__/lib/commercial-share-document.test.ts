/** @jest-environment node */

/**
 * Commercial quotes must be delivered as a proposal everywhere.
 *
 * The operator previews the proposal, but the client share link and the
 * emailed PDF both rendered /share/quote/{token}?pdf=1 — the residential quote
 * sheet — because that page had no commercial branch. A client scoped and
 * priced as a commercial tender received a standard quote document.
 *
 * The share page is the single source: both PDF routes render from that URL,
 * so branching there fixes the link and both attachments at once. These pin
 * the naming half of the contract, which is what the client sees in their
 * inbox.
 */

import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'

/** Mirrors the naming rule used by the send actions and the share PDF route. */
function documentFilename(serviceCategory: string | null, quoteNumber: string): string {
  const label = serviceCategory === 'commercial' ? 'Proposal' : 'Quote'
  return `${sanitizePdfFilename(`Sano ${label} - ${quoteNumber}`)}.pdf`
}

describe('delivered document naming', () => {
  it('names a commercial document a Proposal', () => {
    expect(documentFilename('commercial', 'QUO-0348')).toBe('Sano Proposal - QUO-0348.pdf')
  })

  it('leaves residential naming unchanged', () => {
    expect(documentFilename('residential', 'QUO-0261')).toBe('Sano Quote - QUO-0261.pdf')
  })

  it('treats an unset category as a standard quote', () => {
    // Older rows predate service_category; they are quote sheets.
    expect(documentFilename(null, 'QUO-0100')).toBe('Sano Quote - QUO-0100.pdf')
  })

  it('does not treat a lookalike category as commercial', () => {
    expect(documentFilename('property_management', 'QUO-0200'))
      .toBe('Sano Quote - QUO-0200.pdf')
  })
})
