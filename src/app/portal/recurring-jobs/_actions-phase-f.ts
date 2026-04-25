'use server'

// Phase F — recurring contracts (commercial-aware) + reminders +
// renewal + multi-week generation.
//
// Sits alongside _actions.ts (which holds the legacy single-job
// generator). Keeping these separate makes Phase F's surface easy
// to find and easy to revert.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '@/lib/is-admin'
import { loadJobSettings } from '@/lib/job-settings'

// ─── Helpers ─────────────────────────────────────────────────────

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function reminderRowsForEnd(recurringJobId: string, endDate: string) {
  return [
    { recurring_job_id: recurringJobId, reminder_type: 'six_weeks',  due_date: addDaysIso(endDate, -42), status: 'pending' as const },
    { recurring_job_id: recurringJobId, reminder_type: 'four_weeks', due_date: addDaysIso(endDate, -28), status: 'pending' as const },
    { recurring_job_id: recurringJobId, reminder_type: 'two_weeks',  due_date: addDaysIso(endDate, -14), status: 'pending' as const },
  ]
}

// ─── Create from accepted quote ─────────────────────────────────

export async function createRecurringJobFromQuote(quoteId: string): Promise<{ error: string } | void> {
  const supabase = createClient()
  if (!quoteId) return { error: 'Quote id required.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // 1. Quote — must be accepted + latest version.
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select(`
      id, status, client_id, service_address, notes, generated_scope,
      service_category, frequency, scope_size,
      scheduled_clean_date, estimated_hours, base_price,
      quote_number, version_number, is_latest_version
    `)
    .eq('id', quoteId)
    .single()
  if (qErr || !quote) return { error: `Quote not found: ${qErr?.message ?? 'missing'}` }
  if (quote.status !== 'accepted') return { error: 'Only accepted quotes can become a recurring contract.' }
  if (!quote.is_latest_version)   return { error: 'Only the latest version can be converted.' }

  // 2. Pull commercial details + scope (where present) so the
  // scope_snapshot matches what we already store on Phase C jobs.
  const [
    { data: residentialItems },
    { data: commercialScope },
    { data: commercialDetails },
  ] = await Promise.all([
    supabase.from('quote_items')
      .select('label, price, sort_order')
      .eq('quote_id', quoteId)
      .order('sort_order'),
    supabase.from('commercial_scope_items')
      .select('area_type, task_name, frequency_label, task_group, display_order, included')
      .eq('quote_id', quoteId)
      .order('display_order'),
    supabase.from('commercial_quote_details')
      .select('service_days, service_window, contract_term, notice_period_days, sector_category')
      .eq('quote_id', quoteId)
      .maybeSingle(),
  ])

  const scopeSnapshot = {
    source_quote_id: quote.id,
    source_quote_number: quote.quote_number,
    source_version_number: quote.version_number,
    service_category: quote.service_category,
    frequency: quote.frequency,
    scope_size: quote.scope_size,
    estimated_hours: quote.estimated_hours,
    generated_scope: quote.generated_scope,
    residential_items: residentialItems ?? [],
    commercial_scope: (commercialScope ?? []).filter((r) => r.included !== false),
    created_at: new Date().toISOString(),
  }

  // 3. Contract term defaults — commercial pulls from the
  // commercial_quote_details row when present; residential falls
  // back to a 12-month / 30-day default (operator can edit later).
  const isCommercial = quote.service_category === 'commercial'
  const termMonths = (commercialDetails?.contract_term as number | null)
    ?? (isCommercial ? 12 : null)
  const noticeDays = (commercialDetails?.notice_period_days as number | null)
    ?? (isCommercial ? 30 : null)

  const startDate = quote.scheduled_clean_date ?? todayIso()
  const endDate = termMonths ? addMonthsIso(startDate, termMonths) : null

  const monthlyValue = quote.base_price ?? null

  const title = quote.quote_number
    ? `${isCommercial ? 'Commercial contract' : 'Recurring service'} — ${quote.quote_number}`
    : (isCommercial ? 'Commercial contract' : 'Recurring service')

  // 4. Insert recurring_jobs row.
  const { data: created, error: cErr } = await supabase
    .from('recurring_jobs')
    .insert({
      client_id: quote.client_id,
      quote_id: quote.id,
      title,
      description: quote.generated_scope?.trim() || quote.notes || null,
      address: quote.service_address ?? null,
      service_category: quote.service_category ?? null,
      frequency: quote.frequency ?? 'weekly',
      service_days: commercialDetails?.service_days ?? null,
      service_window: commercialDetails?.service_window ?? null,
      start_date: startDate,
      end_date: endDate,
      contract_term_months: termMonths,
      notice_period_days: noticeDays,
      monthly_value: monthlyValue,
      scope_snapshot: scopeSnapshot,
      status: 'active',
      renewal_status: 'not_started',
      next_due_date: startDate,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (cErr || !created) {
    return { error: `Failed to create recurring contract: ${cErr?.message ?? 'insert returned no row'}` }
  }

  // 5. Reminders — only when end_date is set (so commercial
  // contracts get reminders, ad-hoc residential ones don't).
  if (endDate) {
    await supabase
      .from('recurring_contract_reminders')
      .insert(reminderRowsForEnd(created.id, endDate))
  }

  // 6. Mark quote converted (mirrors createJobFromQuote /
  // convertToInvoice). Audit log.
  const { data: priorQuote } = await supabase
    .from('quotes')
    .select('status, accepted_at')
    .eq('id', quoteId)
    .single()
  await supabase.from('quotes').update({ status: 'converted' }).eq('id', quoteId)

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'quote.converted_to_recurring_contract',
    entity_table: 'quotes',
    entity_id: quoteId,
    before: { status: priorQuote?.status ?? null },
    after: {
      status: 'converted',
      accepted_at_preserved: priorQuote?.accepted_at ?? null,
      recurring_job_id: created.id,
      end_date: endDate,
    },
  })

  redirect(`/portal/recurring-jobs/${created.id}`)
}

// ─── Generate upcoming jobs (1 / 2 / 4 weeks) ───────────────────

export async function generateUpcomingRecurringJobs(input: {
  recurringJobId: string
  weeks: number  // 1 | 2 | 4 | (custom)
}): Promise<{ ok: true; createdCount: number; skippedCount: number } | { error: string }> {
  const supabase = createClient()
  const { recurringJobId, weeks } = input
  if (!recurringJobId) return { error: 'Recurring job id is required.' }
  if (!Number.isFinite(weeks) || weeks <= 0) return { error: 'Weeks must be > 0.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: rec, error: readErr } = await supabase
    .from('recurring_jobs')
    .select('id, client_id, title, description, address, scheduled_time, duration_estimate, contractor_id, assigned_to, frequency, start_date, end_date, next_due_date, status, scope_snapshot')
    .eq('id', recurringJobId)
    .single()
  if (readErr || !rec) return { error: 'Recurring contract not found.' }
  if (rec.status !== 'active') return { error: `Cannot generate jobs while contract is ${rec.status}.` }

  const settings = await loadJobSettings(supabase)
  const horizon = addDaysIso(todayIso(), weeks * 7)
  const stopAt = rec.end_date && rec.end_date < horizon ? rec.end_date : horizon

  // Walk the schedule. Start at the next_due_date (or start_date if
  // null) and step by frequency until we pass stopAt.
  const stepDays = rec.frequency === 'weekly' ? 7
                 : rec.frequency === 'fortnightly' ? 14
                 : null
  const stepMonths = rec.frequency === 'monthly' ? 1 : null
  if (!stepDays && !stepMonths) {
    return { error: `Unsupported frequency for generation: ${rec.frequency}` }
  }

  const candidates: string[] = []
  let cursor = rec.next_due_date ?? rec.start_date
  while (cursor && cursor <= stopAt) {
    candidates.push(cursor)
    cursor = stepDays
      ? addDaysIso(cursor, stepDays)
      : addMonthsIso(cursor, stepMonths!)
  }
  if (candidates.length === 0) {
    return { ok: true as const, createdCount: 0, skippedCount: 0 }
  }

  // Skip dates already generated (duplicate prevention by
  // (recurring_job_id, scheduled_date)).
  const { data: existing } = await supabase
    .from('jobs')
    .select('scheduled_date')
    .eq('recurring_job_id', recurringJobId)
    .in('scheduled_date', candidates)
  const existingSet = new Set((existing ?? []).map((r) => r.scheduled_date as string))

  const newDates = candidates.filter((d) => !existingSet.has(d))
  let lastGenerated = rec.next_due_date as string | null

  for (const date of newDates) {
    const { error: jErr } = await supabase
      .from('jobs')
      .insert({
        client_id: rec.client_id,
        recurring_job_id: recurringJobId,
        title: rec.title || null,
        description: rec.description || null,
        address: rec.address || null,
        scheduled_date: date,
        scheduled_time: rec.scheduled_time || null,
        duration_estimate: rec.duration_estimate || null,
        contractor_id: rec.contractor_id || null,
        assigned_to: rec.assigned_to || null,
        status: rec.contractor_id ? 'assigned' : 'draft',
        payment_status: settings.default_payment_status,
        scope_snapshot: rec.scope_snapshot ?? null,
      })
    if (jErr) {
      // Don't fail the whole batch on a single insert error — log
      // it via audit and keep going.
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'staff',
        action: 'recurring_job.generation_error',
        entity_table: 'recurring_jobs',
        entity_id: recurringJobId,
        before: null,
        after: { date, error: jErr.message },
      })
      continue
    }
    lastGenerated = date
  }

  // Advance next_due_date past the last generated date.
  if (lastGenerated) {
    const advance = stepDays
      ? addDaysIso(lastGenerated, stepDays)
      : addMonthsIso(lastGenerated, stepMonths!)
    await supabase
      .from('recurring_jobs')
      .update({ last_generated_date: lastGenerated, next_due_date: advance, updated_at: new Date().toISOString() })
      .eq('id', recurringJobId)
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'recurring_job.jobs_generated',
    entity_table: 'recurring_jobs',
    entity_id: recurringJobId,
    before: null,
    after: {
      window_weeks: weeks,
      candidates: candidates.length,
      created: newDates.length,
      skipped_existing: candidates.length - newDates.length,
    },
  })

  revalidatePath('/portal/recurring-jobs')
  revalidatePath(`/portal/recurring-jobs/${recurringJobId}`)
  return { ok: true as const, createdCount: newDates.length, skippedCount: candidates.length - newDates.length }
}

