'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'michael@sano.nz'

export async function deleteQuote(quoteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'You do not have permission to delete quotes.' }
  }

  // Delete quote items first (cascade handles this, but be explicit)
  await supabase.from('quote_items').delete().eq('quote_id', quoteId)

  const { error } = await supabase.from('quotes').delete().eq('id', quoteId)

  if (error) {
    return { error: `Failed to delete quote: ${error.message}` }
  }

  redirect('/portal/quotes')
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'You do not have permission to delete invoices.' }
  }

  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)

  if (error) {
    return { error: `Failed to delete invoice: ${error.message}` }
  }

  redirect('/portal/invoices')
}
