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
  contractorNames: string[]
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
}

async function build(svc: SupabaseClient, h: Header): Promise<RemittanceBatch> {
  const { data: itemsRaw } = await svc
    .from('contractor_remittance_items')
    .select('kind, contractor_name, job_number, job_address, note, label, hours, amount, sort, contractor_invoices ( job_id, service_date, gst_supply_date, jobs ( completed_at ) )')
    .eq('remittance_id', h.id)
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
    }
  })
  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100
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
    contractorNames,
  }
}

const HEADER_COLS = 'id, token, remittance_number, payment_date, reference, payee_label, notes, sent_at, paid_at'

export interface RemittanceBatchSummary {
  id: string
  remittanceNumber: string
  paymentDate: string | null
  payeeLabel: string | null
  reference: string | null
  total: number
  sentAt: string | null
  paidAt: string | null
  createdAt: string | null
  contractorNames: string[]
}

/** Summary rows for the saved-remittances list. Totals + contractor
 *  names are rolled up from the snapshotted line items. */
export async function listRemittanceBatches(): Promise<RemittanceBatchSummary[]> {
  const svc = getServiceSupabase()
  const { data: headers } = await svc
    .from('contractor_remittances')
    .select('id, remittance_number, payment_date, reference, payee_label, sent_at, paid_at, created_at')
    .order('created_at', { ascending: false })
  if (!headers || headers.length === 0) return []

  const ids = headers.map((h) => h.id as string)
  const { data: items } = await svc
    .from('contractor_remittance_items')
    .select('remittance_id, contractor_name, amount')
    .in('remittance_id', ids)

  const totals = new Map<string, number>()
  const names = new Map<string, Set<string>>()
  for (const it of items ?? []) {
    const rid = it.remittance_id as string
    totals.set(rid, (totals.get(rid) ?? 0) + ((it.amount as number) ?? 0))
    const name = it.contractor_name as string | null
    if (name) {
      const set = names.get(rid) ?? new Set<string>()
      set.add(name)
      names.set(rid, set)
    }
  }

  return headers.map((h) => {
    const id = h.id as string
    return {
      id,
      remittanceNumber: h.remittance_number as string,
      paymentDate: (h.payment_date as string | null) ?? null,
      payeeLabel: (h.payee_label as string | null) ?? null,
      reference: (h.reference as string | null) ?? null,
      total: Math.round((totals.get(id) ?? 0) * 100) / 100,
      sentAt: (h.sent_at as string | null) ?? null,
      paidAt: (h.paid_at as string | null) ?? null,
      createdAt: (h.created_at as string | null) ?? null,
      contractorNames: Array.from(names.get(id) ?? []),
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
