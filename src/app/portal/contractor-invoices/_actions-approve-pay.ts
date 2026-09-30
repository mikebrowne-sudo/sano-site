'use server'

// Stage A — shared contractor-pay approval. The single source of truth
// for turning a completed job + contractor into an APPROVED contractor
// payable (contractor_invoice), which then flows into the existing
// remittance batch builder. Both the future Pending-approvals worklist
// and the job-page panel will call this, so they can't create duplicates.
//
// Admin/staff only. Does NOT mark paid, create remittances, or send email.


import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { approveContractorPayCore } from '@/lib/approve-contractor-pay-core'
import type { ApproveContractorPayInput, ApproveContractorPayResult } from '@/lib/approve-contractor-pay-core'
import { revalidatePath } from 'next/cache'

export type { ApproveContractorPayInput, ApprovedPayable, ApproveContractorPayResult } from '@/lib/approve-contractor-pay-core'

export async function approveContractorPay(
  jobId: string,
  contractorId: string,
  input: ApproveContractorPayInput = {},
): Promise<ApproveContractorPayResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const res = await approveContractorPayCore(supabase, jobId, contractorId, input, { id: user.id, source: 'manual' })
  if (res.ok) {
    revalidatePath('/portal/contractor-invoices')
    revalidatePath(`/portal/jobs/${jobId}`)
  }
  return res
}
