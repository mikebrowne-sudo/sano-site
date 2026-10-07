// Regression: the contractor cannot trigger or alter the no-service-schedule
// exception. The exception is set ONLY by the admin-gated
// setAgreementNoScheduleException; the contractor-facing token actions must never
// write no_service_schedules. This locks that at the source level.

import { readFileSync } from 'fs'
import { join } from 'path'

const contractorActions = readFileSync(
  join(process.cwd(), 'src/app/agreement/[token]/_actions.ts'),
  'utf8',
)

describe('contractor cannot set/alter the no-schedule exception', () => {
  it('the contractor token actions never write no_service_schedules in an update', () => {
    // Any `.update({ ... no_service_schedules ... })` in the contractor module
    // would be a leak. Reads (select / guard evaluation) are fine.
    const updateBlocks = contractorActions.match(/\.update\(\{[\s\S]*?\}\)/g) ?? []
    for (const block of updateBlocks) {
      expect(block.includes('no_service_schedules')).toBe(false)
    }
  })

  it('the contractor correction action only records an audit note (no agreement mutation of terms)', () => {
    // requestAgreementScheduleCorrection must not update employment_agreements at all.
    const fnStart = contractorActions.indexOf('export async function requestAgreementScheduleCorrection')
    const fnEnd = contractorActions.indexOf('\nexport ', fnStart + 1)
    const fn = contractorActions.slice(fnStart, fnEnd === -1 ? undefined : fnEnd)
    expect(fn).toContain("from('audit_log')")
    expect(fn).not.toMatch(/\.from\('employment_agreements'\)[\s\S]*\.update\(/)
  })
})
