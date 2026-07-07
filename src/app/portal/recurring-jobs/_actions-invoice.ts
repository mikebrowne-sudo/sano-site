'use server'

// Manual "Generate invoice now" for a recurring contract (admin). Core logic
// lives in _lib/generate-recurring-invoice (shared with the daily cron).

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { generateFor, REC_COLS, type RecurringRow, type RecurringInvoiceResult } from './_lib/generate-recurring-invoice'

export async function generateRecurringInvoice(recurringId: string): Promise<RecurringInvoiceResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: rec } = await supabase.from('recurring_jobs').select(REC_COLS).eq('id', recurringId).maybeSingle()
  if (!rec) return { error: 'Recurring contract not found.' }

  const res = await generateFor(supabase, rec as RecurringRow)
  revalidatePath(`/portal/recurring-jobs/${recurringId}`)
  revalidatePath('/portal/invoices')
  return res
}
