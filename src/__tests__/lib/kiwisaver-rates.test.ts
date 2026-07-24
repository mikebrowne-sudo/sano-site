import {
  KS_EMPLOYEE_STANDARD_RATES,
  KS_EMPLOYEE_ALLOWED_RATES,
  KS_DEFAULT_EMPLOYEE,
  KS_DEFAULT_EMPLOYER,
  KS_EMPLOYER_MIN_RATE,
  KS_EMPLOYER_MIN_RATE_FRACTION,
  employerKiwiSaverRate,
  isTempReductionExpired,
  validateKiwiSaverElection,
  resolveEmployeeKiwiSaverRateForPay,
} from '@/lib/payroll/kiwisaver'
import { EMPLOYER_KIWISAVER_MIN_RATE } from '@/lib/payroll/esct'

describe('KiwiSaver canonical constants (1 April 2026 rules)', () => {
  it('standard employee elections are 3.5/4/6/8/10 — 3% is NOT a standard election', () => {
    expect(KS_EMPLOYEE_STANDARD_RATES).toEqual([3.5, 4, 6, 8, 10])
    expect(KS_EMPLOYEE_STANDARD_RATES).not.toContain(3)
  })
  it('allowed (storable) rates include 3 (temporary reduction only)', () => {
    expect(KS_EMPLOYEE_ALLOWED_RATES).toEqual([3, 3.5, 4, 6, 8, 10])
  })
  it('defaults + employer minimum are 3.5', () => {
    expect(KS_DEFAULT_EMPLOYEE).toBe(3.5)
    expect(KS_DEFAULT_EMPLOYER).toBe(3.5)
    expect(KS_EMPLOYER_MIN_RATE).toBe(3.5)
  })
  it('esct employer-min constant is the SAME source (no drift)', () => {
    expect(EMPLOYER_KIWISAVER_MIN_RATE).toBe(KS_EMPLOYER_MIN_RATE_FRACTION)
    expect(EMPLOYER_KIWISAVER_MIN_RATE).toBe(0.035)
  })
})

describe('employerKiwiSaverRate — floors at the statutory minimum', () => {
  it('floors a stale/low stored rate (3) up to 3.5', () => {
    expect(employerKiwiSaverRate(3)).toBe(3.5)
  })
  it('null/undefined → 3.5', () => {
    expect(employerKiwiSaverRate(null)).toBe(3.5)
    expect(employerKiwiSaverRate(undefined)).toBe(3.5)
  })
  it('keeps a valid higher rate', () => {
    expect(employerKiwiSaverRate(4)).toBe(4)
    expect(employerKiwiSaverRate(6)).toBe(6)
  })
})

describe('isTempReductionExpired', () => {
  it('true only for a temporary_reduction whose expiry is before asOf', () => {
    expect(isTempReductionExpired('temporary_reduction', '2026-06-30', '2026-07-01')).toBe(true)
  })
  it('false when the reduction is still current', () => {
    expect(isTempReductionExpired('temporary_reduction', '2026-08-01', '2026-07-01')).toBe(false)
  })
  it('false when not a temporary reduction, or no expiry', () => {
    expect(isTempReductionExpired('standard', '2026-06-30', '2026-07-01')).toBe(false)
    expect(isTempReductionExpired('temporary_reduction', null, '2026-07-01')).toBe(false)
  })
})

describe('validateKiwiSaverElection — blocks only structural errors', () => {
  it('no rate set → nothing to validate', () => {
    expect(validateKiwiSaverElection({ rate: null, source: null })).toEqual({})
  })
  it.each([3.5, 4, 6, 8, 10])('accepts standard election %s%%', (r) => {
    expect(validateKiwiSaverElection({ rate: r, source: 'standard' })).toEqual({})
  })
  it('accepts a valid 3% temporary reduction (rate + source + expiry)', () => {
    expect(validateKiwiSaverElection({ rate: 3, source: 'temporary_reduction', expiry: '2026-12-01' })).toEqual({})
  })
  it('rejects a temporary reduction without an expiry', () => {
    expect(validateKiwiSaverElection({ rate: 3, source: 'temporary_reduction' }).error).toMatch(/expiry/i)
  })
  it('rejects a temporary reduction at a rate other than 3%', () => {
    expect(validateKiwiSaverElection({ rate: 4, source: 'temporary_reduction', expiry: '2026-12-01' }).error).toMatch(/must be 3/i)
  })
  it('rejects a rate outside the allowed set', () => {
    expect(validateKiwiSaverElection({ rate: 5, source: 'standard' }).error).toBeDefined()
    expect(validateKiwiSaverElection({ rate: 7, source: 'standard' }).error).toBeDefined()
  })
  it('rejects an unknown rate source', () => {
    expect(validateKiwiSaverElection({ rate: 4, source: 'nonsense' }).error).toBeDefined()
  })
  it('WARNS (does not block) a stored 3% that is not a temporary reduction — historical rows stay editable', () => {
    const r = validateKiwiSaverElection({ rate: 3, source: 'standard' })
    expect(r.error).toBeUndefined()
    expect(r.warning).toMatch(/temporary rate reduction/i)
  })
})

describe('resolveEmployeeKiwiSaverRateForPay — never continues an expired 3% silently', () => {
  it('expired temporary reduction → uses the standard 3.5% + warning', () => {
    const r = resolveEmployeeKiwiSaverRateForPay({ rate: 3, source: 'temporary_reduction', expiry: '2026-06-30', asOf: '2026-07-24' })
    expect(r.rate).toBe(3.5)
    expect(r.warning).toMatch(/expired/i)
  })
  it('current temporary reduction → keeps the 3% rate, no warning', () => {
    const r = resolveEmployeeKiwiSaverRateForPay({ rate: 3, source: 'temporary_reduction', expiry: '2026-12-31', asOf: '2026-07-24' })
    expect(r.rate).toBe(3)
    expect(r.warning).toBeUndefined()
  })
  it('standard election is used as stored', () => {
    expect(resolveEmployeeKiwiSaverRateForPay({ rate: 4, source: 'standard', expiry: null, asOf: '2026-07-24' })).toEqual({ rate: 4 })
  })
  it('missing rate → standard default 3.5', () => {
    expect(resolveEmployeeKiwiSaverRateForPay({ rate: null, source: null, expiry: null, asOf: '2026-07-24' }).rate).toBe(3.5)
  })
})
