// Shared employee pay-run builder — used by BOTH the manual action
// (/portal/payroll/new) and the weekly auto-draft cron, so they compute
// identically. Creates a draft pay run for one pay cycle and auto-populates a
// line per active employee on that cycle (frequency-aware), including each
// employee's approved, unreimbursed in-period mileage as a non-taxable line
// amount (never added to gross/PAYE — see PR2c).
//
// The caller supplies the Supabase client: the action passes the request-scoped
// client (RLS, admin session); the cron passes the service-role client.

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculatePayPreview } from '@/lib/nz-paye'
import { employerKiwiSaverRate, resolveEmployeeKiwiSaverRateForPay } from '@/lib/payroll/kiwisaver'
import { resolveTermsAsAt, payTermsFromRow } from '@/lib/payroll/pay-terms'

export interface CreatePayRunInput {
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  pay_frequency: 'weekly' | 'fortnightly'
  notes?: string | null
  /** Mileage catch-up: pay ONLY the period's approved mileage (0 hours, 0 wages,
   *  0 PAYE/KiwiSaver). Used to release mileage that predates the normal cycle
   *  without double-paying wages. Mileage is non-taxable, so nothing is withheld. */
  mileage_only?: boolean
  /** Wages are paid in ADVANCE but mileage is reimbursed in ARREARS. When true,
   *  the run pulls mileage from the PERIOD BEFORE its wage period (one cycle
   *  earlier) instead of its own period — so an advance wage run for 10–16 Aug
   *  sweeps in the previous week's (3–9 Aug) approved mileage. */
  mileage_from_prior_week?: boolean
}

/** A pay-run line that needs staff review before finalising (never a silent
 *  problem) — e.g. an employee whose temporary KiwiSaver reduction has expired. */
export interface PayRunWarning {
  contractor_id: string
  message: string
}

