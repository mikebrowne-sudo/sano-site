import {
  INDUCTION_MODULE_KEYS,
  isInductionComplete,
  autoAssignInductionModules,
  completeInductionIfDone,
} from '@/lib/induction-modules'

describe('induction-modules — keys', () => {
  it('defines the four induction module keys', () => {
    expect(INDUCTION_MODULE_KEYS).toEqual([
      'hs_induction', 'hazardous_substances', 'security_property', 'privacy_conduct',
    ])
  })
})

const mod = (id: string, over: Partial<{ requires_acknowledgement: boolean; requires_completion: boolean }> = {}) => ({
  id, requires_acknowledgement: false, requires_completion: true, ...over,
})
const asg = (id: string, over: Partial<{ acknowledged_at: string | null; completed_at: string | null; status: string | null }> = {}) => ({
  training_module_id: id, acknowledged_at: null, completed_at: null, status: 'assigned', ...over,
})

describe('isInductionComplete', () => {
  it('is false when nothing is assigned yet', () => {
    expect(isInductionComplete([mod('m1')], [])).toBe(false)
    expect(isInductionComplete([], [])).toBe(false)
  })

  it('is true only when every assigned module meets its requirement', () => {
    const modules = [mod('m1'), mod('m2')]
    expect(isInductionComplete(modules, [asg('m1', { completed_at: 'x', status: 'completed' }), asg('m2', { status: 'assigned' })])).toBe(false)
    expect(isInductionComplete(modules, [asg('m1', { completed_at: 'x', status: 'completed' }), asg('m2', { completed_at: 'x', status: 'completed' })])).toBe(true)
  })

  it('respects acknowledgement-only modules', () => {
    const modules = [mod('m1', { requires_completion: false, requires_acknowledgement: true })]
    expect(isInductionComplete(modules, [asg('m1', { acknowledged_at: null })])).toBe(false)
    expect(isInductionComplete(modules, [asg('m1', { acknowledged_at: 'x' })])).toBe(true)
  })

  it('ignores modules that are not assigned to this contractor', () => {
    // m2 exists but is not assigned; only the assigned m1 is required.
    expect(isInductionComplete([mod('m1'), mod('m2')], [asg('m1', { completed_at: 'x', status: 'completed' })])).toBe(true)
  })
})

// Minimal thenable fake: every builder returns a chain that resolves (on await)
// to the data configured for that table, and records upserts/updates.
function makeFakeClient(dataByTable: Record<string, unknown[]>) {
  const calls = { upserts: [] as { table: string; rows: unknown[]; opts: Record<string, unknown> }[], updates: [] as { table: string; filters: [string, string, unknown][] }[] }
  function from(table: string) {
    let isUpdate = false
    const filters: [string, string, unknown][] = []
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = (c: string, v: unknown) => { filters.push(['eq', c, v]); return chain }
    chain.in = (c: string, v: unknown) => { filters.push(['in', c, v]); return chain }
    chain.update = () => { isUpdate = true; return chain }
    chain.upsert = (rows: unknown[], opts: Record<string, unknown>) => { calls.upserts.push({ table, rows, opts }); return Promise.resolve({ data: null, error: null }) }
    chain.then = (resolve: (v: unknown) => void) => {
      if (isUpdate) calls.updates.push({ table, filters })
      resolve({ data: dataByTable[table] ?? [], error: null })
    }
    return chain
  }
  return { client: { from }, calls }
}

describe('autoAssignInductionModules', () => {
  it('assigns each auto-assign module idempotently (ignore duplicates)', async () => {
    const { client, calls } = makeFakeClient({ training_modules: [{ id: 'm1' }, { id: 'm2' }] })
    const res = await autoAssignInductionModules(client, 'c-1')
    expect(res.assigned).toBe(2)
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'contractor_id,training_module_id', ignoreDuplicates: true })
    expect(calls.upserts[0].rows).toEqual([
      { contractor_id: 'c-1', training_module_id: 'm1', status: 'assigned' },
      { contractor_id: 'c-1', training_module_id: 'm2', status: 'assigned' },
    ])
  })

  it('does nothing when there are no induction modules', async () => {
    const { client, calls } = makeFakeClient({ training_modules: [] })
    const res = await autoAssignInductionModules(client, 'c-1')
    expect(res.assigned).toBe(0)
    expect(calls.upserts).toHaveLength(0)
  })
})

describe('completeInductionIfDone', () => {
  it('completes induction_completed (only where pending) when all modules are done', async () => {
    const { client, calls } = makeFakeClient({
      training_modules: [{ id: 'm1', requires_acknowledgement: true, requires_completion: true }],
      worker_training_assignments: [{ training_module_id: 'm1', acknowledged_at: 'x', completed_at: 'x', status: 'completed' }],
      contractor_onboarding: [{ item_key: 'induction_completed' }],
    })
    const res = await completeInductionIfDone(client, 'c-1')
    expect(res.completed).toBe(true)
    const upd = calls.updates.find((u) => u.table === 'contractor_onboarding')
    expect(upd?.filters).toContainEqual(['eq', 'item_key', 'induction_completed'])
    expect(upd?.filters).toContainEqual(['eq', 'status', 'pending'])
  })

  it('does not touch the checklist when a module is still outstanding', async () => {
    const { client, calls } = makeFakeClient({
      training_modules: [{ id: 'm1', requires_acknowledgement: true, requires_completion: true }],
      worker_training_assignments: [{ training_module_id: 'm1', acknowledged_at: null, completed_at: null, status: 'assigned' }],
      contractor_onboarding: [],
    })
    const res = await completeInductionIfDone(client, 'c-1')
    expect(res.completed).toBe(false)
    expect(calls.updates).toHaveLength(0)
  })
})
