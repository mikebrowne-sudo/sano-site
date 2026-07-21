/** @jest-environment node */

// Stage 1 PR A — staff draft-statement generation. Uses a small in-memory
// Supabase fake so idempotency, refresh, number-stability, concurrency and
// "no historical mutation" are exercised against real store behaviour.
// (Period math, grouping, GST totals, carry-forward and service-date resolution
// are unit-tested separately in the contractor-statement-* / contractor-service-date suites.)

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({
  isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz',
}))

import { generateDraftStatements } from '@/app/portal/contractor-statements/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock
const PERIOD = { period_start: '2026-07-01', period_end: '2026-07-15' }

interface FakeCI {
  id: string
  contractor_id: string
  invoice_number: string
  amount: number
  gst_status: string | null
  gst_amount: number | null
  job_id: string | null
  service_date: string | null
  gst_supply_date: string | null
  status: string
  date_paid: string | null
  statement_id: string | null
  contractors: { full_name: string | null }
  jobs: { completed_at: string | null } | null
}

function makeDb(cis: FakeCI[], opts: { user?: { id: string; email: string } | null; failInsertOnceWithDup?: boolean } = {}) {
  const store = {
    contractor_invoices: cis.map((c) => ({ ...c })),
    contractor_statements: [] as Array<Record<string, unknown>>,
    contractor_remittance_items: [] as Array<{ contractor_invoice_id: string }>,
    audit_log: [] as Array<Record<string, unknown>>,
  }
  let stmtSeq = 0
  let failInsert = !!opts.failInsertOnceWithDup
  const user = opts.user === undefined ? { id: 'u-admin', email: 'admin@sano.nz' } : opts.user

  function match(table: keyof typeof store, filters: Array<[string, string, unknown]>) {
    return (store[table] as Array<Record<string, unknown>>).filter((row) =>
      filters.every(([kind, col, val]) => {
        if (kind === 'eq') return row[col] === val
        if (kind === 'neq') return row[col] !== val
        if (kind === 'is') return row[col] == null
        if (kind === 'notNull') return row[col] != null
        if (kind === 'in') return (val as unknown[]).includes(row[col])
        return true
      }),
    )
  }

  function builder(table: keyof typeof store) {
    const filters: Array<[string, string, unknown]> = []
    let op: 'select' | 'insert' | 'update' = 'select'
    let payload: Record<string, unknown> | null = null

    const run = () => {
      if (op === 'insert') {
        if (table === 'contractor_statements') {
          if (failInsert) {
            failInsert = false
            // Model a concurrent winner committing the same row between our
            // existence check and insert: the insert fails 23505, and the row
            // now exists for the subsequent re-fetch to find.
            stmtSeq += 1
            store.contractor_statements.push({
              id: `st-race-${stmtSeq}`, statement_number: `STMT-${String(stmtSeq).padStart(4, '0')}`,
              subtotal: 0, gst_total: 0, total_payable: 0, ...payload,
            })
            return { data: null, error: { code: '23505', message: 'duplicate' } }
          }
          const dup = (store.contractor_statements as Array<Record<string, unknown>>).some(
            (s) => s.contractor_id === payload!.contractor_id && s.period_start === payload!.period_start && s.period_end === payload!.period_end && s.status !== 'superseded',
          )
          if (dup) return { data: null, error: { code: '23505', message: 'duplicate' } }
          stmtSeq += 1
          const row = { id: `st-${stmtSeq}`, statement_number: `STMT-${String(stmtSeq).padStart(4, '0')}`, subtotal: 0, gst_total: 0, total_payable: 0, ...payload }
          store.contractor_statements.push(row)
          return { data: row, error: null }
        }
        ;(store[table] as Array<Record<string, unknown>>).push({ ...payload })
        return { data: payload, error: null }
      }
      if (op === 'update') {
        const rows = match(table, filters)
        rows.forEach((r) => Object.assign(r, payload))
        return { data: rows, error: null }
      }
      return { data: match(table, filters), error: null }
    }

    const api: Record<string, unknown> = {
      select: () => api,
      insert: (p: Record<string, unknown>) => { op = 'insert'; payload = p; return api },
      update: (p: Record<string, unknown>) => { op = 'update'; payload = p; return api },
      eq: (col: string, val: unknown) => { filters.push(['eq', col, val]); return api },
      neq: (col: string, val: unknown) => { filters.push(['neq', col, val]); return api },
      is: (col: string) => { filters.push(['is', col, null]); return api },
      not: (col: string) => { filters.push(['notNull', col, null]); return api },
      in: (col: string, val: unknown[]) => { filters.push(['in', col, val]); return api },
      maybeSingle: async () => { const r = run(); return { data: (r.data as unknown[])?.[0] ?? null, error: r.error } },
      single: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error } },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    }
    return api
  }

  return {
    client: {
      from: (t: string) => builder(t as keyof typeof store),
      auth: { getUser: async () => ({ data: { user } }) },
    },
    store,
  }
}

