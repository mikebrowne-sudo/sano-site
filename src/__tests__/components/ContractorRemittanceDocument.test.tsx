// Render tests for the contractor remittance advice document.
// Covers footer wording, the service-note rule, and Hours-column
// show/hide behaviour. Pure presentation — no payment logic.

import { render, screen } from '@testing-library/react'
import { ContractorRemittanceDocument } from '@/components/ContractorRemittanceDocument'
import type { RemittanceBatch, RemittanceBatchLine } from '@/lib/contractor-remittance-data'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

function line(overrides: Partial<RemittanceBatchLine> = {}): RemittanceBatchLine {
  return {
    kind: 'invoice',
    contractorName: 'Kritika Kumar',
    jobNumber: 'JOB-0024',
    jobAddress: '26 Buscomb Avenue, Henderson, Auckland 0610, New Zealand',
    note: null,
    label: null,
    hours: null,
    amount: 350,
    ...overrides,
  }
}

function batch(lines: RemittanceBatchLine[]): RemittanceBatch {
  return {
    id: 'r1',
    token: 'tok',
    remittanceNumber: 'RA-0001',
    paymentDate: '2026-05-08',
    reference: 'KRITIKAPAYROLL08-05-26',
    payeeLabel: null,
    notes: null,
    sentAt: null,
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
    contractorNames: Array.from(new Set(lines.map((l) => l.contractorName).filter(Boolean) as string[])),
  }
}

describe('ContractorRemittanceDocument', () => {
  it('uses the "Sano team" footer wording', () => {
    render(<ContractorRemittanceDocument data={batch([line()])} />)
    expect(screen.getByText(/contact the Sano team/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sano office/i)).not.toBeInTheDocument()
  })

  it('hides a property-manager label as a second line', () => {
    render(<ContractorRemittanceDocument data={batch([line({ note: 'Barfoot Royal Heights - 8/28 Buscomb Ave' })])} />)
    expect(screen.queryByText(/Barfoot Royal Heights/)).not.toBeInTheDocument()
    // clean address still shown on the job line
    expect(screen.getByText(/26 Buscomb Avenue, Henderson/)).toBeInTheDocument()
  })

  it('keeps a genuine service-type note as a second line', () => {
    render(<ContractorRemittanceDocument data={batch([line({ note: 'Carpet clean' })])} />)
    expect(screen.getByText('Carpet clean')).toBeInTheDocument()
  })

  it('hides the Hours column when no line has reliable hours', () => {
    render(<ContractorRemittanceDocument data={batch([line({ hours: null }), line({ jobNumber: 'JOB-0008', hours: null })])} />)
    expect(screen.queryByText('Hours')).not.toBeInTheDocument()
  })

  it('shows the Hours column when a line has hours', () => {
    render(<ContractorRemittanceDocument data={batch([line({ hours: 5 }), line({ jobNumber: 'JOB-0008', hours: null })])} />)
    expect(screen.getByText('Hours')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
