'use server'

// Job EXTRAS — add / edit / delete job_items on a job (2026-09).
//
// An extra is work identified on a job that is not the job itself: a carpet
// clean, an oven, a window round. It carries a CHARGE to the client and an
// optional COST to a contractor with its own pay basis.
//
// WHO DOES IT IS AN OPEN CHOICE. The contractor on an extra is frequently NOT
// one of the job's assigned cleaners — a carpet clean is usually a specialist
// who was never on the roster. So `contractor_id` here is deliberately
// unconstrained by job_workers, and adding an extra NEVER creates a job_workers
// row. (Doing so would drag the specialist into resplitJobHours and silently cut
// the actual cleaner's payable hours — see the addendum in
// docs/superpowers/specs/2026-09-17-job-items-and-quote-payment-details.md.)
//
// Staff-level, not admin-only: adding an extra is ordinary operational work,
// the same tier as recording a job's hours. Deleting one that has already been
// PAID is blocked outright.
//
// No client-approval gate: the operator has agreed the extra verbally on site,
// and the invoice can still be corrected before it is sent.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { costBasisOf, type JobItemCostBasis } from '@/lib/job-items'

export interface JobItemInput {
  label: string
  /** The operator explicitly confirmed nobody is paid for this (in-house work).
   *  Distinguishes a deliberate answer from a half-finished entry, so the
   *  "Needs contractor" prompt stops once it has been answered. */
  inHouse?: boolean
  description?: string | null
  price: number
  contractorId?: string | null
  costBasis?: JobItemCostBasis
  /** For 'fixed': the whole payable. For 'hourly': the RATE (hours × rate is stored). */
  costRate?: number | null
  /** Hours, for 'hourly' only. */
  costHours?: number | null
}

export interface JobItemResult {
  ok?: true
  id?: string
  error?: string
}

function revalidate(jobId: string) {
  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Validate + normalise the operator's input into the columns job_items stores.
 *
 * `cost_amount` is stored as the TOTAL in both bases (the DB constraint and
 * jobItemPayable both assume this), so an hourly extra multiplies here — once,
 * at the edge — rather than leaving two representations of the same money.
 */
function normalise(input: JobItemInput):
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string } {
  const label = (input.label ?? '').trim()
  if (!label) return { ok: false, error: 'Say what was done — the client reads this on the invoice.' }
  if (label.length > 200) return { ok: false, error: 'Keep the description under 200 characters.' }

  const price = Number(input.price)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'Enter a charge of zero or more.' }
  }

  const contractorId = input.contractorId?.trim() || null
  const basis = costBasisOf(input.costBasis)

  // No contractor → no cost. An in-house extra is charged but never paid out.
  if (!contractorId) {
    return {
      ok: true,
      row: {
        label,
        description: (input.description ?? '').trim() || null,
        price: round2(price),
        contractor_id: null,
        cost_amount: null,
        cost_basis: 'fixed',
        cost_hours: null,
        in_house: input.inHouse === true,
      },
    }
  }

  const rate = input.costRate == null ? null : Number(input.costRate)
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    return {
      ok: false,
      error: basis === 'hourly'
        ? 'Enter the hourly rate for this extra.'
        : 'Enter the amount to pay for this extra.',
    }
  }

  let costAmount: number
  let costHours: number | null = null

  if (basis === 'hourly') {
    const hours = input.costHours == null ? null : Number(input.costHours)
    if (hours == null || !Number.isFinite(hours) || hours <= 0) {
      return { ok: false, error: 'Enter how many hours this extra took.' }
    }
    costHours = hours
    costAmount = round2(hours * rate)
  } else {
    costAmount = round2(rate)
  }

  return {
    ok: true,
    row: {
      label,
      description: (input.description ?? '').trim() || null,
      price: round2(price),
      contractor_id: contractorId,
      cost_amount: costAmount,
      cost_basis: basis,
      cost_hours: costHours,
      // Choosing someone clears the in-house answer — they are not both.
      in_house: false,
    },
  }
}

/** Strip `in_house` and retry when the column does not exist yet.
 *
 *  The in_house migration (docs/db/2026-09-18-job-items-in-house.sql) is run by
 *  hand, so the code may deploy first. Without this, every add/edit would fail
 *  outright in that window. Losing the in-house FLAG until the migration lands
 *  is a cosmetic regression (the prompt nags); losing the ability to record an
 *  extra at all is not. */
function isMissingInHouseColumn(message: string | undefined): boolean {
  return !!message && /in_house/.test(message) && /column|schema cache/i.test(message)
}

function withoutInHouse(row: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...row }
  delete rest.in_house
  return rest
}

/** Is this item already committed to pay? Editing/deleting it then would
 *  desync the payable from the item it is supposed to explain. */
async function payableFor(
  supabase: ReturnType<typeof createClient>,
  itemId: string,
): Promise<{ id: string; invoice_number: string | null; status: string | null } | null> {
  const { data } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, status')
    .eq('job_item_id', itemId)
    .neq('status', 'void')
    .limit(1)
    .maybeSingle()
  return (data as { id: string; invoice_number: string | null; status: string | null } | null) ?? null
}

