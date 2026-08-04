import { readFileSync } from 'fs'
import { join } from 'path'

// 8% holiday pay is the "agreement at the start" — offered only to casual
// workers, and locked once the employee exists. Changing it later needs an
// explicit override + typed reason, which is audited. Plus a one-click
// "Pay this week" that creates the current period's draft and lands on review.

describe('holiday-pay method: casual-only + locked after onboarding', () => {
  const form = readFileSync(join(process.cwd(), 'src/app/portal/contractors/_components/ContractorForm.tsx'), 'utf8')

  it('offers 8% pay-as-you-go only for casual workers', () => {
    expect(form).toMatch(/isCasual &&[\s\S]{0,120}pay_as_you_go_8_percent/)
  })

  it('locks the method once set at onboarding (requires override to change)', () => {
    expect(form).toMatch(/holidayMethodWasSet = !!contractor\?\.id && !!contractor\?\.holiday_pay_method/)
    expect(form).toMatch(/holidayLocked = holidayMethodWasSet && !holidayOverride/)
    expect(form).toMatch(/disabled=\{holidayLocked\}/)
  })

  it('an override requires a typed reason before submit', () => {
    expect(form).toMatch(/holidayOverride && !holidayOverrideReason\.trim\(\)/)
    expect(form).toMatch(/holiday_pay_method_override_reason/)
  })
})

describe('overriding the agreed holiday method is audited', () => {
  const actions = readFileSync(join(process.cwd(), 'src/app/portal/contractors/_actions.ts'), 'utf8')
  it('writes an audit_log row with the reason', () => {
    expect(actions).toMatch(/holiday_pay_method_override_reason\?\.trim\(\)/)
    expect(actions).toMatch(/action: 'holiday_pay_method\.override'/)
    expect(actions).toMatch(/reason: input\.holiday_pay_method_override_reason\.trim\(\)/)
  })
})

describe('one-click Pay this week', () => {
  const quick = readFileSync(join(process.cwd(), 'src/app/portal/payroll/_components/QuickPayWeek.tsx'), 'utf8')
  it('creates the current advance week and relies on createPayRun redirecting to review', () => {
    expect(quick).toMatch(/advanceWeek/)
    expect(quick).toMatch(/createPayRun\(\{ pay_period_start: wk\.start/)
  })
})
