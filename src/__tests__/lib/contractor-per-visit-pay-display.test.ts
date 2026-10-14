// A per-visit contractor must see the set amount for the visit, not hours ×
// rate. Bella's weekly clean pays Kritika $121.74 a visit (pay_type
// 'per_visit'); the job screen read pay_rate as hourly and showed
// "4 hrs × $121.74/hr = $486.96". The pay approval was always right — this
// pins the display to the same basis.

const rows: Record<string, unknown> = {}

function query(table: string) {
  const result = () => ({ data: rows[table] ?? null, error: null })
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'in', 'neq']) q[m] = () => q
  q.maybeSingle = async () => result()
  q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: Array.isArray(rows[`${table}[]`]) ? rows[`${table}[]`] : [], error: null }).then(res)
  return q
}
const client = { from: (t: string) => query(t) }

jest.mock('@/lib/supabase-service', () => ({ getServiceSupabase: () => client }))
jest.mock('@/lib/job-photos', () => ({ getJobPhotos: async () => [] }))

import { loadContractorJobDetail } from '@/app/contractor/_lib/contractor-job-detail-data'

const JOB = {
  id: 'job-1', job_number: 'JOB-0445', title: 'Weekly Clean', description: null, address: '34 Douglas Street',
  scheduled_date: '2026-10-20', scheduled_time: '9:30', duration_estimate: '4', allowed_hours: 4,
  access_instructions: null, status: 'assigned', contractor_notes: null, started_at: null, completed_at: null,
}

function setWorker(pay_type: string | null, pay_rate: number | null) {
  rows.jobs = JOB
  rows.job_workers = {
    hours_allocated: null, pay_rate, pay_type, extra_hours: 0, extra_hours_status: 'none',
    hours_confirmed_status: 'unconfirmed', hours_confirmed_note: null,
  }
  rows['job_workers[]'] = [{ contractor_id: 'kritika' }]
}

describe('contractor job pay display follows the pay basis', () => {
  it('per-visit: shows the set amount, never hours × amount', async () => {
    setWorker('per_visit', 121.74)
    const d = await loadContractorJobDetail(client as never, 'kritika', 'job-1', 35)
    expect(d?.payBasis).toBe('per_visit')
    expect(d?.jobPay).toBe(121.74)
    expect(d?.jobPay).not.toBeCloseTo(486.96)
    expect(d?.payRate).toBeNull()
    expect(d?.payableHours).toBe(4) // still told how long the visit is
  })

  it('retainer: no per-job amount', async () => {
    setWorker('fixed', 1500)
    const d = await loadContractorJobDetail(client as never, 'kritika', 'job-1', 35)
    expect(d?.payBasis).toBe('fixed')
    expect(d?.jobPay).toBe(0)
    expect(d?.payRate).toBeNull()
  })

  it('hourly: unchanged — hours × rate', async () => {
    setWorker('hourly', 35)
    const d = await loadContractorJobDetail(client as never, 'kritika', 'job-1', 35)
    expect(d?.payBasis).toBe('hourly')
    expect(d?.jobPay).toBe(140)
    expect(d?.payRate).toBe(35)
  })

  it('older rows with no pay_type are hourly', async () => {
    setWorker(null, 35)
    const d = await loadContractorJobDetail(client as never, 'kritika', 'job-1', 35)
    expect(d?.payBasis).toBe('hourly')
    expect(d?.jobPay).toBe(140)
  })
})
