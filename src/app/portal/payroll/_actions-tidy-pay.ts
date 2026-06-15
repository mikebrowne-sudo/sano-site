'use server'

// Tidy-up actions for the Pay contractors screen.
//
// excludeFromPay — write off a job's contractor pay (e.g. an old test /
// duplicate that can't be priced). It moves to pay_status='excluded' and
// drops out of every pay list. reincludeToPay undoes it.

import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export async function excludeFromPay(jobId: string, contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  const { error } = await supabase
    .from('job_workers')
    .update({ pay_status: 'excluded' })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .in('pay_status', ['pending', 'approved'])
  if (error) return { error: `Failed to exclude: ${error.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job_worker.pay_excluded',
    entity_table: 'job_workers',
    entity_id: `${jobId}:${contractorId}`,
    before: null,
    after: { pay_status: 'excluded' },
  })

  revalidatePath('/portal/payroll/contractors')
  return { ok: true as const }
}

export async function reincludeToPay(jobId: string, contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  const { error } = await supabase
    .from('job_workers')
    .update({ pay_status: 'pending' })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .eq('pay_status', 'excluded')
  if (error) return { error: `Failed to re-include: ${error.message}` }

  revalidatePath('/portal/payroll/contractors')
  return { ok: true as const }
}