export async function createEmployeePayRun(
  supabase: SupabaseClient,
  input: CreatePayRunInput,
): Promise<{ id?: string; error?: string; duplicate?: boolean; warnings?: PayRunWarning[] }> {
  if (!input.pay_period_start || !input.pay_period_end || !input.pay_date) {
    return { error: 'All dates are required.' }
  }
  if (input.pay_frequency !== 'weekly' && input.pay_frequency !== 'fortnightly') {
    return { error: 'Choose a pay cycle (weekly or fortnightly).' }
  }

  const { data, error } = await supabase
    .from('pay_runs')
    .insert({
      pay_period_start: input.pay_period_start,
      pay_period_end: input.pay_period_end,
      pay_date: input.pay_date,
      pay_frequency: input.pay_frequency,
      kind: 'employee',
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    // 23505 = unique violation → the double-pay guard: one employee run per
    // cycle per period. A manual run and the cron can't both pay the same week.
    if (error?.code === '23505') {
      // Unique on (pay_frequency, pay_period_end). A catch-up sharing an end
      // date with an existing run trips this — tell the operator to change the
      // period end, not that "the weekly run exists".
      return {
        duplicate: true,
        error: input.mileage_only
          ? 'A run already ends on this date. For a mileage catch-up, set the period to the mileage dates (e.g. 1–31 Jul) so it doesn’t clash with a weekly run.'
          : `A ${input.pay_frequency} pay run already exists for this period.`,
      }
    }
    return { error: `Failed to create: ${error?.message}` }
  }

  // Active employees on THIS cycle only (frequency-aware).
  const { data: employees } = await supabase
    .from('contractors')
    .select('id, hourly_rate, standard_hours, tax_code, pay_frequency, holiday_pay_method, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_employer_rate, kiwisaver_rate_source, kiwisaver_temp_reduction_expiry, base_hourly_rate, loaded_hourly_rate')
    .eq('status', 'active')
    .neq('worker_type', 'contractor')
    .eq('pay_frequency', input.pay_frequency)

  if (employees?.length) {
    // Approved, unreimbursed mileage in this period → non-taxable reimbursement
    // per employee (kept out of gross/PAYE/ACC/KiwiSaver; settled at completion).
    // pay_run_id IS NULL excludes mileage already consumed by an earlier run —
    // so we must stamp these logs with this run's id below, or the same mileage
    // would be re-pulled (and re-paid) on every subsequent run.
    // Mileage window: normally the run's own period, but when wages are paid in
    // advance the mileage is for the PRIOR cycle — shift the window back one
    // cycle (7 days weekly, 14 fortnightly) so it lines up with driving already
    // done. Uses UTC date maths; date-only so no TZ drift.
    const shiftDays = input.mileage_from_prior_week ? (input.pay_frequency === 'fortnightly' ? 14 : 7) : 0
    const shiftIso = (ymd: string, days: number) => {
      const d = new Date(`${ymd}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() - days)
      return d.toISOString().slice(0, 10)
    }
    const mileageFrom = shiftIso(input.pay_period_start, shiftDays)
    const mileageTo = shiftIso(input.pay_period_end, shiftDays)

    const { data: mileage } = await supabase
      .from('mileage_logs')
      .select('id, contractor_id, reimbursement_amount')
      .in('contractor_id', employees.map((e) => e.id))
      .eq('status', 'approved')
      .is('pay_run_id', null)
      .gte('log_date', mileageFrom)
      .lte('log_date', mileageTo)
    const mileageByContractor = new Map<string, number>()
    const consumedMileageLogIds: string[] = []
    for (const m of mileage ?? []) {
      const cid = m.contractor_id as string
      mileageByContractor.set(cid, (mileageByContractor.get(cid) ?? 0) + Number(m.reimbursement_amount ?? 0))
      consumedMileageLogIds.push(m.id as string)
    }

    const warnings: PayRunWarning[] = []

    const lines = employees.map((emp) => {
      const mileageAmt = Math.round((mileageByContractor.get(emp.id) ?? 0) * 100) / 100

      // Mileage catch-up: pay only the period's mileage. Zero wages/PAYE/KiwiSaver
      // (mileage is a non-taxable reimbursement, so nothing is withheld).
      if (input.mileage_only) {
        return {
          pay_run_id: data.id,
          contractor_id: emp.id,
          hours_worked: 0,
          hourly_rate: 0,
          gross_pay: 0,
          holiday_pay: 0,
          paye: 0,
          student_loan: 0,
          kiwisaver_employee: 0,
          kiwisaver_employer: 0,
          esct: 0,
          kiwisaver_employer_net: 0,
          net_pay: 0,
          mileage_reimbursement: mileageAmt,
          tax_code: emp.tax_code || 'M',
        }
      }

      const isPaygo = emp.holiday_pay_method === 'pay_as_you_go_8_percent'
      const rate = isPaygo ? (emp.loaded_hourly_rate ?? emp.hourly_rate ?? 0) : (emp.hourly_rate ?? 0)
      const hours = emp.standard_hours ?? 0

      // Resolve the employee KiwiSaver rate, actively guarding against an
      // EXPIRED temporary reduction: an expired 3% is never continued silently —
      // the standard minimum is used and the run is flagged for staff review.
      const ks = resolveEmployeeKiwiSaverRateForPay({
        rate: emp.kiwisaver_employee_rate,
        source: emp.kiwisaver_rate_source,
        expiry: emp.kiwisaver_temp_reduction_expiry as string | null,
        asOf: input.pay_date,
      })
      if (ks.warning) warnings.push({ contractor_id: emp.id, message: ks.warning })

      const preview = calculatePayPreview({
        hoursWorked: hours,
        hourlyRate: rate,
        payFrequency: (emp.pay_frequency as 'weekly' | 'fortnightly') || 'fortnightly',
        taxCode: emp.tax_code || 'M',
        kiwisaverEnrolled: emp.kiwisaver_enrolled,
        kiwisaverEmployeeRate: ks.rate,
        // Employer KiwiSaver minimum is 3.5% from 1 Apr 2026 — floored centrally.
        kiwisaverEmployerRate: employerKiwiSaverRate(emp.kiwisaver_employer_rate),
        holidayPayMethod: isPaygo ? null : emp.holiday_pay_method,
      })

      return {
        pay_run_id: data.id,
        contractor_id: emp.id,
        hours_worked: hours,
        hourly_rate: rate,
        gross_pay: preview.effectiveGross,
        holiday_pay: preview.holidayPay,
        paye: preview.paye,
        student_loan: preview.studentLoan,
        kiwisaver_employee: preview.employeeKiwisaver,
        kiwisaver_employer: preview.employerKiwisaver,
        esct: preview.employerEsct,
        kiwisaver_employer_net: preview.employerKiwisaverNet,
        net_pay: preview.netPay,
        mileage_reimbursement: mileageAmt,
        tax_code: emp.tax_code || 'M',
      }
    })

    await supabase.from('pay_run_lines').insert(lines)

    // Stamp the mileage logs this run consumed with its id, so they are not
    // re-pulled (and re-paid) on the next run. The delete-draft flow un-stamps
    // (sets pay_run_id back to null) if this run is discarded. Best-effort: a
    // stamping failure must not roll back an otherwise-created run, but it is the
    // guard against double-paying mileage — see the audit's double-pay concern.
    if (consumedMileageLogIds.length) {
      await supabase.from('mileage_logs').update({ pay_run_id: data.id }).in('id', consumedMileageLogIds)
    }

    // Stamp the effective pay-terms snapshot when the run covers exactly one
    // employee (the advance-weekly norm), so the run is reproducible and PR C's
    // liability backfill has an exact source. Best-effort — the columns/table
    // depend on the PR A/B migrations, so this never blocks run creation.
    if (employees.length === 1) {
      try {
        const { data: termRows } = await supabase
          .from('employee_pay_terms')
          .select('id, standard_weekly_hours, hourly_rate, working_pattern, pay_frequency, payday, basis, effective_from, effective_to')
          .eq('contractor_id', employees[0].id)
        const resolved = resolveTermsAsAt((termRows ?? []).map(payTermsFromRow), input.pay_period_start)
        if (resolved) {
          await supabase.from('pay_runs')
            .update({ pay_terms_id: resolved.id ?? null, terms_snapshot: resolved, basis: resolved.basis })
            .eq('id', data.id)
        }
      } catch { /* migration not applied yet */ }
    }

    if (warnings.length) return { id: data.id as string, warnings }
  }

  return { id: data.id as string }
}
