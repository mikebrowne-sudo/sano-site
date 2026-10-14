'use server'

// Monthly invoice from completed jobs — admin page action.
//
// One invoice per client per month covering the visits actually completed
// (e.g. Oranga Tamariki: 2 × 7-hour visits a week, billed monthly in arrears).
// The DB work lives in src/lib/monthly-invoice-create.ts so the recurring
// cron ('completed_visits' billing) creates identical invoices.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createMonthlyInvoiceCore } from '@/lib/monthly-invoice-create'
import { periodLabel, visitDate } from '@/lib/monthly-invoice'

export interface CreateMonthlyInvoiceInput {
  clientId: string
  /** 'YYYY-MM', or 'all' for every selected unbilled visit (catch-up invoice). */
  month: string
  jobIds: string[]
  /** Ex-GST price for any selected visit that has no job_price. */
  ratePerVisit: number | null
  /** Invoice heading, e.g. "Residential Housekeeping". */
  serviceLabel: string | null
  /** Printed in the invoice's Notes box. */
  notes?: string | null
  /** Prices already include GST. */
  gstIncluded?: boolean
}

export async function createMonthlyInvoice(
  input: CreateMonthlyInvoiceInput,
): Promise<{ error: string } | never> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  // Catch-up invoice: the period runs from the first to the last selected
  // visit, so visits across several months land on one invoice.
  let period: { start: string; end: string; label: string } | undefined
  if (input.month === 'all') {
    const { data: rows } = await supabase.from('jobs').select('scheduled_date, completed_at').in('id', input.jobIds)
    const dates = ((rows ?? []) as Array<{ scheduled_date: string | null; completed_at: string | null }>)
      .map((r) => visitDate(r)).filter((d): d is string => !!d).sort()
    if (dates.length === 0) return { error: 'Select at least one completed visit.' }
    period = { start: dates[0], end: dates[dates.length - 1], label: periodLabel(dates[0], dates[dates.length - 1]) }
  }

  const res = await createMonthlyInvoiceCore(supabase, {
    ...input,
    month: input.month === 'all' ? undefined : input.month,
    period,
    actor: { id: user!.id, email: user!.email ?? null, role: 'admin' },
  })
  if ('error' in res) return { error: res.error }

  revalidatePath('/portal/invoices')
  revalidatePath('/portal/jobs')
  redirect(`/portal/invoices/${res.invoiceId}`)
}
