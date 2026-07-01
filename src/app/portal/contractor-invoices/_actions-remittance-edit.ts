'use server'

// Manual edit of a remittance advice (2026-07).
//
// A remittance batch is a SNAPSHOT taken when it's created: each line
// copies the job number + address off the job at that moment. Sometimes
// what a contractor actually cleaned (and lists on their own email)
// doesn't match what we had, even when the amounts agree. Since the
// payment has already been made, we don't want to re-reconcile the
// underlying invoices — we just need to correct the advice document so
// it matches the contractor's records.
//
// This action lets an admin manually edit the descriptive fields of a
// remittance — header (payee label, reference, payment date, notes) and
// per-line (job number, address, note) — EVEN AFTER it's been sent. It
// deliberately does NOT touch amounts, hours, line membership, or the
// linked contractor_invoices / their paid status. It only changes what
// the advice shows. Re-send or re-download to give the contractor the
// corrected copy. Every edit is audit-logged.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminUser } from '@/lib/is-admin'

export interface RemittanceEditInput {
  id: string
  header: {
    payeeLabel: string | null
    reference: string | null
    paymentDate: string | null
    notes: string | null
  }
  lines: Array<{
    id: string
    jobNumber: string | null
    jobAddress: string | null
    note: string | null
  }>
}

function nullify(v: string | null): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

export async function updateRemittanceBatch(input: RemittanceEditInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input?.id) return { error: 'Remittance id is required.' }

  // Load the current header (snapshot for the audit before-image and to
  // confirm the batch exists).
  const { data: before, error: bErr } = await supabase
    .from('contractor_remittances')
    .select('id, payee_label, reference, payment_date, notes, sent_at, remittance_number')
    .eq('id', input.id)
    .single()
  if (bErr || !before) return { error: 'Remittance not found.' }

  // Header update — descriptive fields only.
  const headerUpdate = {
    payee_label: nullify(input.header.payeeLabel),
    reference: nullify(input.header.reference),
    payment_date: input.header.paymentDate || null,
    notes: nullify(input.header.notes),
  }
  const { error: hErr } = await supabase
    .from('contractor_remittances')
    .update(headerUpdate)
    .eq('id', input.id)
  if (hErr) return { error: `Failed to update remittance: ${hErr.message}` }

  // Per-line updates — scoped to this remittance so a stray id can't
  // touch another batch. Descriptive fields only; amounts/hours untouched.
  for (const line of input.lines ?? []) {
    if (!line.id) continue
    const { error: lErr } = await supabase
      .from('contractor_remittance_items')
      .update({
        job_number: nullify(line.jobNumber),
        job_address: nullify(line.jobAddress),
        note: nullify(line.note),
      })
      .eq('id', line.id)
      .eq('remittance_id', input.id)
    if (lErr) return { error: `Failed to update a line: ${lErr.message}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_remittance.manually_edited',
    entity_table: 'contractor_remittances',
    entity_id: input.id,
    before: {
      payee_label: before.payee_label,
      reference: before.reference,
      payment_date: before.payment_date,
      notes: before.notes,
      was_sent: before.sent_at != null,
    },
    after: { ...headerUpdate, line_count: (input.lines ?? []).length },
  })

  revalidatePath(`/portal/contractor-invoices/remittances/${input.id}`)
  revalidatePath(`/portal/contractor-invoices/remittances/${input.id}/edit`)
  revalidatePath('/portal/contractor-invoices')
  return { ok: true }
}
