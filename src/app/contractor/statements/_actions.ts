'use server'

// Contractor confirms their own issued statement. Delegates to the
// SECURITY DEFINER RPC (ownership + eligibility + confirmed_source set
// server-side). No contractor UPDATE access to the table.

import { getContractor } from '../_lib/get-contractor'
import { revalidatePath } from 'next/cache'

export async function confirmMyStatement(id: string): Promise<{ ok?: true; error?: string }> {
  const { supabase } = await getContractor() // redirects if not an authed contractor
  const { error } = await supabase.rpc('confirm_statement_as_contractor', { p_statement_id: id })
  if (error) return { error: error.message }
  revalidatePath(`/contractor/statements/${id}`)
  revalidatePath('/contractor/statements')
  return { ok: true }
}
