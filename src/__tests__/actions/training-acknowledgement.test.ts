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

import { acknowledgeTraining, completeTraining } from '@/app/contractor/training/_actions'
import { requireModuleReacknowledgement } from '@/app/portal/training/_actions'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

const mockedCreate = createClient as unknown as jest.Mock
const mockedService = getServiceSupabase as unknown as jest.Mock
const mockedIsAdmin = isAdminUser as unknown as jest.Mock

// The worker's USER client authenticates, resolves their contractor_id, and
// calls the atomic RPC (which does the transactional write itself).
function rpcClient(cfg: { contractorId?: string | null; rpcError?: { message: string } | null }) {
  const cap = { rpc: null as { name: string; args: unknown } | null }
  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: cfg.contractorId === null ? null : { id: cfg.contractorId ?? 'c1' }, error: null }) }),
    rpc: (name: string, args: unknown) => { cap.rpc = { name, args }; return Promise.resolve({ data: [{ module_version: '2.0', contractor_id: 'c1', is_new: true }], error: cfg.rpcError ?? null }) },
  }
  return { client, cap }
}

beforeEach(() => { jest.clearAllMocks(); mockedIsAdmin.mockReturnValue(true); mockedService.mockReturnValue({}) })

describe('acknowledgeTraining — atomic RPC, no trusted client input', () => {
  it('calls the atomic RPC with ONLY the assignment id + complete flag (no client-supplied identity/version/timestamp)', async () => {
    const { client, cap } = rpcClient({})
    mockedCreate.mockReturnValue(client)
    const r = await acknowledgeTraining('a1')
    expect(r).toMatchObject({ success: true })
    expect(cap.rpc?.name).toBe('record_training_acknowledgement')
    expect(cap.rpc?.args).toEqual({ p_assignment_id: 'a1', p_complete: false })
  })

  it('completeTraining sets p_complete = true', async () => {
    const { client, cap } = rpcClient({})
    mockedCreate.mockReturnValue(client)
    await completeTraining('a1')
    expect(cap.rpc?.args).toEqual({ p_assignment_id: 'a1', p_complete: true })
  })

  it('maps the RPC ownership error to Access denied', async () => {
    const { client } = rpcClient({ rpcError: { message: 'assignment not found for this worker' } })
    mockedCreate.mockReturnValue(client)
    expect(await acknowledgeTraining('a1')).toEqual({ error: 'Access denied.' })
  })

  it('maps the RPC inactive-module error', async () => {
    const { client } = rpcClient({ rpcError: { message: 'module not active' } })
    mockedCreate.mockReturnValue(client)
    const r = await acknowledgeTraining('a1')
    expect('error' in r && /available/i.test((r as { error: string }).error)).toBe(true)
  })

  it('a duplicate acknowledgement (idempotent RPC, is_new=false) is still a success, not an error', async () => {
    const { client } = rpcClient({}) // RPC returns no error even on a duplicate
    mockedCreate.mockReturnValue(client)
    expect(await acknowledgeTraining('a1')).toMatchObject({ success: true })
  })

  it('an atomic failure surfaces as an error (no partial state — the RPC rolls both writes back)', async () => {
    const { client } = rpcClient({ rpcError: { message: 'deadlock detected' } })
    mockedCreate.mockReturnValue(client)
    expect('error' in (await acknowledgeTraining('a1'))).toBe(true)
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
  it('provides an atomic acknowledgement RPC + a duplicate-evidence unique index', () => {
    expect(sql).toMatch(/create or replace function public\.record_training_acknowledgement/)
    expect(sql).toMatch(/security definer/)
    expect(sql).toMatch(/on conflict \(assignment_id, module_version\)/)
    expect(sql).toMatch(/create unique index if not exists wta_ack_assignment_version_unique/)
  })
  it('the acknowledgement-history table uses ON DELETE RESTRICT (evidence retention), not cascade', () => {
    const ackTable = sql.slice(sql.indexOf('create table if not exists public.worker_training_acknowledgements'))
      .slice(0, sql.slice(sql.indexOf('create table if not exists public.worker_training_acknowledgements')).indexOf(');') + 2)
    expect(ackTable).toMatch(/references public\.worker_training_assignments\(id\) on delete restrict/)
    expect(ackTable).toMatch(/references public\.contractors\(id\) on delete restrict/)
    expect(ackTable).toMatch(/references public\.training_modules\(id\) on delete restrict/)
    expect(ackTable).not.toMatch(/on delete cascade/)
  })
  it('training-module read is restricted (staff or an assigned worker); no USING(true) / anon read', () => {
    expect(sql).toMatch(/create policy tm_read on public\.training_modules/)
    expect(sql).toMatch(/worker_has_module_assignment/)
    expect(sql).not.toMatch(/create policy tm_authenticated_read/)
    expect(sql).toMatch(/drop policy if exists "Anon can read active training_modules"/)
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