// ─── Mark reminder complete / dismissed ─────────────────────────

export async function updateRecurringReminder(input: {
  reminderId: string
  status: 'completed' | 'dismissed'
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!input.reminderId) return { error: 'Reminder id required.' }
  if (input.status !== 'completed' && input.status !== 'dismissed') {
    return { error: 'Status must be completed or dismissed.' }
  }

  const { data: prior } = await supabase
    .from('recurring_contract_reminders')
    .select('id, status, recurring_job_id')
    .eq('id', input.reminderId)
    .single()
  if (!prior) return { error: 'Reminder not found.' }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('recurring_contract_reminders')
    .update({
      status: input.status,
      completed_at: now,
      completed_by: user.id,
    })
    .eq('id', input.reminderId)
  if (updErr) return { error: `Failed to update reminder: ${updErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: `recurring_contract_reminder.${input.status}`,
    entity_table: 'recurring_contract_reminders',
    entity_id: input.reminderId,
    before: { status: prior.status },
    after: { status: input.status, completed_at: now },
  })

  revalidatePath(`/portal/recurring-jobs/${prior.recurring_job_id}`)
  return { ok: true as const }
}

// ─── Renew / extend contract ────────────────────────────────────

export async function extendRecurringContract(input: {
  recurringJobId: string
  newEndDate: string  // YYYY-MM-DD
  newTermMonths?: number | null
  notes?: string | null
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  const { recurringJobId, newEndDate, newTermMonths, notes } = input
  if (!recurringJobId || !newEndDate) {
    return { error: 'Recurring job id and new end date are required.' }
  }

  const { data: rec, error: readErr } = await supabase
    .from('recurring_jobs')
    .select('id, end_date, contract_term_months, renewal_status, renewal_notes')
    .eq('id', recurringJobId)
    .single()
  if (readErr || !rec) return { error: 'Recurring contract not found.' }

  if (rec.end_date && newEndDate <= rec.end_date) {
    return { error: 'New end date must be after the current end date.' }
  }

  const noteCombined = [rec.renewal_notes, notes].filter(Boolean).join('\n').trim() || null

  const { error: updErr } = await supabase
    .from('recurring_jobs')
    .update({
      end_date: newEndDate,
      contract_term_months: newTermMonths ?? rec.contract_term_months,
      renewal_status: 'renewed',
      renewal_notes: noteCombined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recurringJobId)
  if (updErr) return { error: `Failed to extend contract: ${updErr.message}` }

  // Replace pending reminders with a fresh set tied to the new
  // end_date. Completed / dismissed reminders are kept so the
  // history is intact.
  await supabase
    .from('recurring_contract_reminders')
    .delete()
    .eq('recurring_job_id', recurringJobId)
    .eq('status', 'pending')
  await supabase
    .from('recurring_contract_reminders')
    .insert(reminderRowsForEnd(recurringJobId, newEndDate))

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'recurring_contract.renewed',
    entity_table: 'recurring_jobs',
    entity_id: recurringJobId,
    before: {
      end_date: rec.end_date,
      contract_term_months: rec.contract_term_months,
      renewal_status: rec.renewal_status,
    },
    after: {
      end_date: newEndDate,
      contract_term_months: newTermMonths ?? rec.contract_term_months,
      renewal_status: 'renewed',
    },
  })

  revalidatePath('/portal/recurring-jobs')
  revalidatePath(`/portal/recurring-jobs/${recurringJobId}`)
  return { ok: true as const }
}
