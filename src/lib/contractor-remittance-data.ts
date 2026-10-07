// CI-based contractor remittance batch — read helper (server-only).
//
// Lines are snapshotted on the batch, so this never recomputes — it
// returns exactly what was paid. Contractor pay amounts only.

import { getServiceSupabase } from './supabase-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveContractorServiceDate } from './contractor-service-date'
import { toNzCalendarDate } from './contractor-statement-period'

export interface RemittanceBatchLine {
  kind: 'invoice' | 'adjustment'
  contractorName: string | null
  jobNumber: string | null
  jobAddress: string | null
  /** The clean's service date (job completion, or the payable's service date). */
  date: string | null
  note: string | null
  label: string | null
  // Snapshotted display-only hours. Non-null only when the line was
  // genuinely hourly and payable_hours × pay_rate matched the amount
  // (see _actions-remittance-batch). Null for fixed-price / legacy lines.
  hours: number | null
  amount: number
  // Frozen schedular tax breakdown (PR 9). Non-null only when the line was
  // frozen from an approved payment tax snapshot; null/absent for ordinary lines
  // and all pre-PR-9 remittances. Read-only passthrough of the persisted figures.
  contractorPaymentSnapshotId?: string | null
  grossExGst?: number | null
  gstAmount?: number | null
  whtRate?: number | null
  whtAmount?: number | null
  netPaid?: number | null
}

export interface RemittanceBatch {
  id: string
  token: string
  remittanceNumber: string
  paymentDate: string | null
  reference: string | null
  payeeLabel: string | null
  notes: string | null
  sentAt: string | null
  /** When staff marked this remittance paid (null = not yet paid). */
  paidAt: string | null
  lines: RemittanceBatchLine[]
  total: number
  /** Frozen schedular withholding retained to IRD across tax-bearing lines
   *  (PR 9). 0 when no line carries a snapshot. */
  whtTotal: number
  contractorNames: string[]
  /** Fully matched to outgoing bank money (set only by reconcile-out). */
  paymentConfirmed: boolean
  paymentConfirmedAt: string | null
  /** Sum of live (un-reversed) bank allocations — lets the detail page tell
   *  "partly confirmed" apart from "nothing matched yet". */
  allocatedTotal: number
}

interface Header {
  id: string
  token: string
  remittance_number: string
  payment_date: string | null
  reference: string | null
  payee_label: string | null
  notes: string | null
  sent_at: string | null
  paid_at: string | null
  payment_confirmed?: boolean | null
  payment_confirmed_at?: string | null
}

