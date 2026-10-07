import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveContractorServiceDate } from '@/lib/contractor-service-date'

// Regression: the Pay-run period filter showed no jobs because the by-contractor
// planner filtered on the raw service_date column — which is NULL for every
// job-derived payable — so splitByPeriod dropped them all as "undated". The fix:
// resolve the effective date (service_date → job.completed_at → gst_supply_date)
// the same way the rest of the pay pipeline does.

describe('a job-based payable resolves its date from job completion (not a null column)', () => {
  it('service_date null + a completed job → the completion date', () => {
    const d = resolveContractorServiceDate({
      job_id: 'j1', job_completed_at_nz: '2026-07-08', service_date: null, gst_supply_date: '2026-07-20',
    })
    expect(d.date).toBe('2026-07-08')   // job completion wins for a job-derived CI
  })
  it('a jobless CI falls back to its explicit service_date then gst supply date', () => {
    expect(resolveContractorServiceDate({ job_id: null, job_completed_at_nz: null, service_date: '2026-07-03', gst_supply_date: null }).date).toBe('2026-07-03')
    expect(resolveContractorServiceDate({ job_id: null, job_completed_at_nz: null, service_date: null, gst_supply_date: '2026-07-05' }).date).toBe('2026-07-05')
  })
  it('genuinely dateless CI stays undated (surfaced as the amber count, never swept into a run)', () => {
    expect(resolveContractorServiceDate({ job_id: null, job_completed_at_nz: null, service_date: null, gst_supply_date: null }).date).toBeNull()
  })
})

describe('the by-contractor planner now resolves the effective date (source-level)', () => {
  const src = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts'), 'utf8')

  it('joins the job + reads gst_supply_date (not just the raw service_date column)', () => {
    // The job join also carries job_number/address for the pay-workspace
    // breakdown (Phase 3); completed_at remains the date source.
    expect(src).toMatch(/jobs \( completed_at, job_number, address \)/)
    expect(src).toMatch(/gst_supply_date/)
  })
  it('feeds the effective date to the period splitter via resolveContractorServiceDate', () => {
    expect(src).toMatch(/resolveContractorServiceDate\(\{[\s\S]{0,160}job_completed_at_nz: toNzCalendarDate/)
    expect(src).toMatch(/serviceDate: resolveContractorServiceDate/)
  })
})
