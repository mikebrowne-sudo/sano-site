/** @jest-environment node */

// Phase 5 — H&S acknowledgement foundation.

import { isInductionComplete } from '@/lib/induction-modules'

describe('isInductionComplete — re-acknowledgement gating', () => {
  const mods = [{ id: 'm1', requires_acknowledgement: true, requires_completion: false }]
  it('a version update WITHOUT re-ack leaves an existing ack valid', () => {
    expect(isInductionComplete(mods, [{ training_module_id: 'm1', acknowledged_at: '2026-07-01T00:00:00Z', completed_at: null, status: 'assigned', reacknowledgement_required: false }])).toBe(true)
  })
  it('a module awaiting re-acknowledgement is NOT complete (for a new induction)', () => {
    expect(isInductionComplete(mods, [{ training_module_id: 'm1', acknowledged_at: '2026-07-01T00:00:00Z', completed_at: null, status: 'assigned', reacknowledgement_required: true }])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/supabase-service', () => ({ getServiceSupabase: jest.fn(() => ({})) }))
jest.mock('@/lib/induction-modules', () => ({
  ...jest.requireActual('@/lib/induction-modules'),
  completeInductionIfDone: jest.fn().mockResolvedValue({ completed: false }),
}))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), redirect: jest.fn() }))

import { acknowledgeTraining } from '@/app/contractor/training/_actions'
import { requireModuleReacknowledgement } from '@/app/portal/training/_actions'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'

const mockedCreate = createClient as unknown as jest.Mock
const mockedIsAdmin = isAdminUser as unknown as jest.Mock

// Mock for the worker acknowledgement flow.
function ackClient(cfg: { assignment: Record<string, unknown> | null }) {
  const cap = { asgUpdate: null as Record<string, unknown> | null, ackInsert: null as Record<string, unknown> | null }
  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => {
      if (table === 'contractors') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'c1' }, error: null }) }
      }
      if (table === 'worker_training_assignments') {
        const st = { isUpdate: false, payload: null as Record<string, unknown> | null }
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.update = (p: Record<string, unknown>) => { st.isUpdate = true; st.payload = p; return chain }
        chain.eq = () => chain
        chain.maybeSingle = () => Promise.resolve({ data: cfg.assignment, error: null })
        chain.then = (res: (v: unknown) => void) => { if (st.isUpdate) cap.asgUpdate = st.payload; res({ error: null }) }
        return chain
      }
      if (table === 'worker_training_acknowledgements') {
        return { insert: (p: Record<string, unknown>) => { cap.ackInsert = p; return Promise.resolve({ error: null }) } }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
    },
  }
  return { client, cap }
}

beforeEach(() => { jest.clearAllMocks(); mockedIsAdmin.mockReturnValue(true) })

describe('acknowledgeTraining', () => {
  it('records the CURRENT module version + timestamp and appends a history row', async () => {
    const { client, cap } = ackClient({ assignment: { id: 'a1', training_module_id: 'm1', training_modules: { version: '2.0' } } })
    mockedCreate.mockReturnValue(client)
    const r = await acknowledgeTraining('a1')
    expect(r).toMatchObject({ success: true })
    expect(cap.asgUpdate).toMatchObject({ acknowledged_version: '2.0', reacknowledgement_required: false })
    expect(cap.asgUpdate?.acknowledged_at).toBeDefined()
    expect(cap.ackInsert).toMatchObject({ assignment_id: 'a1', contractor_id: 'c1', training_module_id: 'm1', module_version: '2.0' })
  })

  it('a worker cannot acknowledge an assignment that is not their own', async () => {
    const { client } = ackClient({ assignment: null }) // ownership filter returns nothing
    mockedCreate.mockReturnValue(client)
    const r = await acknowledgeTraining('someone-else')
    expect(r).toEqual({ error: 'Access denied.' })
  })
})

// Mock for the admin re-ack trigger.
function reackClient(cfg: { version: string | null; acked: { id: string; acknowledged_version: string | null }[] }) {
  const cap = { flaggedIds: null as string[] | null }
  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin1' } } }) },
    from: (table: string) => {
      if (table === 'training_modules') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: { version: cfg.version }, error: null }) }
      }
      // worker_training_assignments: read (select…not) then update…in
      const st = { isUpdate: false }
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.not = () => Promise.resolve({ data: cfg.acked, error: null })
      chain.update = () => { st.isUpdate = true; return chain }
      chain.in = (_col: string, ids: string[]) => { cap.flaggedIds = ids; return Promise.resolve({ error: null }) }
      return chain
    },
  }
  return { client, cap }
}

describe('requireModuleReacknowledgement', () => {
  it('is admin-only', async () => {
    mockedIsAdmin.mockReturnValue(false)
    const { client } = reackClient({ version: '2.0', acked: [] })
    mockedCreate.mockReturnValue(client)
    expect(await requireModuleReacknowledgement('m1')).toEqual({ error: 'Admin only.' })
  })

  it('flags only workers whose acknowledged version differs from the current one (legacy null included)', async () => {
    const { client, cap } = reackClient({ version: '2.0', acked: [
      { id: 'a-old', acknowledged_version: '1.0' },     // stale → flag
      { id: 'a-current', acknowledged_version: '2.0' },  // current → skip
      { id: 'a-legacy', acknowledged_version: null },    // legacy → flag
    ] })
    mockedCreate.mockReturnValue(client)
    const r = await requireModuleReacknowledgement('m1')
    expect(r).toMatchObject({ success: true, flagged: 2 })
    expect(cap.flaggedIds?.sort()).toEqual(['a-legacy', 'a-old'])
  })
})
