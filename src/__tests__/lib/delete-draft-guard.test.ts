import { canDeletePayRunDraft } from '@/lib/payroll/delete-draft-guard'

const base = { status: 'draft', paidAt: null, filingStatus: 'not_filed', payslips: 0, liabilityLines: 0 }

describe('canDeletePayRunDraft', () => {
  it('allows a clean draft', () => {
    expect(canDeletePayRunDraft(base)).toEqual({ ok: true })
  })

  it('blocks a non-draft run', () => {
    for (const status of ['approved', 'paid', 'completed', null]) {
      const r = canDeletePayRunDraft({ ...base, status })
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/only a draft/i)
    }
  })

  it('blocks a run that has been paid', () => {
    expect(canDeletePayRunDraft({ ...base, paidAt: '2026-07-27T00:00:00Z' }).ok).toBe(false)
  })

  it('blocks a run whose payday filing is in flight', () => {
    for (const filingStatus of ['submitted', 'accepted', 'queued', 'rejected']) {
      expect(canDeletePayRunDraft({ ...base, filingStatus }).ok).toBe(false)
    }
  })

  it('blocks a run with payslips or an IRD liability line', () => {
    expect(canDeletePayRunDraft({ ...base, payslips: 1 }).ok).toBe(false)
    expect(canDeletePayRunDraft({ ...base, liabilityLines: 1 }).ok).toBe(false)
  })
})
