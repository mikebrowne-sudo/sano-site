'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function regenerateShareToken(table: 'quotes' | 'invoices', id: string) {
  const supabase = createClient()

  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from(table)
    .update({ share_token: newToken })
    .eq('id', id)

  if (error) {
    return { error: `Failed to regenerate link: ${error.message}` }
  }

  const path = table === 'quotes' ? `/portal/quotes/${id}` : `/portal/invoices/${id}`
  revalidatePath(path)
  return { success: true }
}
