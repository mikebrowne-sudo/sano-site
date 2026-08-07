'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { LeadStatus, QualityRank } from '@/lib/campaigns/constants'
import { LEAD_STATUS_LABELS } from '@/lib/campaigns/constants'

export interface LeadInput {
  company: string
  industry?: string
  website?: string
  staff_size?: string
  address?: string
  contact_name?: string
  contact_role?: string
  email?: string
  phone?: string
  linkedin_url?: string
  source?: string
  quality_rank: QualityRank
  notes?: string
  next_follow_up?: string
}

function leadRow(input: LeadInput) {
  return {
    company: input.company.trim(),
    industry: input.industry || null,
    website: input.website?.trim() || null,
    staff_size: input.staff_size?.trim() || null,
    address: input.address?.trim() || null,
    contact_name: input.contact_name?.trim() || null,
    contact_role: input.contact_role?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone?.trim() || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    source: input.source?.trim() || null,
    quality_rank: input.quality_rank,
    notes: input.notes || null,
    next_follow_up: input.next_follow_up || null,
  }
}

export async function createLeadAction(input: LeadInput) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sales_leads')
    .insert(leadRow(input))
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Failed to create lead: ${error?.message}` }
  }
  redirect(`/portal/leads/${data.id}`)
}

export async function updateLeadAction(id: string, input: LeadInput) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sales_leads')
    .update({ ...leadRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: `Failed to update lead: ${error.message}` }
  revalidatePath(`/portal/leads/${id}`)
  revalidatePath('/portal/leads')
  return { success: true }
}

export async function setLeadStatusAction(id: string, status: LeadStatus) {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'do_not_contact') patch.unsubscribed_at = new Date().toISOString()

  const { error } = await supabase.from('sales_leads').update(patch).eq('id', id)
  if (error) return { error: `Failed to update status: ${error.message}` }

  await supabase.from('sales_lead_activities').insert({
    lead_id: id,
    kind: 'status_change',
    body: `Status set to ${LEAD_STATUS_LABELS[status]}`,
  })

  revalidatePath(`/portal/leads/${id}`)
  revalidatePath('/portal/leads')
  return { success: true }
}

export async function addLeadNoteAction(id: string, kind: 'note' | 'call' | 'email', body: string) {
  if (!body.trim()) return { error: 'Note is empty.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('sales_lead_activities')
    .insert({ lead_id: id, kind, body: body.trim() })
  if (error) return { error: `Failed to add note: ${error.message}` }
  revalidatePath(`/portal/leads/${id}`)
  return { success: true }
}

/**
 * One-box "log feedback / next step" — write a note, status, follow-up date and
 * renewal date in a single save. Only the fields provided are changed. Writes to
 * the ONE sales_leads row, so it reflects everywhere (leads list, campaign
 * recipient view, Alerts). Usable from both the lead page and the campaign page.
 */
export async function quickLogAction(input: {
  leadId: string
  note?: string
  status?: string
  followUp?: string | null
  renewalDate?: string | null
  fromCampaignId?: string // to revalidate the campaign page too
}) {
  const supabase = createClient()
  const nowIso = new Date().toISOString()

  const patch: Record<string, unknown> = { updated_at: nowIso }
  if (input.status) patch.status = input.status
  if (input.followUp !== undefined) patch.next_follow_up = input.followUp || null
  if (input.renewalDate !== undefined) patch.renewal_date = input.renewalDate || null

  if (Object.keys(patch).length > 1) {
    const { error } = await supabase.from('sales_leads').update(patch).eq('id', input.leadId)
    if (error) return { error: `Failed to save: ${error.message}` }
  }

  const note = (input.note ?? '').trim()
  if (note) {
    await supabase.from('sales_lead_activities').insert({ lead_id: input.leadId, kind: 'note', body: note })
  }
  if (input.status) {
    await supabase.from('sales_lead_activities').insert({ lead_id: input.leadId, kind: 'status_change', body: `Status → ${input.status}` })
  }
  if (input.followUp) {
    await supabase.from('sales_lead_activities').insert({ lead_id: input.leadId, kind: 'follow_up', body: `Follow-up set for ${input.followUp}` })
  }

  revalidatePath(`/portal/leads/${input.leadId}`)
  revalidatePath('/portal/leads')
  revalidatePath('/portal/alerts')
  if (input.fromCampaignId) revalidatePath(`/portal/campaigns/${input.fromCampaignId}`)
  return { success: true }
}

export async function setFollowUpAction(id: string, date: string | null) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sales_leads')
    .update({ next_follow_up: date, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: `Failed to set follow-up: ${error.message}` }

  if (date) {
    await supabase.from('sales_lead_activities').insert({
      lead_id: id,
      kind: 'follow_up',
      body: `Follow-up set for ${date}`,
    })
  }
  revalidatePath(`/portal/leads/${id}`)
  revalidatePath('/portal/leads')
  return { success: true }
}
