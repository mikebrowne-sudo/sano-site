'use server'

// Phase 4 — staff tax-review workflow action.
//
// Updates the contractor's tax-review lifecycle (status / notes / whether an
// IR330C is expected). When the review reaches a DONE state (Confirmed /
// Not required) it completes the staff-only tax_review checklist item — this is
// the ONLY path that completes tax_review. Selecting a structure, uploading an
// IR330C, or supplying an NZBN never complete it.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { taxReviewCompletesChecklist, type TaxReviewStatus } from '@/lib/tax-review'

const VALID: TaxReviewStatus[] = [
  'review_required', 'awaiting_contractor', 'awaiting_ir330c',
  'ready_for_review', 'confirmed', 'not_required', 'exception',
]

export async function setTaxReviewStatus(input: {
  contractorId: string
  status: TaxReviewStatus
  notes?: string | null
  ir330cRequested?: boolean
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!VALID.includes(input.status)) return { error: 'Unknown status.' }

  const update: Record<string, unknown> = {
    tax_review_status: input.status,
    tax_review_notes: input.notes?.trim() || null,
  }
  if (typeof input.ir330cRequested === 'boolean') update.ir330c_requested = input.ir330cRequested

  const { error } = await supabase.from('contractors').update(update).eq('id', input.contractorId)
  if (error) return { error: error.message }

  // Complete the staff-only tax_review checklist item only on a DONE decision,
  // and only where still pending (idempotent; preserves an existing completion).
  if (taxReviewCompletesChecklist(input.status)) {
    const { error: itemErr } = await supabase
      .from('contractor_onboarding')
      .update({ status: 'complete', completed_at: new Date().toISOString(), completed_by: user.id })
      .eq('contractor_id', input.contractorId)
      .eq('item_key', 'tax_review')
      .eq('status', 'pending')
    // Best-effort: the checklist has admin-only RLS; the status update above is
    // the source of truth and must not fail because a non-admin staff user
    // couldn't also tick the item.
    if (itemErr) console.error('[tax-review] tax_review item not auto-completed:', itemErr.message)
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor.tax_review_updated',
    entity_table: 'contractors',
    entity_id: input.contractorId,
    before: {},
    after: { tax_review_status: input.status, ir330c_requested: input.ir330cRequested ?? null },
  })

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}
