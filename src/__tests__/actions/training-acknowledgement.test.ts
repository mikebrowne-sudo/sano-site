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
jest.mock('@/lib/supabase-service', () => ({ getServiceSupabase: jest.fn() }))
jest.mock('@/lib/induction-modules', () => ({
  ...jest.requireActual('@/lib/induction-modules'),
  completeInductionIfDone: jest.fn().mockResolvedValue({ completed: false }),
}))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), redirect: jest.fn() }))

import { acknowledgeTraining } from '@/app/contractor/training/_actions'
import { requireModuleReacknowledgement } from '@/app/portal/training/_actions'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

const mockedCreate = createClient as unknown as jest.Mock
const mockedService = getServiceSupabase as unknown as jest.Mock
const mockedIsAdmin = isAdminUser as unknown as jest.Mock

// The worker's USER client only authenticates + resolves their contractor_id.
function userClient(contractorId: string | null) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: contractorId ? { id: contractorId } : null, error: null }) }),
  }
}

// The SERVICE-ROLE client performs the writes; it captures them for assertions.
function serviceClient(cfg: { assignment: Record<string, unknown> | null }) {
  const cap = { asgUpdate: null as Record<string, unknown> | null, ackInsert: null as Record<string, unknown> | null }
  const client = {
    from: (table: string) => {
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
      // completeInductionIfDone is mocked out, so no other tables are hit.
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
    },
  }
  return { client, cap }
}

beforeEach(() => { jest.clearAllMocks(); mockedIsAdmin.mockReturnValue(true) })

describe('acknowledgeTraining — server-authoritative (service-role) writes', () => {
  it('derives the module version + server timestamp itself and appends a history row with DB-derived IDs', async () => {
    mockedCreate.mockReturnValue(userClient('c1'))
    const svc = serviceClient({ assignment: { id: 'a1', contractor_id: 'c1', status: 'assigned', training_module_id: 'm1', training_modules: { id: 'm1', version: '2.0', status: 'active' } } })
    mockedService.mockReturnValue(svc.client)
    const r = await acknowledgeTraining('a1')
    expect(r).toMatchObject({ success: true })
    // Only the intended fields; version + timestamp derived by the server.
    expect(svc.cap.asgUpdate).toMatchObject({ acknowledged_version: '2.0', reacknowledgement_required: false })
    expect(svc.cap.asgUpdate?.acknowledged_at).toBeDefined()
    expect(svc.cap.asgUpdate).not.toHaveProperty('contractor_id') // never rewrites identity
    // History from DB-derived IDs + version + server time.
    expect(svc.cap.ackInsert).toMatchObject({ assignment_id: 'a1', contractor_id: 'c1', training_module_id: 'm1', module_version: '2.0' })
    expect(svc.cap.ackInsert?.acknowledged_at).toBeDefined()
  })

  it('clears re-acknowledgement ONLY together with a real acknowledgement (both writes happen)', async () => {
    mockedCreate.mockReturnValue(userClient('c1'))
    const svc = serviceClient({ assignment: { id: 'a1', contractor_id: 'c1', status: 'completed', training_module_id: 'm1', training_modules: { id: 'm1', version: '3.0', status: 'active' } } })
    mockedService.mockReturnValue(svc.client)
    await acknowledgeTraining('a1')
    expect(svc.cap.asgUpdate?.reacknowledgement_required).toBe(false)
    expect(svc.cap.ackInsert).not.toBeNull() // a history row is always written when the flag clears
  })

  it('a worker cannot acknowledge an assignment that is not their own', async () => {
    mockedCreate.mockReturnValue(userClient('c1'))
    const svc = serviceClient({ assignment: null }) // ownership filter (id + contractor_id) returns nothing
    mockedService.mockReturnValue(svc.client)
    expect(await acknowledgeTraining('someone-else')).toEqual({ error: 'Access denied.' })
    expect(svc.cap.asgUpdate).toBeNull()
    expect(svc.cap.ackInsert).toBeNull()
  })

  it('cannot acknowledge an inactive module', async () => {
    mockedCreate.mockReturnValue(userClient('c1'))
    const svc = serviceClient({ assignment: { id: 'a1', contractor_id: 'c1', status: 'assigned', training_module_id: 'm1', training_modules: { id: 'm1', version: '1.0', status: 'inactive' } } })
    mockedService.mockReturnValue(svc.client)
    const r = await acknowledgeTraining('a1')
    expect('error' in r).toBe(true)
    expect(svc.cap.asgUpdate).toBeNull()
    expect(svc.cap.ackInsert).toBeNull()
  })
})

describe('RLS design (direct-access assumptions) — Phase 5 migration', () => {
  const sql = readFileSync(join(process.cwd(), 'docs/db/2026-07-24-phase5-hs-acknowledgement.sql'), 'utf8')
  it('workers get READ-ONLY on assignments — no worker UPDATE policy', () => {
    expect(sql).toMatch(/create policy wta_worker_read_own[\s\S]*?for select/)
    expect(sql).not.toMatch(/create policy wta_worker_update_own/)
  })
  it('workers get READ-ONLY on the ack history — no worker INSERT policy', () => {
    expect(sql).toMatch(/create policy wta_ack_worker_read[\s\S]*?for select/)
    expect(sql).not.toMatch(/create policy wta_ack_worker_insert/)
  })
  it('the old USING(true) hole is dropped, staff access retained', () => {
    expect(sql).toMatch(/drop policy if exists "Staff full access to worker_training_assignments"/)
    expect(sql).toMatch(/create policy wta_staff_all/)
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