const jobCi = (over: Partial<FakeCI> & { id: string; contractor_id: string; amount: number }): FakeCI => ({
  invoice_number: `CI-${over.id}`,
  gst_status: 'not_assessed', gst_amount: null,
  job_id: `job-${over.id}`, service_date: null, gst_supply_date: null,
  status: 'approved', date_paid: null, statement_id: null,
  contractors: { full_name: 'Kritika Kumar' },
  jobs: { completed_at: '2026-07-06T02:00:00Z' }, // NZ 2026-07-06
  ...over,
})

beforeEach(() => mockedCreate.mockReset())

it('creates one draft per contractor, links CIs, computes totals, and audits', async () => {
  const { client, store } = makeDb([
    jobCi({ id: '1', contractor_id: 'k', amount: 280 }),
    jobCi({ id: '2', contractor_id: 'k', amount: 140 }),
    jobCi({ id: '3', contractor_id: 'm', amount: 350, contractors: { full_name: 'Marina' } }),
  ])
  mockedCreate.mockReturnValue(client)

  const res = await generateDraftStatements(PERIOD)
  expect(res).toMatchObject({ created: 2, linked_cis: 3 })
  expect(store.contractor_statements).toHaveLength(2)
  const k = store.contractor_statements.find((s) => s.contractor_id === 'k')!
  expect(k.subtotal).toBe(420)
  expect(k.total_payable).toBe(420)
  expect(store.contractor_invoices.filter((c) => c.statement_id === k.id)).toHaveLength(2)
  expect(store.audit_log.some((a) => a.action === 'contractor_statement.created')).toBe(true)
  expect(store.audit_log.some((a) => a.action === 'contractor_invoice.linked_to_statement')).toBe(true)
})

it('is idempotent — a second run makes no new statement and keeps the number', async () => {
  const { client, store } = makeDb([jobCi({ id: '1', contractor_id: 'k', amount: 280 })])
  mockedCreate.mockReturnValue(client)

  await generateDraftStatements(PERIOD)
  const numberAfterFirst = store.contractor_statements[0].statement_number
  const res2 = await generateDraftStatements(PERIOD)

  expect(res2).toMatchObject({ created: 0, refreshed: 0, linked_cis: 0 })
  expect(store.contractor_statements).toHaveLength(1)
  expect(store.contractor_statements[0].statement_number).toBe(numberAfterFirst)
})

it('refresh ADDS a newly eligible CI without removing existing lines, number stable', async () => {
  const first = [jobCi({ id: '1', contractor_id: 'k', amount: 280 })]
  const { client, store } = makeDb(first)
  mockedCreate.mockReturnValue(client)

  await generateDraftStatements(PERIOD)
  const stmt = store.contractor_statements[0]
  const numberBefore = stmt.statement_number

  // A new approved CI arrives for the same contractor + period.
  store.contractor_invoices.push(jobCi({ id: '2', contractor_id: 'k', amount: 140, jobs: { completed_at: '2026-07-10T02:00:00Z' } }))
  const res = await generateDraftStatements(PERIOD)

  expect(res).toMatchObject({ created: 0, refreshed: 1, linked_cis: 1 })
  expect(store.contractor_statements).toHaveLength(1)
  expect(store.contractor_statements[0].statement_number).toBe(numberBefore)
  expect(store.contractor_statements[0].subtotal).toBe(420) // 280 + 140
  expect(store.contractor_invoices.filter((c) => c.statement_id === stmt.id)).toHaveLength(2)
  expect(store.audit_log.some((a) => a.action === 'contractor_statement.refreshed')).toBe(true)
})

