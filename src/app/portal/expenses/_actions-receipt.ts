'use server'

// Expense receipts — upload + remove (admin-only). Storage + DB writes go
// through the service-role client so we don't depend on storage RLS; the
// bucket is private and images/PDFs are only ever served via short-lived
// signed URLs (see getExpenseReceiptUrl in ./_data). One receipt per expense
// — a new upload replaces the previous file.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import {
  EXPENSE_RECEIPTS_BUCKET,
  RECEIPT_MAX_BYTES,
  isAllowedReceiptType,
  receiptExt,
} from '@/lib/expense-receipts'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user)
}

export async function uploadExpenseReceipt(expenseId: string, formData: FormData) {
  if (!(await requireAdmin())) return { error: 'Admin only.' }
  if (!expenseId) return { error: 'Expense is required.' }

  const file = formData.get('receipt')
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected.' }
  if (!isAllowedReceiptType(file.type)) return { error: 'Receipts must be an image or a PDF.' }
  if (file.size > RECEIPT_MAX_BYTES) return { error: 'The receipt must be under 10 MB.' }

  const svc = getServiceSupabase()

  // Replace any existing receipt for this expense.
  const { data: existing } = await svc.from('expenses').select('receipt_path').eq('id', expenseId).maybeSingle()
  const oldPath = (existing as { receipt_path?: string | null } | null)?.receipt_path ?? null

  const path = `${expenseId}/${crypto.randomUUID()}.${receiptExt(file.name)}`
  const { error: upErr } = await svc.storage
    .from(EXPENSE_RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return { error: `Upload failed: ${upErr.message}` }

  const { error: dbErr } = await svc
    .from('expenses')
    .update({ receipt_path: path, receipt_uploaded_at: new Date().toISOString() })
    .eq('id', expenseId)
  if (dbErr) {
    await svc.storage.from(EXPENSE_RECEIPTS_BUCKET).remove([path]) // don't orphan
    return { error: `Failed to save receipt: ${dbErr.message}` }
  }

  if (oldPath && oldPath !== path) await svc.storage.from(EXPENSE_RECEIPTS_BUCKET).remove([oldPath])

  revalidatePath('/portal/expenses')
  revalidatePath(`/portal/expenses/${expenseId}/edit`)
  return { ok: true as const }
}

export async function removeExpenseReceipt(expenseId: string) {
  if (!(await requireAdmin())) return { error: 'Admin only.' }
  if (!expenseId) return { error: 'Expense is required.' }

  const svc = getServiceSupabase()
  const { data: row } = await svc.from('expenses').select('receipt_path').eq('id', expenseId).maybeSingle()
  const path = (row as { receipt_path?: string | null } | null)?.receipt_path ?? null

  const { error: dbErr } = await svc
    .from('expenses')
    .update({ receipt_path: null, receipt_uploaded_at: null })
    .eq('id', expenseId)
  if (dbErr) return { error: dbErr.message }

  if (path) await svc.storage.from(EXPENSE_RECEIPTS_BUCKET).remove([path])

  revalidatePath('/portal/expenses')
  revalidatePath(`/portal/expenses/${expenseId}/edit`)
  return { ok: true as const }
}
