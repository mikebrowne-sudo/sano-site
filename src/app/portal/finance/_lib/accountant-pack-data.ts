// Supabase reads for the accountant pack. Server-only.
//
// Callers MUST check isFinanceUser before calling, and pass the service-role
// client: some finance tables (remittance_payment_allocations) are admin-only
// under RLS, and an accountant login would otherwise get a silently partial
// pack (e.g. every remittance looking "not matched to the bank"). Every query
// here is a SELECT.
//
// Whole-table loads are deliberate: receivables need every open invoice,
// duplicate matching needs neighbouring rows, and volumes are small.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AccountantPackRaw } from './accountant-pack'

type Rec = Record<string, unknown>
const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? ((v[0] ?? null) as T | null) : ((v ?? null) as T | null))

export async function loadAccountantPackRaw(db: SupabaseClient): Promise<AccountantPackRaw> {
  const [inv, exp, items, alloc, lines, runs, bank, mileage, payables] = await Promise.all([
    db.from('invoices')
      .select('invoice_number, status, base_price, discount, gst_included, date_issued, due_date, date_paid, stripe_payment_intent_id, bill_to_name, clients ( name, company_name ), invoice_items ( price )')
      .is('deleted_at', null)
      .not('is_test', 'is', true),
    db.from('expenses')
      .select('expense_date, amount, category, vendor, description, payment_reference, gst_inclusive, receipt_path'),
    db.from('contractor_remittance_items')
      .select('remittance_id, contractor_name, job_number, label, amount, wht_amount, contractor_remittances ( remittance_number, payment_date, reference ), contractor_invoices ( gst_status, gst_amount, amount ), contractors ( gst_number )'),
    db.from('remittance_payment_allocations')
      .select('remittance_id, amount_allocated')
      .is('reversed_at', null),
    db.from('pay_run_lines')
      .select('pay_run_id, hours_worked, gross_pay, holiday_pay, paye, student_loan, kiwisaver_employee, kiwisaver_employer, esct, net_pay, mileage_reimbursement, contractors ( full_name ), pay_runs ( kind, status, pay_date, pay_period_start, pay_period_end, payday_filing_status )'),
    db.from('pay_runs')
      .select('id, status, pay_date, pay_period_end')
      .eq('kind', 'employee')
      .in('status', ['draft', 'approved']),
    db.from('bank_transactions')
      .select('id, txn_date, account, tran_type, payee, memo, amount, direction, cleared'),
    db.from('mileage_logs')
      .select('log_date, person_label, business_purpose, distance_km, rate_per_km, reimbursement_amount, status'),
    db.from('contractor_invoices')
      .select('invoice_number, amount, gst_amount, gst_status, date_submitted, service_date, contractors ( full_name )')
      .eq('status', 'approved'),
  ])

  const failed = [inv, exp, items, alloc, lines, runs, bank, mileage, payables].find((r) => r.error)
  if (failed?.error) throw new Error(`Accountant pack load failed: ${failed.error.message}`)

  const remittanceAllocated: Record<string, number> = {}
  for (const a of (alloc.data ?? []) as Rec[]) {
    const id = a.remittance_id as string
    remittanceAllocated[id] = (remittanceAllocated[id] ?? 0) + Number(a.amount_allocated ?? 0)
  }

  const bankRows = (bank.data ?? []) as Rec[]
  const bankLatestDate = bankRows.reduce<string | null>((max, b) => {
    const d = (b.txn_date as string | null) ?? null
    return d && (!max || d > max) ? d : max
  }, null)

  return {
    invoices: ((inv.data ?? []) as Rec[]).map((i) => {
      const c = one<{ name: string | null; company_name: string | null }>(i.clients)
      return {
        invoice_number: (i.invoice_number as string | null) ?? null,
        status: (i.status as string | null) ?? null,
        base_price: (i.base_price as number | null) ?? null,
        discount: (i.discount as number | null) ?? null,
        gst_included: (i.gst_included as boolean | null) ?? null,
        date_issued: (i.date_issued as string | null) ?? null,
        due_date: (i.due_date as string | null) ?? null,
        date_paid: (i.date_paid as string | null) ?? null,
        stripe_payment_intent_id: (i.stripe_payment_intent_id as string | null) ?? null,
        client_name: (i.bill_to_name as string | null) || c?.company_name || c?.name || '',
        invoice_items: (i.invoice_items as Array<{ price: number | null }> | null) ?? [],
      }
    }),
    expenses: ((exp.data ?? []) as Rec[]).map((e) => ({
      expense_date: (e.expense_date as string | null) ?? null,
      amount: (e.amount as number | null) ?? null,
      category: (e.category as string | null) ?? null,
      vendor: (e.vendor as string | null) ?? null,
      description: (e.description as string | null) ?? null,
      payment_reference: (e.payment_reference as string | null) ?? null,
      gst_inclusive: (e.gst_inclusive as boolean | null) ?? null,
      receipt_path: (e.receipt_path as string | null) ?? null,
    })),
    remittanceItems: ((items.data ?? []) as Rec[])
      .map((it) => {
        const rem = one<{ remittance_number: string | null; payment_date: string | null; reference: string | null }>(it.contractor_remittances)
        const ci = one<{ gst_status: string | null; gst_amount: number | null; amount: number | null }>(it.contractor_invoices)
        const con = one<{ gst_number: string | null }>(it.contractors)
        return {
          remittance_id: it.remittance_id as string,
          remittance_number: rem?.remittance_number ?? null,
          payment_date: rem?.payment_date ?? null,
          reference: rem?.reference ?? null,
          contractor_name: (it.contractor_name as string | null) ?? null,
          contractor_gst_number: con?.gst_number ?? null,
          job_number: (it.job_number as string | null) ?? null,
          label: (it.label as string | null) ?? null,
          amount: (it.amount as number | null) ?? null,
          wht_amount: (it.wht_amount as number | null) ?? null,
          ci_gst_status: ci?.gst_status ?? null,
          ci_gst_amount: ci?.gst_amount ?? null,
          ci_amount: ci?.amount ?? null,
        }
      })
      .filter((it) => !!it.payment_date),
    remittanceAllocated,
    payLines: ((lines.data ?? []) as Rec[])
      .map((l) => ({ l, run: one<Rec>(l.pay_runs), who: one<{ full_name: string | null }>(l.contractors) }))
      .filter(({ run }) => run?.kind === 'employee')
      .map(({ l, run, who }) => ({
        pay_run_id: l.pay_run_id as string,
        pay_date: (run?.pay_date as string | null) ?? null,
        period_start: (run?.pay_period_start as string | null) ?? null,
        period_end: (run?.pay_period_end as string | null) ?? null,
        run_status: (run?.status as string | null) ?? null,
        payday_filing_status: (run?.payday_filing_status as string | null) ?? null,
        employee: who?.full_name ?? null,
        hours_worked: (l.hours_worked as number | null) ?? null,
        gross_pay: (l.gross_pay as number | null) ?? null,
        holiday_pay: (l.holiday_pay as number | null) ?? null,
        paye: (l.paye as number | null) ?? null,
        student_loan: (l.student_loan as number | null) ?? null,
        kiwisaver_employee: (l.kiwisaver_employee as number | null) ?? null,
        kiwisaver_employer: (l.kiwisaver_employer as number | null) ?? null,
        esct: (l.esct as number | null) ?? null,
        net_pay: (l.net_pay as number | null) ?? null,
        mileage_reimbursement: (l.mileage_reimbursement as number | null) ?? null,
      })),
    unpaidPayRuns: ((runs.data ?? []) as Rec[]).map((r) => ({
      id: r.id as string,
      status: (r.status as string | null) ?? null,
      pay_date: (r.pay_date as string | null) ?? null,
      period_end: (r.pay_period_end as string | null) ?? null,
    })),
    bank: bankRows.map((b) => ({
      id: b.id as string,
      txn_date: (b.txn_date as string | null) ?? null,
      account: (b.account as string | null) ?? null,
      tran_type: (b.tran_type as string | null) ?? null,
      payee: (b.payee as string | null) ?? null,
      memo: (b.memo as string | null) ?? null,
      amount: (b.amount as number | null) ?? null,
      direction: (b.direction as string | null) ?? null,
      cleared: (b.cleared as boolean | null) ?? null,
    })),
    bankLatestDate,
    mileage: ((mileage.data ?? []) as Rec[]).map((m) => ({
      log_date: (m.log_date as string | null) ?? null,
      person_label: (m.person_label as string | null) ?? null,
      business_purpose: (m.business_purpose as string | null) ?? null,
      distance_km: (m.distance_km as number | null) ?? null,
      rate_per_km: (m.rate_per_km as number | null) ?? null,
      reimbursement_amount: (m.reimbursement_amount as number | null) ?? null,
      status: (m.status as string | null) ?? null,
    })),
    contractorPayables: ((payables.data ?? []) as Rec[]).map((p) => ({
      invoice_number: (p.invoice_number as string | null) ?? null,
      contractor_name: one<{ full_name: string | null }>(p.contractors)?.full_name ?? null,
      amount: (p.amount as number | null) ?? null,
      gst_amount: (p.gst_amount as number | null) ?? null,
      gst_status: (p.gst_status as string | null) ?? null,
      date_submitted: (p.date_submitted as string | null) ?? null,
      service_date: (p.service_date as string | null) ?? null,
    })),
  }
}
