'use server'

// Contractor self-service on the Profile screen: emergency contact + evidence
// uploads (photo ID, insurance, right-to-work).
//
// Security model:
//  - The caller is resolved from their OWN session (auth_user_id) — never from
//    a client-supplied id — so a contractor can only touch their own record.
//  - Writes use the service-role client but are limited to an explicit field
//    set (emergency contact only) and to worker_documents rows for that id.
//  - Uploads only ever complete *_uploaded checklist items, never *_verified —
//    Sano still verifies the evidence (completeUploadedItems enforces this).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { validateEmergencyContact, type EmergencyContactInput } from '@/lib/emergency-contact'
import { profileDocTypesForWorker } from '@/lib/agreement-documents'
import { completeUploadedItems } from '@/lib/onboarding-sign'
import {
  WORKER_DOC_BUCKET,
  buildWorkerDocPath,
  isExpectedWorkerDocPath,
  createWorkerDocUploadUrl,
  confirmUploadedWorkerDoc,
} from '@/lib/worker-document-upload'

async function currentWorker(): Promise<{ id: string; workerType: string | null } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('contractors')
    .select('id, worker_type')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data) return null
  return { id: data.id as string, workerType: (data.worker_type as string | null) ?? null }
}

function allowedDocType(workerType: string | null, documentType: string): boolean {
  return profileDocTypesForWorker(workerType).some((d) => d.value === documentType)
}

export async function saveEmergencyContact(
  input: EmergencyContactInput,
): Promise<{ ok: true } | { error: string }> {
  const me = await currentWorker()
  if (!me) return { error: 'Please sign in again.' }

  const checked = validateEmergencyContact(input)
  if (!checked.ok) return { error: checked.error }

  const svc = getServiceSupabase()
  const { data: before } = await svc
    .from('contractors')
    .select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
    .eq('id', me.id)
    .maybeSingle()

  const { error } = await svc
    .from('contractors')
    .update({ ...checked.value, updated_at: new Date().toISOString() })
    .eq('id', me.id)
  if (error) return { error: 'Couldn’t save — please try again.' }

  await svc.from('audit_log').insert({
    actor_id: null,
    actor_role: 'contractor',
    action: 'contractor.emergency_contact_updated',
    entity_table: 'contractors',
    entity_id: me.id,
    before: before ?? null,
    after: checked.value,
  })

  revalidatePath('/contractor/profile')
  revalidatePath(`/portal/contractors/${me.id}`)
  return { ok: true }
}

export async function prepareProfileUpload(input: {
  documentType: string
  fileName: string
  fileType?: string | null
  fileSize: number
}): Promise<{ ok: true; path: string; uploadToken: string } | { error: string }> {
  const me = await currentWorker()
  if (!me) return { error: 'Please sign in again.' }
  if (!allowedDocType(me.workerType, input.documentType)) return { error: 'Unknown document type.' }

  const svc = getServiceSupabase()
  const path = buildWorkerDocPath(`contractors/${me.id}`, input.documentType, input.fileName)
  return createWorkerDocUploadUrl(svc, path, input)
}

export async function finaliseProfileUpload(input: {
  documentType: string
  path: string
  fileName: string
}): Promise<{ ok: true; title: string; uploadedAt: string } | { error: string }> {
  const me = await currentWorker()
  if (!me) return { error: 'Please sign in again.' }
  if (!allowedDocType(me.workerType, input.documentType)) return { error: 'Unknown document type.' }
  if (!isExpectedWorkerDocPath(input.path, `contractors/${me.id}`, input.documentType)) {
    return { error: 'That upload doesn’t belong to your account.' }
  }

  const svc = getServiceSupabase()
  const confirmed = await confirmUploadedWorkerDoc(svc, input.path)
  if (!('ok' in confirmed)) return { error: confirmed.error }

  const title = input.fileName.slice(0, 200)
  const { data: inserted, error } = await svc
    .from('worker_documents')
    .insert({
      contractor_id: me.id,
      agreement_id: null,
      document_type: input.documentType,
      title,
      file_path: input.path,
      file_size: confirmed.size,
      notes: 'Uploaded by the worker from their portal profile',
    })
    .select('id, uploaded_at')
    .single()
  if (error || !inserted) {
    await svc.storage.from(WORKER_DOC_BUCKET).remove([input.path]) // don't orphan the object
    return { error: 'Couldn’t save the document — please try again.' }
  }

  // Mark the matching *_uploaded item done (pending rows only; never *_verified).
  try {
    await completeUploadedItems(svc, { contractorId: me.id, docTypes: [input.documentType] })
  } catch (e) {
    console.error('[profile-upload] checklist auto-complete failed:', e instanceof Error ? e.message : e)
  }

  await svc.from('audit_log').insert({
    actor_id: null,
    actor_role: 'contractor',
    action: 'contractor.document_uploaded',
    entity_table: 'contractors',
    entity_id: me.id,
    before: null,
    after: { document_id: inserted.id, document_type: input.documentType, title },
  })

  revalidatePath('/contractor/profile')
  revalidatePath(`/portal/contractors/${me.id}`)
  return { ok: true, title, uploadedAt: inserted.uploaded_at as string }
}
