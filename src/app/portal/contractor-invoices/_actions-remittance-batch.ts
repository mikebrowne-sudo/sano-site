'use server'

// Create an invoice-based contractor remittance batch.
//
// Snapshots the selected contractor_invoices (+ any manual adjustment
// lines) onto the batch so the remittance always matches the actual
// payment. Optionally (default on) marks the selected CIs paid with the
// batch's payment date — this is how historical date corrections get
// applied through an audited admin action rather than raw SQL.
//
// Admin-only. Does NOT send anything — preview/PDF only.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export interface RemittanceAdjustmentInput {
  label: string
  amount: number
}

export interface CreateRemittanceBatchInput {
  paymentDate: string // YYYY-MM-DD
  reference?: string | null
  payeeLabel?: string | null
  notes?: string | null
  ciIds: string[]
  adjustments?: RemittanceAdjustmentInput[]
  markPaid?: boolean // default true
}

interface CIRow {
  id: string
  amount: number | null
  note: string | null
  contractor_id: string | null
  contractors: { full_name: string | null } | null
  jobs: { job_number: string | null; address: string | null } | null
}

export async function createContractorRemittance(input: CreateRemittanceBatchInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  if (!input.paymentDate) return { error: 'Payment date is required.' }
  const ciIds = Array.from(new Set(input.ciIds ?? []))
  const adjustments = (input.adjustments ?? []).filter((a) => a.label?.trim() && Number.isFinite(a.amount))
  if (ciIds.length === 0 && adjustments.length === 0) {
    return { error: 'Select at least one invoice or add an adjustment line.' }
  }

  // Load the selected CIs (snapshot source).
  const { data: ciRaw, error: ciErr } = ciIds.length > 0
    ? await supabase
        .from('contractor_invoices')
        .select('id, amount, notes:notes, contractor_id, contractors ( full_name ), jobs ( job_number, address )')
        .in('id', ciIds)
    : { data: [] as unknown[], error: null }
  if (ciErr) return { error: `Could not load invoices: ${ciErr.message}` }
  const cis = (ciRaw ?? []) as unknown as Array<CIRow & { notes: string | null }>
  if (cis.length !== ciIds.length) return { error: 'Some selected invoices could not be found.' }

  // Header.
  const { data: header, error: hErr } = await supabase
    .from('contractor_remittances')
    .insert({
      payment_date: input.paymentDate,
      reference: input.reference?.trim() || null,
      payee_label: input.payeeLabel?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    })
    .select('id, token')
    .single()
  if (hErr || !header) return { error: `Failed to create remittance: ${hErr?.message ?? 'no row'}` }

  // Snapshotted line items (invoices first, then adjustments).
  let sort = 0
  const items = [
    ...cis.map((ci) => ({
      remittance_id: header.id,
      kind: 'invoice',
      contractor_invoice_id: ci.id,
      contractor_id: ci.contractor_id,
      contractor_name: ci.contractors?.full_name ?? null,
      job_number: ci.jobs?.job_number ?? null,
      job_address: ci.jobs?.address ?? null,
      note: ci.notes?.trim() || null,
      label: null,
      amount: ci.amount ?? 0,
      sort: sort++,
    })),
    ...adjustments.map((a) => ({
      remittance_id: header.id,
      kind: 'adjustment',
      contractor_invoice_id: null,
      contractor_id: null,
      contractor_name: null,
      job_number: null,
      job_address: null,
      note: null,
      label: a.label.trim(),
      amount: Math.round(a.amount * 100) / 100,
      sort: sort++,
    })),
  ]
  const { error: iErr } = await supabase.from('contractor_remittance_items').insert(items)
  if (iErr) {
    await supabase.from('contractor_remittances').delete().eq('id', header.id)
    return { error: `Failed to add lines: ${iErr.message}` }
  }

  // Mark the selected CIs paid on the payment date (default on).
  const markPaid = input.markPaid !== false
  if (markPaid && ciIds.length > 0) {
    await supabase
      .from('contractor_invoices')
      .update({ status: 'paid', date_paid: input.paymentDate })
      .in('id', ciIds)
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_remittance.created',
    entity_table: 'contractor_remittances',
    entity_id: header.id,
    before: null,
    after: {
      payment_date: input.paymentDate,
      reference: input.reference ?? null,
      ci_ids: ciIds,
      adjustments,
      marked_paid: markPaid,
    },
  })

  revalidatePath('/portal/contractor-invoices')
  return { ok: true as const, id: header.id as string }
}
