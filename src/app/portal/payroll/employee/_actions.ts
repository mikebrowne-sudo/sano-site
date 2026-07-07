'use server'

// Casual-employee pay run: recompute server-side (never trust client numbers),
// store the run, and record the gross as a wages_payroll expense so it flows
// into the P&L + bank reconciliation. Admin-only.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { computePayslip } from '@/lib/payroll/payslip'
import type { PayPeriod } from '@/lib/payroll/paye'

export interface SavePayRunInput {
  personLabel: string
  taxCode: string
  payPeriod: PayPeriod
  periodStart?: string | null
  periodEnd?: string | null
  payDate: string
  hours: number
  rate: number
  kiwiSaverEmployeeRate?: number
  notes?: string | null
  recordExpense?: boolean
}

export async function saveEmployeePayRun(input: SavePayRunInput): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.payDate) return { error: 'Pay date is required.' }
  if (!(input.hours > 0) || !(input.rate > 0)) return { error: 'Enter hours and an hourly rate.' }

  const slip = computePayslip({
    hours: input.hours,
    rate: input.rate,
    period: input.payPeriod,
    kiwiSaverEmployeeRate: input.kiwiSaverEmployeeRate ?? 0,
  })

  let expenseId: string | null = null
  if (input.recordExpense !== false) {
    const { data: exp } = await supabase
      .from('expenses')
      .insert({
        expense_date: input.payDate,
        amount: slip.gross,
        category: 'wages_payroll',
        vendor: input.personLabel || 'Carol',
        description: `Wages — ${input.personLabel || 'Carol'} (${input.payPeriod})`,
        gst_inclusive: false,
        created_by: user.id,
      })
      .select('id')
      .single()
    expenseId = (exp?.id as string | null) ?? null
  }

  const { error } = await supabase.from('employee_pay_runs').insert({
    person_label: input.personLabel || 'Carol',
    tax_code: input.taxCode || 'M',
    pay_period: input.payPeriod,
    period_start: input.periodStart || null,
    period_end: input.periodEnd || null,
    pay_date: input.payDate,
    hours: input.hours,
    rate: input.rate,
    gross: slip.gross,
    holiday_pay_component: slip.holidayPayComponent,
    income_tax: slip.incomeTax,
    acc_levy: slip.accLevy,
    paye: slip.paye,
    kiwisaver: slip.kiwiSaver,
    net: slip.net,
    notes: input.notes?.trim() || null,
    expense_id: expenseId,
    created_by: user.id,
  })
  if (error) return { error: `Couldn’t save pay run: ${error.message}` }

  revalidatePath('/portal/payroll/employee')
  revalidatePath('/portal/expenses')
  return { ok: true }
}

export async function deleteEmployeePayRun(id: string): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const { error } = await supabase.from('employee_pay_runs').delete().eq('id', id)
  if (error) return { error: `Couldn’t delete: ${error.message}` }
  revalidatePath('/portal/payroll/employee')
  return { ok: true }
}
