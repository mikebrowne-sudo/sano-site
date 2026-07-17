'use server'

// Expenses V1 — admin-only create / update / delete.
//
// Simple manual expense records. No financial-history lock (unlike paid
// contractor payables), so admins can correct or remove a mis-entered row
// — these are entered by hand from bank transactions. No GST math, no tax
// treatment.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { normaliseExpenseCategory } from '@/lib/expense-categories'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
// Note: createExpense returns the new id (rather than redirecting) so the
// caller can attach a receipt to it before navigating away.

export interface ExpenseInput {
  expense_date: string
  amount: number
  category: string
  vendor?: string | null
  description?: string | null
  payment_reference?: string | null
  gst_inclusive?: boolean
  notes?: string | null
}

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  return { ok: isAdminUser(user), user }
}

function validate(input: ExpenseInput): string | null {
  if (!input.expense_date) return 'Date is required.'
  if (!input.amount || input.amount <= 0) return 'Amount must be greater than zero.'
  return null
}

function rowFrom(input: ExpenseInput) {
  return {
    expense_date: input.expense_date,
    amount: input.amount,
    category: normaliseExpenseCategory(input.category),
    vendor: input.vendor?.trim() || null,
    description: input.description?.trim() || null,
    payment_reference: input.payment_reference?.trim() || null,
    gst_inclusive: input.gst_inclusive ?? true,
    notes: input.notes?.trim() || null,
  }
}

export async function createExpense(input: ExpenseInput) {
  const supabase = createClient()
  const { ok, user } = await requireAdmin(supabase)
  if (!ok) return { error: 'Admin only.' }
  const v = validate(input)
  if (v) return { error: v }

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...rowFrom(input), created_by: user?.id ?? null })
    .select('id')
    .single()
  if (error || !data) return { error: `Failed to create: ${error?.message}` }
  revalidatePath('/portal/expenses')
  return { ok: true as const, id: data.id as string }
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const supabase = createClient()
  const { ok } = await requireAdmin(supabase)
  if (!ok) return { error: 'Admin only.' }
  if (!id) return { error: 'Expense is required.' }
  const v = validate(input)
  if (v) return { error: v }

  const { error } = await supabase
    .from('expenses')
    .update({ ...rowFrom(input), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/portal/expenses')
  revalidatePath(`/portal/expenses/${id}/edit`)
  return { ok: true as const }
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  const { ok } = await requireAdmin(supabase)
  if (!ok) return { error: 'Admin only.' }
  if (!id) return { error: 'Expense is required.' }

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/portal/expenses')
  redirect('/portal/expenses')
}
