'use server'

// Per-employee KiwiSaver compliance actions. Admin-only. Each transition is
// validated by the pure helpers in lib/payroll/kiwisaver and writes BOTH the
// worker's current-state columns AND an immutable worker_kiwisaver_events audit
// row (who did what, and when). Writes go through the service-role client after
// an admin gate — workers never have a write path to KiwiSaver state or the
// audit trail (Phase 5 rule). Supersedes the legacy single-person
// portal/_actions-kiwisaver.ts (kiwisaver_optout table).
//
// The rule the whole thing enforces: a stated intention (or a pending IRD
// application) NEVER stops deductions. Deductions and employer contributions
// continue until a valid KS10 (received in-window) or an approved IRD opt-out
// or an evidenced savings suspension is recorded.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import {
  KS_DEFAULT_EMPLOYEE,
  validateKiwiSaverElection,
  validateEmployerOptOut,
  validateIrdOptOut,
  validateSavingsSuspension,
  type KiwiSaverStatePatch,
} from '@/lib/payroll/kiwisaver'

type Result = { ok?: true; error?: string; warning?: string }

interface WorkerKs {
  id: string
  worker_type: string | null
  start_date: string | null
  kiwisaver_status: string | null
}

/** Admin gate + load the worker's KiwiSaver-relevant fields. */
async function authAndLoad(workerId: string): Promise<{ error?: string; userId?: string; worker?: WorkerKs }> {
  if (!workerId) return { error: 'Missing employee.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const svc = getServiceSupabase()
  const { data } = await svc
    .from('contractors')
    .select('id, worker_type, start_date, kiwisaver_status')
    .eq('id', workerId)
    .maybeSingle()
  if (!data) return { error: 'Employee not found.' }
  if ((data as WorkerKs).worker_type !== 'employee') return { error: 'KiwiSaver applies to employees only.' }
  return { userId: user.id, worker: data as WorkerKs }
}

/** Apply a validated transition: patch the worker + append the audit event. */
async function applyTransition(
  workerId: string,
  userId: string,
  patch: Partial<KiwiSaverStatePatch> & Record<string, unknown>,
  event: { type: string; evidenceRef?: string | null; effectiveDate?: string | null; note?: string | null },
): Promise<Result> {
  const svc = getServiceSupabase()
  const { error: updErr } = await svc.from('contractors').update(patch).eq('id', workerId)
  if (updErr) return { error: `Couldn’t update KiwiSaver status: ${updErr.message}` }
  const { error: evErr } = await svc.from('worker_kiwisaver_events').insert({
    worker_id: workerId,
    event_type: event.type,
    evidence_ref: event.evidenceRef ?? null,
    effective_date: event.effectiveDate ?? null,
    note: event.note ?? null,
    performed_by: userId,
  })
  // The state change is what matters; a failed audit insert is surfaced, not fatal.
  if (evErr) console.error('[kiwisaver] audit event not recorded:', evErr.message)
  revalidatePath(`/portal/contractors/${workerId}`)
  return { ok: true }
}

/**
 * Record a completed KS2. Sets the elected rate (default 3.5% when none is
 * supplied — payroll is never blocked for want of a rate). Never changes
 * enrolment; an enrolled member stays enrolled and contributing.
 */
export async function recordKiwiSaverKs2(input: {
  workerId: string
  rate?: number | null
  source?: string | null
  completedDate?: string | null
  evidenceRef?: string | null
}): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }

  const rate = input.rate ?? KS_DEFAULT_EMPLOYEE
  const source = input.source ?? 'standard'
  const v = validateKiwiSaverElection({ rate, source })
  if (v.error) return { error: v.error }

  const res = await applyTransition(input.workerId, gate.userId!, {
    kiwisaver_ks2_completed: true,
    kiwisaver_ks2_completed_date: input.completedDate || new Date().toISOString().slice(0, 10),
    kiwisaver_employee_rate: rate,
    kiwisaver_rate_source: source,
  }, {
    type: 'ks2_completed',
    evidenceRef: input.evidenceRef ?? null,
    note: `KS2 recorded at ${rate}%${input.rate == null ? ' (statutory default — no rate supplied)' : ''}.`,
  })
  return v.warning ? { ...res, warning: v.warning } : res
}

/**
 * Record delivery of the auto-enrolment information pack (KS3 deduction form +
 * KS10 opt-out info) — part of the auto-enrolment audit trail. State only; does
 * not change enrolment or deductions.
 */
export async function recordKiwiSaverInfoPack(input: { workerId: string; deliveredDate?: string | null }): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  const date = input.deliveredDate || new Date().toISOString().slice(0, 10)
  return applyTransition(input.workerId, gate.userId!, {
    kiwisaver_ks3_provided: true,
    kiwisaver_info_pack_delivered_date: date,
  }, { type: 'auto_enrolled', effectiveDate: date, note: 'KS3 + KS10 information pack delivered.' })
}

/**
 * EMPLOYER-RECEIVED opt-out (KS10). Only valid for an auto-enrolled employee
 * when the completed KS10 is received within the day-14–56 window. Stops
 * deductions from the effective date; Sano must then submit the opt-out to IRD
 * (recorded via recordOptOutSubmittedToIrd).
 */
