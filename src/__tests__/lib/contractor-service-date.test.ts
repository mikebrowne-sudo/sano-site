import { resolveContractorServiceDate } from '@/lib/contractor-service-date'

describe('resolveContractorServiceDate — one rule for every canonical CI', () => {
  it('job-derived CI uses the job completion date', () => {
    expect(resolveContractorServiceDate({
      job_id: 'j1', job_completed_at_nz: '2026-07-06', service_date: null, gst_supply_date: '2026-07-30',
    })).toEqual({ date: '2026-07-06', source: 'job_completed_at' })
  })

  it('manual (jobless) CI uses an explicit service_date', () => {
    expect(resolveContractorServiceDate({
      job_id: null, job_completed_at_nz: null, service_date: '2026-07-10', gst_supply_date: null,
    })).toEqual({ date: '2026-07-10', source: 'service_date' })
  })

  it('fixed-contract (jobless) CI uses the explicit service-period end stored as service_date', () => {
    expect(resolveContractorServiceDate({
      job_id: null, job_completed_at_nz: null, service_date: '2026-07-31', gst_supply_date: '2026-07-31',
    })).toEqual({ date: '2026-07-31', source: 'service_date' })
  })

  it('jobless CI with no service_date falls back to the explicit gst_supply_date', () => {
    expect(resolveContractorServiceDate({
      job_id: null, job_completed_at_nz: null, service_date: null, gst_supply_date: '2026-06-30',
    })).toEqual({ date: '2026-06-30', source: 'gst_supply_date' })
  })

  it('jobless CI with no service date at all → none (excluded + flagged)', () => {
    expect(resolveContractorServiceDate({
      job_id: null, job_completed_at_nz: null, service_date: null, gst_supply_date: null,
    })).toEqual({ date: null, source: 'none' })
  })

  it('job-derived CI with no completion date → none, and NEVER bridges to the tax field', () => {
    expect(resolveContractorServiceDate({
      job_id: 'j1', job_completed_at_nz: null, service_date: null, gst_supply_date: '2026-07-30',
    })).toEqual({ date: null, source: 'none' })
  })

  it('never falls back to a creation timestamp (there is no created_at input at all)', () => {
    // The resolver has no created_at parameter by design — a booking time is not
    // a service date. Absent every explicit date, the result is none.
    const r = resolveContractorServiceDate({ job_id: null, job_completed_at_nz: null, service_date: null, gst_supply_date: null })
    expect(r.date).toBeNull()
  })
})
