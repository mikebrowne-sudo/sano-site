// CI-based contractor remittance batch — read helper (server-only).
//
// Lines are snapshotted on the batch, so this never recomputes — it
// returns exactly what was paid. Contractor pay amounts only.

import { getServiceSupabase } from './supabase-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface RemittanceBatchLine {
  kind: 'invoice' | 'adjustment'
  contractorName: string | null
  jobNumber: string | null
  jobAddress: string | null
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
}

async function build(svc: SupabaseClient, h: Header): Promise<RemittanceBatch> {
  const { data: itemsRaw } = await svc
    .from('contractor_remittance_items')
    .select('kind, contractor_name, job_number, job_address, note, label, hours, amount, sort')
    .eq('remittance_id', h.id)
    .order('sort', { ascending: true })

  const lines: RemittanceBatchLine[] = (itemsRaw ?? []).map((it) => ({
    kind: (it.kind as 'invoice' | 'adjustment') ?? 'invoice',
    contractorName: (it.contractor_name as string | null) ?? null,
    jobNumber: (it.job_number as string | null) ?? null,
    jobAddress: (it.job_address as string | null) ?? null,
    note: (it.note as string | null) ?? null,
    label: (it.label as string | null) ?? null,
    hours: (it.hours as number | null) ?? null,
    amount: (it.amount as number) ?? 0,
  }))
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
    lines,
    total,
    contractorNames,
  }
}

const HEADER_COLS = 'id, token, remittance_number, payment_date, reference, payee_label, notes, sent_at'

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
