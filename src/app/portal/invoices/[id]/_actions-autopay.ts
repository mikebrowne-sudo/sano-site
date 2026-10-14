'use server'

// "Collect by direct debit" on an invoice — for one sent before the customer
// set up automatic payments, or to retry after a failed debit. The same
// collector runs automatically whenever an invoice is sent.

import { revalidatePath } from 'next/cache'
import { assertAdminAction } from '@/lib/require-admin'
import { getServiceSupabase } from '@/lib/supabase-service'
import { collectInvoiceByAutopay } from '@/lib/autopay'

export async function collectInvoiceByDirectDebit(invoiceId: string): Promise<{ ok: true } | { error: string }> {
  await assertAdminAction()
  const res = await collectInvoiceByAutopay(getServiceSupabase(), invoiceId)
  revalidatePath(`/portal/invoices/${invoiceId}`)
  if (res.started) return { ok: true }
  return { error: res.error ?? `Not collected: ${res.reason ?? 'unknown reason'}.` }
}
