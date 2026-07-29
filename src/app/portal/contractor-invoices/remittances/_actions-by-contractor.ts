'use server'

// Contractor-select remittance builder. Staff pick contractors; for each
// company-group (a shared GST number collapses a couple into one company) this
// gathers that contractor's APPROVED, not-yet-remitted pay (their statement's
// period jobs plus any earlier unpaid jobs — "unpaid" = not on any existing
// remittance), and creates one remittance with a uniform reference
// (FIRSTNAME/COMPANYPAYROLLDDMMYY). Reuses the canonical createContractorRemittance.
// Admin-only; each group is independent (partial success).

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { buildRemittanceReference, groupContractorsForRemittance, type RemittanceContractor } from '@/lib/remittance-reference'
import { createContractorRemittance } from '../_actions-remittance-batch'
import { splitByPeriod, sumInvoices, round2, type EligibleInvoice, type PeriodFilter } from '@/lib/remittance-period'

export interface Period { period_start?: string; period_end?: string }

/** A single invoice line in a preview, so staff see exactly what's included. */
export interface PlanLine {
  ciId: string
  invoiceNumber: string
  serviceDate: string | null
  hours: number | null
  amount: number
  gstAmount: number
}

export interface GroupPlan {
  key: string
  payeeName: string
  reference: string
  contractorIds: string[]
  ciIds: string[]
  ciCount: number
  total: number
  gstTotal: number
  hoursTotal: number
  combined: boolean
  lines: PlanLine[]
  /** Undated (null service_date) invoices excluded when a period filter is set. */
  undatedCount: number
}

interface EligibleCi {
  id: string
  contractor_id: string
  amount: number
  pay_hours: number | null
  gst_amount: number | null
  service_date: string | null
  invoice_number: string | null
}

async function loadPlan(
  supabase: ReturnType<typeof createClient>,
  contractorIds: string[],
  paymentDate: string,
  period?: PeriodFilter,
): Promise<GroupPlan[]> {
  const ids = Array.from(new Set(contractorIds))
  if (ids.length === 0) return []

  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, full_name, company_name, gst_number')
    .in('id', ids)

  // Approved, not-yet-remitted pay for these contractors.
  const { data: ciRaw } = await supabase
    .from('contractor_invoices')
    .select('id, contractor_id, amount, pay_hours, gst_amount, service_date, invoice_number')
    .in('contractor_id', ids)
    .eq('status', 'approved')
  const cis = (ciRaw ?? []) as EligibleCi[]

  const { data: remitted } = await supabase
    .from('contractor_remittance_items')
    .select('contractor_invoice_id')
    .not('contractor_invoice_id', 'is', null)
  const remittedSet = new Set((remitted ?? []).map((r) => r.contractor_invoice_id as string))

  // Not-yet-remitted, normalised for the pure period splitter.
  const eligible: EligibleInvoice[] = cis
    .filter((c) => !remittedSet.has(c.id))
    .map((c) => ({
      id: c.id,
      contractorId: c.contractor_id,
      amount: Number(c.amount ?? 0),
      hours: c.pay_hours == null ? null : Number(c.pay_hours),
      gstAmount: c.gst_amount == null ? null : Number(c.gst_amount),
      serviceDate: c.service_date,
      invoiceNumber: c.invoice_number ?? '',
    }))

  const groups = groupContractorsForRemittance((contractors ?? []) as RemittanceContractor[])
  return groups.map((g) => {
    const groupInvoices = eligible.filter((c) => g.contractorIds.includes(c.contractorId))
    // Apply the service-date period filter (no-op when no range set).
    const split = splitByPeriod(groupInvoices, period ?? {})
    const included = split.inRange
    const sums = sumInvoices(included)
    return {
      key: g.key,
      payeeName: g.payeeName,
      reference: buildRemittanceReference(g.referenceName, paymentDate),
      contractorIds: g.contractorIds,
      ciIds: included.map((c) => c.id),
      ciCount: included.length,
      total: sums.total,
      gstTotal: sums.gst,
      hoursTotal: sums.hours,
      combined: g.combined,
      lines: included
        .slice()
        .sort((a, b) => (a.serviceDate ?? '').localeCompare(b.serviceDate ?? ''))
        .map((c) => ({
          ciId: c.id,
          invoiceNumber: c.invoiceNumber ?? '',
          serviceDate: c.serviceDate,
          hours: c.hours,
          amount: round2(c.amount),
          gstAmount: round2(c.gstAmount ?? 0),
        })),
      undatedCount: split.undated.length,
    }
  })
}

/** Dry-run: one row per company-group with its payee, reference, and a per-invoice breakdown. */
export async function previewRemittancesForContractors(
  contractorIds: string[],
  paymentDate: string,
  period?: PeriodFilter,
): Promise<{ error?: string; groups?: GroupPlan[]; grand_total?: number }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }
  if (!paymentDate) return { error: 'Set a payment date first.' }
  const groups = await loadPlan(supabase, contractorIds, paymentDate, period)
  return { groups, grand_total: Math.round(groups.reduce((s, g) => s + g.total, 0) * 100) / 100 }
}

export interface BuildResultItem { payee: string; reference: string; ok: boolean; ci_count: number; total: number; reason?: string }
export interface BuildResult { error?: string; created: number; skipped: number; failed: number; items: BuildResultItem[] }

export async function createRemittancesForContractors(input: {
  contractorIds: string[]
  paymentDate: string
  markPaid?: boolean
  period?: PeriodFilter
}): Promise<BuildResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.', created: 0, skipped: 0, failed: 0, items: [] }
  if (!input.paymentDate) return { error: 'A payment date is required.', created: 0, skipped: 0, failed: 0, items: [] }

  // Re-derive the plan under the SAME period filter used in the preview so the
  // created remittances match exactly what staff saw (no full-sweep drift).
  const groups = await loadPlan(supabase, input.contractorIds, input.paymentDate, input.period)
  const items: BuildResultItem[] = []
  let created = 0, skipped = 0, failed = 0

  for (const g of groups) {
    if (g.ciIds.length === 0) {
      skipped++
      items.push({ payee: g.payeeName, reference: g.reference, ok: false, ci_count: 0, total: 0, reason: 'no unpaid jobs' })
      continue
    }
    const res = await createContractorRemittance({
      paymentDate: input.paymentDate,
      reference: g.reference,
      payeeLabel: g.payeeName,
      ciIds: g.ciIds,
      markPaid: input.markPaid === true,
    })
    if ('error' in res && res.error) {
      failed++
      items.push({ payee: g.payeeName, reference: g.reference, ok: false, ci_count: g.ciCount, total: g.total, reason: res.error })
    } else {
      created++
      items.push({ payee: g.payeeName, reference: g.reference, ok: true, ci_count: g.ciCount, total: g.total })
    }
  }

  revalidatePath('/portal/contractor-invoices')
  revalidatePath('/portal/contractor-invoices/remittances')
  return { created, skipped, failed, items }
}
