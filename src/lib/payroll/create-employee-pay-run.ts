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

export interface CreatePayRunInput {
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  pay_frequency: 'weekly' | 'fortnightly'
  notes?: string | null
}

export async function createEmployeePayRun(
  supabase: SupabaseClient,
  input: CreatePayRunInput,
): Promise<{ id?: string; error?: string; duplicate?: boolean }> {
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
      return { duplicate: true, error: `A ${input.pay_frequency} pay run already exists for this period.` }
    }
    return { error: `Failed to create: ${error?.message}` }
  }

  // Active employees on THIS cycle only (frequency-aware).
  const { data: employees } = await supabase
    .from('contractors')
    .select('id, hourly_rate, standard_hours, tax_code, pay_frequency, holiday_pay_method, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_employer_rate, base_hourly_rate, loaded_hourly_rate')
    .eq('status', 'active')
    .neq('worker_type', 'contractor')
    .eq('pay_frequency', input.pay_frequency)

  if (employees?.length) {
    // Approved, unreimbursed mileage in this period → non-taxable reimbursement
    // per employee (kept out of gross/PAYE/ACC/KiwiSaver; settled at completion).
    const { data: mileage } = await supabase
      .from('mileage_logs')
      .select('contractor_id, reimbursement_amount')
      .in('contractor_id', employees.map((e) => e.id))
      .eq('status', 'approved')
      .is('pay_run_id', null)
      .gte('log_date', input.pay_period_start)
      .lte('log_date', input.pay_period_end)
    const mileageByContractor = new Map<string, number>()
    for (const m of mileage ?? []) {
      const cid = m.contractor_id as string
      mileageByContractor.set(cid, (mileageByContractor.get(cid) ?? 0) + Number(m.reimbursement_amount ?? 0))
    }

    const lines = employees.map((emp) => {
      const isPaygo = emp.holiday_pay_method === 'pay_as_you_go_8_percent'
      const rate = isPaygo ? (emp.loaded_hourly_rate ?? emp.hourly_rate ?? 0) : (emp.hourly_rate ?? 0)
      const hours = emp.standard_hours ?? 0

      const preview = calculatePayPreview({
        hoursWorked: hours,
        hourlyRate: rate,
        payFrequency: (emp.pay_frequency as 'weekly' | 'fortnightly') || 'fortnightly',
        taxCode: emp.tax_code || 'M',
        kiwisaverEnrolled: emp.kiwisaver_enrolled,
        kiwisaverEmployeeRate: emp.kiwisaver_employee_rate ?? 3,
        // Employer KiwiSaver minimum is 3.5% from 1 Apr 2026 — floor it.
        kiwisaverEmployerRate: Math.max(emp.kiwisaver_employer_rate ?? 3.5, 3.5),
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
        mileage_reimbursement: Math.round((mileageByContractor.get(emp.id) ?? 0) * 100) / 100,
        tax_code: emp.tax_code || 'M',
      }
    })

    await supabase.from('pay_run_lines').insert(lines)
  }

  return { id: data.id as string }
}
