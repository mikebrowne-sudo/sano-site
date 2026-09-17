// The Extras form must not let an operator save a half-finished extra.
//
// An extra with a contractor but no pay amount cannot be approved for pay
// later — it just sits there unpaid, and the person who did the work chases it.
// So the amount is REQUIRED once someone is assigned, while an extra with
// nobody on it is allowed (in-house work) but confirmed once first.

type Basis = 'fixed' | 'hourly'

/** Mirrors submit() in JobExtras.tsx. */
function validate(input: {
  contractorId: string
  basis: Basis
  rate: string
  hours: string
  alreadyConfirmedNoContractor: boolean
}): { ok: true } | { prompt: string } {
  if (!input.contractorId && !input.alreadyConfirmedNoContractor) {
    return { prompt: 'who-did-it' }
  }
  if (input.contractorId) {
    const r = Number(input.rate)
    if (!Number.isFinite(r) || r <= 0) return { prompt: 'pay-amount' }
    if (input.basis === 'hourly') {
      const h = Number(input.hours)
      if (!Number.isFinite(h) || h <= 0) return { prompt: 'hours' }
    }
  }
  return { ok: true }
}

const base = { contractorId: '', basis: 'fixed' as Basis, rate: '', hours: '', alreadyConfirmedNoContractor: false }

describe('assigning someone is prompted for', () => {
  it('asks who did the work before saving an unassigned extra', () => {
    expect(validate(base)).toEqual({ prompt: 'who-did-it' })
  })

  it('respects the answer on the second press — in-house is legitimate', () => {
    expect(validate({ ...base, alreadyConfirmedNoContractor: true })).toEqual({ ok: true })
  })
})

describe('the pay amount is required once someone is assigned', () => {
  it('refuses a set-amount extra with no amount', () => {
    expect(validate({ ...base, contractorId: 'dave' })).toEqual({ prompt: 'pay-amount' })
  })

  it('refuses a zero or negative amount', () => {
    expect(validate({ ...base, contractorId: 'dave', rate: '0' })).toEqual({ prompt: 'pay-amount' })
    expect(validate({ ...base, contractorId: 'dave', rate: '-50' })).toEqual({ prompt: 'pay-amount' })
  })

  it('accepts a set amount', () => {
    expect(validate({ ...base, contractorId: 'dave', rate: '180' })).toEqual({ ok: true })
  })

  it('refuses an hourly extra with a rate but no hours', () => {
    expect(validate({ ...base, contractorId: 'dave', basis: 'hourly', rate: '50' }))
      .toEqual({ prompt: 'hours' })
  })

  it('accepts hourly with both a rate and hours', () => {
    expect(validate({ ...base, contractorId: 'dave', basis: 'hourly', rate: '50', hours: '3' }))
      .toEqual({ ok: true })
  })

  it('never asks for a pay amount when nobody is assigned', () => {
    expect(validate({ ...base, alreadyConfirmedNoContractor: true, rate: '' })).toEqual({ ok: true })
  })
})

describe('the carpet-clean case end to end', () => {
  it('a carpet clean by a specialist at a set $180 saves cleanly', () => {
    expect(validate({
      contractorId: 'dave-the-carpet-guy',
      basis: 'fixed',
      rate: '180',
      hours: '',
      alreadyConfirmedNoContractor: false,
    })).toEqual({ ok: true })
  })

  it('the same extra with the contractor picked but no amount is stopped', () => {
    expect(validate({
      contractorId: 'dave-the-carpet-guy',
      basis: 'fixed',
      rate: '',
      hours: '',
      alreadyConfirmedNoContractor: false,
    })).toEqual({ prompt: 'pay-amount' })
  })
})