it('excludes paid, void, remitted, already-linked and other-period CIs', async () => {
  const { client, store } = makeDb([
    jobCi({ id: 'ok', contractor_id: 'k', amount: 100 }),
    jobCi({ id: 'paid', contractor_id: 'k', amount: 100, status: 'paid' }),
    jobCi({ id: 'void', contractor_id: 'k', amount: 100, status: 'void' }),
    jobCi({ id: 'linked', contractor_id: 'k', amount: 100, statement_id: 'st-existing' }),
    jobCi({ id: 'future', contractor_id: 'k', amount: 100, jobs: { completed_at: '2026-07-20T02:00:00Z' } }),
    jobCi({ id: 'nocomplete', contractor_id: 'k', amount: 100, jobs: { completed_at: null } }),
  ])
  store.contractor_remittance_items.push({ contractor_invoice_id: 'ok' }) // mark 'ok' as remitted → excluded
  mockedCreate.mockReturnValue(client)

  const res = await generateDraftStatements(PERIOD)
  // Every candidate is excluded for some reason → no drafts.
  expect(res.created).toBe(0)
  expect(store.contractor_statements).toHaveLength(0)
})

it('groups a jobless (fixed/manual) CI with a job-derived CI on the same statement', async () => {
  const { client, store } = makeDb([
    jobCi({ id: 'job', contractor_id: 'k', amount: 200 }),
    jobCi({ id: 'fix', contractor_id: 'k', amount: 300, job_id: null, jobs: null, service_date: '2026-07-10' }),
  ])
  mockedCreate.mockReturnValue(client)

  const res = await generateDraftStatements(PERIOD)
  expect(res).toMatchObject({ created: 1, linked_cis: 2 })
  expect(store.contractor_statements[0].subtotal).toBe(500)
})

it('does not create a duplicate when a draft already exists (find-or-refresh)', async () => {
  const { client, store } = makeDb([jobCi({ id: '1', contractor_id: 'k', amount: 280 })])
  // Pre-seed an existing draft for the same contractor+period.
  store.contractor_statements.push({ id: 'st-pre', statement_number: 'STMT-9000', contractor_id: 'k', period_start: PERIOD.period_start, period_end: PERIOD.period_end, status: 'draft', subtotal: 0, gst_total: 0, total_payable: 0 })
  mockedCreate.mockReturnValue(client)

  await generateDraftStatements(PERIOD)
  const forK = store.contractor_statements.filter((s) => s.contractor_id === 'k')
  expect(forK).toHaveLength(1) // no duplicate
  expect(forK[0].id).toBe('st-pre')
})

it('survives a concurrent insert race (23505) by refreshing the winner, no duplicate', async () => {
  // Store starts with NO draft, so the existence check misses and we reach the
  // insert path; the fake then forces a 23505 and commits the racer's row, which
  // the action's re-fetch finds and refreshes.
  const { client, store } = makeDb([jobCi({ id: '1', contractor_id: 'k', amount: 280 })], { failInsertOnceWithDup: true })
  mockedCreate.mockReturnValue(client)

  const res = await generateDraftStatements(PERIOD)
  expect(res.error).toBeUndefined()
  const forK = store.contractor_statements.filter((s) => s.contractor_id === 'k')
  expect(forK).toHaveLength(1) // the racer's single row, refreshed — never a duplicate
  expect(store.contractor_invoices.filter((c) => c.statement_id === forK[0].id)).toHaveLength(1)
})

it('blocks a non-admin staff user', async () => {
  const { client, store } = makeDb([jobCi({ id: '1', contractor_id: 'k', amount: 280 })], { user: { id: 'u2', email: 'staff@sano.nz' } })
  mockedCreate.mockReturnValue(client)
  const res = await generateDraftStatements(PERIOD)
  expect(res).toMatchObject({ error: 'Admin only.' })
  expect(store.contractor_statements).toHaveLength(0)
})

it('blocks an unauthenticated / contractor caller', async () => {
  const { client, store } = makeDb([jobCi({ id: '1', contractor_id: 'k', amount: 280 })], { user: null })
  mockedCreate.mockReturnValue(client)
  const res = await generateDraftStatements(PERIOD)
  expect(res).toMatchObject({ error: 'Admin only.' })
  expect(store.contractor_statements).toHaveLength(0)
})

it('never changes historical CI amount, status or GST snapshot', async () => {
  const { client, store } = makeDb([jobCi({ id: '1', contractor_id: 'k', amount: 280, gst_status: 'not_assessed', gst_amount: null })])
  mockedCreate.mockReturnValue(client)
  await generateDraftStatements(PERIOD)
  const ci = store.contractor_invoices[0]
  expect(ci.amount).toBe(280)
  expect(ci.status).toBe('approved')
  expect(ci.gst_status).toBe('not_assessed')
  expect(ci.gst_amount).toBeNull()
  expect(ci.statement_id).not.toBeNull() // only the link was added
})
