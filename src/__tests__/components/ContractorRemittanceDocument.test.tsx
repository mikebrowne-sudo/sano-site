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
    date: null,
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
    paidAt: null,
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
    whtTotal: lines.reduce((s, l) => s + (l.whtAmount ?? 0), 0),
    contractorNames: Array.from(new Set(lines.map((l) => l.contractorName).filter(Boolean) as string[])),
  }
}

describe('ContractorRemittanceDocument', () => {
  it('uses the "Sano team" footer wording', () => {
    render(<ContractorRemittanceDocument data={batch([line()])} />)
    expect(screen.getByText(/contact the Sano team/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sano office/i)).not.toBeInTheDocument()
  })

  it('renders the stored line note verbatim as a second line', () => {
    // Notes are cleaned at seed time and edited by the operator; the
    // document prints whatever is stored, as-is.
    render(<ContractorRemittanceDocument data={batch([line({ note: 'Carpet clean' })])} />)
    expect(screen.getByText('Carpet clean')).toBeInTheDocument()
    // clean address still shown on the job line
    expect(screen.getByText(/26 Buscomb Avenue, Henderson/)).toBeInTheDocument()
  })

  it('shows a Date column with the clean date when lines have one', () => {
    render(<ContractorRemittanceDocument data={batch([line({ date: '2026-04-30' })])} />)
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText(/30 Apr 2026/)).toBeInTheDocument()
  })

  it('hides the Date column when no line has a date', () => {
    render(<ContractorRemittanceDocument data={batch([line({ date: null })])} />)
    expect(screen.queryByText('Date')).not.toBeInTheDocument()
  })

  it('shows no second line when the note is empty', () => {
    render(<ContractorRemittanceDocument data={batch([line({ note: null })])} />)
    expect(screen.getByText(/26 Buscomb Avenue, Henderson/)).toBeInTheDocument()
  })

  it('suppresses a dumped job description (over-long note)', () => {
    const dump = 'Please clean ceiling fans in bedrooms and lounge, wipe vanity sink cupboards and extractor fan in bathroom, floor tiles around the toilet, empty fireplace, dust laundry shelves'
    render(<ContractorRemittanceDocument data={batch([line({ note: dump })])} />)
    expect(screen.queryByText(/ceiling fans/)).not.toBeInTheDocument()
    expect(screen.getByText(/26 Buscomb Avenue, Henderson/)).toBeInTheDocument()
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

  it('renders the frozen tax breakdown (gross/GST/withholding/net) for a tax-bearing line', () => {
    render(<ContractorRemittanceDocument data={batch([line({
      amount: 1875, contractorPaymentSnapshotId: 's1', grossExGst: 1875, gstAmount: 0,
      whtRate: 0.2, whtAmount: 375, netPaid: 1500,
    })])} />)
    expect(screen.getByText('Gross fee (excl GST)')).toBeInTheDocument()
    expect(screen.getByText('Withholding to IRD')).toBeInTheDocument()
    expect(screen.getByText('Net paid to you')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText(/Total schedular withholding retained to IRD/)).toBeInTheDocument()
  })

  it('an ordinary line renders unchanged — no tax breakdown', () => {
    render(<ContractorRemittanceDocument data={batch([line()])} />)
    expect(screen.queryByText('Gross fee (excl GST)')).not.toBeInTheDocument()
    expect(screen.queryByText('Withholding to IRD')).not.toBeInTheDocument()
    expect(screen.queryByText(/withholding retained to IRD/i)).not.toBeInTheDocument()
  })
})