async function build(svc: SupabaseClient, h: Header): Promise<RemittanceBatch> {
  // Live (un-reversed) bank allocations against this remittance. Read-only —
  // reconcile-out owns writing these and payment_confirmed.
  const { data: allocRows } = await svc
    .from('remittance_payment_allocations')
    .select('amount_allocated')
    .eq('remittance_id', h.id)
    .is('reversed_at', null)
  const allocated = Math.round(
    ((allocRows ?? []) as Array<{ amount_allocated: number | null }>)
      .reduce((s, a) => s + Number(a.amount_allocated ?? 0), 0) * 100,
  ) / 100

  const { data: itemsRaw } = await svc
    .from('contractor_remittance_items')
    .select('kind, contractor_name, job_number, job_address, note, label, hours, amount, contractor_payment_snapshot_id, gross_ex_gst, gst_amount, wht_rate, wht_amount, net_paid, tax_status, sort, contractor_invoices ( job_id, service_date, gst_supply_date, jobs ( completed_at ) )')
    .eq('remittance_id', h.id)
    .neq('tax_status', 'superseded')
    .order('sort', { ascending: true })

  const flat = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

  const lines: RemittanceBatchLine[] = (itemsRaw ?? []).map((it) => {
    const ci = flat((it as { contractor_invoices?: unknown }).contractor_invoices) as
      { job_id: string | null; service_date: string | null; gst_supply_date: string | null; jobs: unknown } | null
    const job = flat(ci?.jobs) as { completed_at: string | null } | null
    const date = ci
      ? resolveContractorServiceDate({
          job_id: ci.job_id,
          job_completed_at_nz: toNzCalendarDate(job?.completed_at ?? null),
          service_date: ci.service_date,
          gst_supply_date: ci.gst_supply_date,
        }).date
      : null
    return {
      kind: (it.kind as 'invoice' | 'adjustment') ?? 'invoice',
      contractorName: (it.contractor_name as string | null) ?? null,
      jobNumber: (it.job_number as string | null) ?? null,
      jobAddress: (it.job_address as string | null) ?? null,
      date,
      note: (it.note as string | null) ?? null,
      label: (it.label as string | null) ?? null,
      hours: (it.hours as number | null) ?? null,
      amount: (it.amount as number) ?? 0,
      contractorPaymentSnapshotId: (it.contractor_payment_snapshot_id as string | null) ?? null,
      grossExGst: (it.gross_ex_gst as number | null) ?? null,
      gstAmount: (it.gst_amount as number | null) ?? null,
      whtRate: (it.wht_rate as number | null) ?? null,
      whtAmount: (it.wht_amount as number | null) ?? null,
      netPaid: (it.net_paid as number | null) ?? null,
    }
  })
  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100
  const whtTotal = Math.round(lines.reduce((s, l) => s + (l.whtAmount ?? 0), 0) * 100) / 100
  const contractorNames = Array.from(new Set(lines.map((l) => l.contractorName).filter((n): n is string => !!n)))

  return {
    id: h.id,
    token: h.token,
    remittanceNumber: h.remittance_number,
    paymentDate: h.payment_date,
    reference: h.reference,
    payeeLabel: h.payee_label,
    notes: h.notes,
    sentAt: h.sent_at,
    paidAt: h.paid_at,
    lines,
    total,
    whtTotal,
    contractorNames,
    paymentConfirmed: !!h.payment_confirmed,
    paymentConfirmedAt: h.payment_confirmed_at ?? null,
    allocatedTotal: allocated,
  }
}

const HEADER_COLS = 'id, token, remittance_number, payment_date, reference, payee_label, notes, sent_at, paid_at, payment_confirmed, payment_confirmed_at'

/**
 * User-facing payment state. Derived, never stored — the stored truth is
 * paid_at + payment_confirmed + live allocations, and this only names it.
 *
 *  open       — not yet marked paid by staff
 *  paid       — staff stamped it paid; no bank money matched yet
 *  partial    — SOME bank money matched, but less than the total. This state is
 *               real: payment_confirmed only flips true at FULL coverage
 *               (allocated >= total - 0.005 in reconcile-out/_actions.ts), so a
 *               partially-matched remittance is otherwise indistinguishable
 *               from an unmatched one.
 *  confirmed  — fully matched to outgoing bank debits
 */
export type PaymentState = 'open' | 'paid' | 'partial' | 'confirmed'

export interface RemittanceBatchSummary {
  id: string
  remittanceNumber: string
  paymentDate: string | null
  payeeLabel: string | null
  reference: string | null
  total: number
  sentAt: string | null
  paidAt: string | null
  /** True once the remittance is fully matched to outgoing bank money. A
   *  remittance can be paidAt-stamped (manual) yet unconfirmed = "paid,
   *  unconfirmed" until bank reconciliation ties it to a debit. */
  paymentConfirmed: boolean
  createdAt: string | null
  contractorNames: string[]
  /** Sum of live (un-reversed) bank allocations against this remittance. */
  allocatedTotal: number
  /** Derived label — see PaymentState. */
  state: PaymentState
  /** Job numbers + addresses on the frozen items, so history can be searched
   *  by job without a second round-trip. Snapshotted values, not live joins:
   *  history must read as it was paid. */
  jobNumbers: string[]
  jobAddresses: string[]
}

/** Summary rows for the saved-remittances list. Totals + contractor
 *  names are rolled up from the snapshotted line items. */
