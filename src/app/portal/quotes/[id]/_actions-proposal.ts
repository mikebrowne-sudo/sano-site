'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Create a proposal from a quote, or return the existing one.
 *
 * Idempotent: if a proposal already exists for this quote, we do not create
 * a second row — we redirect to the existing one. Enforces the current
 * "one proposal per quote" rule at the app layer.
 *
 * On success: redirects to /portal/proposals/[id].
 * On failure: returns { error } so the client button can surface it.
 */
export async function createProposalFromQuote(quoteId: string) {
  const supabase = createClient()

  // 1. Confirm the quote exists (avoids orphan proposals and gives us a
  //    clean error message).
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .single()

  if (quoteErr || !quote) {
    return { error: `Quote not found: ${quoteErr?.message ?? 'no match'}` }
  }

  // 2. If a proposal already exists for this quote, reuse it.
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existing?.id) {
    redirect(`/portal/proposals/${existing.id}`)
  }

  // 3. Insert a new proposal. share_token defaults to gen_random_uuid()::text
  //    at the DB level, so we don't need to supply one here.
  const { data: inserted, error: insertErr } = await supabase
    .from('proposals')
    .insert({
      quote_id: quoteId,
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    return {
      error: `Failed to create proposal: ${insertErr?.message ?? 'unknown error'}`,
    }
  }

  revalidatePath(`/portal/quotes/${quoteId}`)
  redirect(`/portal/proposals/${inserted.id}`)
}
