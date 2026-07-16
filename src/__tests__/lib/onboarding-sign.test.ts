import { seedAndAutoCompleteOnboardingOnSign } from '@/lib/onboarding-sign'
import { SIGN_AUTO_COMPLETE_KEYS } from '@/lib/onboarding-checklist'

// Minimal chainable fake of the Supabase client, recording the calls the
// wrapper makes so we can assert it is constructed to be idempotent and to
// touch only the right rows — without simulating a real database.
function makeFakeClient(updateReturns: { item_key: string }[]) {
  const calls = {
    upserts: [] as { table: string; rows: unknown[]; opts: Record<string, unknown> }[],
    updates: [] as { table: string; updateObj: Record<string, unknown>; filters: [string, string, unknown][] }[],
    inserts: [] as { table: string; obj: Record<string, unknown> }[],
  }
  function from(table: string) {
    const ctx: { updateObj: Record<string, unknown>; filters: [string, string, unknown][] } = { updateObj: {}, filters: [] }
    const api: Record<string, (...args: never[]) => unknown> = {}
    api.upsert = ((rows: unknown[], opts: Record<string, unknown>) => {
      calls.upserts.push({ table, rows, opts })
      return Promise.resolve({ data: null, error: null })
    }) as never
    api.insert = ((obj: Record<string, unknown>) => {
      calls.inserts.push({ table, obj })
      return Promise.resolve({ data: null, error: null })
    }) as never
    api.update = ((obj: Record<string, unknown>) => { ctx.updateObj = obj; return api }) as never
    api.eq = ((col: string, val: unknown) => { ctx.filters.push(['eq', col, val]); return api }) as never
    api.in = ((col: string, val: unknown) => { ctx.filters.push(['in', col, val]); return api }) as never
    api.select = (() => {
      calls.updates.push({ table, updateObj: ctx.updateObj, filters: ctx.filters })
      return Promise.resolve({ data: updateReturns, error: null })
    }) as never
    return api
  }
  return { client: { from }, calls }
}

const THREE = [{ item_key: 'confirm_details' }, { item_key: 'bank_details' }, { item_key: 'contract_signed' }]

describe('seedAndAutoCompleteOnboardingOnSign', () => {
  it('seeds idempotently (upsert, ignore duplicates on the unique key)', async () => {
    const { client, calls } = makeFakeClient(THREE)
    await seedAndAutoCompleteOnboardingOnSign(client, { contractorId: 'c-1', agreementId: 'a-1' })

    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].table).toBe('contractor_onboarding')
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'contractor_id,item_key', ignoreDuplicates: true })
    expect(calls.upserts[0].rows).toHaveLength(10) // contractor items, no RTW
  })

  it('completes ONLY the three system items, and only where pending', async () => {
    const { client, calls } = makeFakeClient(THREE)
    const res = await seedAndAutoCompleteOnboardingOnSign(client, { contractorId: 'c-1', agreementId: 'a-1' })

    expect(res.completedKeys).toEqual(['confirm_details', 'bank_details', 'contract_signed'])
    const upd = calls.updates[0]
    expect(upd.updateObj.status).toBe('complete')
    expect(upd.updateObj.completed_by).toBeNull() // system, no auth user
    expect(upd.filters).toContainEqual(['in', 'item_key', SIGN_AUTO_COMPLETE_KEYS])
    expect(upd.filters).toContainEqual(['eq', 'status', 'pending'])
    expect(upd.filters).toContainEqual(['eq', 'contractor_id', 'c-1'])
  })

  it('writes one system audit row carrying the agreement id', async () => {
    const { client, calls } = makeFakeClient(THREE)
    await seedAndAutoCompleteOnboardingOnSign(client, { contractorId: 'c-1', agreementId: 'a-9' })

    expect(calls.inserts).toHaveLength(1)
    const audit = calls.inserts[0].obj
    expect(calls.inserts[0].table).toBe('audit_log')
    expect(audit.actor_id).toBeNull()
    expect(audit.actor_role).toBe('system')
    expect(audit.action).toBe('contractor.onboarding_auto_completed')
    expect(audit.after).toEqual({
      items: ['confirm_details', 'bank_details', 'contract_signed'],
      source: 'agreement_signing',
      agreement_id: 'a-9',
    })
  })

  it('is idempotent on retry — nothing pending means no completion and no audit row', async () => {
    const { client, calls } = makeFakeClient([]) // second run: nothing left pending
    const res = await seedAndAutoCompleteOnboardingOnSign(client, { contractorId: 'c-1', agreementId: 'a-1' })

    expect(res.completedKeys).toEqual([])
    expect(calls.inserts).toHaveLength(0) // no duplicate audit
    expect(calls.upserts).toHaveLength(1) // re-seed is a no-op upsert (ignoreDuplicates)
  })

  it('seeds right-to-work items only when required', async () => {
    const withRtw = makeFakeClient(THREE)
    await seedAndAutoCompleteOnboardingOnSign(withRtw.client, { contractorId: 'c-1', agreementId: 'a-1', rightToWorkRequired: true })
    const rtwRows = (withRtw.calls.upserts[0].rows as { item_key: string }[]).map((r) => r.item_key)
    expect(rtwRows).toContain('right_to_work_uploaded')
    expect(rtwRows).toContain('right_to_work_verified')

    const noRtw = makeFakeClient(THREE)
    await seedAndAutoCompleteOnboardingOnSign(noRtw.client, { contractorId: 'c-1', agreementId: 'a-1', rightToWorkRequired: false })
    const noRtwRows = (noRtw.calls.upserts[0].rows as { item_key: string }[]).map((r) => r.item_key)
    expect(noRtwRows).not.toContain('right_to_work_uploaded')
    expect(noRtwRows).not.toContain('right_to_work_verified')
  })
})
