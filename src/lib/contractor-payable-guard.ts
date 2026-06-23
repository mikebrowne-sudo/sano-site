// Admin Full Edit Mode — Stage 4. Remittance-aware guard for editing a
// contractor payable (contractor_invoice).
//
// A contractor payable carries a single flat `amount` (its total). Hours
// and rate live on job_workers, not here, so editing a payable is editing
// that fixed amount + its details — we never synthesise hours.
//
// Once a payable has been paid, or snapshotted into a remittance batch, its
// amount has become part of payment / remittance history. Remittance lines
// are snapshotted at batch-create time and never recomputed, so editing a
// payable that is already in a batch would silently make the two disagree.
// V1 therefore BLOCKS edits in those states with a clear explanation, and
// only allows edits on a clean (pending / approved, unpaid, unremitted)
// payable — always with a reason + audit.

export type PayableBlockReason = 'sent_remittance' | 'paid' | 'draft_remittance'

export const PAYABLE_BLOCK_MESSAGES: Record<PayableBlockReason, string> = {
  sent_remittance:
    'This contractor payable has already been included in a sent remittance. Editing it is blocked in V1 to protect remittance history.',
  paid:
    'This contractor payable has already been marked paid. Editing paid contractor amounts is blocked in V1 to protect payment history.',
  draft_remittance:
    'This contractor payable is part of a draft remittance batch. Remove it from that batch before editing, so the payable and the remittance can’t disagree.',
}

/** The fields an admin may edit on a clean payable. Never status / date_paid /
 *  invoice_number — so an edit can't mark paid/unpaid or renumber. */
export const EDITABLE_PAYABLE_FIELDS = [
  'contractor_id',
  'job_id',
  'amount',
  'date_submitted',
  'notes',
  // Fixed contract payment fields — correctable via the audited edit path.
  'payment_type',
  'site_label',
  'period_label',
] as const

export interface LinkedRemittance {
  /** Whether the remittance batch this payable was snapshotted into has been sent. */
  sent: boolean
}

/** Supabase types a to-one embed (contractor_remittance_items →
 *  contractor_remittances) as an array even though it resolves to a single
 *  row. Flatten either shape to the single related row (or null). */
export type RemittanceRef = { sent_at: string | null } | { sent_at: string | null }[] | null

export function flattenRef(ref: RemittanceRef): { sent_at: string | null } | null {
  if (!ref) return null
  return Array.isArray(ref) ? (ref[0] ?? null) : ref
}

export interface PayableEditState {
  editable: boolean
  block: PayableBlockReason | null
  message: string | null
  isPaid: boolean
  inSentRemittance: boolean
  inDraftRemittance: boolean
}

/**
 * Decide whether a contractor payable may be edited, given its status and
 * the remittance batches it has been snapshotted into. Pure — the server
 * action and the page both call this so the UI and the write agree.
 *
 * Precedence (strongest protection first): a sent remittance locks it
 * hardest; then paid; then membership of an unsent (draft) batch.
 */
export function evaluatePayableEdit(input: {
  status: string | null
  datePaid: string | null
  remittances: LinkedRemittance[]
}): PayableEditState {
  const isPaid = input.status === 'paid' || !!input.datePaid
  const inSentRemittance = input.remittances.some((r) => r.sent)
  const inDraftRemittance = input.remittances.some((r) => !r.sent)

  let block: PayableBlockReason | null = null
  if (inSentRemittance) block = 'sent_remittance'
  else if (isPaid) block = 'paid'
  else if (inDraftRemittance) block = 'draft_remittance'

  return {
    editable: block === null,
    block,
    message: block ? PAYABLE_BLOCK_MESSAGES[block] : null,
    isPaid,
    inSentRemittance,
    inDraftRemittance,
  }
}
