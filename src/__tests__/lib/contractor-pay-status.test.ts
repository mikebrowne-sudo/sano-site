import {
  getContractorPayStatus,
  CONTRACTOR_PAY_STATUS_META,
  type ContractorPayStatusInput,
} from '@/app/contractor/_lib/contractor-pay-status'

const base: ContractorPayStatusInput = {
  jobStatus: 'assigned',
  jobCompletedAt: null,
  invoiceStatus: null,
  invoiceDatePaid: null,
  inSentRemittance: false,
}

describe('getContractorPayStatus', () => {
  it('assigned/scheduled job (not completed) → scheduled', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'assigned' })).toBe('scheduled')
    expect(getContractorPayStatus({ ...base, jobStatus: 'in_progress' })).toBe('scheduled')
    expect(getContractorPayStatus({ ...base, jobStatus: 'draft' })).toBe('scheduled')
  })

  it('completed job with no payable → awaiting_approval', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', jobCompletedAt: '2026-06-10', invoiceStatus: null })).toBe('awaiting_approval')
  })

  it('completed job with a not-yet-approved (pending) payable → still awaiting_approval', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', invoiceStatus: 'pending' })).toBe('awaiting_approval')
  })

  it('approved payable, not paid → approved_pending', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', invoiceStatus: 'approved' })).toBe('approved_pending')
  })

  it('paid payable → paid (via status, date_paid, or sent remittance)', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', invoiceStatus: 'paid' })).toBe('paid')
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', invoiceStatus: 'approved', invoiceDatePaid: '2026-06-12' })).toBe('paid')
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', invoiceStatus: 'approved', inSentRemittance: true })).toBe('paid')
  })

  it('treats an invoiced job, or one with completed_at, as completed', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'invoiced', invoiceStatus: 'approved' })).toBe('approved_pending')
    expect(getContractorPayStatus({ ...base, jobStatus: 'assigned', jobCompletedAt: '2026-06-10', invoiceStatus: null })).toBe('awaiting_approval')
  })

  it('resolves two contractors on the same job independently', () => {
    const completedJob = { jobStatus: 'completed', jobCompletedAt: '2026-06-10', invoiceDatePaid: null, inSentRemittance: false }
    // Contractor A approved, contractor B still has no payable.
    expect(getContractorPayStatus({ ...completedJob, invoiceStatus: 'approved' })).toBe('approved_pending')
    expect(getContractorPayStatus({ ...completedJob, invoiceStatus: null })).toBe('awaiting_approval')
  })

  it('legacy / unknown invoice status does not crash and defaults to awaiting_approval', () => {
    expect(getContractorPayStatus({ ...base, jobStatus: 'completed', invoiceStatus: 'some_legacy_value' })).toBe('awaiting_approval')
  })

  it('every status has contractor-safe label/help (no internal financial wording, no old pay-run wording)', () => {
    const text = Object.values(CONTRACTOR_PAY_STATUS_META).flatMap((m) => [m.label, m.help]).join(' ').toLowerCase()
    for (const banned of ['margin', 'profit', 'variance', 'base price', 'quote total', 'pay run']) {
      expect(text).not.toContain(banned)
    }
    expect(CONTRACTOR_PAY_STATUS_META.awaiting_approval.label).toMatch(/sano approval/i)
    expect(CONTRACTOR_PAY_STATUS_META.paid.label).toBe('Paid')
  })
})