export async function addJobItem(jobId: string, input: JobItemInput): Promise<JobItemResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!jobId) return { error: 'Job is required.' }

  const norm = normalise(input)
  if (!norm.ok) return { error: norm.error }

  const { data: job } = await supabase
    .from('jobs')
    .select('id, deleted_at')
    .eq('id', jobId)
    .maybeSingle()
  if (!job) return { error: 'Job not found.' }
  if (job.deleted_at) return { error: 'Cannot add an extra to an archived job.' }

  // Append to the end of the existing list.
  const { data: last } = await supabase
    .from('job_items')
    .select('sort_order')
    .eq('job_id', jobId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sortOrder = ((last?.sort_order as number | null) ?? -1) + 1

  const baseRow = {
    ...norm.row,
    job_id: jobId,
    source: 'added',
    sort_order: sortOrder,
    created_by: user.id,
  }
  let { data: created, error: insErr } = await supabase
    .from('job_items').insert(baseRow).select('id').single()
  if (insErr && isMissingInHouseColumn(insErr.message)) {
    ({ data: created, error: insErr } = await supabase
      .from('job_items').insert(withoutInHouse(baseRow)).select('id').single())
  }
  if (insErr || !created) {
    return { error: `Could not add the extra: ${insErr?.message ?? 'no row returned'}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'job_item.added',
    entity_table: 'job_items',
    entity_id: created.id as string,
    before: null,
    after: { job_id: jobId, ...norm.row },
  })

  revalidate(jobId)
  return { ok: true, id: created.id as string }
}

export async function updateJobItem(
  jobId: string,
  itemId: string,
  input: JobItemInput,
): Promise<JobItemResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const norm = normalise(input)
  if (!norm.ok) return { error: norm.error }

  const { data: before } = await supabase
    .from('job_items')
    .select('id, job_id, label, description, price, contractor_id, cost_amount, cost_basis, cost_hours, source')
    .eq('id', itemId)
    .maybeSingle()
  if (!before) return { error: 'Extra not found.' }
  if (before.job_id !== jobId) return { error: 'That extra belongs to a different job.' }

  // A paid extra is frozen: its payable already exists and quotes these figures.
  const payable = await payableFor(supabase, itemId)
  if (payable && payable.status === 'paid') {
    return { error: `This extra has already been paid (${payable.invoice_number ?? 'payable'}). Void the payable first if it needs to change.` }
  }

  // The CHARGE stays editable while a payable exists — it is the client side and
  // does not affect what the contractor is owed. The COST does not.
  const costChanged =
    norm.row.contractor_id !== before.contractor_id ||
    norm.row.cost_amount !== before.cost_amount ||
    norm.row.cost_basis !== before.cost_basis ||
    norm.row.cost_hours !== before.cost_hours
  if (payable && costChanged) {
    return { error: `This extra is already approved for pay (${payable.invoice_number ?? 'payable'}), so who does it and what they are paid can no longer change. Void the payable first.` }
  }

  // A quote-sourced item keeps its source: its charge lives in job_price and
  // flipping it to 'added' would double-bill the client.
  let { error: updErr } = await supabase.from('job_items').update(norm.row).eq('id', itemId)
  if (updErr && isMissingInHouseColumn(updErr.message)) {
    ({ error: updErr } = await supabase
      .from('job_items').update(withoutInHouse(norm.row)).eq('id', itemId))
  }
  if (updErr) return { error: `Could not update the extra: ${updErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'job_item.updated',
    entity_table: 'job_items',
    entity_id: itemId,
    before,
    after: { job_id: jobId, ...norm.row },
  })

  revalidate(jobId)
  return { ok: true, id: itemId }
}

export async function deleteJobItem(jobId: string, itemId: string): Promise<JobItemResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: before } = await supabase
    .from('job_items')
    .select('id, job_id, label, description, price, contractor_id, cost_amount, cost_basis, cost_hours, source')
    .eq('id', itemId)
    .maybeSingle()
  if (!before) return { error: 'Extra not found.' }
  if (before.job_id !== jobId) return { error: 'That extra belongs to a different job.' }

  // Any live payable blocks deletion — the DB's on-delete-restrict would refuse
  // anyway, but a clear message beats a foreign-key error.
  const payable = await payableFor(supabase, itemId)
  if (payable) {
    return { error: `This extra has a contractor payable (${payable.invoice_number ?? 'payable'}) against it. Void that first.` }
  }

  const { error: delErr } = await supabase.from('job_items').delete().eq('id', itemId)
  if (delErr) return { error: `Could not remove the extra: ${delErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'job_item.deleted',
    entity_table: 'job_items',
    entity_id: itemId,
    before,
    after: null,
  })

  revalidate(jobId)
  return { ok: true, id: itemId }
}
