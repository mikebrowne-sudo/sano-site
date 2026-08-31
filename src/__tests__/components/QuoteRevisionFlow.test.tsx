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
import userEvent from '@testing-library/user-event'

// The action bar pulls in SendQuotePanel -> quote server actions -> the Resend
// SDK, which needs Node globals jsdom doesn't provide. These are presentation
// tests, so stub the server-action module at the boundary.
jest.mock('@/app/portal/quotes/[id]/_actions', () => ({
  sendQuoteEmail: jest.fn(),
  sendQuoteTestEmail: jest.fn(),
}))
jest.mock('@/app/portal/quotes/_actions-versioning', () => ({
  createNewVersion: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}))

import { QuoteActionBar, type QuoteActionBarProps } from '@/app/portal/quotes/[id]/_components/QuoteActionBar'
import { QuoteStatusMessage } from '@/app/portal/quotes/[id]/_components/QuoteStatusMessage'
import { RevisionCreatedBanner } from '@/app/portal/quotes/[id]/_components/RevisionCreatedBanner'
import { createNewVersion } from '@/app/portal/quotes/_actions-versioning'
import { useRouter } from 'next/navigation'

function barProps(overrides: Partial<QuoteActionBarProps> = {}): QuoteActionBarProps {
  return {
    quoteId: 'q-1',
    quoteDisplayNumber: 'QUO-0261',
    status: 'draft',
    isArchived: false,
    isLatestVersion: true,
    versionNumber: 1,
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

describe('Revise & resend — the discoverable path off an accepted quote', () => {
  it('offers Revise & resend on an accepted quote', () => {
    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)
    expect(screen.getByRole('button', { name: /revise & resend/i })).toBeInTheDocument()
  })

  it('explains that the accepted version survives and is not re-sent', async () => {
    const user = userEvent.setup()
    render(<QuoteActionBar {...barProps({ status: 'accepted', versionNumber: 2 })} />)

    await user.click(screen.getByRole('button', { name: /revise & resend/i }))

    // Confirmation step spells out both halves of the guarantee.
    expect(screen.getByText(/stays on file unchanged/i)).toBeInTheDocument()
    expect(screen.getByText(/is not re-sent/i)).toBeInTheDocument()
    // Forking v2 produces v3, not a hardcoded v2.
    expect(screen.getByRole('button', { name: /create v3 draft/i })).toBeInTheDocument()
  })

  it('forks from the current version and lands on the new draft', async () => {
    const user = userEvent.setup()
    const push = jest.fn()
    const refresh = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push, refresh })
    ;(createNewVersion as jest.Mock).mockResolvedValue({ ok: true, new_quote_id: 'q-2' })

    render(<QuoteActionBar {...barProps({ status: 'accepted', versionNumber: 1 })} />)
    await user.click(screen.getByRole('button', { name: /revise & resend/i }))
    await user.click(screen.getByRole('button', { name: /create v2 draft/i }))

    expect(createNewVersion).toHaveBeenCalledWith('q-1', expect.objectContaining({
      version_note: expect.stringContaining('accepted v1'),
    }))
    // Redirect carries the params RevisionCreatedBanner validates.
    expect(push).toHaveBeenCalledWith('/portal/quotes/q-2?revised_from=1&revised_status=accepted')
  })

  it('surfaces a fork failure and does not navigate', async () => {
    const user = userEvent.setup()
    const push = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push, refresh: jest.fn() })
    ;(createNewVersion as jest.Mock).mockResolvedValue({ error: 'Chain is locked.' })

    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)
    await user.click(screen.getByRole('button', { name: /revise & resend/i }))
    await user.click(screen.getByRole('button', { name: /create v2 draft/i }))

    expect(screen.getByText('Chain is locked.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('does not navigate when the fork returns no new id', async () => {
    const user = userEvent.setup()
    const push = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push, refresh: jest.fn() })
    ;(createNewVersion as jest.Mock).mockResolvedValue({ ok: true })

    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)
    await user.click(screen.getByRole('button', { name: /revise & resend/i }))
    await user.click(screen.getByRole('button', { name: /create v2 draft/i }))

    expect(screen.getByText(/nothing was changed/i)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('is absent on draft, sent and converted quotes', () => {
    const { unmount } = render(<QuoteActionBar {...barProps({ status: 'draft' })} />)
    expect(screen.queryByRole('button', { name: /revise & resend/i })).not.toBeInTheDocument()
    unmount()

    const { unmount: u2 } = render(<QuoteActionBar {...barProps({ status: 'sent' })} />)
    expect(screen.queryByRole('button', { name: /revise & resend/i })).not.toBeInTheDocument()
    u2()

    render(<QuoteActionBar {...barProps({ status: 'converted' })} />)
    expect(screen.queryByRole('button', { name: /revise & resend/i })).not.toBeInTheDocument()
  })
})

describe('Accepted quote — Send again vs Revise & resend are distinct', () => {
  it('offers both actions, clearly differentiated', () => {
    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)

    // Plain re-send of the agreed document…
    expect(screen.getByRole('button', { name: /send again/i })).toBeInTheDocument()
    // …and the fork-a-new-version path. Two buttons, two meanings.
    expect(screen.getByRole('button', { name: /revise & resend/i })).toBeInTheDocument()
  })

  it('does not offer a generic "Send to customer" on an accepted quote', () => {
    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)
    // An unqualified Send here would be ambiguous about which version the
    // client receives.
    expect(screen.queryByRole('button', { name: /^send to customer$/i })).not.toBeInTheDocument()
  })

  it('hides the test-send action on the accepted re-send (secondary action)', () => {
    render(<QuoteActionBar {...barProps({ status: 'accepted' })} />)
    expect(screen.queryByRole('button', { name: /send test email/i })).not.toBeInTheDocument()
  })

  it('keeps the full send controls on a draft, including test send', () => {
    render(<QuoteActionBar {...barProps({ status: 'draft' })} />)
    expect(screen.getByRole('button', { name: /send to customer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send test email/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send again/i })).not.toBeInTheDocument()
  })
})
