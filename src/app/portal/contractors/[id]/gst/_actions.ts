'use server'

// Staff contractor GST-history actions (PR 5). Record / verify / reject GST
// status, immutable + superseding, with atomic supersede on verify and a derived
// contractors.gst_* cache sync. Admin-only, audited. NO withholding / money.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { validateGstHistory, GST_DECLARATION_TEXT, GST_DECLARATION_VERSION } from '@/lib/contractor-gst-history'
import { syncGstCache } from '@/lib/contractor-gst-history-data'
import { getServiceSupabase } from '@/lib/supabase-service'

function revalidate(contractorId: string) {
  revalidatePath(`/portal/contractors/${contractorId}/gst`)
  revalidatePath(`/portal/contractors/${contractorId}/setup`)
  revalidatePath(`/portal/contractors/${contractorId}`)
}

async function admin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { supabase, user: null as null }
  return { supabase, user }
}

export interface GstStaffInput {
  contractorId: string
  gstRegistered: boolean
  gstNumber?: string | null
  effectiveDate?: string | null
  endDate?: string | null
  evidenceRef?: string | null
  signedName?: string | null
  verifyNow?: boolean
}

/** Record a GST status (staff-entered). Pending replaces a prior submitted row;
 *  verify-now atomically supersedes the prior verified row + syncs the cache. */
export async function recordGstStatus(input: GstStaffInput): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const err = validateGstHistory(input)
  if (err) return { error: err }
  if (input.verifyNow && input.gstRegistered && !input.effectiveDate) return { error: 'A verified registered status needs an effective date.' }
  if (input.verifyNow && !input.signedName?.trim()) return { error: 'A verified GST status must be signed.' }

  const nowIso = new Date().toISOString()
  const { data: priorSubmitted } = await supabase.from('contractor_gst_history').select('id').eq('contractor_id', input.contractorId).eq('status', 'submitted').maybeSingle()
  const { data: priorVerified } = await supabase.from('contractor_gst_history').select('id').eq('contractor_id', input.contractorId).eq('status', 'verified').is('superseded_at', null).maybeSingle()
  const supersedesId = input.verifyNow ? (priorVerified?.id ?? null) : (priorSubmitted?.id ?? null)
  if (!input.verifyNow && priorSubmitted?.id) {
    await supabase.from('contractor_gst_history').update({ status: 'superseded', superseded_at: nowIso }).eq('id', priorSubmitted.id)
  }

  const { data: inserted, error: insErr } = await supabase.from('contractor_gst_history').insert({
    contractor_id: input.contractorId,
    gst_registered: input.gstRegistered,
    gst_number: input.gstRegistered ? (input.gstNumber || null) : null,
    effective_date: input.effectiveDate || null,
    end_date: input.endDate || null,
    evidence_ref: input.evidenceRef || null,
    signed_name: input.signedName || null,
    signed_at: input.signedName ? nowIso : null,
    declaration_text: GST_DECLARATION_TEXT,
    declaration_version: GST_DECLARATION_VERSION,
    source: 'staff_recorded',
    status: input.verifyNow ? 'verified' : 'submitted',
    verified_at: input.verifyNow ? nowIso : null,
    verified_by: input.verifyNow ? user.id : null,
    supersedes_id: supersedesId,
    created_by: user.id,
  }).select('id').single()
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') return { error: 'There is already a current GST status of that kind — supersede it first.' }
    return { error: insErr.message }
  }
  await supabase.from('contractor_gst_history').update({ gst_number_ref: `GSTR-${String(inserted.id).slice(0, 4).toUpperCase()}` }).eq('id', inserted.id)

  if (input.verifyNow && priorVerified?.id) {
    await supabase.from('contractor_gst_history').update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: inserted.id }).eq('id', priorVerified.id).eq('status', 'verified')
  }
  if (input.verifyNow) await syncGstCache(getServiceSupabase(), input.contractorId)

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_gst.recorded',
    entity_table: 'contractor_gst_history', entity_id: inserted.id,
    before: supersedesId ? { superseded: supersedesId } : null,
    after: { registered: input.gstRegistered, verified: !!input.verifyNow },
  })
  revalidate(input.contractorId)
  return { ok: true, id: inserted.id as string }
}

/** Verify or reject a submitted GST status. Verify supersedes the prior verified
 *  atomically + syncs the cache. Reject leaves the verified status untouched. */
export async function setGstStatus(gstId: string, status: 'verified' | 'rejected', reviewNotes: string | null): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const { data: g } = await supabase.from('contractor_gst_history')
    .select('id, contractor_id, status, gst_registered, effective_date, signed_name, signed_at, declaration_text, declaration_version, supersedes_id')
    .eq('id', gstId).maybeSingle()
  if (!g) return { error: 'GST record not found.' }
  if (g.status !== 'submitted') return { error: `Only a submitted GST status can be ${status}. This one is ${g.status}.` }

  const nowIso = new Date().toISOString()

  if (status === 'rejected') {
    const { error } = await supabase.from('contractor_gst_history').update({ status: 'rejected', review_notes: reviewNotes || null }).eq('id', gstId).eq('status', 'submitted')
    if (error) return { error: error.message }
    await supabase.from('audit_log').insert({
      actor_id: user.id, actor_role: 'admin', action: 'contractor_gst.rejected',
      entity_table: 'contractor_gst_history', entity_id: gstId, before: { status: 'submitted' }, after: { status: 'rejected', review_notes: reviewNotes || null },
    })
    revalidate(g.contractor_id as string)
    return { ok: true }
  }

  // Verify: completeness guard.
  if (g.gst_registered && !g.effective_date) return { error: 'Set an effective date before verifying a registered GST status.' }
  if (!g.signed_name || !g.signed_at) return { error: 'A verified GST status must be signed.' }
  if (!g.declaration_text || !g.declaration_version) return { error: 'The GST declaration wording/version is missing.' }

  const { data: priorVerified } = await supabase.from('contractor_gst_history').select('id').eq('contractor_id', g.contractor_id as string).eq('status', 'verified').is('superseded_at', null).maybeSingle()

  const { error: vErr } = await supabase.from('contractor_gst_history').update({
    status: 'verified', verified_at: nowIso, verified_by: user.id, review_notes: reviewNotes || null,
    supersedes_id: priorVerified?.id ?? (g.supersedes_id as string | null) ?? null,
  }).eq('id', gstId).eq('status', 'submitted')
  if (vErr) return { error: vErr.message }

  if (priorVerified?.id) {
    const { error: supErr } = await supabase.from('contractor_gst_history').update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: gstId }).eq('id', priorVerified.id).eq('status', 'verified')
    if (supErr) return { error: `Verified, but superseding the prior GST status failed: ${supErr.message}` }
  }
  await syncGstCache(getServiceSupabase(), g.contractor_id as string)

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_gst.verified',
    entity_table: 'contractor_gst_history', entity_id: gstId,
    before: { status: 'submitted', prior_verified: priorVerified?.id ?? null }, after: { status: 'verified', superseded: priorVerified?.id ?? null },
  })
  revalidate(g.contractor_id as string)
  return { ok: true }
}
