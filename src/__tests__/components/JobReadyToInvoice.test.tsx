// Phase G.2 step 3 — light render tests for the Ready-to-invoice
// panel. Asserts the clean state copy, the severity summary line,
// the relabelled severity badges, and that suggested-action links
// render when href is supplied.

import { render, screen } from '@testing-library/react'
import { JobReadyToInvoice } from '@/app/portal/jobs/[id]/_components/JobReadyToInvoice'
import type { ReconciliationFlag } from '@/lib/job-reconciliation'

function flag(partial: Partial<ReconciliationFlag> = {}): ReconciliationFlag {
  return {
    flag: 'test-flag',
    severity: 'warning',
    message: 'Something to check',
    ...partial,
  }
}

describe('JobReadyToInvoice', () => {
  it('renders the clean state when there are no flags', () => {
    render(
      <JobReadyToInvoice
        flags={[]}
        severityCounts={{ hard: 0, warning: 0, info: 0 }}
      />,
    )
    expect(screen.getByText('Ready to invoice')).toBeInTheDocument()
    expect(screen.getByText(/No finance cleanup issues found for this job\./)).toBeInTheDocument()
  })

  it('renders the severity summary line when there are issues', () => {
    render(
      <JobReadyToInvoice
        flags={[flag({ flag: 'no-job-price', severity: 'hard', message: 'No job price set' })]}
        severityCounts={{ hard: 2, warning: 3, info: 0 }}
      />,
    )
    // The summary numbers + labels are split into spans; assert each piece.
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText(/need fixing/)).toBeInTheDocument()
    expect(screen.getByText(/to check/)).toBeInTheDocument()
    expect(screen.getByText(/info/)).toBeInTheDocument()
  })

  it('uses friendly severity labels on badges', () => {
    render(
      <JobReadyToInvoice
        flags={[
          flag({ flag: 'a', severity: 'hard', message: 'A' }),
          flag({ flag: 'b', severity: 'warning', message: 'B' }),
          flag({ flag: 'c', severity: 'info', message: 'C' }),
        ]}
        severityCounts={{ hard: 1, warning: 1, info: 1 }}
      />,
    )
    expect(screen.getByText('Needs fixing')).toBeInTheDocument()
    expect(screen.getByText('Check')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('renders a clickable suggested-action link when href is supplied', () => {
    render(
      <JobReadyToInvoice
        flags={[
          flag({
            flag: 'no-job-price',
            severity: 'hard',
            message: 'No job price set',
            suggestedAction: 'Set job price',
            href: '/portal/jobs/abc/edit',
          }),
        ]}
        severityCounts={{ hard: 1, warning: 0, info: 0 }}
      />,
    )
    const link = screen.getByRole('link', { name: /Set job price/i })
    expect(link).toHaveAttribute('href', '/portal/jobs/abc/edit')
  })

  it('renders the suggested action as plain text when no href is supplied', () => {
    render(
      <JobReadyToInvoice
        flags={[
          flag({
            flag: 'pay-not-approved',
            severity: 'warning',
            message: 'Contractor pay not approved',
            suggestedAction: 'Open pay approvals',
          }),
        ]}
        severityCounts={{ hard: 0, warning: 1, info: 0 }}
      />,
    )
    expect(screen.getByText('Open pay approvals')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Open pay approvals/i })).toBeNull()
  })

  it('renders each flag message on its own row', () => {
    render(
      <JobReadyToInvoice
        flags={[
          flag({ flag: 'a', severity: 'hard', message: 'No client linked' }),
          flag({ flag: 'b', severity: 'hard', message: 'No job price set' }),
          flag({ flag: 'c', severity: 'warning', message: 'Approved hours missing' }),
        ]}
        severityCounts={{ hard: 2, warning: 1, info: 0 }}
      />,
    )
    expect(screen.getByText('No client linked')).toBeInTheDocument()
    expect(screen.getByText('No job price set')).toBeInTheDocument()
    expect(screen.getByText('Approved hours missing')).toBeInTheDocument()
  })
})
