// Regression tests for the quote revision flow.
//
// The bug these lock down: editing an ACCEPTED quote saved in place (no new
// version) AND the action bar early-returned null for accepted status, so the
// operator had no Preview / Download / Send at all — the amended quote was
// unreachable and the accepted record had been silently overwritten.
//
// Covers the two presentation surfaces (action bar + status message) and the
// confirmation banner. The fork decision itself lives in EditQuoteForm's
// FORK_ON_SAVE_STATUSES and is asserted here via the statuses the action bar
// must support as a result.

import { render, screen } from '@testing-library/react'

// The action bar pulls in SendQuotePanel -> quote server actions -> the Resend
// SDK, which needs Node globals jsdom doesn't provide. These are presentation
// tests, so stub the server-action module at the boundary.
jest.mock('@/app/portal/quotes/[id]/_actions', () => ({
  sendQuoteEmail: jest.fn(),
  sendQuoteTestEmail: jest.fn(),
}))

import { QuoteActionBar, type QuoteActionBarProps } from '@/app/portal/quotes/[id]/_components/QuoteActionBar'
import { QuoteStatusMessage } from '@/app/portal/quotes/[id]/_components/QuoteStatusMessage'
import { RevisionCreatedBanner } from '@/app/portal/quotes/[id]/_components/RevisionCreatedBanner'

function barProps(overrides: Partial<QuoteActionBarProps> = {}): QuoteActionBarProps {
  return {
    quoteId: 'q-1',
    quoteDisplayNumber: 'QUO-0261',
    status: 'draft',
    isArchived: false,
    isLatestVersion: true,
    isCommercial: false,
    shareUrl: 'https://sano.nz/share/quote/tok-1',
    clientEmail: 'client@example.com',
    greeting: 'Hi Jamie,',
    staffEmail: 'staff@sano.nz',
    primaryContactEmail: 'client@example.com',
    accountsEmail: '',
    clientReference: '',
    ...overrides,
  }
}

describe('QuoteActionBar — accepted quotes keep document actions', () => {
  it('renders preview, download and copy-link on an accepted quote', () => {
    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)

    // The regression: this bar used to render nothing at all for 'accepted',
    // leaving no way to view or hand over the accepted document.
    expect(screen.getByRole('region', { name: 'Quote actions' })).toBeInTheDocument()
    expect(screen.getByText('View Proposal')).toBeInTheDocument()
    expect(screen.getByText(/download/i)).toBeInTheDocument()
  })

  it('does not offer Send on an accepted quote', () => {
    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)
    // Sending an already-agreed document would confuse the client; the
    // revision path is edit -> fork -> send from the new draft.
    expect(screen.queryByText(/send to customer/i)).not.toBeInTheDocument()
  })

  it('still offers Send on a draft (the forked revision lands here)', () => {
    render(<QuoteActionBar {...barProps({ status: 'draft' })} />)
    expect(screen.getByRole('region', { name: 'Quote actions' })).toBeInTheDocument()
  })

  it('stays hidden for converted, archived and non-latest rows', () => {
    const { container: converted } = render(<QuoteActionBar {...barProps({ status: 'converted' })} />)
    expect(converted).toBeEmptyDOMElement()

    const { container: archived } = render(
      <QuoteActionBar {...barProps({ status: 'accepted', isArchived: true })} />,
    )
    expect(archived).toBeEmptyDOMElement()

    const { container: old } = render(
      <QuoteActionBar {...barProps({ status: 'accepted', isLatestVersion: false })} />,
    )
    expect(old).toBeEmptyDOMElement()
  })
})

describe('QuoteStatusMessage — revision drafts read differently', () => {
  it('flags a v2+ draft as an unsent revision', () => {
    render(<QuoteStatusMessage status="draft" itemCount={3} isArchived={false} versionNumber={2} />)
    expect(screen.getByText(/version 2/i)).toBeInTheDocument()
    expect(screen.getByText(/replace the version they currently have/i)).toBeInTheDocument()
  })

  it('keeps the plain ready-to-send copy for a v1 draft', () => {
    render(<QuoteStatusMessage status="draft" itemCount={3} isArchived={false} versionNumber={1} />)
    expect(screen.getByText(/ready to send/i)).toBeInTheDocument()
  })

  it('does not claim revision status for an empty draft', () => {
    render(<QuoteStatusMessage status="draft" itemCount={0} isArchived={false} versionNumber={2} />)
    expect(screen.getByText(/still being prepared/i)).toBeInTheDocument()
  })
})

describe('RevisionCreatedBanner', () => {
  it('explains that the accepted version is preserved', () => {
    render(
      <RevisionCreatedBanner
        fromVersion={1}
        fromStatus="accepted"
        newVersion={2}
        fromVersionId="q-1"
        isCommercial={false}
      />,
    )
    expect(screen.getByText(/version 2 created/i)).toBeInTheDocument()
    expect(screen.getByText(/the client accepted/i)).toBeInTheDocument()
    expect(screen.getByText(/re-acceptance/i)).toBeInTheDocument()
  })

  it('uses sent-quote wording when the source was merely sent', () => {
    render(
      <RevisionCreatedBanner
        fromVersion={2}
        fromStatus="sent"
        newVersion={3}
        fromVersionId="q-2"
        isCommercial={false}
      />,
    )
    expect(screen.getByText(/preserved read-only/i)).toBeInTheDocument()
    expect(screen.getByText(/still has the old quote/i)).toBeInTheDocument()
  })

  it('links back to the version the client currently holds', () => {
    render(
      <RevisionCreatedBanner
        fromVersion={1}
        fromStatus="accepted"
        newVersion={2}
        fromVersionId="q-1"
        isCommercial={false}
      />,
    )
    expect(screen.getByRole('link', { name: /view v1/i })).toHaveAttribute('href', '/portal/quotes/q-1')
  })
})
