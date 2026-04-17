'use server'

import { createClient } from '@/lib/supabase-server'
import { calculatePayPreview } from '@/lib/nz-paye'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createPayRun(input: { pay_period_start: string; pay_period_end: string; pay_date: string; notes?: string }) {
  const supabase = createClient()

  if (!input.pay_period_start || !input.pay_period_end || !input.pay_date) {
    return { error: 'All dates are required.' }
  }

  const { data, error } = await supabase
    .from('pay_runs')
    .insert({
      pay_period_start: input.pay_period_start,
      pay_period_end: input.pay_period_end,
      pay_date: input.pay_date,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: `Failed to create: ${error?.message}` }

  // Auto-populate lines for all active employees (not contractors)
  const { data: employees } = await supabase
    .from('contractors')
    .select('id, hourly_rate, standard_hours, tax_code, pay_frequency, holiday_pay_method, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_employer_rate, base_hourly_rate, loaded_hourly_rate')
    .eq('status', 'active')
    .neq('worker_type', 'contractor')

  if (employees?.length) {
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
        kiwisaverEmployerRate: emp.kiwisaver_employer_rate ?? 3,
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
        net_pay: preview.netPay,
        tax_code: emp.tax_code || 'M',
      }
    })

    await supabase.from('pay_run_lines').insert(lines)
  }

  redirect(`/portal/payroll/${data.id}`)
}

export async function completePayRun(payRunId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('pay_runs')
    .update({ status: 'completed' })
    .eq('id', payRunId)

  if (error) return { error: error.message }

  // Generate payslip records for each line
  const { data: lines } = await supabase
    .from('pay_run_lines')
    .select('id, contractor_id')
    .eq('pay_run_id', payRunId)

  if (lines?.length) {
    const payslips = lines.map((l) => ({
      pay_run_line_id: l.id,
      contractor_id: l.contractor_id,
      pay_run_id: payRunId,
    }))
    await supabase.from('payslips').upsert(payslips, { onConflict: 'pay_run_line_id' })
  }

  revalidatePath(`/portal/payroll/${payRunId}`)
  revalidatePath('/portal/payroll')
  return { success: true }
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtNZD(d: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function sendPayslip(payslipId: string) {
  const supabase = createClient()

  const { data: payslip } = await supabase
    .from('payslips')
    .select('id, pay_run_line_id, contractor_id, pay_run_id')
    .eq('id', payslipId)
    .single()

  if (!payslip) return { error: 'Payslip not found.' }

  const [{ data: line }, { data: employee }, { data: run }] = await Promise.all([
    supabase.from('pay_run_lines').select('*').eq('id', payslip.pay_run_line_id).single(),
    supabase.from('contractors').select('full_name, email').eq('id', payslip.contractor_id).single(),
    supabase.from('pay_runs').select('pay_period_start, pay_period_end, pay_date').eq('id', payslip.pay_run_id).single(),
  ])

  if (!line || !employee || !run) return { error: 'Missing data.' }
  if (!employee.email) return { error: `${employee.full_name} has no email address.` }

  const firstName = employee.full_name.split(/\s+/)[0]

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:500px;margin:0 auto;color:#1a1a1a;">
      <h2 style="color:#076653;margin-bottom:4px;">Payslip</h2>
      <p style="color:#888;font-size:13px;margin-top:0;">Sano Property Services Limited</p>

      <p>Hi ${esc(firstName)},</p>
      <p>Here is your payslip for the period <strong>${fmtDate(run.pay_period_start)}</strong> to <strong>${fmtDate(run.pay_period_end)}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Pay date</td><td style="padding:8px 0;text-align:right;font-weight:600;">${fmtDate(run.pay_date)}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Hours worked</td><td style="padding:8px 0;text-align:right;">${line.hours_worked}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Hourly rate</td><td style="padding:8px 0;text-align:right;">${fmtNZD(line.hourly_rate)}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Gross pay</td><td style="padding:8px 0;text-align:right;font-weight:600;">${fmtNZD(line.gross_pay)}</td></tr>
        ${line.holiday_pay > 0 ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Holiday pay</td><td style="padding:8px 0;text-align:right;">${fmtNZD(line.holiday_pay)}</td></tr>` : ''}
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">PAYE (${esc(line.tax_code || 'M')})</td><td style="padding:8px 0;text-align:right;color:#c53030;">-${fmtNZD(line.paye)}</td></tr>
        ${line.student_loan > 0 ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Student loan</td><td style="padding:8px 0;text-align:right;color:#c53030;">-${fmtNZD(line.student_loan)}</td></tr>` : ''}
        ${line.kiwisaver_employee > 0 ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">KiwiSaver (employee)</td><td style="padding:8px 0;text-align:right;color:#c53030;">-${fmtNZD(line.kiwisaver_employee)}</td></tr>` : ''}
        <tr style="background:#e8f5e9;"><td style="padding:12px 8px;font-weight:700;font-size:16px;">Net pay</td><td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px;color:#076653;">${fmtNZD(line.net_pay)}</td></tr>
      </table>

      ${line.kiwisaver_employer > 0 ? `<p style="font-size:12px;color:#888;">Employer KiwiSaver contribution: ${fmtNZD(line.kiwisaver_employer)}</p>` : ''}
      <p style="font-size:12px;color:#888;margin-top:24px;">Sano Property Services Limited</p>
    </div>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailErr } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: employee.email,
      subject: `Payslip — ${fmtDate(run.pay_period_start)} to ${fmtDate(run.pay_period_end)}`,
      html,
    })
    if (emailErr) return { error: `Email failed: ${emailErr.message}` }
  } catch (err) {
    return { error: `Email error: ${err}` }
  }

  await supabase.from('payslips').update({ sent_at: new Date().toISOString() }).eq('id', payslipId)
  revalidatePath(`/portal/payroll/${payslip.pay_run_id}`)
  return { success: true }
}

export async function sendAllPayslips(payRunId: string) {
  const supabase = createClient()

  const { data: payslips } = await supabase
    .from('payslips')
    .select('id')
    .eq('pay_run_id', payRunId)
    .is('sent_at', null)

  let sent = 0
  let failed = 0

  for (const ps of payslips ?? []) {
    const result = await sendPayslip(ps.id)
    if (result?.success) sent++
    else failed++
  }

  revalidatePath(`/portal/payroll/${payRunId}`)
  return { sent, failed }
}
