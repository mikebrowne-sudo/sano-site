// Phase 2 — connect agreement signing to the onboarding checklist.
//
// On a successful CONTRACTOR signing we:
//   1. Seed the onboarding checklist idempotently (upsert, ignore
//      duplicates on the unique (contractor_id, item_key) constraint),
//      so a contractor created straight from the sign flow gets a
//      checklist without a separate staff "Seed" click.
//   2. Auto-complete ONLY the system-kind items (SIGN_AUTO_COMPLETE_KEYS:
//      confirm_details, bank_details, contract_signed) — and only where
//      still pending, so a retry never rewrites an existing completion
//      timestamp or history.
//   3. Record a single system audit_log row carrying the completed item
//      keys + the source agreement id.
//
// completed_by is left NULL: signing runs on the service-role client with
// no auth user, and completed_by is an FK to auth.users. The audit row is
// the "system action" identity (actor_id NULL, actor_role 'system').
//
// This helper is deliberately IO-thin and takes the Supabase client so it
// can run on the service-role client from the token-keyed sign action.

import { onboardingSeedRows, SIGN_AUTO_COMPLETE_KEYS, uploadedItemKeysForDocTypes } from './onboarding-checklist'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export interface AutoCompleteOnSignArgs {
  contractorId: string
  agreementId: string | null
  rightToWorkRequired?: boolean
}

export async function seedAndAutoCompleteOnboardingOnSign(
  client: AnyClient,
  { contractorId, agreementId, rightToWorkRequired }: AutoCompleteOnSignArgs,
): Promise<{ completedKeys: string[] }> {
  // 1. Idempotent seed — insert any missing template rows as pending.
  const rows = onboardingSeedRows(contractorId, 'contractor', { rightToWorkRequired })
  if (rows.length > 0) {
    await client
      .from('contractor_onboarding')
      .upsert(rows, { onConflict: 'contractor_id,item_key', ignoreDuplicates: true })
  }

  // 2. Auto-complete only the system items that are still pending.
  const nowIso = new Date().toISOString()
  const { data: completed } = await client
    .from('contractor_onboarding')
    .update({ status: 'complete', completed_at: nowIso, completed_by: null })
    .eq('contractor_id', contractorId)
    .in('item_key', SIGN_AUTO_COMPLETE_KEYS)
    .eq('status', 'pending')
    .select('item_key')

  const completedKeys = ((completed ?? []) as { item_key: string }[]).map((r) => r.item_key)

  // 3. One system audit row — only when something actually changed, so a
  //    retry of an already-completed signing writes no duplicate audit.
  if (completedKeys.length > 0) {
    await client.from('audit_log').insert({
      actor_id: null,
      actor_role: 'system',
      action: 'contractor.onboarding_auto_completed',
      entity_table: 'contractors',
      entity_id: contractorId,
      before: {},
      after: { items: completedKeys, source: 'agreement_signing', agreement_id: agreementId },
    })
  }

  return { completedKeys }
}

/**
 * Complete the WORKER-kind *_uploaded checklist items satisfied by a set of
 * uploaded document types (insurance / id_verification / right_to_work).
 * Only ever targets *_uploaded items — never *_verified — and only rows that
 * are still pending, so it is idempotent and can never complete a Sano
 * verification from a document's mere presence.
 */
export async function completeUploadedItems(
  client: AnyClient,
  { contractorId, docTypes, completedBy = null }: { contractorId: string; docTypes: Iterable<string>; completedBy?: string | null },
): Promise<{ completedKeys: string[] }> {
  const keys = uploadedItemKeysForDocTypes(docTypes)
  if (keys.length === 0) return { completedKeys: [] }

  const nowIso = new Date().toISOString()
  const { data: completed } = await client
    .from('contractor_onboarding')
    .update({ status: 'complete', completed_at: nowIso, completed_by: completedBy })
    .eq('contractor_id', contractorId)
    .in('item_key', keys)
    .eq('status', 'pending')
    .select('item_key')

  return { completedKeys: ((completed ?? []) as { item_key: string }[]).map((r) => r.item_key) }
}
