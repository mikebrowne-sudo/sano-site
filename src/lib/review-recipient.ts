import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// Who a job's Google-review request should greet and be sent to. For business
// clients the `clients` row holds the company name + accounts email, so we must
// resolve the actual person: the job's main contact, else the client's primary
// contact, else the client record as a last resort. Used by the send action
// and by the pages that prefill the editable message.

export interface ReviewRecipient {
  name: string | null
  email: string | null
  phone: string | null
}

export interface ContactRow {
  full_name: string | null
  email: string | null
  phone: string | null
}

const trimOrNull = (v?: string | null) => (v && v.trim() ? v.trim() : null)

/** Prefer the contact's details, falling back to the client record. Pure — tested. */
export function preferContact(
  contact: ContactRow | null,
  client: { name?: string | null; email?: string | null; phone?: string | null } | null,
): ReviewRecipient {
  return {
    name: trimOrNull(contact?.full_name) ?? trimOrNull(client?.name),
    email: trimOrNull(contact?.email) ?? trimOrNull(client?.email),
    phone: trimOrNull(contact?.phone) ?? trimOrNull(client?.phone),
  }
}

/**
 * Resolve a single job's review recipient: job.contact_id → client's 'primary'
 * contact → the client record. Two cheap lookups at most.
 */
export async function resolveReviewRecipient(
  supabase: SupabaseClient,
  opts: {
    contactId: string | null
    clientId: string | null
    client: { name?: string | null; email?: string | null; phone?: string | null } | null
  },
): Promise<ReviewRecipient> {
  let contact: ContactRow | null = null

  if (opts.contactId) {
    const { data } = await supabase
      .from('contacts')
      .select('full_name, email, phone')
      .eq('id', opts.contactId)
      .maybeSingle()
    contact = (data as ContactRow | null) ?? null
  }

  if (!contact && opts.clientId) {
    const { data } = await supabase
      .from('contacts')
      .select('full_name, email, phone')
      .eq('client_id', opts.clientId)
      .eq('contact_type', 'primary')
      .limit(1)
      .maybeSingle()
    contact = (data as ContactRow | null) ?? null
  }

  return preferContact(contact, opts.client)
}
