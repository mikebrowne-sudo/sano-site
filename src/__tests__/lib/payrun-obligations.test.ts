import { computeIrdSetAside, paydayFilingDue } from '@/lib/payroll/payrun-obligations'
import { firstPayReadiness, readinessOutstanding } from '@/lib/payroll/first-pay-readiness'

describe('computeIrdSetAside — Carol golden', () => {
  it('sets aside PAYE + employee KS + gross employer KS, ESCT shown but not added', () => {
    const res = computeIrdSetAside([
      { paye: 94.5, kiwisaverEmployee: 21, kiwisaverEmployerGross: 21, kiwisaverEmployerNet: 17.32 },
    ])
    expect(res.paye).toBe(94.5)
    expect(res.employeeKs).toBe(21)
    expect(res.employerKsGross).toBe(21)
    expect(res.esct).toBe(3.68)            // 21 − 17.32, informational
    expect(res.total).toBe(136.5)          // NOT 136.5 + 3.68
  })

  it('sums multiple lines and leaves ESCT null when net is unknown', () => {
    const res = computeIrdSetAside([
      { paye: 94.5, kiwisaverEmployee: 21, kiwisaverEmployerGross: 21 },
      { paye: 50, kiwisaverEmployee: 10, kiwisaverEmployerGross: 10 },
    ])
    expect(res.total).toBe(206.5)
    expect(res.esct).toBeNull()
  })
})

describe('paydayFilingDue — 2 working days after payday', () => {
  it('Monday payday → due Wednesday', () => {
    expect(paydayFilingDue('2026-07-27')).toBe('2026-07-29') // Mon → Wed
  })
  it('skips the weekend (Thursday payday → Monday)', () => {
    expect(paydayFilingDue('2026-07-30')).toBe('2026-08-03') // Thu → +Fri,+Mon
  })
})

describe('firstPayReadiness', () => {
  const carolReady = {
    agreementSigned: true, ir330Received: true, bankAccount: '12-3456-7890123-00',
    kiwisaverStatus: 'auto_enrolled', infoPackRecorded: true, irdCompared: true, empRegistered: false,
  }

  it('passes the six settled checks and marks EMP pending (non-blocking)', () => {
    const items = firstPayReadiness(carolReady)
    const emp = items.find((i) => i.key === 'emp')!
    expect(emp.status).toBe('pending')
    expect(emp.detail).toMatch(/does not block/i)
    // EMP pending is excluded from "outstanding" so it never blocks readiness.
    expect(readinessOutstanding(items)).toEqual([])
  })

  it('warns on a review_required KiwiSaver status and missing pieces', () => {
    const items = firstPayReadiness({ ...carolReady, kiwisaverStatus: 'review_required', ir330Received: false, bankAccount: null })
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.status]))
    expect(byKey.kiwisaver).toBe('warn')
    expect(byKey.ir330).toBe('warn')
    expect(byKey.bank).toBe('warn')
    expect(readinessOutstanding(items).map((i) => i.key).sort()).toEqual(['bank', 'ir330', 'kiwisaver'])
  })

  it('never reports EMP as filed/accepted while pending', () => {
    const emp = firstPayReadiness(carolReady).find((i) => i.key === 'emp')!
    expect(emp.detail).not.toMatch(/accepted|filed\b/i)
  })
})
