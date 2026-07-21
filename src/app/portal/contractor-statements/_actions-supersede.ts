'use server'

// Supersede an issued contractor statement. The state change is ATOMIC: a
// single SECURITY DEFINER RPC (supersede_contractor_statement) verifies the
// statement is issued, stamps the supersede fields, preserves issued_snapshot,
// releases the linked CIs and writes the audit row in one transaction. If any
// step fails, none persist. A fresh replacement draft is created separately via
// the generate action (which then back-fills replacement_statement_id).

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export interface SupersedeResult {
  error?: string
  ok?: boolean
  statement_number?: string
  released_ci_ids?: string[]
}

export async function supersedeContractorStatement(input: { id: string; reason: string }): Promise<SupersedeResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }
  const reason = (input.reason ?? '').trim()
  if (!reason) return { error: 'A reason is required to supersede a statement.' }

  const { data, error } = await supabase.rpc('supersede_contractor_statement', {
    p_statement_id: input.id,
    p_reason: reason,
  })
  if (error) return { error: error.message }

  revalidatePath('/portal/contractor-statements')
  revalidatePath(`/portal/contractor-statements/${input.id}`)
  const result = (data ?? {}) as { statement_number?: string; released_ci_ids?: string[] }
  return { ok: true, statement_number: result.statement_number, released_ci_ids: result.released_ci_ids ?? [] }
}