export async function recordEmployerOptOut(input: {
  workerId: string
  ks10SignedDate: string
  ks10ReceivedDate: string
  payrollStopEffectiveDate?: string | null
}): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  const v = validateEmployerOptOut({
    status: gate.worker!.kiwisaver_status,
    startDate: gate.worker!.start_date,
    ks10SignedDate: input.ks10SignedDate,
    ks10ReceivedDate: input.ks10ReceivedDate,
    payrollStopEffectiveDate: input.payrollStopEffectiveDate ?? null,
  })
  if (v.error || !v.patch) return { error: v.error }
  return applyTransition(input.workerId, gate.userId!, { ...v.patch }, {
    type: 'optout_ks10',
    effectiveDate: v.patch.kiwisaver_payroll_stop_effective_date,
    note: `KS10 opt-out: signed ${input.ks10SignedDate}, received ${input.ks10ReceivedDate}. Submit to IRD.`,
  })
}

/** Record that the KS10 opt-out details were submitted to IRD (Sano's obligation). */
export async function recordOptOutSubmittedToIrd(input: { workerId: string; date?: string | null }): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  const date = input.date || new Date().toISOString().slice(0, 10)
  return applyTransition(input.workerId, gate.userId!, {
    kiwisaver_optout_submitted_to_ird_date: date,
  }, { type: 'status_changed', effectiveDate: date, note: 'KS10 opt-out submitted to IRD.' })
}

/**
 * IRD-MANAGED opt-out (myIR / late). Only takes effect once IRD APPROVAL is
 * received — deductions, employer contributions and ESCT continue until then.
 */
export async function recordIrdOptOut(input: {
  workerId: string
  irdApprovalReference: string
  irdApprovalDate: string
  instructedEffectiveDate: string
}): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  const v = validateIrdOptOut({
    status: gate.worker!.kiwisaver_status,
    irdApprovalReference: input.irdApprovalReference,
    irdApprovalDate: input.irdApprovalDate,
    instructedEffectiveDate: input.instructedEffectiveDate,
  })
  if (v.error || !v.patch) return { error: v.error }
  return applyTransition(input.workerId, gate.userId!, { ...v.patch }, {
    type: 'optout_ird_confirmed',
    evidenceRef: input.irdApprovalReference,
    effectiveDate: v.patch.kiwisaver_payroll_stop_effective_date,
    note: `IRD-approved opt-out (ref ${input.irdApprovalReference}, approved ${input.irdApprovalDate}).`,
  })
}

/**
 * Savings suspension. Deductions only stop once an approved savings-suspension
 * notice is evidenced (reference + effective-from).
 */
export async function recordSavingsSuspension(input: {
  workerId: string
  noticeRef: string
  from: string
  to?: string | null
}): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  const v = validateSavingsSuspension({ noticeRef: input.noticeRef, from: input.from, to: input.to ?? null })
  if (v.error || !v.patch) return { error: v.error }
  return applyTransition(input.workerId, gate.userId!, { ...v.patch }, {
    type: 'savings_suspension_start',
    evidenceRef: input.noticeRef,
    effectiveDate: input.from,
    note: `Savings suspension from ${input.from}${input.to ? ` to ${input.to}` : ''} (notice ${input.noticeRef}).`,
  })
}

/** End a savings suspension — resume deductions as an enrolled member. */
export async function endSavingsSuspension(input: { workerId: string; endDate?: string | null }): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  if (gate.worker!.kiwisaver_status !== 'savings_suspension') return { error: 'This employee is not on a savings suspension.' }
  const date = input.endDate || new Date().toISOString().slice(0, 10)
  return applyTransition(input.workerId, gate.userId!, {
    kiwisaver_status: 'existing_member',
    kiwisaver_enrolled: true,
    kiwisaver_savings_suspension_to: date,
  }, { type: 'savings_suspension_end', effectiveDate: date, note: 'Savings suspension ended; deductions resume.' })
}

/**
 * Record a stated intention to opt out (or a pending IRD application) as a
 * NON-OPERATIVE note. Explicitly does NOT change status, enrolment, deductions
 * or employer contributions — nothing changes until a valid opt-out is recorded.
 */
export async function recordOptOutIntention(input: { workerId: string; note: string }): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  if (!input.note?.trim()) return { error: 'Enter the note.' }
  return applyTransition(input.workerId, gate.userId!, {
    kiwisaver_optout_intention_note: input.note.trim(),
    kiwisaver_optout_intention_recorded_at: new Date().toISOString().slice(0, 10),
  }, { type: 'intention_noted', note: input.note.trim() })
}

/** Record that an employee is not eligible for automatic enrolment, with reason. */
export async function recordKiwiSaverNotEligible(input: { workerId: string; reason: string }): Promise<Result> {
  const gate = await authAndLoad(input.workerId)
  if (gate.error) return { error: gate.error }
  if (!input.reason?.trim()) return { error: 'Enter the reason.' }
  return applyTransition(input.workerId, gate.userId!, {
    kiwisaver_status: 'not_eligible',
    kiwisaver_enrolled: false,
  }, { type: 'not_eligible_recorded', note: input.reason.trim() })
}
