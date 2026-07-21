'use server'

// Staff statement actions: confirm-on-behalf (after the review deadline) and
// extend the review deadline. Confirm-on-behalf delegates to the atomic RPC;
// deadline extension is an optimistic-locked staff update with an audit row.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

function revalidate(id: string) {
  revalidatePath('/portal/contractor-statements')
  revalidatePath(`/portal/contractor-statements/${id}`)
}

export async function confirmStatementOnBehalf(input: {
  id: string
  reason: string
  email_override?: boolean
}): Promise<{ ok?: true; error?: string; statement_number?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }
  const reason = (input.reason ?? '').trim()
  if (!reason) return { error: 'A reason is required to confirm on the contractor’s behalf.' }

  const { data, error } = await supabase.rpc('confirm_statement_on_behalf', {
    p_statement_id: input.id,
    p_reason: reason,
    p_email_override: !!input.email_override,
  })
  if (error) return { error: error.message }
  revalidate(input.id)
  return { ok: true, statement_number: (data as { statement_number?: string } | null)?.statement_number }
}

export async function extendReviewDeadline(input: {
  id: string
  review_due_at: string
  reason: string
}): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }
  const reason = (input.reason ?? '').trim()
  if (!reason) return { error: 'A reason is required to extend the deadline.' }
  const newDue = input.review_due_at
  if (!newDue || new Date(newDue).getTime() <= Date.now()) return { error: 'The new deadline must be in the future.' }

  const { data: st } = await supabase
    .from('contractor_statements')
    .select('id, status, review_due_at, statement_number')
    .eq('id', input.id)
    .maybeSingle()
  if (!st) return { error: 'Statement not found.' }
  if (st.status !== 'issued') return { error: `Only an issued statement’s deadline can be extended (current: ${st.status}).` }

  const { data: upd, error } = await supabase
    .from('contractor_statements')
    .update({ review_due_at: newDue, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('status', 'issued')
    .select('id')
  if (error) return { error: error.message }
  if (!upd || upd.length === 0) return { error: 'This statement was changed — reload and try again.' }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_statement.review_deadline_extended',
    entity_table: 'contractor_statements',
    entity_id: input.id,
    before: { review_due_at: (st.review_due_at as string | null) ?? null },
    after: { statement_number: st.statement_number, review_due_at: newDue, reason },
  })
  revalidate(input.id)
  return { ok: true }
}
