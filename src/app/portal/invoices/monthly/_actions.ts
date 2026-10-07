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

export interface CreateMonthlyInvoiceInput {
  clientId: string
  /** 'YYYY-MM' */
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

  const res = await createMonthlyInvoiceCore(supabase, {
    ...input,
    actor: { id: user!.id, email: user!.email ?? null, role: 'admin' },
  })
  if ('error' in res) return { error: res.error }

  revalidatePath('/portal/invoices')
  revalidatePath('/portal/jobs')
  redirect(`/portal/invoices/${res.invoiceId}`)
}
