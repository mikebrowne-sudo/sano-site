// Contractor setup: section ownership/completion model + readiness gates.
//
// Pure + DB-free so the gate logic (what blocks Active, what stays blocked
// pending later PRs) is unit-tested and reused by staff + contractor + review
// screens. PR 1 deliberately stores NO structured tax/GST data — tax_declaration
// and gst are tracked here only as SECTION STATES, so the later immutable
// contractor_tax_declarations / contractor_gst_history tables own the real data
// without conflict.

/** The setup sections tracked on contractor_setup.section_status. */
export const SETUP_SECTIONS = [
  'identity',
  'structure',
  'gst',
  'tax_declaration',
  'banking',
  'insurance',
  'service_schedules',
  'agreement_acceptance',
] as const
export type SetupSection = (typeof SETUP_SECTIONS)[number]

/**
 * Per-section state. Distinguishes deferred-workflow sections from ones that are
 * genuinely done. `blocked_pending_workflow` means "this section needs a
 * capability that doesn't exist until a later PR" (e.g. IR330C verification) —
 * it is never treated as complete.
 */
export const SECTION_STATES = [
  'not_requested', // not asked for yet
  'not_applicable', // doesn't apply (e.g. insurance when covered_by_sano)
  'confirmed_by_sano', // staff entered + confirmed a known value
  'contractor_to_confirm', // staff entered but wants the contractor to confirm
  'contractor_to_complete', // missing; contractor must supply
  'awaiting_contractor', // sent; waiting on the contractor
  'awaiting_sano_review', // contractor submitted; staff must review/accept
  'blocked_pending_workflow', // needs a later-PR capability (deferred)
  'verified', // staff-verified, complete
] as const
export type SectionState = (typeof SECTION_STATES)[number]

/** Sections whose real capture is DEFERRED to later PRs. In PR 1 these can only
 *  ever be not_requested / not_applicable / blocked_pending_workflow — never
 *  verified — so nothing here is mistaken for complete. */
export const DEFERRED_SECTIONS: readonly SetupSection[] = ['gst', 'tax_declaration']

/** A section counts as "settled for readiness" only when verified or N/A. */
export function isSectionSettled(state: SectionState): boolean {
  return state === 'verified' || state === 'not_applicable'
}

export type SectionStatusMap = Partial<Record<SetupSection, SectionState>>

export function sectionState(map: SectionStatusMap, section: SetupSection): SectionState {
  return map[section] ?? 'not_requested'
}

export interface TaxContext {
  /** Is this contractor classified as a schedular payee? If so, tax stays
   *  blocked until the verified IR330C/exemption workflow completes it. */
  schedular: boolean
  /** PR 4: the REAL per-schedule tax-gate result (from resolveContractorTaxGate).
   *  When provided it drives the tax_declaration blocker precisely — a schedule
   *  is blocked on its own classification, not universally. When omitted, the
   *  PR-1 placeholder `schedular` behaviour applies. */
  taxGate?: { allClear: boolean; blocked: Array<{ name: string; reason: string }> }
}

export interface ReadinessResult {
  /** True only when every applicable section is settled AND no schedular tax
   *  block remains. Identity+structure+schedules alone can NEVER satisfy this. */
  paymentReady: boolean
  /** Sections still blocking payment-ready, with a human reason. */
  blockers: Array<{ section: SetupSection; state: SectionState; reason: string }>
}

const SECTION_LABEL: Record<SetupSection, string> = {
  identity: 'Identity',
  structure: 'Contracting structure',
  gst: 'GST information',
  tax_declaration: 'Contractor tax declaration',
  banking: 'Banking',
  insurance: 'Insurance',
  service_schedules: 'Service schedules',
  agreement_acceptance: 'Agreement acceptance',
}

export function sectionLabel(section: SetupSection): string {
  return SECTION_LABEL[section]
}

/**
 * Compute payment-readiness. A setup is payment-ready ONLY when:
 *  - every applicable section is settled (verified / not_applicable), AND
 *  - if the contractor is schedular, the tax_declaration section is NOT left in
 *    a pending/blocked state (it must be genuinely verified — which PR 1 cannot
 *    do, so schedular contractors always show a tax blocker until the later PR).
 *
 * Deferred sections (gst, tax_declaration) can't be verified in PR 1, so this
 * intentionally reports them as blockers for schedular contractors — that's the
 * required behaviour, not a bug.
 */
export function computeReadiness(map: SectionStatusMap, ctx: TaxContext): ReadinessResult {
  const blockers: ReadinessResult['blockers'] = []

  for (const section of SETUP_SECTIONS) {
    const state = sectionState(map, section)
    if (isSectionSettled(state)) continue

    // PR 4: when the real per-schedule tax gate is supplied, it is authoritative
    // for the tax_declaration section — a schedule is blocked on its own
    // classification, not universally. allClear → tax section is satisfied
    // regardless of the raw section-status value.
    if (section === 'tax_declaration' && ctx.taxGate) {
      if (ctx.taxGate.allClear) continue
      for (const b of ctx.taxGate.blocked) {
        blockers.push({ section, state, reason: `${b.name}: ${b.reason}` })
      }
      continue
    }
    // Fallback (PR 1 placeholder): schedular tax gets an explicit blocker.
    if (section === 'tax_declaration' && ctx.schedular) {
      blockers.push({
        section,
        state,
        reason: 'Payment blocked: valid contractor tax declaration required (verified IR330C or exemption).',
      })
      continue
    }
    // Non-schedular contractors don't need a tax declaration to be payment-ready.
    if (section === 'tax_declaration' && !ctx.schedular) {
      if (state === 'not_applicable' || state === 'not_requested') continue
    }

    blockers.push({
      section,
      state,
      reason: `${SECTION_LABEL[section]} is not yet verified (${state.replace(/_/g, ' ')}).`,
    })
  }

  return { paymentReady: blockers.length === 0, blockers }
}

/**
 * Can this setup move to a given target status? Guards the transitions PR 1
 * cares about: you cannot reach 'active' unless payment-ready, and 'ready_to_sign'
 * requires identity + structure + schedules at least accepted. Tax/GST verification
 * is NOT required to sign (the agreement can be signed while tax is collected) —
 * but IS required for 'active'/payment-ready.
 */
export function canTransitionTo(
  target: string,
  map: SectionStatusMap,
  ctx: TaxContext,
): { ok: boolean; reason?: string } {
  if (target === 'ready_to_sign') {
    for (const s of ['identity', 'structure', 'service_schedules'] as SetupSection[]) {
      const st = sectionState(map, s)
      if (!(st === 'verified' || st === 'confirmed_by_sano')) {
        return { ok: false, reason: `${SECTION_LABEL[s]} must be confirmed before signing.` }
      }
    }
    return { ok: true }
  }
  if (target === 'active') {
    const r = computeReadiness(map, ctx)
    if (!r.paymentReady) {
      return { ok: false, reason: r.blockers[0]?.reason ?? 'Outstanding sections block activation.' }
    }
    return { ok: true }
  }
  return { ok: true }
}
