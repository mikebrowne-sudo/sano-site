'use server'

// Phase C — create a job from an accepted quote.
//
// Siblings to _actions-invoice.ts. This path is for the "no invoice
// yet" route — typical for account clients or commercial work where
// invoicing happens after the job is done.
//
// Side effects per call:
//   1. Read the accepted quote + items (residential) + commercial
//      scope items.
//   2. Insert a fresh `jobs` row, mirroring the quote's client,
//      address, schedule, hours, and description. Snapshot the
//      scope into jobs.scope_snapshot jsonb (requires the
//      migration at docs/db/2026-04-25-job-scope-snapshot.sql).
//   3. Mark the quote as `converted` (mirrors the invoice path) so
//      the workflow bar advances and edit-in-place is locked.
//   4. Audit-log the transition.
//   5. Redirect to /portal/jobs/[id].
//
// Not handled here (deferred phases):
//   - Modal confirmation before creating the job.
//   - Contractor assignment — jobs are inserted unassigned.
//   - Email / SMS notifications.
//   - Deleting or editing the snapshot later.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

type ResidentialItemRow = {
  label: string | null
  price: number | null
  sort_order: number | null
}

type CommercialScopeRow = {
  area_type: string | null
  task_name: string | null
  frequency_label: string | null
  task_group: string | null
  display_order: number | null
  included: boolean | null
}

export async function createJobFromQuote(quoteId: string) {
  const supabase = createClient()

  // 1. Quote — exactly the columns the job needs + snapshot metadata.
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select(`
      id, status, client_id, service_category,
      service_address, notes, generated_scope,
      frequency, scope_size,
      scheduled_clean_date, estimated_hours,
      contact_name, contact_email, contact_phone,
      accounts_contact_name, accounts_email,
      client_reference, requires_po,
      quote_number, version_number, is_latest_version
    `)
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) {
    return { error: `Quote not found: ${qErr?.message ?? 'missing row'}` }
  }
  if (quote.status !== 'accepted') {
    return { error: 'Only accepted quotes can be converted to a job.' }
  }
  if (!quote.is_latest_version) {
    return { error: 'Only the latest quote version can be converted to a job.' }
  }

  // 2. Pull both scope shapes in parallel. Residential quotes use
  //    quote_items; commercial quotes use commercial_scope_items.
  //    We snapshot whichever is present so the job carries a
  //    faithful copy of the agreed work.
  const [
    { data: residentialItems },
    { data: commercialScope },
  ] = await Promise.all([
    supabase
      .from('quote_items')
      .select('label, price, sort_order')
      .eq('quote_id', quoteId)
      .order('sort_order'),
    supabase
      .from('commercial_scope_items')
      .select('area_type, task_name, frequency_label, task_group, display_order, included')
      .eq('quote_id', quoteId)
      .order('display_order'),
  ])

  const scopeSnapshot = {
    source_quote_id: quote.id,
    source_quote_number: quote.quote_number,
    source_version_number: quote.version_number,
    service_category: quote.service_category,
    frequency: quote.frequency,
    scope_size: quote.scope_size,
    estimated_hours: quote.estimated_hours,
    allowed_hours: quote.estimated_hours,
    generated_scope: quote.generated_scope,
    residential_items: (residentialItems ?? []).map((r: ResidentialItemRow) => ({
      label: r.label ?? '',
      price: r.price ?? 0,
      sort_order: r.sort_order ?? 0,
    })),
    commercial_scope: (commercialScope ?? [])
      .filter((r: CommercialScopeRow) => r.included !== false)
      .map((r: CommercialScopeRow) => ({
        area_type: r.area_type ?? '',
        task_name: r.task_name ?? '',
        frequency_label: r.frequency_label ?? '',
        task_group: r.task_group ?? null,
        display_order: r.display_order ?? 0,
      })),
    created_at: new Date().toISOString(),
  }

  // 3. Build a human-readable description for the job detail page.
  //    Residential → generated_scope. Commercial → concatenated
  //    area labels. Falls back to quote notes.
  const description = quote.generated_scope?.trim()
    || summariseCommercialScope(scopeSnapshot.commercial_scope)
    || quote.notes
    || null

  // 4. Insert the job. Phase D — payment_status defaults to
  // 'on_account' for the job-first path; we're agreeing to the work
  // now and invoicing later.
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .insert({
      client_id: quote.client_id,
      quote_id: quote.id,
      title: jobTitleForQuote(quote.quote_number, quote.service_category),
      description,
      address: quote.service_address ?? null,
      scheduled_date: quote.scheduled_clean_date ?? null,
      allowed_hours: quote.estimated_hours ?? null,
      internal_notes: quote.notes ?? null,
      status: 'draft',
      payment_status: 'on_account',
      scope_snapshot: scopeSnapshot,
    })
    .select('id, job_number')
    .single()

  if (jErr || !job) {
    return { error: `Failed to create job: ${jErr?.message ?? 'insert returned no row'}` }
  }

  // 5. Mark quote as converted — same transition the invoice path
  //    uses, so the workflow bar advances to Next Step and the
  //    quote locks.
  const { data: priorQuote } = await supabase
    .from('quotes')
    .select('status, accepted_at')
    .eq('id', quoteId)
    .single()

  await supabase
    .from('quotes')
    .update({ status: 'converted' })
    .eq('id', quoteId)

  // 6. Audit-log. Mirrors the structure used by convertToInvoice so
  //    both conversion paths leave a discoverable trace.
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'staff',
    action: 'quote.converted_to_job',
    entity_table: 'quotes',
    entity_id: quoteId,
    before: { status: priorQuote?.status ?? null },
    after: {
      status: 'converted',
      accepted_at_preserved: priorQuote?.accepted_at ?? null,
      job_id: job.id,
      job_number: job.job_number,
    },
  })

  redirect(`/portal/jobs/${job.id}`)
}

function jobTitleForQuote(quoteNumber: string | null, serviceCategory: string | null): string {
  const prefix = serviceCategory === 'commercial' ? 'Commercial clean' : 'Clean'
  return quoteNumber ? `${prefix} — ${quoteNumber}` : prefix
}

function summariseCommercialScope(items: Array<{ area_type: string; task_name: string }>): string {
  if (!items.length) return ''
  const areas = new Set<string>()
  for (const i of items) {
    if (i.area_type) areas.add(i.area_type)
  }
  if (areas.size === 0) return `${items.length} scoped tasks`
  return `${areas.size} area${areas.size === 1 ? '' : 's'} · ${items.length} task${items.length === 1 ? '' : 's'}`
}