export async function listRemittanceBatches(): Promise<RemittanceBatchSummary[]> {
  const svc = getServiceSupabase()
  const { data: headers } = await svc
    .from('contractor_remittances')
    .select('id, remittance_number, payment_date, reference, payee_label, sent_at, paid_at, payment_confirmed, created_at')
    .order('created_at', { ascending: false })
  if (!headers || headers.length === 0) return []

  const ids = headers.map((h) => h.id as string)
  const [{ data: items }, { data: allocs }] = await Promise.all([
    svc
      .from('contractor_remittance_items')
      .select('remittance_id, contractor_name, amount, job_number, job_address')
      .in('remittance_id', ids),
    // Live allocations only — a reversed allocation is not bank money.
    svc
      .from('remittance_payment_allocations')
      .select('remittance_id, amount_allocated')
      .in('remittance_id', ids)
      .is('reversed_at', null),
  ])

  const totals = new Map<string, number>()
  const names = new Map<string, Set<string>>()
  const jobNums = new Map<string, Set<string>>()
  const jobAddrs = new Map<string, Set<string>>()
  for (const it of items ?? []) {
    const rid = it.remittance_id as string
    totals.set(rid, (totals.get(rid) ?? 0) + ((it.amount as number) ?? 0))
    const add = (m: Map<string, Set<string>>, v: string | null) => {
      if (!v) return
      const set = m.get(rid) ?? new Set<string>()
      set.add(v)
      m.set(rid, set)
    }
    add(names, it.contractor_name as string | null)
    add(jobNums, it.job_number as string | null)
    add(jobAddrs, it.job_address as string | null)
  }

  const allocated = new Map<string, number>()
  for (const a of allocs ?? []) {
    const rid = a.remittance_id as string
    allocated.set(rid, (allocated.get(rid) ?? 0) + Number(a.amount_allocated ?? 0))
  }

  return headers.map((h) => {
    const id = h.id as string
    const total = Math.round((totals.get(id) ?? 0) * 100) / 100
    const alloc = Math.round((allocated.get(id) ?? 0) * 100) / 100
    const paidAt = (h.paid_at as string | null) ?? null
    const confirmed = !!(h as { payment_confirmed?: boolean }).payment_confirmed

    // Mirrors refreshConfirmed() in reconcile-out/_actions.ts. Trust the stored
    // flag for "confirmed" — reconciliation owns it — and only use the
    // allocation sum to distinguish partial from untouched.
    const state: PaymentState =
      !paidAt ? 'open'
      : confirmed ? 'confirmed'
      : alloc > 0 ? 'partial'
      : 'paid'

    return {
      id,
      remittanceNumber: h.remittance_number as string,
      paymentDate: (h.payment_date as string | null) ?? null,
      payeeLabel: (h.payee_label as string | null) ?? null,
      reference: (h.reference as string | null) ?? null,
      total,
      sentAt: (h.sent_at as string | null) ?? null,
      paidAt,
      paymentConfirmed: confirmed,
      createdAt: (h.created_at as string | null) ?? null,
      contractorNames: Array.from(names.get(id) ?? []),
      allocatedTotal: alloc,
      state,
      jobNumbers: Array.from(jobNums.get(id) ?? []),
      jobAddresses: Array.from(jobAddrs.get(id) ?? []),
    }
  })
}

export async function getRemittanceBatchByToken(token: string): Promise<RemittanceBatch | null> {
  const svc = getServiceSupabase()
  const { data } = await svc.from('contractor_remittances').select(HEADER_COLS).eq('token', token).maybeSingle()
  if (!data) return null
  return build(svc, data as unknown as Header)
}

export async function getRemittanceBatchById(id: string): Promise<RemittanceBatch | null> {
  const svc = getServiceSupabase()
  const { data } = await svc.from('contractor_remittances').select(HEADER_COLS).eq('id', id).maybeSingle()
  if (!data) return null
  return build(svc, data as unknown as Header)
}
