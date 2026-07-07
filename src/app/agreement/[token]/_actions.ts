'use server'

// Public (token-keyed) employment-agreement signing. Uses the service-role
// client — the employee has the secret token but no login, mirroring /share/*.

import { getServiceSupabase } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'

export interface SignAgreementInput {
  token: string
  fullName: string
  address: string
  irdNumber: string
  bankAccount: string
  taxCode: string
  kiwisaverChoice: string // 'opt_out' | 'stay_in'
  // Contractor-only:
  tradingName?: string
  gstNumber?: string
  signedName: string
}

export async function signEmploymentAgreement(input: SignAgreementInput): Promise<{ ok?: true; error?: string }> {
  if (!input.token) return { error: 'Invalid link.' }
  if (!input.fullName?.trim()) return { error: 'Your full name is required.' }
  if (!input.signedName?.trim()) return { error: 'Type your name to sign.' }
  if (input.signedName.trim().toLowerCase() !== input.fullName.trim().toLowerCase()) {
    return { error: 'The signature must match your full legal name above.' }
  }

  const svc = getServiceSupabase()
  const { data: agreement } = await svc
    .from('employment_agreements')
    .select('id, status')
    .eq('token', input.token)
    .maybeSingle()
  if (!agreement) return { error: 'Agreement not found.' }
  if (agreement.status === 'signed') return { error: 'This agreement has already been signed.' }

  const { error } = await svc
    .from('employment_agreements')
    .update({
      employee_full_name: input.fullName.trim(),
      employee_address: input.address?.trim() || null,
      employee_ird_number: input.irdNumber?.trim() || null,
      employee_bank_account: input.bankAccount?.trim() || null,
      tax_code: input.taxCode?.trim() || 'M',
      kiwisaver_choice: input.kiwisaverChoice === 'stay_in' ? 'stay_in' : 'opt_out',
      contractor_trading_name: input.tradingName?.trim() || null,
      contractor_gst_number: input.gstNumber?.trim() || null,
      signed_name: input.signedName.trim(),
      signed_at: new Date().toISOString(),
      status: 'signed',
    })
    .eq('id', agreement.id)
  if (error) return { error: `Couldn’t save your signature: ${error.message}` }

  revalidatePath('/portal/agreements')
  return { ok: true }
}
