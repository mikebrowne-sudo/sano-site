'use server'

// Contractor-side GST submission via the secure setup link (PR 5). Token-keyed,
// service-role. Creates a PENDING GST status for Sano to review — never
// auto-verified, never disturbs the live verified status. Contractor cannot
// self-verify or bypass review. GST is never inferred from turnover.

import { getServiceSupabase } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'
import { validateGstHistory, GST_DECLARATION_TEXT, GST_DECLARATION_VERSION } from '@/lib/contractor-gst-history'

const OPEN = new Set(['draft', 'ready_to_send', 'awaiting_contractor', 'contractor_submitted', 'sano_review_required', 'changes_requested', 'ready_to_sign'])

export interface ContractorGstInput {
  token: string
  gstRegistered: boolean
  gstNumber?: string
  effectiveDate?: string
  endDate?: string
  evidenceRef?: string
  signedName: string
  acknowledged: boolean
}

export async function submitContractorGst(input: ContractorGstInput): Promise<{ ok?: true; error?: string }> {
  if (!input.token || input.token.length < 16) return { error: 'This link is not valid.' }
  if (!input.acknowledged) return { error: 'Please confirm the declaration to submit it.' }
  if (!input.signedName?.trim()) return { error: 'Type your name to sign.' }

  const err = validateGstHistory(input)
  if (err) return { error: err }

  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('contractor_id, status').eq('token', input.token).maybeSingle()
  if (!setup) return { error: 'This link is not valid.' }
  if (!OPEN.has((setup.status as string) ?? '')) return { error: 'This setup is no longer open for changes.' }
  const contractorId = setup.contractor_id as string

  const nowIso = new Date().toISOString()
  // Only clears a prior PENDING submitted row — never the live verified one.
  const { data: priorSubmitted } = await svc.from('contractor_gst_history').select('id').eq('contractor_id', contractorId).eq('status', 'submitted').maybeSingle()
  if (priorSubmitted?.id) {
    await svc.from('contractor_gst_history').update({ status: 'superseded', superseded_at: nowIso }).eq('id', priorSubmitted.id)
  }

  const { data: inserted, error: insErr } = await svc.from('contractor_gst_history').insert({
    contractor_id: contractorId,
    gst_registered: input.gstRegistered,
    gst_number: input.gstRegistered ? (input.gstNumber?.trim() || null) : null,
    effective_date: input.effectiveDate || null,
    end_date: input.endDate || null,
    evidence_ref: input.evidenceRef?.trim() || null,
    signed_name: input.signedName.trim(),
    signed_at: nowIso,
    declaration_text: GST_DECLARATION_TEXT,
    declaration_version: GST_DECLARATION_VERSION,
    source: 'contractor_submitted',
    status: 'submitted', // ALWAYS pending
    supersedes_id: priorSubmitted?.id ?? null,
  }).select('id').single()
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') return { error: 'A GST declaration is already awaiting review.' }
    return { error: insErr.message }
  }
  await svc.from('contractor_gst_history').update({ gst_number_ref: `GSTR-${String(inserted.id).slice(0, 4).toUpperCase()}` }).eq('id', inserted.id)

  const { data: s2 } = await svc.from('contractor_setup').select('section_status').eq('contractor_id', contractorId).maybeSingle()
  const section = { ...((s2?.section_status as Record<string, string>) ?? {}) }
  section.gst = 'awaiting_sano_review'
  await svc.from('contractor_setup').update({ section_status: section, status: 'contractor_submitted', updated_at: nowIso }).eq('contractor_id', contractorId)

  revalidatePath(`/contractor-setup/${input.token}`)
  return { ok: true }
}
