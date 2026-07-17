// Vendor suggestions for the expense form — derived from existing expenses
// (no vendors table). Returns each distinct vendor with the category + GST
// flag from its MOST RECENT expense, so re-entering a known supplier can
// prefill those fields. Read-only; admin pages already gate access.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { EXPENSE_RECEIPTS_BUCKET } from '@/lib/expense-receipts'

const RECEIPT_SIGNED_TTL = 60 * 60 // 1 hour — a page session.

/** Short-lived signed URL for a stored receipt path (private bucket, service-role). */
export async function getExpenseReceiptUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const { data } = await getServiceSupabase().storage
    .from(EXPENSE_RECEIPTS_BUCKET)
    .createSignedUrl(path, RECEIPT_SIGNED_TTL)
  return data?.signedUrl ?? null
}

export interface VendorSuggestion {
  vendor: string
  category: string
  gst_inclusive: boolean
}

interface Row {
  vendor: string | null
  category: string | null
  gst_inclusive: boolean | null
}

export async function getVendorSuggestions(): Promise<VendorSuggestion[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('expenses')
    .select('vendor, category, gst_inclusive, expense_date, created_at')
    .not('vendor', 'is', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  // First occurrence per vendor wins = most recent (rows are date-desc).
  const seen = new Map<string, VendorSuggestion>()
  for (const r of (data as unknown as Row[] ?? [])) {
    const v = (r.vendor ?? '').trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, { vendor: v, category: r.category ?? 'other', gst_inclusive: r.gst_inclusive ?? true })
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.vendor.localeCompare(b.vendor))
}
