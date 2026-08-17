/** @jest-environment node */

// Unit coverage for the shared accepted-quote invariant helper, and for the
// property that makes the supported edit path keep working: after a fork the
// row being written is the NEW DRAFT, so the guard does not fire.

import {
  assertNotAcceptedInPlace,
  ACCEPTED_QUOTE_IN_PLACE_ERROR,
} from '@/lib/amendment-lock'

describe('assertNotAcceptedInPlace', () => {
  it('rejects an accepted quote', () => {
    expect(assertNotAcceptedInPlace('accepted')).toEqual({ error: ACCEPTED_QUOTE_IN_PLACE_ERROR })
  })

  it.each(['draft', 'sent', 'viewed', 'declined', 'converted', null, undefined])(
    'allows status %s',
    (status) => {
      expect(assertNotAcceptedInPlace(status as string | null | undefined)).toBeNull()
    },
  )

  it('is case-sensitive on the canonical stored value only', () => {
    // Statuses are written by our own code as lowercase literals; a differently
    // cased value is not a status we produce, so it must not be treated as
    // accepted (and equally must not be silently blocked).
    expect(assertNotAcceptedInPlace('Accepted')).toBeNull()
  })

  it('names the new-version path in the operator message', () => {
    expect(ACCEPTED_QUOTE_IN_PLACE_ERROR).toMatch(/new version/i)
    expect(ACCEPTED_QUOTE_IN_PLACE_ERROR).toMatch(/stays on file/i)
  })
})

describe('supported edit path — fork then write', () => {
  // EditQuoteForm calls createNewVersion() first, which returns a NEW draft
  // id, and only then calls updateQuote against that id. The guard reads the
  // status of the row being written, so the accepted source is never the
  // target of the write.
  it('does not fire for the forked draft that the edit is written onto', () => {
    const acceptedSourceStatus = 'accepted'
    const forkedTargetStatus = 'draft' // what cloneAsNewVersion sets

    expect(assertNotAcceptedInPlace(acceptedSourceStatus)).not.toBeNull()
    expect(assertNotAcceptedInPlace(forkedTargetStatus)).toBeNull()
  })
})
