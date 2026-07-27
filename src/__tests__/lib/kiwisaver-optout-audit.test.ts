import {
  validateEmployerOptOut,
  validateIrdOptOut,
  validateSavingsSuspension,
  kiwiSaverStatusStatement,
  validateKiwiSaverElection,
  KS_DEFAULT_EMPLOYEE,
} from '@/lib/payroll/kiwisaver'

// Start 2026-07-01 → window day 14 = 2026-07-15, day 56 = 2026-08-26.
const START = '2026-07-01'

describe('validateEmployerOptOut (KS10 — employer-received)', () => {
  it('only an auto-enrolled employee may opt out', () => {
    for (const status of ['existing_member', 'opted_in', 'savings_suspension', 'opted_out', null]) {
      const r = validateEmployerOptOut({ status, startDate: START, ks10SignedDate: '2026-07-20', ks10ReceivedDate: '2026-07-21' })
      expect(r.error).toMatch(/Only an automatically enrolled employee/)
      expect(r.patch).toBeUndefined()
    }
  })

  it('requires both the signed and received dates', () => {
    expect(validateEmployerOptOut({ status: 'auto_enrolled', startDate: START, ks10SignedDate: '', ks10ReceivedDate: '2026-07-21' }).error).toMatch(/signed the KS10/)
    expect(validateEmployerOptOut({ status: 'auto_enrolled', startDate: START, ks10SignedDate: '2026-07-20', ks10ReceivedDate: '' }).error).toMatch(/received by Sano/)
  })

  it('rejects a KS10 received before the window opens (day 14)', () => {
    const r = validateEmployerOptOut({ status: 'auto_enrolled', startDate: START, ks10SignedDate: '2026-07-05', ks10ReceivedDate: '2026-07-10' })
    expect(r.error).toMatch(/before the opt-out window opened/)
    expect(r.patch).toBeUndefined()
  })

  it('rejects a KS10 received after the window closes (day 56) — must go via IRD', () => {
    const r = validateEmployerOptOut({ status: 'auto_enrolled', startDate: START, ks10SignedDate: '2026-08-20', ks10ReceivedDate: '2026-09-01' })
    expect(r.error).toMatch(/after the opt-out window closed/)
    expect(r.error).toMatch(/IRD/)
  })

  it('accepts a KS10 received in-window and stops deductions from the effective date', () => {
    const r = validateEmployerOptOut({ status: 'auto_enrolled', startDate: START, ks10SignedDate: '2026-07-18', ks10ReceivedDate: '2026-07-20' })
    expect(r.error).toBeUndefined()
    expect(r.patch).toMatchObject({
      kiwisaver_status: 'opted_out',
      kiwisaver_enrolled: false,
      kiwisaver_ks10_signed_date: '2026-07-18',
      kiwisaver_ks10_received_date: '2026-07-20',
      kiwisaver_payroll_stop_effective_date: '2026-07-20',
    })
  })
})

describe('validateIrdOptOut (myIR / late — approval-gated)', () => {
  it('a pending application (no approval) never stops deductions', () => {
    const r = validateIrdOptOut({ status: 'auto_enrolled', irdApprovalReference: '', irdApprovalDate: null, instructedEffectiveDate: null })
    expect(r.error).toMatch(/only takes effect once IRD approval is received/)
    expect(r.patch).toBeUndefined()
  })

  it('requires the instructed effective date even with an approval reference', () => {
    const r = validateIrdOptOut({ status: 'auto_enrolled', irdApprovalReference: 'IRD-123', irdApprovalDate: '2026-09-10', instructedEffectiveDate: null })
    expect(r.error).toMatch(/effective date IRD has instructed/)
  })

  it('only an auto-enrolled employee may opt out via IRD', () => {
    const r = validateIrdOptOut({ status: 'existing_member', irdApprovalReference: 'IRD-123', irdApprovalDate: '2026-09-10', instructedEffectiveDate: '2026-09-10' })
    expect(r.error).toMatch(/Only an automatically enrolled employee/)
  })

  it('records the approval and stops deductions from the IRD-instructed date', () => {
    const r = validateIrdOptOut({ status: 'auto_enrolled', irdApprovalReference: 'IRD-123', irdApprovalDate: '2026-09-10', instructedEffectiveDate: '2026-09-15' })
    expect(r.patch).toMatchObject({
      kiwisaver_status: 'opted_out',
      kiwisaver_enrolled: false,
      kiwisaver_ird_approval_reference: 'IRD-123',
      kiwisaver_ird_approval_date: '2026-09-10',
      kiwisaver_payroll_stop_effective_date: '2026-09-15',
    })
  })
})

describe('validateSavingsSuspension', () => {
  it('blocks without an approved-notice reference (deductions continue)', () => {
    expect(validateSavingsSuspension({ noticeRef: '', from: '2026-08-01' }).error).toMatch(/approved savings-suspension notice/)
    expect(validateSavingsSuspension({ noticeRef: '  ', from: '2026-08-01' }).patch).toBeUndefined()
  })

  it('requires an effective-from date', () => {
    expect(validateSavingsSuspension({ noticeRef: 'SS-9', from: null }).error).toMatch(/effective-from date/)
  })

  it('rejects an end date before the start date', () => {
    expect(validateSavingsSuspension({ noticeRef: 'SS-9', from: '2026-08-01', to: '2026-07-01' }).error).toMatch(/cannot be before/)
  })

  it('suspends (deductions stop) on valid evidence', () => {
    const r = validateSavingsSuspension({ noticeRef: 'SS-9', from: '2026-08-01', to: '2027-02-01' })
    expect(r.patch).toMatchObject({
      kiwisaver_status: 'savings_suspension',
      kiwisaver_enrolled: false,
      kiwisaver_savings_suspension_ref: 'SS-9',
      kiwisaver_savings_suspension_from: '2026-08-01',
      kiwisaver_savings_suspension_to: '2027-02-01',
    })
  })
})

describe('KS2 rate handling — never block payroll for want of a rate', () => {
  it('a missing rate is not an error (payroll defaults to 3.5%)', () => {
    expect(validateKiwiSaverElection({ rate: null, source: null })).toEqual({})
    expect(KS_DEFAULT_EMPLOYEE).toBe(3.5)
  })
})

describe('kiwiSaverStatusStatement — current legal status only', () => {
  it('maps each status to its statement, never an intention', () => {
    expect(kiwiSaverStatusStatement('existing_member')).toMatch(/Existing KiwiSaver member/)
    expect(kiwiSaverStatusStatement('auto_enrolled')).toMatch(/Automatically enrolled in KiwiSaver/)
    expect(kiwiSaverStatusStatement('opted_in')).toMatch(/Automatically enrolled in KiwiSaver/)
    expect(kiwiSaverStatusStatement('savings_suspension', { suspensionTo: '2027-02-01' })).toBe('Approved KiwiSaver savings suspension recorded until 2027-02-01.')
    expect(kiwiSaverStatusStatement('opted_out', { optOutEffectiveDate: '2026-07-20' })).toBe('Opted out of KiwiSaver, effective 2026-07-20.')
    expect(kiwiSaverStatusStatement('not_eligible', { notEligibleReason: 'under 18' })).toBe('Not eligible for automatic enrolment (under 18).')
    // Never leaks a future intention:
    for (const s of ['existing_member', 'auto_enrolled', 'opted_in', 'savings_suspension', 'opted_out', 'not_eligible']) {
      expect(kiwiSaverStatusStatement(s)).not.toMatch(/inten(d|tion)/i)
    }
  })
})
