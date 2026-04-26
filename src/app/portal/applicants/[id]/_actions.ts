'use server'

// Phase 5 — Server actions for applicant detail page.
// Status update + staff notes save. Admin-only writes per RLS.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const VALID_STATUSES = [
  'new', 'reviewing', 'interview', 'approved', 'rejected', 'converted_to_contractor',
] as const

type ApplicantStatus = typeof VALID_STATUSES[number]

export async function updateApplicantStatus(input: {
  applicantId: string
  status: ApplicantStatus
}): Promise<{ ok: true } | { error: string }> {
  if (!VALID_STATUSES.includes(input.status)) {
    return { error: 'Invalid status.' }
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('applicants')
    .update({
      status: input.status,
      status_updated_at: new Date().toISOString(),
      status_updated_by: user.id,
    })
    .eq('id', input.applicantId)

  if (error) return { error: error.message }

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function updateApplicantNotes(input: {
  applicantId: string
  notes: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('applicants')
    .update({ staff_notes: input.notes || null })
    .eq('id', input.applicantId)

  if (error) return { error: error.message }

  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}
