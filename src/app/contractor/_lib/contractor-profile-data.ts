// Loads everything the contractor Profile screen shows. Shared by the live
// contractor page and the staff "Preview as contractor" tool so both render
// exactly the same data. Callers pass a client already scoped to the right
// contractor id (the live page resolves it from the signed-in user).

import type { SupabaseClient } from '@supabase/supabase-js'
import { profileDocTypesForWorker, requiredProfileDocValues } from '@/lib/agreement-documents'

export interface ProfileDocSlot {
  documentType: string
  label: string
  hint?: string
  required: boolean
  /** Latest upload of this type, if any. */
  latest: { title: string; uploadedAt: string } | null
}

export interface ContractorProfileData {
  full_name: string
  email: string | null
  phone: string | null
  worker_type: string | null
  emergency: { name: string; phone: string; relationship: string }
  docSlots: ProfileDocSlot[]
  /** Plain-English list of what Sano still needs from this worker. */
  missing: string[]
}

export async function loadContractorProfile(
  svc: SupabaseClient,
  contractorId: string,
): Promise<ContractorProfileData | null> {
  const [{ data: c }, { data: docs }] = await Promise.all([
    svc
      .from('contractors')
      .select('full_name, email, phone, worker_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
      .eq('id', contractorId)
      .maybeSingle(),
    svc
      .from('worker_documents')
      .select('document_type, title, uploaded_at')
      .eq('contractor_id', contractorId)
      .order('uploaded_at', { ascending: false }),
  ])
  if (!c) return null

  const workerType = (c.worker_type as string | null) ?? null
  const required = new Set(requiredProfileDocValues(workerType))
  const rows = (docs ?? []) as Array<{ document_type: string; title: string | null; uploaded_at: string }>

  const docSlots: ProfileDocSlot[] = profileDocTypesForWorker(workerType).map((dt) => {
    const hit = rows.find((r) => r.document_type === dt.value) // newest first
    return {
      documentType: dt.value,
      label: dt.label,
      hint: dt.hint,
      required: required.has(dt.value),
      latest: hit ? { title: hit.title ?? dt.label, uploadedAt: hit.uploaded_at } : null,
    }
  })

  const emergency = {
    name: (c.emergency_contact_name as string | null) ?? '',
    phone: (c.emergency_contact_phone as string | null) ?? '',
    relationship: (c.emergency_contact_relationship as string | null) ?? '',
  }

  const missing: string[] = []
  if (!emergency.name || !emergency.phone) missing.push('Emergency contact')
  for (const s of docSlots) if (s.required && !s.latest) missing.push(s.label)

  return {
    full_name: c.full_name as string,
    email: (c.email as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    worker_type: workerType,
    emergency,
    docSlots,
    missing,
  }
}
