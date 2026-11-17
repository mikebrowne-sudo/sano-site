import { ensureLiabilityLineForRun, backfillMissingLiabilityLines } from '@/lib/payroll/ird-liability-ledger'

// Minimal in-memory Supabase stand-in: enough of the query builder for the ledger writer.
type Row = Record<string, unknown>
function fakeClient(tables: Record<string, Row[]>, opts: { denyWrites?: boolean } = {}) {
  const writeErr = { message: 'new row violates row-level security policy', code: '42501' }
  function builder(table: string) {
    let rows = [...(tables[table] ?? [])]
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return q },
      in: (c: string, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(r[c])); return q },
      order: () => q,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (res: (v: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: rows, error: null }).then(res),
      upsert: async (row: Row) => {
        if (opts.denyWrites) return { error: writeErr }
        const list = (tables[table] ??= [])
        if (!list.some((r) => r.period_key === row.period_key)) list.push({ id: `liab-${row.period_key}`, ...row })
        return { error: null }
      },
      insert: async (row: Row) => {
        if (opts.denyWrites) return { error: writeErr }
        ;(tables[table] ??= []).push({ id: `line-${row.pay_run_id}`, ...row })
        return { error: null }
      },
    }
    return q
  }
  return { from: (t: string) => builder(t) }
}

const carolLine = (pay_run_id: string) => ({ pay_run_id, contractor_id: 'carol', paye: 94.5, kiwisaver_employee: 0, kiwisaver_employer: 0, kiwisaver_employer_net: 0 })

describe('IRD liability ledger writer', () => {
  it('reports a refused period write instead of silently skipping', async () => {
    const client = fakeClient({
      pay_runs: [{ id: 'r1', pay_date: '2026-11-02', status: 'paid' }],
      pay_run_lines: [carolLine('r1')],
      ird_liability_lines: [],
      ird_liabilities: [],
    }, { denyWrites: true })
    const res = await ensureLiabilityLineForRun(client, 'r1')
    expect(res.created).toBeUndefined()
    expect(res.skipped).toMatch(/row-level security/)
  })

  it('backfills only approved/paid runs that have no line, into the right month', async () => {
    const tables: Record<string, Row[]> = {
      pay_runs: [
        { id: 'jul', pay_date: '2026-07-27', status: 'paid' },
        { id: 'oct', pay_date: '2026-10-19', status: 'paid' },
        { id: 'nov', pay_date: '2026-11-02', status: 'approved' },
        { id: 'draft', pay_date: '2026-11-16', status: 'draft' },
      ],
      pay_run_lines: [carolLine('jul'), carolLine('oct'), carolLine('nov'), carolLine('draft')],
      ird_liabilities: [{ id: 'liab-2026-07', period_key: '2026-07' }],
      ird_liability_lines: [{ id: 'existing', pay_run_id: 'jul', ird_liability_id: 'liab-2026-07' }],
    }
    const res = await backfillMissingLiabilityLines(fakeClient(tables))
    expect(res).toEqual({ created: 2, skipped: [] })
    const lines = tables.ird_liability_lines
    expect(lines.map((l) => l.pay_run_id).sort()).toEqual(['jul', 'nov', 'oct'])
    expect(lines.find((l) => l.pay_run_id === 'oct')).toMatchObject({ ird_liability_id: 'liab-2026-10', total_payable: 94.5 })
    expect(lines.find((l) => l.pay_run_id === 'nov')).toMatchObject({ ird_liability_id: 'liab-2026-11' })
  })
})
